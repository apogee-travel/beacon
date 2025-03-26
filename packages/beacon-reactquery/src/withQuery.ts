/* eslint-disable @typescript-eslint/no-explicit-any */
import { BeaconActions, BeaconDerived, BeaconState, Store, StoreConfig } from "@apogeelabs/beacon";
import { Query, QueryClient, QueryState } from "@tanstack/react-query";
import { runInAction } from "mobx";

/**
 * Type for a query's refetch function
 */
export type QueryRefetch = () => Promise<void>;

/**
 * Status mapping configuration - can be property names or setter functions
 */
export type StatusMapping = {
    loading?: string | ((state: any, isLoading: boolean) => void);
    error?: string | ((state: any, error: Error | null) => void);
};

/**
 * Helper type that describes what a store will look like after
 * the withQuery middleware has been applied and the store has been created.
 * This is not the return type of the middleware itself.
 */
export type StoreWithQueries<
    TQueries extends Record<string, QueryRefetch>,
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState>,
    TActions extends BeaconActions<TState>,
> = Store<TState, TDerived, TActions> & {
    queries: TQueries;
};

/**
 * Middleware that integrates TanStack Query's data fetching capabilities with Beacon stores.
 *
 * This middleware connects React Query to Beacon stores, mapping query results and status
 * directly to store state properties. It only uses a minimal queries property for refetch functions.
 *
 * @param options Configuration object containing the QueryClient and query definitions
 * @returns A middleware function that enhances a Beacon store configuration
 */
export function withQuery<
    TQueries extends Record<string, QueryRefetch>,
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState>,
    TActions extends BeaconActions<TState>,
