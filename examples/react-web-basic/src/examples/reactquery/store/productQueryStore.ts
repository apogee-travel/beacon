import { compose, createStore } from "@apogeelabs/beacon";
import { withMutation, withQuery } from "@apogeelabs/beacon-reactquery";
import { QueryClient } from "@tanstack/react-query";
import { Product } from "../../basic/store/productListStore";
import { productApi } from "../services/productApi";

export type ProductQueryState = {
    products: Product[];
    sortBy: "name" | "price" | "qty";
    sortDirection: "asc" | "desc";
    selectedProductId: string | null;
    isProductsLoading: boolean; // Added for query status
    productsError: Error | null; // Added for query error
};

export type ProductQueryComputedState = {
    sortedProducts: (state: ProductQueryState) => Product[];
    selectedProduct: (state: ProductQueryState) => Product | null;
};

export type ProductQueryActions = {
    setSortBy: (state: ProductQueryState, sortBy: "name" | "price" | "qty") => void;
    setSortDirection: (state: ProductQueryState, sortDirection: "asc" | "desc") => void;
    setSelectedProductId: (state: ProductQueryState, id: string) => void;
};

export type ProductQueryMutations = {
    updateProductQty: (params: { id: string; qty: number }) => Promise<Product>;
};

// Define the queries refetch functions type
export type ProductQueryQueries = {
    products: () => Promise<void>;
};

// Factory function to create store with injected QueryClient
export const createProductQueryStore = (queryClient: QueryClient) => {
    return createStore<ProductQueryState, ProductQueryComputedState, ProductQueryActions>(
        compose<ProductQueryState, ProductQueryComputedState, ProductQueryActions>(
            // React Query integration for products query
            withQuery<
                ProductQueryQueries,
                ProductQueryState,
                ProductQueryComputedState,
                ProductQueryActions
            >({
                queryClient,
                queries: {
                    products: {
                        queryKey: ["products"],
                        queryFn: () => productApi.fetchProducts(),
                        stateMapping: (_state, products) => ({
                            products,
                        }),
                        // Map query status to store state properties
                        statusMapping: {
                            loading: "isProductsLoading",
                            error: "productsError",
                        },
                    },
                },
            }),
            // React Query integration for mutations
            withMutation<
                ProductQueryMutations,
                ProductQueryState,
                ProductQueryComputedState,
                ProductQueryActions
            >({
                queryClient,
                mutations: {
                    updateProductQty: {
                        mutationFn: ({ id, qty }) => productApi.updateProductQty(id, qty),
                        onMutate: (state, { id, qty }) => {
                            // Save previous state for potential rollback
                            const previousProducts = [...state.products];

                            // Apply optimistic update
                            const productIndex = state.products.findIndex(p => p.id === id);
                            if (productIndex >= 0) {
                                state.products[productIndex] = {
                                    ...state.products[productIndex],
                                    qty,
                                };
                            }

                            return { previousProducts };
                        },
                        onError: (state, _error, _, context) => {
                            if (context?.previousProducts) {
                                state.products = context.previousProducts;
                            }
                        },
                        invalidateQueries: [["products"]],
                    },
                },
            })
        )({
            initialState: {
                products: [],
                sortBy: "name",
                sortDirection: "asc",
                selectedProductId: null,
                isProductsLoading: false, // Initial loading state
                productsError: null, // Initial error state
            },
            derived: {
                sortedProducts: state => {
                    const sorted = [...state.products];
                    sorted.sort((a, b) => {
                        const sortByField = state.sortBy;
                        const direction = state.sortDirection === "asc" ? 1 : -1;
                        if (sortByField === "name") {
                            return direction * a[sortByField].localeCompare(b[sortByField]);
                        }
                        return direction * (a[sortByField] - b[sortByField]);
                    });
                    return sorted;
                },
                selectedProduct: state => {
                    return state.selectedProductId
                        ? state.products.find(p => p.id === state.selectedProductId) || null
                        : null;
                },
            },
            actions: {
                setSortBy: (state, sortBy) => {
                    state.sortBy = sortBy;
                },
                setSortDirection: (state, sortDirection) => {
                    state.sortDirection = sortDirection;
                },
                setSelectedProductId: (state, id) => {
                    state.selectedProductId = id;
                },
            },
        })
    );
};

// Define a helper type for the complete store with all properties
export type ProductQueryStore = ReturnType<typeof createProductQueryStore> & {
    queries: ProductQueryQueries;
    mutations: ProductQueryMutations;
};
