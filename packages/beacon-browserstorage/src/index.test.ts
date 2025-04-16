/* eslint-disable @typescript-eslint/no-explicit-any */

const mockReaction = jest.fn();
jest.mock("mobx", () => {
    return { reaction: mockReaction };
});

describe("beacon-browserstorage", () => {
    let localStg: any,
        sessionStg: any,
        storeCfg: any,
        origCfg: any,
        mockStoreInstance: any,
        origOnStoreCreated: any;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        mockReaction.mockImplementation((selector, onChange) => {
            selector();
            onChange();
        });
        localStg = {
            getItem: jest.fn().mockReturnValue(JSON.stringify({ testKey: "storedTestValue" })),
            setItem: jest.fn(),
        };
        sessionStg = {
            getItem: jest.fn().mockReturnValue(JSON.stringify({ testKey: "storedTestValue" })),
            setItem: jest.fn(),
        };
        (global as any).localStorage = localStg;
        (global as any).sessionStorage = sessionStg;
        mockStoreInstance = {
            getStateSnapshot: jest.fn(() => ({ testKey: "origTestValue" })),
        };
    });

    describe("with local storage", () => {
        describe("when things go swimmingly", () => {
            beforeEach(async () => {
                const options = {
                    key: "testKey",
                    storageType: "local",
                };
                origOnStoreCreated = jest.fn();
                origCfg = {
                    initialState: {
                        testKey: null,
                    },
                    onStoreCreated: origOnStoreCreated,
                };
                const mod = await import("./index");
                const { browserStorageMiddleware } = mod;
                storeCfg = browserStorageMiddleware(options as any)(origCfg);
                storeCfg.onStoreCreated(mockStoreInstance);
            });

            it("should get the item/key from local storage", () => {
                expect(localStg.getItem).toHaveBeenCalledWith("testKey");
            });

            it("should call the original onStoreCreated function", () => {
                expect(origOnStoreCreated).toHaveBeenCalled();
            });

            it("should create a reaction to save the state to local storage", () => {
                expect(mockReaction).toHaveBeenCalledWith(
                    expect.any(Function),
                    expect.any(Function)
                );
            });

            it("should call getStateSnapshot when invoking the reaction fn's selector arg", () => {
                expect(mockStoreInstance.getStateSnapshot).toHaveBeenCalled();
            });

            it("should call setItem on storage with the expected args when invoking the reaction fn's onChange arg", () => {
                expect(localStg.setItem).toHaveBeenCalledWith(
                    "testKey",
                    JSON.stringify({ testKey: "origTestValue" })
                );
            });
        });

        describe("when an storage read error occurs", () => {
            let origErr: any, err: any;

            beforeEach(async () => {
                origErr = console.error;
                console.error = jest.fn();
                const options = {
                    key: "testKey",
                };
                origOnStoreCreated = jest.fn();
                origCfg = {
                    initialState: {
                        testKey: null,
                    },
                    onStoreCreated: origOnStoreCreated,
                };
                err = new Error("E_COLD_CALZONE");
                localStg.getItem.mockReset();
                localStg.getItem.mockImplementationOnce(() => {
                    throw err;
                });
                const mod = await import("./index");
                const { browserStorageMiddleware } = mod;
                storeCfg = browserStorageMiddleware(options as any)(origCfg);
                storeCfg.onStoreCreated(mockStoreInstance);
            });

            afterEach(() => {
                console.error = origErr;
            });

            it("should log the error", () => {
                expect(console.error).toHaveBeenCalledWith(
                    "Failed to load state from localStorage",
                    err
                );
            });
        });
    });

    describe("with session storage", () => {
        describe("when things go splendiferously", () => {
            beforeEach(async () => {
                const options = {
                    key: "testKey",
                    storageType: "session",
                };
                origOnStoreCreated = jest.fn();
                origCfg = {
                    initialState: {
                        testKey: null,
                    },
                    onStoreCreated: origOnStoreCreated,
                };
                const mod = await import("./index");
                const { browserStorageMiddleware } = mod;
                storeCfg = browserStorageMiddleware(options as any)(origCfg);
                storeCfg.onStoreCreated(mockStoreInstance);
            });

            it("should get the item/key from session storage", () => {
                expect(sessionStg.getItem).toHaveBeenCalledWith("testKey");
            });

            it("should call the original onStoreCreated function", () => {
                expect(origOnStoreCreated).toHaveBeenCalled();
            });

            it("should create a reaction to save the state to session storage", () => {
                expect(mockReaction).toHaveBeenCalledWith(
                    expect.any(Function),
                    expect.any(Function)
                );
            });

            it("should call getStateSnapshot when invoking the reaction fn's selector arg", () => {
                expect(mockStoreInstance.getStateSnapshot).toHaveBeenCalled();
            });

            it("should call setItem on storage with the expected args when invoking the reaction fn's onChange arg", () => {
                expect(sessionStg.setItem).toHaveBeenCalledWith(
                    "testKey",
                    JSON.stringify({ testKey: "origTestValue" })
                );
            });
        });

        describe("when an storage read error occurs", () => {
            let origErr: any, err: any;

            beforeEach(async () => {
                origErr = console.error;
                console.error = jest.fn();
                const options = {
                    key: "testKey",
                    storageType: "session",
                };
                origOnStoreCreated = jest.fn();
                origCfg = {
                    initialState: {
                        testKey: null,
                    },
                    onStoreCreated: origOnStoreCreated,
                };
                err = new Error("E_COLD_CALZONE");
                sessionStg.getItem.mockReset();
                sessionStg.getItem.mockImplementationOnce(() => {
                    throw err;
                });
                const mod = await import("./index");
                const { browserStorageMiddleware } = mod;
                storeCfg = browserStorageMiddleware(options as any)(origCfg);
                storeCfg.onStoreCreated(mockStoreInstance);
            });

            afterEach(() => {
                console.error = origErr;
            });

            it("should log the error", () => {
                expect(console.error).toHaveBeenCalledWith(
                    "Failed to load state from sessionStorage",
                    err
                );
            });
        });
    });
});