>(options: {
    /**
     * QueryClient instance that handles caching and data fetching
     */
    queryClient: QueryClient;

    /**
     * Collection of queries to connect to this store
     */
    queries: Record<
        keyof TQueries,
        {
            /**
             * Unique identifier for this query in the Query cache
             */
            queryKey: unknown[];

            /**
             * Function that performs the actual data fetching
             */
            queryFn: () => Promise<any>;

            /**
             * Optional transformer for query results before they update the store
             */
            selector?: (data: any) => any;

            /**
             * Whether this query should be executed immediately when the store is created
             */
            enabled?: boolean;

            /**
             * Function that determines how query results map to store state
             */
            stateMapping: (
                state: TState & {
                    [K in keyof TDerived]: ReturnType<TDerived[K]>;
                },
                queryResult: any
            ) => Partial<TState>;

            /**
             * Configuration for mapping query status to store state
             */
            statusMapping?: StatusMapping;
        }
    >;
}) {
    return (
        config: StoreConfig<TState, TDerived, TActions>
    ): StoreConfig<TState, TDerived, TActions> => {
        const { queryClient } = options;
        const enhancedConfig = { ...config };
        const originalOnStoreCreated = config.onStoreCreated;

        enhancedConfig.onStoreCreated = (store: Store<TState, TDerived, TActions>) => {
            // Create a queries container with only refetch functions
            const queries = {} as TQueries;

            // For each query, set up state tracking and cache subscriptions
            const unsubscribes = Object.entries(options.queries).map(([queryName, queryConfig]) => {
                // Add refetch function to queries object
                (queries as Record<string, QueryRefetch>)[queryName] = () =>
                    queryClient.refetchQueries({
                        queryKey: queryConfig.queryKey,
                    });

                // Set initial loading and error states in store if configured
                runInAction(() => {
                    // Handle loading state
                    if (queryConfig.statusMapping?.loading) {
                        const loadingMapping = queryConfig.statusMapping.loading;
                        if (typeof loadingMapping === "string") {
                            (store as any)[loadingMapping] = true;
                        } else if (typeof loadingMapping === "function") {
                            loadingMapping(store, true);
                        }
                    }

                    // Handle error state
                    if (queryConfig.statusMapping?.error) {
                        const errorMapping = queryConfig.statusMapping.error;
                        if (typeof errorMapping === "string") {
                            (store as any)[errorMapping] = null;
                        } else if (typeof errorMapping === "function") {
                            errorMapping(store, null);
                        }
                    }
                });

                // Helper to check if a query matches our query key
                const queryMatches = (query: Query<unknown, unknown>) => {
                    return (
                        JSON.stringify(query.options.queryKey) ===
                        JSON.stringify(queryConfig.queryKey)
                    );
                };

                // Subscribe to TanStack Query's cache events for this query
                const unsubscribe = queryClient.getQueryCache().subscribe(event => {
                    if (!event.query) return;

                    if (queryMatches(event.query)) {
                        const queryState = event.query.state as QueryState<any, Error>;

                        // Update loading and error states in store if configured
                        runInAction(() => {
                            // Handle loading state
                            if (queryConfig.statusMapping?.loading) {
                                const loadingMapping = queryConfig.statusMapping.loading;
                                const isLoading = queryState.fetchStatus === "fetching";

                                if (typeof loadingMapping === "string") {
                                    (store as any)[loadingMapping] = isLoading;
                                } else if (typeof loadingMapping === "function") {
                                    loadingMapping(store, isLoading);
                                }
                            }

                            // Handle error state
                            if (queryConfig.statusMapping?.error) {
                                const errorMapping = queryConfig.statusMapping.error;

                                if (typeof errorMapping === "string") {
                                    (store as any)[errorMapping] = queryState.error;
                                } else if (typeof errorMapping === "function") {
                                    errorMapping(store, queryState.error);
                                }
                            }
                        });

                        // Update store data if we have successful data
                        if (queryState.data !== undefined && !queryState.error) {
                            // Apply selector if provided to transform the data
                            const selectedData = queryConfig.selector
                                ? queryConfig.selector(queryState.data)
                                : queryState.data;

                            // Map the query result to store state
                            const stateUpdates = queryConfig.stateMapping(store, selectedData);

                            // Update the store with the mapped data
                            runInAction(() => {
                                Object.assign(store, stateUpdates);
                            });
                        }
                    }
                });

                return unsubscribe;
            });

            // Add the queries object to the store (only with refetch functions)
            Object.defineProperty(store, "queries", {
                value: queries,
                enumerable: true,
                configurable: false,
            });

            // Initialize enabled queries when the store is created
            Object.entries(options.queries).forEach(([queryName, queryConfig]) => {
                if (queryConfig.enabled !== false) {
                    // Use fetchQuery to immediately execute the query
                    queryClient
                        .fetchQuery({
                            queryKey: queryConfig.queryKey,
                            queryFn: queryConfig.queryFn,
                        })
                        .catch(error => {
                            console.error(`Error fetching query "${queryName}":`, error);

                            // Update loading and error states in store if configured
                            runInAction(() => {
                                // Handle error state
                                if (queryConfig.statusMapping?.error) {
                                    const errorMapping = queryConfig.statusMapping.error;
                                    const typedError =
                                        error instanceof Error ? error : new Error(String(error));

                                    if (typeof errorMapping === "string") {
                                        (store as any)[errorMapping] = typedError;
                                    } else if (typeof errorMapping === "function") {
                                        errorMapping(store, typedError);
                                    }
                                }

                                // Handle loading state
                                if (queryConfig.statusMapping?.loading) {
                                    const loadingMapping = queryConfig.statusMapping.loading;

                                    if (typeof loadingMapping === "string") {
                                        (store as any)[loadingMapping] = false;
                                    } else if (typeof loadingMapping === "function") {
                                        loadingMapping(store, false);
                                    }
                                }
                            });
                        });
                }
            });

            // Call the original onStoreCreated if it exists
            if (originalOnStoreCreated) {
                originalOnStoreCreated(store);
            }

            // Return a cleanup function
            // Usage of this would need to be implemented in cleanup middleware that runs after this one
            return () => {
                unsubscribes.forEach(unsubscribe => unsubscribe());
            };
        };

        return enhancedConfig;
    };
}
