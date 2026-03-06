// Copied verbatim from examples/react-dashboard/src/lib/undoMiddleware.ts.
// If you change this file, update the web version too (or extract to a shared package).
import { observable, reaction } from "mobx";
import type { BeaconActions, BeaconDerived, BeaconState } from "@apogeelabs/beacon";

// Hermes (React Native's JS engine) doesn't support structuredClone.
// JSON round-trip is fine here — snapshots are plain objects with primitives/arrays.
const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

export interface UndoMiddlewareOptions {
    /**
     * Maximum number of history entries to keep.
     * Older entries are dropped as new ones are pushed.
     * Defaults to 10.
     */
    maxHistory?: number;
}

/**
 * Custom undo/redo middleware for Beacon stores.
 *
 * Demonstrates the full middleware authoring pattern:
 *   - Adds `undo` and `redo` actions
 *   - Adds `canUndo` and `canRedo` derived properties
 *   - Sets up a MobX reaction in `onStoreCreated` to capture state history
 *   - Registers reaction cleanup so it's torn down with the store
 *
 * Usage: compose(undoMiddleware({ maxHistory: 10 }))(config)
 */
export function undoMiddleware<
    TState extends BeaconState,
    _TDerived extends BeaconDerived<TState>,
    _TActions extends BeaconActions<TState>,
>(options: UndoMiddlewareOptions = {}) {
    const maxHistory = options.maxHistory ?? 10;

    return (config: any): any => {
        // History stacks are MobX observable so that canUndo/canRedo computed values
        // update reactively when items are pushed/popped.
        const past = observable<Record<string, any>>([]);
        const future = observable<Record<string, any>>([]);

        // skipNextN tracks how many upcoming reaction firings to skip.
        // undo and redo each cause one state write → one reaction firing.
        // We skip exactly 1 reaction per undo/redo call.
        let skipNextN = 0;

        config.derived = {
            ...config.derived,
            canUndo: () => past.length > 0,
            canRedo: () => future.length > 0,
        };

        config.actions = {
            ...config.actions,
            undo: (state: TState) => {
                if (past.length === 0) return;

                skipNextN += 1;

                const currentSnapshot = extractStateOnly(state, config);
                future.unshift(currentSnapshot);

                const previousSnapshot = past.pop()!;
                applySnapshot(state, previousSnapshot, config);
            },
            redo: (state: TState) => {
                if (future.length === 0) return;

                skipNextN += 1;

                const currentSnapshot = extractStateOnly(state, config);
                past.push(currentSnapshot);

                const nextSnapshot = future.shift()!;
                applySnapshot(state, nextSnapshot, config);
            },
        };

        // Chain onStoreCreated so we don't clobber any middleware that ran before us.
        const originalOnStoreCreated = config.onStoreCreated;
        config.onStoreCreated = (store: any) => {
            if (originalOnStoreCreated) {
                originalOnStoreCreated(store);
            }

            // Wrap every action except undo/redo to clear the redo stack at invocation
            // time rather than relying on the reaction. The reaction only fires when
            // observable state actually changes — no-op actions (e.g. resetFilters when
            // already at defaults) would leave stale redo entries otherwise.
            const undoRedoKeys = new Set(["undo", "redo"]);
            for (const key of Object.keys(store.actions)) {
                if (undoRedoKeys.has(key)) continue;
                const original = store.actions[key];
                store.actions[key] = (...args: any[]) => {
                    future.splice(0, future.length);
                    return original(...args);
                };
            }

            const stateKeys = Object.keys(config.initialState);

            const readStateSnapshot = (): Record<string, any> => {
                const snap: Record<string, any> = {};
                for (const key of stateKeys) {
                    snap[key] = store[key];
                }
                return snap;
            };

            let prevSnapshot: Record<string, any> = deepClone(readStateSnapshot());

            const disposer = reaction(
                () => readStateSnapshot(),
                () => {
                    if (skipNextN > 0) {
                        skipNextN -= 1;
                        prevSnapshot = deepClone(readStateSnapshot());
                        return;
                    }

                    past.push(prevSnapshot);

                    if (past.length > maxHistory) {
                        past.shift();
                    }

                    prevSnapshot = deepClone(readStateSnapshot());
                }
            );

            store.registerCleanup(disposer);
        };

        return config;
    };
}

function extractStateOnly(state: any, config: any): any {
    const derivedKeys = new Set(Object.keys(config.derived || {}));
    const raw: Record<string, any> = {};
    for (const key of Object.keys(config.initialState)) {
        if (!derivedKeys.has(key)) {
            raw[key] = state[key];
        }
    }
    return deepClone(raw);
}

function applySnapshot(state: any, snapshot: any, config: any): void {
    for (const key of Object.keys(config.initialState)) {
        if (key in snapshot) {
            state[key] = snapshot[key];
        }
    }
}
