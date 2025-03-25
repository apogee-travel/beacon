import { QueryClient } from "react-query";
import { Store, StoreConfig, EmptyDerived, EmptyActions } from "@apogeelabs/beacon";

/**
 * Middleware that integrates React Query's data fetching capabilities with Beacon stores.
 *
 * This middleware establishes a connection between React Query's cache and a Beacon store,
 * automatically keeping the store in sync with query results. It also adds loading and
 * error states for each query, as well as refetch actions to the store.
 *
 * @param options Configuration object containing the QueryClient and query definitions
 * @returns A middleware function that enhances a Beacon store configuration
 */
export function withQuery<
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
        string,
        {
            /**
             * Unique identifier for this query in the React Query cache
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
        // Extract QueryClient from options for use in this middleware
        const { queryClient } = options;

        // Preserve the original store configuration
        const enhancedConfig = { ...config };

        // Store the original onStoreCreated lifecycle hook if it exists
        const originalOnStoreCreated = config.onStoreCreated;

        // Override the onStoreCreated lifecycle hook to set up React Query integration
        enhancedConfig.onStoreCreated = (store: Store<TState, TDerived, TActions>) => {
            // For each query, set up state tracking and cache subscriptions
            const unsubscribes = Object.entries(options.queries).map(([queryName, queryConfig]) => {
                // Add loading and error state properties for this query to the store
                // These properties are dynamically added and not part of the original type definition
                (store as any)[`${queryName}Loading`] = true;
                (store as any)[`${queryName}Error`] = null;

                // Subscribe to React Query's cache events for this query
                const unsubscribe = queryClient.getQueryCache().subscribe(event => {
                    // Check if this event is relevant to our query by comparing query keys
                    const isRelevantQuery =
                        event?.query.queryKey.toString() === queryConfig.queryKey.toString();

                    if (isRelevantQuery) {
                        // Handle query result updates
                        if (event.type === "observerResultsUpdated") {
                            // Extract data from the query
                            const data = event.query.state.data;
                            if (data !== undefined) {
                                // Apply selector if provided to transform the data
                                const selectedData = queryConfig.selector
                                    ? queryConfig.selector(data)
                                    : data;

                                // Map the query result to store state using the provided mapping function
                                const stateUpdates = queryConfig.stateMapping(store, selectedData);

                                // Update the store with the mapped data
                                Object.assign(store, stateUpdates);

                                // Update loading and error state
                                (store as any)[`${queryName}Loading`] = false;
                                (store as any)[`${queryName}Error`] = null;
                            }
                        }
                        // Handle error state updates
                        else if (event.type === "queryUpdated" && event.query.state.error) {
                            (store as any)[`${queryName}Loading`] = false;
                            (store as any)[`${queryName}Error`] = event.query.state.error;
                        }
                    }
                });

                // Add a refetch action for this query to the store's actions
                // This allows components to trigger a refetch when needed
                (store.actions as any)[
                    `refetch${queryName.charAt(0).toUpperCase() + queryName.slice(1)}`
                ] = () => queryClient.refetchQueries(queryConfig.queryKey);

                // Return the unsubscribe function for cleanup
                return unsubscribe;
            });

            // Initialize enabled queries when the store is created
            Object.entries(options.queries).forEach(([_, queryConfig]) => {
                if (queryConfig.enabled !== false) {
                    queryClient.prefetchQuery(queryConfig.queryKey, queryConfig.queryFn);
                }
            });

            // Call the original onStoreCreated if it exists to preserve existing behavior
            if (originalOnStoreCreated) {
                originalOnStoreCreated(store);
            }

            // Return a cleanup function that unsubscribes from all query events
            // This helps prevent memory leaks when the store is destroyed
            return () => {
                unsubscribes.forEach(unsubscribe => unsubscribe());
            };
        };

        // Return the enhanced store configuration
        return enhancedConfig;
    };
}
