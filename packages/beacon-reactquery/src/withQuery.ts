// @apogeelabs/beacon-reactquery withQuery.ts

/* eslint-disable @typescript-eslint/no-explicit-any */
import { BeaconActions, BeaconDerived, BeaconState, Store, StoreConfig } from "@apogeelabs/beacon";
import { QueryClient, QueryState } from "@tanstack/react-query";
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

// @apogeelabs/beacon-reactquery withQuery.ts

/* ... existing imports ... */

// Add new options type for initial loading state
export type InitialQueriesLoadingOptions = {
    /**
     * Name of the property to track initial loading state
     * This boolean property will be true while initial queries are loading
     * and will become false when all enabled initial queries complete
     */
    propertyName: string;

    /**
     * Optional callback fired when all initial queries complete
     */
    onComplete?: (store: any) => void;
};

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
            queryKey: unknown[];
            queryFn: () => Promise<any>;
            selector?: (data: any) => any;
            enabled?: boolean;
            stateMapping: (
                state: TState & {
                    [K in keyof TDerived]: ReturnType<TDerived[K]>;
                },
                queryResult: any
            ) => Partial<TState>;
            statusMapping?: StatusMapping;
        }
    >;

    /**
     * Configuration for tracking initial queries loading state
     * When provided, a boolean property will be added to track loading
     */
    initialQueriesLoading?: InitialQueriesLoadingOptions;
}) {
    return (
        config: StoreConfig<TState, TDerived, TActions>
    ): StoreConfig<TState, TDerived, TActions> => {
        const { queryClient } = options;
        const enhancedConfig = { ...config };
        const originalOnStoreCreated = config.onStoreCreated;

        // Add the initial loading property to state if configured
        if (options.initialQueriesLoading?.propertyName) {
            const propName = options.initialQueriesLoading.propertyName;
            enhancedConfig.initialState = {
                ...enhancedConfig.initialState,
                [propName]: true, // Start with loading state
            };
        }

        enhancedConfig.onStoreCreated = (store: Store<TState, TDerived, TActions>) => {
            // Create a queries container with refetch functions
            const queries = {} as TQueries;

            // Set up state tracking and cache subscriptions
            const unsubscribes = Object.entries(options.queries).map(([queryName, queryConfig]) => {
                // Add refetch function to queries object (we may want to refactor this to be an explictly named function on an object here)
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

                // Subscribe to cache events for this query
                const unsubscribe = queryClient.getQueryCache().subscribe(event => {
                    if (!event.query) return;

                    // Skip processing for disposed stores
                    if ((store as any).isDisposed) return;

                    const queryMatches =
                        JSON.stringify(event.query.options.queryKey) ===
                        JSON.stringify(queryConfig.queryKey);

                    if (queryMatches) {
                        const queryState = event.query.state as QueryState<any, Error>;

                        // Update loading and error states in store
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
                            // Apply selector if provided
                            const selectedData = queryConfig.selector
                                ? queryConfig.selector(queryState.data)
                                : queryState.data;

                            // Map the query result to store state
                            // Another potential refactor point here - we may want to
                            // have state set explicitly in the state mapping vs returning
                            // here and having it assigned below
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

            // Add the queries object to the store
            Object.defineProperty(store, "queries", {
                value: queries,
                enumerable: true,
                configurable: false,
            });

            // Handle initial queries loading state tracking
            const initialLoadingProp = options.initialQueriesLoading?.propertyName;
            const enabledQueries = Object.entries(options.queries).filter(
                ([_name, config]) => config.enabled !== false
            );

            // Set up promise tracking for enabled queries
            if (initialLoadingProp && enabledQueries.length > 0) {
                // Create a counter to track query completion
                let pendingQueries = enabledQueries.length;

                // Handle query completion
                const onQueryComplete = () => {
                    pendingQueries--;

                    // If all queries have completed, update loading state
                    if (pendingQueries <= 0 && !(store as any).isDisposed) {
                        runInAction(() => {
                            // Update loading state to false
                            (store as any)[initialLoadingProp] = false;

                            // Call completion callback if configured
                            if (options.initialQueriesLoading?.onComplete) {
                                options.initialQueriesLoading.onComplete(store);
                            }
                        });
                    }
                };

                // Initialize queries and track their completion
                enabledQueries.forEach(([queryName, queryConfig]) => {
                    queryClient
                        .fetchQuery({
                            queryKey: queryConfig.queryKey,
                            queryFn: queryConfig.queryFn,
                        })
                        .then(() => {
                            onQueryComplete();
                        })
                        .catch(error => {
                            console.error(`Error fetching query "${queryName}":`, error);
                            onQueryComplete(); // Still mark as complete even if there was an error
                        });
                });
            }
            // If no enabled queries but initialLoadingProp is set, mark as complete immediately
            else if (initialLoadingProp) {
                runInAction(() => {
                    (store as any)[initialLoadingProp] = false;

                    if (options.initialQueriesLoading?.onComplete) {
                        options.initialQueriesLoading.onComplete(store);
                    }
                });
            }

            // Register cleanup function directly using the new method
            store.registerCleanup(() => {
                // Unsubscribe from all query cache subscriptions
                unsubscribes.forEach(unsubscribe => unsubscribe());
            });

            // Call the original onStoreCreated if it exists
            if (originalOnStoreCreated) {
                originalOnStoreCreated(store);
            }
        };

        return enhancedConfig;
    };
}
