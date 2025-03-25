import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { ProductQueryStore } from "../store/productQueryStore";

interface ProductListWithQueryProps {
    store: ProductQueryStore;
}

const ProductListWithQuery = observer(({ store }: ProductListWithQueryProps) => {
    // get state and actions from the store
    const { sortedProducts, sortBy, sortDirection, selectedProduct } = store;

    // Access query status from the queries property
    const {
        loading: productsLoading,
        error: productsError,
        refetch: refetchProducts,
    } = store.queries.products;

    const { setSortBy, setSortDirection, setSelectedProductId } = store.actions;

    // Access mutations from the mutations property
    const { updateProductQty } = store.mutations;

    // Local state for quantity input
    const [qtyInput, setQtyInput] = useState<number | "">("");

    // Reset quantity input when selected product changes
    useEffect(() => {
        if (selectedProduct) {
            setQtyInput(selectedProduct.qty);
        } else {
            setQtyInput("");
        }
    }, [selectedProduct]);

    // Handle quantity update
    const handleUpdateQty = async () => {
        if (selectedProduct && qtyInput !== "") {
            try {
                await updateProductQty({
                    id: selectedProduct.id,
                    qty: Number(qtyInput),
                });
            } catch (error) {
                console.error("Failed to update quantity:", error);
            }
        }
    };

    if (productsError) {
        return (
            <div className="error-message">
                <span>Error loading products:</span> {productsError.message}
            </div>
        );
    }

    if (productsLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading products...</p>
            </div>
        );
    }

    return (
        <div className="product-list-container">
            <div className="controls">
                <div className="sort-controls">
                    <label>
                        Sort by:
                        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
                            <option value="name">Name</option>
                            <option value="price">Price</option>
                            <option value="qty">Quantity</option>
                        </select>
                    </label>
                    <label>
                        Direction:
                        <select
                            value={sortDirection}
                            onChange={e => setSortDirection(e.target.value as any)}
                        >
                            <option value="asc">Ascending</option>
                            <option value="desc">Descending</option>
                        </select>
                    </label>
                </div>
                <button onClick={() => refetchProducts()} disabled={productsLoading}>
                    {productsLoading ? "Loading..." : "Refresh Products"}
                </button>
            </div>

            <div className="product-list">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Price</th>
                            <th>Quantity</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedProducts.map(product => (
                            <tr
                                key={product.id}
                                className={selectedProduct?.id === product.id ? "selected" : ""}
                            >
                                <td>{product.name}</td>
                                <td>${product.price.toFixed(2)}</td>
                                <td>{product.qty}</td>
                                <td>
                                    <button onClick={() => setSelectedProductId(product.id)}>
                                        Select
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedProduct && (
                <div className="product-detail">
                    <h3>Update Quantity for {selectedProduct.name}</h3>
                    <div className="qty-control">
                        <input
                            type="number"
                            value={qtyInput}
                            onChange={e =>
                                setQtyInput(e.target.value ? Number(e.target.value) : "")
                            }
                            min="0"
                        />
                        <button
                            onClick={handleUpdateQty}
                            disabled={qtyInput === "" || qtyInput === selectedProduct.qty}
                        >
                            Update Quantity
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

export default ProductListWithQuery;
