// example app ReactQueryExample.tsx

import { observer } from "mobx-react-lite";
import { useProductQueryStore } from "./BrqContext";
import ProductListWithQuery from "./components/ProductListWithQuery";

const ReactQueryExample = observer(() => {
    const store = useProductQueryStore();

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
