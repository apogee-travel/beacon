import { useCallback } from "react";
import { Product, productListStore } from "../store/productListStore";

interface ProductListItemProps {
    product: Product;
    isSelected: boolean;
}

function ProductListItem({ product, isSelected }: ProductListItemProps) {
    console.log("Rendering ProductListItem", product.id);
    const handleClick = useCallback(() => {
        console.log("Selected product:", product);
        productListStore.actions.setSelectedProductId(isSelected ? "" : product.id);
    }, [isSelected, product]);

    return (
        <li
            onClick={handleClick}
            style={{
                cursor: "pointer",
                backgroundColor: isSelected ? "#e0e0e0" : "transparent",
                padding: "8px",
                margin: "4px 0",
            }}
        >
            ({product.id}) {product.name} - ${product.price.toFixed(2)} (Qty: {product.qty})
        </li>
    );
}

export default ProductListItem;
