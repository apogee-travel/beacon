/* eslint-disable @typescript-eslint/no-explicit-any */
import { observable, reaction } from "mobx";
import type { BeaconActions, BeaconDerived, BeaconState } from "@apogeelabs/beacon";

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
        // update reactively when items are pushed/popped. Plain arrays wouldn't trigger
        // MobX's computed tracking.
        // Typed as Record<string, any>[] because snapshots are plain cloned objects,
        // not full TState instances (they lack MobX proxy wrapping and store methods).
        const past = observable<Record<string, any>>([]);
        const future = observable<Record<string, any>>([]);

        // skipNextN tracks how many upcoming reaction firings to skip.
        // MobX actions batch mutations and fire reactions after the action closes, so
        // a plain boolean flag gets cleared before the reaction runs. Using a counter
        // that decrements inside the reaction itself is the reliable solution.
        //
        // undo and redo each cause one state write (applySnapshot) → one reaction firing.
        // So we skip exactly 1 reaction per undo/redo call.
        let skipNextN = 0;

        // Inject canUndo and canRedo as derived values so components can reactively
        // disable/enable undo buttons. These read from the observable arrays, so MobX
        // tracks the dependency and re-computes when past/future change.
        config.derived = {
            ...config.derived,
            canUndo: () => past.length > 0,
            canRedo: () => future.length > 0,
        };

        // Inject undo and redo actions, replacing the no-op stubs from the store config.
        config.actions = {
            ...config.actions,
            undo: (state: TState) => {
                if (past.length === 0) return;

                // Tell the reaction to skip the next firing — undo writes state, which
                // triggers the reaction, but that write shouldn't be treated as a new action.
                skipNextN += 1;

                // Capture current state so redo can restore it, then apply the previous snapshot.
                const currentSnapshot = extractStateOnly(state, config);
                future.unshift(currentSnapshot);

                const previousSnapshot = past.pop()!;
                applySnapshot(state, previousSnapshot, config);
            },
            redo: (state: TState) => {
                if (future.length === 0) return;

                // Same skip logic — redo's state write should not add to the undo stack.
                skipNextN += 1;

                // Capture current state so undo can come back here, then apply the next snapshot.
                const currentSnapshot = extractStateOnly(state, config);
                past.push(currentSnapshot);

                const nextSnapshot = future.shift()!;
                applySnapshot(state, nextSnapshot, config);
            },
        };

        // Chain onStoreCreated so we don't clobber any middleware that ran before us.
        // This is the standard middleware pattern — always preserve the prior hook.
        const originalOnStoreCreated = config.onStoreCreated;
        config.onStoreCreated = (store: any) => {
            if (originalOnStoreCreated) {
                originalOnStoreCreated(store);
            }

            // We need to record the state BEFORE each action for undo to work correctly.
            // MobX reactions fire AFTER the action completes with the new state value.
            // The trick: keep a `prevSnapshot` variable that always holds the last-known state.
            // When a reaction fires, `prevSnapshot` is the state before the change — we push
            // that to `past`. Then we update `prevSnapshot` to the new state.
            const stateKeys = Object.keys(config.initialState);

            const readStateSnapshot = (): Record<string, any> => {
                const snap: Record<string, any> = {};
                for (const key of stateKeys) {
                    snap[key] = store[key];
                }
                return snap;
            };

            // Seed prevSnapshot with the initial state so the first undo has something to go back to
            let prevSnapshot: Record<string, any> = structuredClone(readStateSnapshot());

            const disposer = reaction(
                () => {
                    // Reading each state property here registers them as MobX tracked dependencies.
                    // Return a plain object so the reaction can receive it in the effect.
                    return readStateSnapshot();
                },
                () => {
                    // Decrement the skip counter — this firing was caused by an undo/redo write,
                    // not a genuine user action. Still update prevSnapshot so next undo is correct.
                    if (skipNextN > 0) {
                        skipNextN -= 1;
                        prevSnapshot = structuredClone(readStateSnapshot());
                        return;
                    }

                    // Each new user action clears redo — you can't redo after branching
                    future.splice(0, future.length);

                    // Push the PREVIOUS state (before this action's change) so undo can restore it
                    past.push(prevSnapshot);

                    // Cap history so old entries don't accumulate indefinitely
                    if (past.length > maxHistory) {
                        past.shift();
                    }

                    // Record the new current state for the next action
                    prevSnapshot = structuredClone(readStateSnapshot());
                }
            );

            // Register with the store so the reaction is cleaned up on dispose()
            store.registerCleanup(disposer);
        };

        return config;
    };
}

/**
 * Extract only the raw state keys from the MobX observable state object.
 * Skips derived values (canUndo, canRedo) and store API methods.
 * We use JSON round-trip to deep-clone and strip any MobX proxy wrapping.
 */
function extractStateOnly(state: any, config: any): any {
    const derivedKeys = new Set(Object.keys(config.derived || {}));
    const raw: Record<string, any> = {};
    for (const key of Object.keys(config.initialState)) {
        if (!derivedKeys.has(key)) {
            raw[key] = state[key];
        }
    }
    return structuredClone(raw);
}

/**
 * Apply a snapshot to the observable state, skipping derived and non-state keys.
 * Only keys present in `config.initialState` are written — we never clobber
 * derived properties or store API methods via Object.assign.
 */
function applySnapshot(state: any, snapshot: any, config: any): void {
    for (const key of Object.keys(config.initialState)) {
        if (key in snapshot) {
            state[key] = snapshot[key];
        }
    }
}
