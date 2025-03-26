/* eslint-disable @typescript-eslint/no-explicit-any */
import { action, computed, observable, toJS } from "mobx";
import type {
    ActionParameters,
    BeaconActions,
    BeaconDerived,
    BeaconState,
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
    const derivedKeys = Object.keys(config.derived || {});

    // Prevent naming conflicts between state and derived values
    for (const key of derivedKeys) {
        if (initialStateKeys.has(key)) {
            throw new Error(`Derived key '${key}' conflicts with state property of the same name`);
        }
    }

    // Create store instance with initial state
    const store = observable({
        ...config.initialState,
    });

    // Add derived (computed) properties
    if (config.derived) {
        for (const key in config.derived) {
            // Create a computed property for each derived value
            const computedValue = computed(() => {
                return config.derived![key](store as any);
            });

            // Add the computed property to the store
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
            actions[key] = action(key, (...args: any[]) => {
                // Wrap in action to ensure changes are tracked properly
                return config.actions![key](
                    store as any,
                    ...(args as ActionParameters<TActions[Extract<keyof TActions, string>]>)
                );
            });
        }
    }

    // Create the getStateSnapshot method
    const getStateSnapshot = (options?: { withDerived?: boolean }) => {
        const snapshot = toJS(store);

        if (config.derived) {
            for (const key in config.derived) {
                if (!options?.withDerived) {
                    delete snapshot[key];
                }
            }
        }

        delete snapshot.actions;

        return snapshot;
    };

    // Add actions and getStateSnapshot to the store
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

    // Call onStoreCreated if provided
    if (config.onStoreCreated) {
        config.onStoreCreated(store as any);
    }

    return store as Store<TState, TDerived, TActions>;
}
