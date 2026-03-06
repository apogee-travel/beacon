// @apogeelabs/beacon types.ts

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Constraint type for store state objects.
 * State must be a plain object with string keys — this keeps the observable
 * surface predictable and prevents non-serializable values from sneaking in as top-level keys.
 */
export type BeaconState = Record<string, any>;

/**
 * Constraint type for derived (computed) value definitions.
 * Each entry is a function that receives the current state and returns a derived value.
 * MobX tracks which state properties are accessed so it knows when to recompute.
 */
export type BeaconDerived<TState = BeaconState> = Record<string, (state: TState) => any>;

/**
 * Constraint type for action definitions.
 * Actions always receive the observable state as their first argument — the store injects
 * this so callers never pass state directly. Additional args are forwarded from the call site.
 */
export type BeaconActions<TState = BeaconState> = Record<
    string,
    (state: TState, ...args: any[]) => any
>;

/**
 * Function that handles cleanup when a store is disposed
 * Used by middleware to register disposal handlers
 */
export type CleanupFunction = () => void;

/**
 * Helper type that extracts all parameters of an action function except the first one (state).
 * This allows us to provide proper typing when calling actions from outside the store,
 * where the state parameter is handled internally by the store.
 *
 * @template T The action function type
 * @example
 * // If T is: (state, id: number, name: string) => void
 * // ActionParameters<T> becomes: [id: number, name: string]
 */
export type ActionParameters<T extends (...args: any[]) => any> = T extends (
    state: any,
    ...args: infer P
) => any
    ? P
    : never;

/**
 * Default type for derived state with no actual derivations
 */
export type EmptyDerived<_TState> = Record<string, never>;

/**
 * Default type for empty actions
 */
export type EmptyActions = Record<string, never>;

/**
 * The main configuration interface for creating a store.
 */
export interface StoreConfig<
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState> = EmptyDerived<TState>,
    TActions extends BeaconActions<TState> = EmptyActions,
> {
    /**
     * Initial state values for the store
     */
    initialState: TState;

    /**
     * Computed values derived from the state
     * These are automatically updated when their dependencies change
     */
    derived?: TDerived;

    /**
     * Actions that can modify the state
     * These are functions that receive the state as their first parameter
     */
    actions?: {
        [K in keyof TActions]: (
            state: TState & {
                [K in keyof TDerived]: ReturnType<TDerived[K]>;
            },
            ...args: ActionParameters<TActions[K]>
        ) => ReturnType<TActions[K]>;
    };

    /**
     * Optional callback that is executed after the store is created
     * This is particularly useful for middleware to set up side effects or subscriptions
     * @returns A cleanup function that will be called when the store is disposed (optional)
     */
    onStoreCreated?: (store: Store<TState, TDerived, TActions>) => void;
}

/**
 * Type definition for a complete store instance
 */
export type Store<
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState> = EmptyDerived<TState>,
    TActions extends BeaconActions<TState> = EmptyActions,
> = TState & {
    [K in keyof TDerived]: ReturnType<TDerived[K]>;
} & {
    actions: {
        [K in keyof TActions]: (...args: ActionParameters<TActions[K]>) => ReturnType<TActions[K]>;
    };
    /**
     * Returns a snapshot of the store's state, including derived values (if withDerived is true)
     * This is useful for debugging or persisting the store state
     */
    getStateSnapshot: (opt?: { withDerived?: boolean }) => TState &
        Partial<{
            [K in keyof TDerived]: ReturnType<TDerived[K]>;
        }>;

    /**
     * Registers a function to be called when the store is disposed
     * This allows middleware to clean up resources when the store is no longer needed
     */
    registerCleanup: (cleanupFn: CleanupFunction) => void;

    /**
     * Removes a previously registered cleanup function.
     * If the function was not registered, this is a no-op.
     */
    unregisterCleanup: (cleanupFn: CleanupFunction) => void;

    /**
     * Disposes of the store, cleaning up all resources and preventing memory leaks
     * - Calls all middleware cleanup functions
     * - Cleans up MobX-specific artifacts
     * - Clears store state to prevent zombie references
     * - Marks the store as disposed to prevent further use
     */
    dispose: () => void;

    /**
     * Indicates whether this store has been disposed
     * Used to prevent operating on stores that have been cleaned up
     */
    isDisposed: boolean;
};

/**
 * Type helper for middleware functions.
 *
 * Middleware uses a curried signature: `(options) => (config) => StoreConfig`.
 * The outer function captures middleware-specific options and returns a transformer.
 * The transformer receives the current StoreConfig (possibly already modified by earlier
 * middleware), applies its changes, and passes the result down the chain via `compose`.
 *
 * @example
 * const myMiddleware: MiddlewareFunction<MyState, MyDerived, MyActions, MyOptions> =
 *   (options) => (config) => ({ ...config, initialState: { ...config.initialState, ...hydrated } });
 */
export type MiddlewareFunction<
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState> = EmptyDerived<TState>,
    TActions extends BeaconActions<TState> = EmptyActions,
    TOptions = any,
> = (
    options: TOptions
) => (config: StoreConfig<TState, TDerived, TActions>) => StoreConfig<TState, TDerived, TActions>;
