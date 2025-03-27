// example app productApi.tsx

import { Product } from "../../basic/store/productListStore";

// Mock product data
const mockProducts: Product[] = [
    { id: "1", name: "Laptop", price: 1299, qty: 10 },
    { id: "2", name: "Smartphone", price: 699, qty: 25 },
    { id: "3", name: "Headphones", price: 199, qty: 50 },
    { id: "4", name: "Monitor", price: 349, qty: 15 },
    { id: "5", name: "Keyboard", price: 89, qty: 30 },
];

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const productApi = {
    // Fetch all products
    fetchProducts: async (): Promise<Product[]> => {
        console.log("Simulating fetchProducts API call");
        await delay(800); // Simulate network delay
        return [...mockProducts];
    },

    // Update product quantity
    updateProductQty: async (id: string, qty: number): Promise<Product> => {
        console.log("Simulating updateProductQty API call");
        await delay(600); // Simulate network delay

        const product = mockProducts.find(p => p.id === id);
        if (!product) {
            throw new Error(`Product with id ${id} not found`);
        }

        product.qty = qty;
        return { ...product };
    },
};
