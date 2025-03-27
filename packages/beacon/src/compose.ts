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
 * Helper function to compose multiple middleware functions together
 *
 * @param middlewares Array of middleware functions to compose
 * @returns A function that applies all middleware in sequence
 */
export function compose<
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState> = EmptyDerived<TState>,
    TActions extends BeaconActions<TState> = EmptyActions,
>(
    ...middlewares: ((
        config: StoreConfig<TState, TDerived, TActions>
    ) => StoreConfig<TState, TDerived, TActions>)[]
) {
    return (
        config: StoreConfig<TState, TDerived, TActions>
    ): StoreConfig<TState, TDerived, TActions> => {
        return middlewares.reduce((acc, middleware) => middleware(acc), config);
    };
}
