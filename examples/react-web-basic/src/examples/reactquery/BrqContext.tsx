// example app BrqContext.tsx

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, ReactNode, useContext } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createProductQueryStore, ProductQueryStore } from "./store/productQueryStore";

const ProductQueryStoreContext = createContext<ProductQueryStore | null>(null);

interface StoreProviderProps {
    children: ReactNode;
}

export const ProductQueryStoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
    const queryClient = useQueryClient();

    const [store] = React.useState(() => {
        const store = createProductQueryStore(queryClient) as ProductQueryStore;

        return store;
    });

    return (
        <ProductQueryStoreContext.Provider value={store}>
            {children}
        </ProductQueryStoreContext.Provider>
    );
};

export const useProductQueryStore = (): ProductQueryStore => {
    const context = useContext(ProductQueryStoreContext);
    if (context === null) {
        throw new Error("useProductQueryStore must be used within a ProductQueryStoreProvider");
    }
    return context;
};
