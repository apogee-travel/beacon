import ProductList from "./components/ProductList";

function BasicExample() {
    return (
        <>
            <h1 className="page-title">Beacon Store Basic Example</h1>
            <p className="page-description">
                This example shows a basic Beacon store that utilizes local storage middleware -
                loading from (during init) and persisting to local storage as state changes.
            </p>

            <div className="example-container">
                <ProductList />
            </div>
        </>
    );
}

export default BasicExample;
