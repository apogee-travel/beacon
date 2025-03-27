/* eslint-disable @typescript-eslint/no-explicit-any */
export type ProductQueryState = {
    products: any[];
    isProductsLoading: boolean;
    productsError: Error | null;
};

export type ProductQueryComputedState = {
    productCount: (state: ProductQueryState) => number;
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ProductQueryActions = {};

export type ProductQueryQueries = {
    products: () => Promise<void>;
};

const mockRunInAction = jest.fn();
jest.mock("mobx", () => {
    return {
        runInAction: mockRunInAction,
    };
});

import { withQuery } from "./withQuery";

describe.skip("withQuery", () => {
    let mockApi: any,
        origOnStoreCreated: any,
        mockStore: any,
        mockQueryClient: any,
        mockQueryCache: any,
        origConsoleErr: any;

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.resetModules();
        origConsoleErr = console.error;
        console.error = jest.fn();
        mockRunInAction.mockImplementation(cb => cb());
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

    afterEach(() => {
        console.error = origConsoleErr;
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
                    isProductsLoading: false,
                    productsError: null,
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
                    isProductsLoading: false,
                    productsError: null,
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
                        statusMapping: {
                            loading: "isProductsLoading",
                            error: "productsError",
                        },
                    },
                },
            });
            const cfg = mwFn({
                initialState: {
                    products: [],
                    isProductsLoading: false,
                    productsError: null,
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

        it("should call refetchQueries on the queryClient when the query is invokved", async () => {
            await mockStore.queries.products();
            expect(mockQueryClient.refetchQueries).toHaveBeenCalledTimes(1);
            expect(mockQueryClient.refetchQueries).toHaveBeenCalledWith({
                queryKey: ["products"],
            });
        });

        it("should call the original onStoreCreated callback with the store instance", () => {
            expect(origOnStoreCreated).toHaveBeenCalledTimes(1);
            expect(origOnStoreCreated).toHaveBeenCalledWith(mockStore);
        });

        it("should set the state on the store", () => {
            expect(mockStore.isProductsLoading).toEqual(true);
            expect(mockStore.productsError).toEqual(undefined);
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
                            statusMapping: {
                                loading: (state: ProductQueryState, isLoading: boolean) => {
                                    state.isProductsLoading = isLoading;
                                },
                                error: (state: ProductQueryState, err: Error | null) => {
                                    state.productsError = err;
                                },
                            },
                        },
                    },
                });
                const cfg = mwFn({
                    initialState: {
                        products: [],
                        isProductsLoading: false,
                        productsError: null,
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

            it("should call the original onStoreCreated callback with the store instance", () => {
                expect(origOnStoreCreated).toHaveBeenCalledTimes(1);
                expect(origOnStoreCreated).toHaveBeenCalledWith(mockStore);
            });

            it("should call refetchQueries on the queryClient when refetch is invokved", async () => {
                await mockStore.queries.products();
                expect(mockQueryClient.refetchQueries).toHaveBeenCalledTimes(1);
                expect(mockQueryClient.refetchQueries).toHaveBeenCalledWith({
                    queryKey: ["products"],
                });
            });

            it("should set the state on the store", () => {
                expect(mockStore.products).toEqual(["ITEM1", "ITEM2"]);
                expect(mockStore.isProductsLoading).toEqual(false);
                expect(mockStore.productsError).toEqual(undefined);
            });
        });

        describe("and it does not have a state selector", () => {
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
                                return { products: products.items };
                            },
                            statusMapping: {
                                loading: (state: ProductQueryState, isLoading: boolean) => {
                                    state.isProductsLoading = isLoading;
                                },
                                error: (state: ProductQueryState, err: Error | null) => {
                                    state.productsError = err;
                                },
                            },
                        },
                    },
                });
                const cfg = mwFn({
                    initialState: {
                        products: [],
                        isProductsLoading: false,
                        productsError: null,
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

            it("should call the original onStoreCreated callback with the store instance", () => {
                expect(origOnStoreCreated).toHaveBeenCalledTimes(1);
                expect(origOnStoreCreated).toHaveBeenCalledWith(mockStore);
            });

            it("should call refetchQueries on the queryClient when refetch is invokved", async () => {
                await mockStore.queries.products();
                expect(mockQueryClient.refetchQueries).toHaveBeenCalledTimes(1);
                expect(mockQueryClient.refetchQueries).toHaveBeenCalledWith({
                    queryKey: ["products"],
                });
            });

            it("should set the state on the store", () => {
                expect(mockStore.products).toEqual(["ITEM1", "ITEM2"]);
                expect(mockStore.isProductsLoading).toEqual(false);
                expect(mockStore.productsError).toEqual(undefined);
            });
        });
    });

    describe("when the query is erroring", () => {
        beforeEach(() => {
            mockQueryCache.subscribe.mockImplementation((cb: any) => {
                cb({
                    query: {
                        options: {
                            queryKey: ["products"],
                        },
                        state: {
                            fetchStatus: "error",
                            error: new Error("FETCH_ERROR"),
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
                        statusMapping: {
                            loading: "isProductsLoading",
                            error: "productsError",
                        },
                    },
                },
            });
            const cfg = mwFn({
                initialState: {
                    products: [],
                    isProductsLoading: false,
                    productsError: null,
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

        it("should call the original onStoreCreated callback with the store instance", () => {
            expect(origOnStoreCreated).toHaveBeenCalledTimes(1);
            expect(origOnStoreCreated).toHaveBeenCalledWith(mockStore);
        });

        it("should set the state on the store", () => {
            expect(mockStore.isProductsLoading).toEqual(false);
            expect(mockStore.productsError).toEqual(new Error("FETCH_ERROR"));
        });
    });

    describe("when queryClient.fetchQuery rejects", () => {
        describe("with string status mappings", () => {
            beforeEach(() => {
                mockQueryClient.fetchQuery.mockRejectedValue(new Error("FETCH_ERROR"));
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
                            statusMapping: {
                                loading: "isProductsLoading",
                                error: "productsError",
                            },
                        },
                    },
                });
                const cfg = mwFn({
                    initialState: {
                        products: [],
                        isProductsLoading: false,
                        productsError: null,
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

            it("should set the state on the store", () => {
                expect(mockStore.isProductsLoading).toEqual(false);
                expect(mockStore.productsError).toEqual(new Error("FETCH_ERROR"));
            });
        });

        describe("with callback status mappings (& with invoking the cleanup fn returned by the middleware)", () => {
            let unsubscribe: any;

            beforeEach(() => {
                unsubscribe = jest.fn();
                mockQueryCache.subscribe.mockReset();
                mockQueryCache.subscribe.mockReturnValue(unsubscribe);
                mockQueryClient.fetchQuery.mockRejectedValue("FETCH_ERROR");
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
                            statusMapping: {
                                loading: (state: ProductQueryState, isLoading: boolean) => {
                                    state.isProductsLoading = isLoading;
                                },
                                error: (state: ProductQueryState, err: Error | null) => {
                                    state.productsError = err;
                                },
                            },
                        },
                    },
                });
                const cfg = mwFn({
                    initialState: {
                        products: [],
                        isProductsLoading: false,
                        productsError: null,
                    },
                    derived: {
                        productCount: state => {
                            return state.products.length;
                        },
                    },
                    actions: {},
                    onStoreCreated: origOnStoreCreated,
                });
                const mwCleanupFn = cfg.onStoreCreated!(mockStore as any);
                (mwCleanupFn as any)();
            });

            it("should set the state on the store", () => {
                expect(mockStore.isProductsLoading).toEqual(false);
                expect(mockStore.productsError).toEqual(new Error("FETCH_ERROR"));
            });

            it("should unsubscribe from the query cache", () => {
                expect(unsubscribe).toHaveBeenCalledTimes(1);
            });
        });
    });
});
