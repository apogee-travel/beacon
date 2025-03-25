import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useQueryClient } from "@tanstack/react-query";
import { createProductQueryStore, ProductQueryStore } from "./store/productQueryStore";
import ProductListWithQuery from "./components/ProductListWithQuery";

const ReactQueryExample = observer(() => {
    const queryClient = useQueryClient();

    const [store] = useState(() => createProductQueryStore(queryClient) as ProductQueryStore);

    // Ensure query is executed when page loads
    useEffect(() => {
        store.queries.products.refetch();
    }, [store]);

    return (
        <>
            <h1 className="page-title">Beacon + React Query Integration</h1>
            <p className="page-description">
                This example demonstrates how to integrate react-query with beacon stores via
                middleware for efficient server state management, including loading states, error
                handling, and optimistic updates.
            </p>

            <div className="example-container">
                <ProductListWithQuery store={store} />
            </div>
        </>
    );
});

export default ReactQueryExample;
