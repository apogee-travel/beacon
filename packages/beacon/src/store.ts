// @apogeelabs/beacon store.ts

/* eslint-disable @typescript-eslint/no-explicit-any */
import { action, computed, IComputedValue, observable, toJS } from "mobx";
import type {
    ActionParameters,
    BeaconActions,
    BeaconDerived,
    BeaconState,
    CleanupFunction,
    EmptyActions,
    EmptyDerived,
    Store,
    StoreConfig,
} from "./types";

/**
 * Creates a reactive state management store using MobX
 *
 * @param config The store configuration object containing initial state, derived values, and actions
 * @returns An object containing observable state, computed values, actions, and a snapshot function
 */
export function createStore<
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState> = EmptyDerived<TState>,
    TActions extends BeaconActions<TState> = EmptyActions,
>(config: StoreConfig<TState, TDerived, TActions>): Store<TState, TDerived, TActions> {
    const initialStateKeys = new Set(Object.keys(config.initialState));
    const derivedKeys = Object.keys(config.derived ?? {});

    // Prevent naming conflicts between state and derived values
    for (const key of derivedKeys) {
        if (initialStateKeys.has(key)) {
            throw new Error(`Derived key '${key}' conflicts with state property of the same name`);
        }
    }

    // Wrapping in observable() makes every property reactive — MobX can then track
    // reads and writes so computed values and reactions update automatically.
    const store = observable({
        ...config.initialState,
    });

    // Collection of computed property instances for cleanup
    const computedProperties: Record<string, IComputedValue<any>> = {};

    if (config.derived) {
        for (const key in config.derived) {
            const computedValue = computed(() => {
                return config.derived![key](store as any);
            });

            computedProperties[key] = computedValue;

            // Object.defineProperty with a getter exposes the computed value as a plain property
            // access on the store, while keeping MobX's lazy evaluation intact — the computation
            // only runs when something actually reads the property.
            Object.defineProperty(store, key, {
                get: () => computedValue.get(),
                enumerable: true,
                configurable: true,
            });
        }
    }

    // Add actions to the store
    const actions = {} as any;
    if (config.actions) {
        for (const key in config.actions) {
            // action() names the function for MobX DevTools and batches all observable
            // mutations inside it into a single transaction, preventing intermediate renders.
            actions[key] = action(key, (...args: any[]) => {
                if ((store as any).isDisposed) {
                    console.warn(`Cannot execute action '${key}': store has been disposed`);
                    return;
                }

                return config.actions![key](
                    store as any,
                    ...(args as ActionParameters<TActions[Extract<keyof TActions, string>]>)
                );
            });
        }
    }

    // Create the getStateSnapshot method
    const getStateSnapshot = (options?: { withDerived?: boolean }) => {
        // Check if store is disposed
        if ((store as any).isDisposed) {
            console.warn("Cannot get state snapshot: store has been disposed");
            // Returning null signals the store is gone — callers should treat this as a no-op
            // rather than attempting to use the result.
            return null;
        }

        const snapshot = toJS(store);

        if (config.derived) {
            for (const key in config.derived) {
                if (!options?.withDerived) {
                    delete snapshot[key];
                }
            }
        }

        // Strip store API methods — the snapshot is plain state data for serialization
        // or persistence, so consumers shouldn't see non-serializable function references.
        delete snapshot.actions;
        delete snapshot.isDisposed;
        delete snapshot.dispose;
        delete snapshot.getStateSnapshot;
        delete snapshot.registerCleanup;
        delete snapshot.unregisterCleanup;

        return snapshot;
    };

    // Array to store cleanup functions
    const cleanupFunctions: CleanupFunction[] = [];

    // Function to register cleanup
    const registerCleanup = (cleanupFn: CleanupFunction) => {
        if (typeof cleanupFn !== "function") {
            console.warn("Attempted to register non-function as cleanup");
            return;
        }

        if ((store as any).isDisposed) {
            console.warn("Attempted to register cleanup on disposed store");
            return;
        }

        cleanupFunctions.push(cleanupFn);
    };

    // Removes a previously registered cleanup function by reference.
    // Matching by reference is intentional — callers hold the same closure they registered.
    const unregisterCleanup = (cleanupFn: CleanupFunction) => {
        if ((store as any).isDisposed) {
            // Store already disposed — cleanup list has been drained, nothing to remove
            return;
        }

        const idx = cleanupFunctions.indexOf(cleanupFn);
        if (idx !== -1) {
            cleanupFunctions.splice(idx, 1);
        }
    };

    // Create the dispose method
    const dispose = () => {
        // Prevent multiple disposals
        if ((store as any).isDisposed) {
            return;
        }

        // Mark store as disposed to prevent further operations
        (store as any).isDisposed = true;

        // Execute all cleanup functions
        while (cleanupFunctions.length > 0) {
            const cleanup = cleanupFunctions.pop();
            try {
                cleanup?.();
            } catch (error) {
                console.error("Error in cleanup function:", error);
            }
        }

        // Replace actions with no-ops — calling an action on a disposed store is always a bug.
        // This is a plain JS assignment, not an observable mutation, so no runInAction needed.
        for (const key in actions) {
            (actions as any)[key] = () => {
                console.warn(`Cannot execute action '${key}': store has been disposed`);
            };
        }

        // Clear computed property references from the internal record.
        // Note: the getter closures still hold their own references to the computed values,
        // so this alone won't GC them while the store is alive. It does drop the extra
        // reference from this private record, keeping the disposal cleanup thorough.
        for (const key in computedProperties) {
            computedProperties[key] = null as any;
        }
    };

    // Add actions and methods to the store
    Object.defineProperty(store, "actions", {
        value: actions,
        enumerable: true,
        configurable: true,
    });

    Object.defineProperty(store, "getStateSnapshot", {
        value: getStateSnapshot,
        enumerable: true,
        configurable: true,
    });

    Object.defineProperty(store, "registerCleanup", {
        value: registerCleanup,
        enumerable: true,
        configurable: true,
    });

    Object.defineProperty(store, "unregisterCleanup", {
        value: unregisterCleanup,
        enumerable: true,
        configurable: true,
    });

    Object.defineProperty(store, "dispose", {
        value: dispose,
        enumerable: true,
        configurable: true,
    });

    Object.defineProperty(store, "isDisposed", {
        value: false,
        enumerable: false,
        configurable: true,
        writable: true,
    });

    // Call onStoreCreated if provided
    if (config.onStoreCreated) {
        config.onStoreCreated(store as any);
    }

    return store as Store<TState, TDerived, TActions>;
}
