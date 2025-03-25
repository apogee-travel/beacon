import { compose, createStore } from "@apogeelabs/beacon";
import { browserStorageMiddleware } from "@apogeelabs/beacon-browserstorage";

export interface Product {
    id: string;
    name: string;
    price: number;
    qty: number;
}

export type ProductListState = {
    products: Product[];
    sortBy: "name" | "price" | "qty";
    sortDirection: "asc" | "desc";
    selectedProductId: string | null;
};

export type ProductListComputedState = {
    sortedProducts: (state: ProductListState) => Product[];
    selectedProduct: (state: ProductListState) => Product | null;
};

export type ProductListActions = {
    setProducts: (state: ProductListState, products: Product[]) => void;
    setSortBy: (state: ProductListState, sortBy: "name" | "price" | "qty") => void;
    setSortDirection: (state: ProductListState, sortDirection: "asc" | "desc") => void;
    setSelectedProductId: (state: ProductListState, id: string) => void;
};

export const productListStore = createStore<
    ProductListState,
    ProductListComputedState,
    ProductListActions
>(
    compose<ProductListState, ProductListComputedState, ProductListActions>(
        browserStorageMiddleware({ key: "productListStore" })
    )({
        initialState: {
            products: [],
            sortBy: "name",
            sortDirection: "asc",
            selectedProductId: null,
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
                    ? state.products.find((p: Product) => p.id === state.selectedProductId) || null
                    : null;
            },
        },
        actions: {
            setProducts: (state, products) => {
                state.products = products;
            },
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
