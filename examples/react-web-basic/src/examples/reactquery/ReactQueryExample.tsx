import { useQueryClient } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import ProductListWithQuery from "./components/ProductListWithQuery";
import { createProductQueryStore, ProductQueryStore } from "./store/productQueryStore";

const ReactQueryExample = observer(() => {
    const queryClient = useQueryClient();

    const [store] = useState(() => createProductQueryStore(queryClient) as ProductQueryStore);

    // Optionally ensure query is executed when page loads (the productQueryStore has its
    // middleware configured to automatically fetch products on store creation so this is
    // just shown as an example)
    // useEffect(() => {
    //     store.queries.products();
    // }, [store]);

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
