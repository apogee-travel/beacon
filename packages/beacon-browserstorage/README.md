# Beacon Browser Storage v0.1.0

This lib is a middleware wrapper that lets you:

- load initial state from local or session storage
- persist store state to local or session storage as the state changes

Example usage:

```typescript
// the browserStorageMiddleware call below will load the store's state from the object serialized to the "productListStore"
// key in localStorage (if it exists). Local storage is the default, but it could be changed to use session storage if the
// call was changed to browserStorageMiddleware({ key: "productListStore", storageType: "session" })
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
            // derived state methods
        },
        actions: {
            // action methods
        },
    })
);
```

A running example of this middleware exists in the examples/react-web-basic directory.
