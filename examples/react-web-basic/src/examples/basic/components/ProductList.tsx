import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { Product, productListStore } from "../store/productListStore";
import ProductListItem from "./ProductListItem";

const ProductList = observer(() => {
    const { sortedProducts, sortBy, sortDirection, selectedProduct, selectedProductId } =
        productListStore;
    console.log("ProductList render");

    const handleSortByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        console.log("handleSortByChange", e.target.value);
        productListStore.actions.setSortBy(e.target.value as "name" | "price" | "qty");
    };

    const handleSortDirectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        console.log("handleSortDirectionChange", e.target.value);
        productListStore.actions.setSortDirection(e.target.value as "asc" | "desc");
    };

    // Simulate fetching products
    const loadSampleData = () => {
        const sampleProducts: Product[] = [
            { id: "1", name: "Laptop", price: 999.99, qty: 5 },
            { id: "2", name: "Mouse", price: 29.99, qty: 50 },
            { id: "3", name: "Keyboard", price: 59.99, qty: 20 },
        ];
        productListStore.actions.setProducts(sampleProducts);
    };

    useEffect(() => {
        console.log("STATE SNAPSHOT", productListStore.getStateSnapshot());
    }, [sortedProducts, sortBy, sortDirection, selectedProduct, selectedProductId]);

    return (
        <div>
            <h2>Product List</h2>

            {/* Sort Controls */}
            <div style={{ marginBottom: "16px" }}>
                <label>
                    Sort By:
                    <select value={sortBy} onChange={handleSortByChange}>
                        <option value="name">Name</option>
                        <option value="price">Price</option>
                        <option value="qty">Quantity</option>
                    </select>
                </label>
                <label style={{ marginLeft: "16px" }}>
                    Direction:
                    <select value={sortDirection} onChange={handleSortDirectionChange}>
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                    </select>
                </label>
                <button onClick={loadSampleData} style={{ marginLeft: "16px" }}>
                    Load Sample Data
                </button>
            </div>

            {/* Product List */}
            <ul style={{ listStyle: "none", padding: 0 }}>
                {sortedProducts.map(product => (
                    <ProductListItem
                        key={product.id}
                        product={product}
                        isSelected={selectedProductId === product.id}
                    />
                ))}
            </ul>

            {/* Selected Product Details */}
            {selectedProduct ? (
                <div className="card">
                    <div style={{ marginTop: "16px" }}>
                        <h3>Selected Product</h3>
                        <p>Name: {selectedProduct.name}</p>
                        <p>Price: ${selectedProduct.price.toFixed(2)}</p>
                        <p>Quantity: {selectedProduct.qty}</p>
                    </div>
                </div>
            ) : (
                <p style={{ marginTop: "16px" }}>No product selected</p>
            )}
        </div>
    );
});

export default ProductList;
