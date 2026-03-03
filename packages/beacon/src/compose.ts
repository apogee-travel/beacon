// @apogeelabs/beacon compose.ts

import {
    BeaconActions,
    BeaconDerived,
    BeaconState,
    EmptyActions,
    EmptyDerived,
    StoreConfig,
} from "./types";

/**
 * Composes multiple middleware transformers into a single config transformer.
 *
 * Middlewares are applied left-to-right: the first argument in the list processes
 * the config first, and each subsequent middleware receives the output of the previous one.
 * Returns a function that accepts a StoreConfig and produces the fully-transformed StoreConfig,
 * ready to pass to `createStore`.
 *
 * @example
 * const config = compose(withStorage(storageOpts), withLogger(loggerOpts))(baseConfig);
 * const store = createStore(config);
 *
 * @param middlewares Pre-applied middleware functions, i.e. the inner `(config) => StoreConfig`
 *   returned after calling each middleware factory with its options.
 */
export function compose<
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState> = EmptyDerived<TState>,
    TActions extends BeaconActions<TState> = EmptyActions,
>(
    ...middlewares: ((
        config: StoreConfig<TState, TDerived, TActions>
    ) => StoreConfig<TState, TDerived, TActions>)[]
): (config: StoreConfig<TState, TDerived, TActions>) => StoreConfig<TState, TDerived, TActions> {
    return (
        config: StoreConfig<TState, TDerived, TActions>
    ): StoreConfig<TState, TDerived, TActions> => {
        // Each middleware receives the config produced by the previous one,
        // forming a left-to-right transformation pipeline.
        return middlewares.reduce((acc, middleware) => middleware(acc), config);
    };
}
