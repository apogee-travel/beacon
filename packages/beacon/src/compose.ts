/* eslint-disable @typescript-eslint/no-explicit-any */
import { StoreConfig } from "./types";

/**
 * Helper function to compose multiple middleware functions together
 *
 * @param middlewares Array of middleware functions to compose
 * @returns A function that applies all middleware in sequence
 */
export function compose<
    TState extends Record<string, any>,
    TDerived extends Record<string, (state: TState) => any>,
    TActions extends Record<string, (...args: any[]) => any>,
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
