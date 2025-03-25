import { QueryClient } from "react-query";
import { EmptyActions, EmptyDerived, StoreConfig } from "@apogeelabs/beacon";

/**
 * Middleware that integrates React Query's mutation capabilities with Beacon stores.
 *
 * This middleware adds actions to a Beacon store that perform mutations (data changes)
 * via React Query. It supports optimistic updates, success/error handling, and query
 * invalidation to ensure UI consistency.
 *
 * @param options Configuration object containing the QueryClient and mutation definitions
 * @returns A middleware function that enhances a Beacon store configuration
 */
export function withMutation<
    TState extends Record<string, any>,
    TDerived extends Record<string, (state: TState) => any> = EmptyDerived<TState>,
    TActions extends Record<string, (...args: any[]) => any> = EmptyActions,
>(options: {
    /**
     * QueryClient instance that handles caching and mutations
     */
    queryClient: QueryClient;

    /**
     * Collection of mutations to add to this store
     */
    mutations: Record<
        string,
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
        // Extract QueryClient from options for use in this middleware
        const { queryClient } = options;

        // Preserve the original store actions
        const originalActions = config.actions || {};

        // Create a new actions object that extends the original actions
        // This type allows us to add new actions dynamically
        const enhancedActions = { ...originalActions } as {
            [K in keyof TActions | string]: (...args: any[]) => any;
        };

        // Add mutation actions for each configured mutation
        Object.entries(options.mutations).forEach(([mutationName, mutationConfig]) => {
            // Create an action with the name specified in the mutations config
            (enhancedActions as Record<string, (...args: any[]) => any>)[mutationName] = async (
                state: TState & { [K in keyof TDerived]: ReturnType<TDerived[K]> },
                ...args: any[]
            ) => {
                // Extract the variables (data to mutate) from the action parameters
                const variables = args[0];
                let context;

                // Perform optimistic updates if configured
                // This updates the UI immediately before the server responds
                if (mutationConfig.onMutate) {
                    context = mutationConfig.onMutate(state, variables);
                }

                try {
                    // Execute the actual mutation (e.g., API call)
                    const result = await mutationConfig.mutationFn(variables);

                    // Handle successful mutation
                    if (mutationConfig.onSuccess) {
                        mutationConfig.onSuccess(state, result, variables);
                    }

                    // Invalidate affected queries to ensure data consistency
                    // This forces dependent queries to refetch their data
                    if (mutationConfig.invalidateQueries) {
                        mutationConfig.invalidateQueries.forEach(queryKey => {
                            queryClient.invalidateQueries(queryKey);
                        });
                    }

                    return result;
                } catch (error) {
                    // Handle mutation errors
                    if (mutationConfig.onError) {
                        // Ensure error is of type Error for consistent error handling
                        const typedError =
                            error instanceof Error ? error : new Error(String(error));

                        // Call the error handler with the context from onMutate
                        // This allows rolling back optimistic updates
                        mutationConfig.onError(state, typedError, variables, context);
                    }

                    // Re-throw the error for handling up the call stack
                    throw error;
                }
            };
        });

        // Return the enhanced store configuration with new mutation actions
        return {
            ...config,
            actions: enhancedActions as any, // Cast back to expected type
        };
    };
}
