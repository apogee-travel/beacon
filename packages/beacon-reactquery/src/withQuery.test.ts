import { QueryClient } from "@tanstack/react-query";
import { QueryStatus, withQuery } from "./withQuery";
import { StoreConfig } from "@apogeelabs/beacon";

export type ProductQueryState = {
    products: any[];
};

export type ProductQueryComputedState = {
    productCount: (state: ProductQueryState) => number;
};

export type ProductQueryActions = {};

export type ProductQueryQueries = {
    products: QueryStatus;
};

describe("withQuery", () => {
    let mockApi: any,
        origOnStoreCreated: any,
        mockStore: any,
        mockQueryClient: any,
        mockQueryCache: any;

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.resetModules();
        mockStore = {};
        origOnStoreCreated = jest.fn();
        mockApi = {
            fetchProducts: jest.fn(),
        };
        mockQueryCache = {
            subscribe: jest.fn(),
        };
        mockQueryClient = {
            refetchQueries: jest.fn(),
            getQueryCache: jest.fn().mockReturnValue(mockQueryCache),
            fetchQuery: jest.fn().mockResolvedValue({}),
        };
    });

    describe("when the event doesn't have a query property", () => {
        let mockSelector: any;

        beforeEach(() => {
            mockQueryCache.subscribe.mockImplementation((cb: any) => {
                cb({});
            });
            mockSelector = jest.fn();
            const mwFn = withQuery<
                ProductQueryQueries,
                ProductQueryState,
                ProductQueryComputedState,
                ProductQueryActions
            >({
                queryClient: mockQueryClient,
                queries: {
                    products: {
                        queryKey: ["products"],
                        queryFn: () => mockApi.fetchProducts(),
                        stateMapping: (_state, products) => {
                            return { products };
                        },
                        selector: mockSelector,
                    },
                },
            });
            const cfg = mwFn({
                initialState: {
                    products: [],
                },
                derived: {
                    productCount: state => {
                        return state.products.length;
                    },
                },
                actions: {},
                onStoreCreated: origOnStoreCreated,
            });
            cfg.onStoreCreated!(mockStore as any);
        });

        it("should not call the selector", () => {
            expect(mockSelector).not.toHaveBeenCalled();
        });
    });

    describe("when the event doesn't have a matching query", () => {
        let mockSelector: any;

        beforeEach(() => {
            mockQueryCache.subscribe.mockImplementation((cb: any) => {
                cb({ query: { options: { queryKey: ["CALZONE"] } } });
            });
            mockSelector = jest.fn();
            const mwFn = withQuery<
                ProductQueryQueries,
                ProductQueryState,
                ProductQueryComputedState,
                ProductQueryActions
            >({
                queryClient: mockQueryClient,
                queries: {
                    products: {
                        queryKey: ["products"],
                        queryFn: () => mockApi.fetchProducts(),
                        stateMapping: (_state, products) => {
                            return { products };
                        },
                        selector: mockSelector,
                    },
                },
            });
            const cfg = mwFn({
                initialState: {
                    products: [],
                },
                derived: {
                    productCount: state => {
                        return state.products.length;
                    },
                },
                actions: {},
                onStoreCreated: origOnStoreCreated,
            });
            cfg.onStoreCreated!(mockStore as any);
        });

        it("should not call the selector", () => {
            expect(mockSelector).not.toHaveBeenCalled();
        });
    });

    describe("when the query is fetching", () => {
        beforeEach(() => {
            mockQueryCache.subscribe.mockImplementation((cb: any) => {
                cb({
                    query: {
                        options: {
                            queryKey: ["products"],
                        },
                        state: {
                            fetchStatus: "fetching",
                        },
                    },
                });
            });
            const mwFn = withQuery<
                ProductQueryQueries,
                ProductQueryState,
                ProductQueryComputedState,
                ProductQueryActions
            >({
                queryClient: mockQueryClient,
                queries: {
                    products: {
                        queryKey: ["products"],
                        queryFn: () => mockApi.fetchProducts(),
                        stateMapping: (_state, products) => {
                            return { products };
                        },
                    },
                },
            });
            const cfg = mwFn({
                initialState: {
                    products: [],
                },
                derived: {
                    productCount: state => {
                        return state.products.length;
                    },
                },
                actions: {},
                onStoreCreated: origOnStoreCreated,
            });
            cfg.onStoreCreated!(mockStore as any);
            console.info("MOCK STORE", mockStore);
        });

        it("should call the original onStoreCreated callback with the store instance", () => {
            expect(origOnStoreCreated).toHaveBeenCalledTimes(1);
            expect(origOnStoreCreated).toHaveBeenCalledWith(mockStore);
        });

        it("should call refetchQueries on the queryClient when refetch is invokved", async () => {
            await mockStore.queries.products.refetch();
            expect(mockQueryClient.refetchQueries).toHaveBeenCalledTimes(1);
            expect(mockQueryClient.refetchQueries).toHaveBeenCalledWith({
                queryKey: ["products"],
            });
        });
    });

    describe("when the query is idle", () => {
        describe("and it has a state selector", () => {
            beforeEach(() => {
                mockQueryCache.subscribe.mockImplementation((cb: any) => {
                    cb({
                        query: {
                            options: {
                                queryKey: ["products"],
                            },
                            state: {
                                fetchStatus: "idle",
                                data: {
                                    items: ["ITEM1", "ITEM2"],
                                },
                            },
                        },
                    });
                });
                const mwFn = withQuery<
                    ProductQueryQueries,
                    ProductQueryState,
                    ProductQueryComputedState,
                    ProductQueryActions
                >({
                    queryClient: mockQueryClient,
                    queries: {
                        products: {
                            queryKey: ["products"],
                            queryFn: () => mockApi.fetchProducts(),
                            stateMapping: (_state, products) => {
                                return { products };
                            },
                            selector: (data: any) => {
                                return data.items;
                            },
                        },
                    },
                });
                const cfg = mwFn({
                    initialState: {
                        products: [],
                    },
                    derived: {
                        productCount: state => {
                            return state.products.length;
                        },
                    },
                    actions: {},
                    onStoreCreated: origOnStoreCreated,
                });
                cfg.onStoreCreated!(mockStore as any);
                console.info("MOCK STORE", mockStore);
            });

            it("should call the original onStoreCreated callback with the store instance", () => {
                expect(origOnStoreCreated).toHaveBeenCalledTimes(1);
                expect(origOnStoreCreated).toHaveBeenCalledWith(mockStore);
            });

            it("should call refetchQueries on the queryClient when refetch is invokved", async () => {
                await mockStore.queries.products.refetch();
                expect(mockQueryClient.refetchQueries).toHaveBeenCalledTimes(1);
                expect(mockQueryClient.refetchQueries).toHaveBeenCalledWith({
                    queryKey: ["products"],
                });
            });

            it("should set the state on the store", () => {
                expect(mockStore.products).toEqual(["ITEM1", "ITEM2"]);
            });
        });
    });
});
