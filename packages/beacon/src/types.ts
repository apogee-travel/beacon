/* eslint-disable @typescript-eslint/no-explicit-any */

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
    TState extends Record<string, any>,
    TDerived extends Record<string, (state: TState) => any> = EmptyDerived<TState>,
    TActions extends Record<string, (...args: any[]) => any> = EmptyActions,
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
     */
    onStoreCreated?: (store: Store<TState, TDerived, TActions>) => void;
}

/**
 * Type definition for a complete store instance
 */
export type Store<
    TState extends Record<string, any>,
    TDerived extends Record<string, (state: TState) => any> = EmptyDerived<TState>,
    TActions extends Record<string, (...args: any[]) => any> = EmptyActions,
> = TState & {
    [K in keyof TDerived]: ReturnType<TDerived[K]>;
} & {
    actions: {
        [K in keyof TActions]: (...args: ActionParameters<TActions[K]>) => ReturnType<TActions[K]>;
    };
    getStateSnapshot: (opt?: { withDerived?: boolean }) => TState &
        Partial<{
            [K in keyof TDerived]: ReturnType<TDerived[K]>;
        }>;
};

/**
 * Type helper for middleware functions
 */
export type MiddlewareFunction<
    TState extends Record<string, any>,
    TDerived extends Record<string, (state: TState) => any> = EmptyDerived<TState>,
    TActions extends Record<string, (...args: any[]) => any> = EmptyActions,
    TOptions = any,
> = (
    options: TOptions
) => (config: StoreConfig<TState, TDerived, TActions>) => StoreConfig<TState, TDerived, TActions>;
