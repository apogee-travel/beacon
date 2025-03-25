import { QueryClient, Query, QueryState } from "@tanstack/react-query";
import { Store, StoreConfig, EmptyDerived, EmptyActions } from "@apogeelabs/beacon";

/**
 * Type for a query's status information
 */
export type QueryStatus = {
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
};

/**
 * Generic type for a store with queries support
 */
export type StoreWithQueries<
    TQueries extends Record<string, QueryStatus>,
    TState extends Record<string, any>,
    TDerived extends Record<string, (state: TState) => any> = EmptyDerived<TState>,
    TActions extends Record<string, (...args: any[]) => any> = EmptyActions,
> = Store<TState, TDerived, TActions> & {
    queries: TQueries;
};

/**
 * Middleware that integrates TanStack Query's data fetching capabilities with Beacon stores.
 *
 * This middleware establishes a connection between Query's cache and a Beacon store,
 * automatically keeping the store in sync with query results. It also adds a `queries`
 * property to the store with loading, error states, and refetch functions.
 *
 * @param options Configuration object containing the QueryClient and query definitions
 * @returns A middleware function that enhances a Beacon store configuration
 */
export function withQuery<
    TQueries extends Record<string, QueryStatus>,
    TState extends Record<string, any>,
    TDerived extends Record<string, (state: TState) => any> = EmptyDerived<TState>,
    TActions extends Record<string, (...args: any[]) => any> = EmptyActions,
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
            // Create a queries container object
            const queries = {} as Record<string, QueryStatus>;

            // For each query, set up state tracking and cache subscriptions
            const unsubscribes = Object.entries(options.queries).map(([queryName, queryConfig]) => {
                // Initialize query status
                queries[queryName] = {
                    loading: true,
                    error: null,
                    refetch: () =>
                        queryClient.refetchQueries({
                            queryKey: queryConfig.queryKey,
                        }),
                };

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

                        // Update loading state based on query state
                        if (queryState.fetchStatus === "fetching") {
                            queries[queryName].loading = true;
                        } else {
                            queries[queryName].loading = false;
                        }

                        // Update error state
                        queries[queryName].error = queryState.error;

                        // Update store data if we have successful data
                        if (queryState.data !== undefined && !queryState.error) {
                            // Apply selector if provided to transform the data
                            const selectedData = queryConfig.selector
                                ? queryConfig.selector(queryState.data)
                                : queryState.data;

                            // Map the query result to store state
                            const stateUpdates = queryConfig.stateMapping(store, selectedData);

                            // Update the store with the mapped data
                            Object.assign(store, stateUpdates);
                        }
                    }
                });

                return unsubscribe;
            });

            // Add the queries object to the store
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
                            if (queries[queryName]) {
                                queries[queryName].error =
                                    error instanceof Error ? error : new Error(String(error));
                                queries[queryName].loading = false;
                            }
                        });
                }
            });

            // Call the original onStoreCreated if it exists
            if (originalOnStoreCreated) {
                originalOnStoreCreated(store);
            }

            // Return a cleanup function
            return () => {
                unsubscribes.forEach(unsubscribe => unsubscribe());
            };
        };

        return enhancedConfig;
    };
}
