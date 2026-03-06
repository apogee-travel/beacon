/* eslint-disable @typescript-eslint/no-explicit-any */
export default {};

const mockMobx = {
    computed: jest.fn(),
    observable: jest.fn(),
    action: jest.fn(),
    toJS: jest.fn(),
    isObservable: jest.fn(),
    runInAction: jest.fn(),
};
jest.mock("mobx", () => {
    return mockMobx;
});

describe("store", () => {
    let storeModule: { createStore: any }, storeInstance: any, config: any;

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.resetModules();
        mockMobx.computed.mockImplementation(cb => cb);
        mockMobx.observable.mockImplementation(val => val);
        mockMobx.toJS.mockReset();
        mockMobx.toJS.mockImplementation(val => {
            return JSON.parse(JSON.stringify(val));
        });
        mockMobx.isObservable.mockReturnValue(false);
        mockMobx.runInAction.mockImplementation((fn: any) => fn());
        storeModule = await import("./store");
    });

    describe("with initial state", () => {
        beforeEach(() => {
            config = { initialState: { foo: "bar" } };
            storeInstance = storeModule.createStore(config);
        });

        it("should make the initial state observable", () => {
            expect(mockMobx.observable).toHaveBeenCalledTimes(1);
            expect(mockMobx.observable).toHaveBeenCalledWith(
                expect.objectContaining(config.initialState)
            );
        });

        it("should export the state on the store instance", () => {
            expect(storeInstance).toEqual({
                actions: {},
                foo: "bar",
                getStateSnapshot: expect.any(Function),
                registerCleanup: expect.any(Function),
                unregisterCleanup: expect.any(Function),
                dispose: expect.any(Function),
            });
        });
    });

    describe("with derived state", () => {
        describe("when the derived state key has no conflicts with state", () => {
            let computedVal: any, definePropertySpy: any;

            beforeEach(() => {
                definePropertySpy = jest.spyOn(Object, "defineProperty");
                mockMobx.computed.mockReset();
                mockMobx.computed.mockImplementationOnce(cb => {
                    computedVal = cb();
                    return { get: () => computedVal };
                });
                storeInstance = storeModule.createStore({
                    initialState: { foo: "bar" },
                    derived: {
                        derivedFoo: (state: any) => state.foo.toUpperCase(),
                    },
                });
            });

            afterEach(() => {
                definePropertySpy.mockRestore();
            });

            it("should create a dervied state prop called derivedFoo", () => {
                expect(mockMobx.computed).toHaveBeenCalledWith(expect.any(Function));
                expect(computedVal).toEqual("BAR");
            });

            it("should define the derived state prop on the store instance", () => {
                expect(definePropertySpy).toHaveBeenCalledWith(
                    storeInstance,
                    "derivedFoo",
                    expect.objectContaining({
                        get: expect.any(Function),
                        enumerable: true,
                        configurable: true,
                    })
                );
            });

            it("should export the created signal as state on the store instance", () => {
                expect(storeInstance.derivedFoo).toEqual("BAR");
            });
        });

        describe("when the derived state key conflicts with state", () => {
            it("should throw an error", () => {
                expect(() => {
                    storeModule.createStore({
                        initialState: { foo: "bar" },
                        derived: { foo: (state: any) => state.foo.toUpperCase() },
                    });
                }).toThrow("Derived key 'foo' conflicts with state property of the same name");
            });
        });
    });

    describe("with actions", () => {
        beforeEach(() => {
            mockMobx.action.mockImplementation((_key, cb) => {
                return cb;
            });
            storeInstance = storeModule.createStore({
                initialState: { foo: "bar" },
                actions: {
                    setFoo: (state: any, val: string) => {
                        state.foo = val;
                    },
                },
            });
            storeInstance.actions.setFoo("baz");
        });

        it("should create action functions that modify state", () => {
            expect(mockMobx.action).toHaveBeenCalledWith("setFoo", expect.any(Function));
            expect(storeInstance.foo).toEqual("baz");
        });
    });

    describe("with getStateSnapshot", () => {
        let snapshot: any;

        beforeEach(() => {
            mockMobx.computed.mockReset();
            mockMobx.computed.mockImplementationOnce(cb => {
                return { get: cb };
            });
            storeInstance = storeModule.createStore({
                initialState: { foo: "bar", baz: "qux" },
                derived: {
                    derivedFoo: (state: any) => state.foo.toUpperCase(),
                },
            });
        });

        describe("when called without options", () => {
            beforeEach(() => {
                snapshot = storeInstance.getStateSnapshot();
            });

            it("should return a snapshot of the current state that does not include derived state", () => {
                expect(snapshot).toEqual(expect.objectContaining({ foo: "bar", baz: "qux" }));
                expect(snapshot).not.toHaveProperty("derivedFoo");
            });
        });

        describe("when called with { withDerived: true }", () => {
            beforeEach(() => {
                snapshot = storeInstance.getStateSnapshot({ withDerived: true });
            });

            it("should include derived state in the snapshot", () => {
                expect(snapshot).toEqual(
                    expect.objectContaining({ foo: "bar", baz: "qux", derivedFoo: "BAR" })
                );
            });
        });
    });

    describe("with the onStoreCreated callback", () => {
        let onStoreCreated: any;

        beforeEach(() => {
            onStoreCreated = jest.fn();
            storeInstance = storeModule.createStore({
                initialState: { foo: "bar", baz: "qux" },
                onStoreCreated,
            });
            storeInstance.getStateSnapshot();
        });

        it("should execute the onStoreCreated callback", () => {
            expect(onStoreCreated).toHaveBeenCalledWith(storeInstance);
        });
    });
});
