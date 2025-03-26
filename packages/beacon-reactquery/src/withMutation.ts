/* eslint-disable @typescript-eslint/no-explicit-any */
import { BeaconActions, BeaconDerived, BeaconState, Store, StoreConfig } from "@apogeelabs/beacon";
import { QueryClient } from "@tanstack/react-query";
import { runInAction } from "mobx";

/**
 * Mutation function signature for TanStack Query mutations
 */
export type MutationFunction<TVariables, TResult> = (variables: TVariables) => Promise<TResult>;

/**
 * Generic type for a store with mutations support
 */
export type StoreWithMutations<
    TMutations extends Record<string, (variables: any) => Promise<any>>,
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState>,
    TActions extends BeaconActions<TState>,
> = Store<TState, TDerived, TActions> & {
    mutations: TMutations;
};

/**
 * Middleware that integrates TanStack Query's mutation capabilities with Beacon stores.
 *
 * This middleware adds a new `mutations` property to the store containing functions
 * that perform data mutations via TanStack Query, with support for optimistic updates.
 *
 * @param options Configuration object containing the QueryClient and mutation definitions
 * @returns A middleware function that enhances a Beacon store configuration
 */
export function withMutation<
    TMutations extends Record<string, (variables: any) => Promise<any>>,
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState>,
    TActions extends BeaconActions<TState>,
>(options: {
    /**
     * QueryClient instance that handles caching and mutations
     */
    queryClient: QueryClient;

    /**
     * Collection of mutations to add to this store
     */
    mutations: Record<
        keyof TMutations,
        {
            /**
             * Function that performs the actual API mutation
             */
            mutationFn: (variables: any) => Promise<any>;

            /**
             * Optional function for optimistic updates before the mutation completes
             */
            onMutate?: (
                state: TState & { [K in keyof TDerived]: ReturnType<TDerived[K]> },
                variables: any
            ) => any;

            /**
             * Optional function to handle successful mutations
             */
            onSuccess?: (
                state: TState & { [K in keyof TDerived]: ReturnType<TDerived[K]> },
                data: any,
                variables: any
            ) => void;

            /**
             * Optional function to handle mutation errors (including rolling back optimistic updates)
             */
            onError?: (
                state: TState & { [K in keyof TDerived]: ReturnType<TDerived[K]> },
                error: Error,
                variables: any,
                context: any
            ) => void;

            /**
             * Optional list of query keys to invalidate after a successful mutation
             */
            invalidateQueries?: unknown[][];
        }
    >;
}) {
    return (
        config: StoreConfig<TState, TDerived, TActions>
    ): StoreConfig<TState, TDerived, TActions> => {
        const { queryClient } = options;
        const originalOnStoreCreated = config.onStoreCreated;

        const enhancedOnStoreCreated = (store: Store<TState, TDerived, TActions>) => {
            // Create the mutations container
            const mutations = {} as TMutations;

            // Add mutation functions for each configured mutation
            Object.entries(options.mutations).forEach(([mutationName, mutationConfig]) => {
                (mutations as Record<string, (...args: any[]) => Promise<any>>)[mutationName] =
                    async (variables: any) => {
                        let context: any;

                        // Perform optimistic updates if configured
                        if (mutationConfig.onMutate) {
                            runInAction(() => {
                                context = mutationConfig.onMutate!(store, variables);
                            });
                        }

                        try {
                            // Execute the mutation using TanStack Query's mutationFn
                            const result = await mutationConfig.mutationFn(variables);

                            // Handle successful mutation and any state updates together
                            runInAction(() => {
                                // Apply success handler if provided
                                if (mutationConfig.onSuccess) {
                                    mutationConfig.onSuccess(store, result, variables);
                                }
                            });

                            // Invalidate affected queries to ensure data consistency
                            if (
                                mutationConfig.invalidateQueries &&
                                mutationConfig.invalidateQueries.length > 0
                            ) {
                                await Promise.all(
                                    mutationConfig.invalidateQueries.map(queryKey =>
                                        queryClient.invalidateQueries({
                                            queryKey: queryKey,
                                        })
                                    )
                                );
                            }

                            return result;
                        } catch (error) {
                            // Handle mutation errors
                            if (mutationConfig.onError) {
                                const typedError =
                                    error instanceof Error ? error : new Error(String(error));

                                runInAction(() => {
                                    mutationConfig.onError!(store, typedError, variables, context);
                                });
                            }
                            throw error;
                        }
                    };
            });

            // Add the mutations object to the store
            Object.defineProperty(store, "mutations", {
                value: mutations,
                enumerable: true,
                configurable: false,
            });

            // Call the original onStoreCreated if it exists
            if (originalOnStoreCreated) {
                originalOnStoreCreated(store);
            }

            // Return a cleanup function if needed
            return () => {
                // Any cleanup logic would go here
            };
        };

        // Return the enhanced store configuration
        return {
            ...config,
            onStoreCreated: enhancedOnStoreCreated,
        };
    };
}
