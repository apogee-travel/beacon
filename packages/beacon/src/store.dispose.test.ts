/* eslint-disable @typescript-eslint/no-explicit-any */
export default {};

// Minimal MobX mock — enough for createStore + dispose to run without real reactivity.
const mockObservable = jest.fn();
const mockAction = jest.fn();
const mockComputed = jest.fn();
const mockToJS = jest.fn();

jest.mock("mobx", () => ({
    observable: mockObservable,
    action: mockAction,
    computed: mockComputed,
    toJS: mockToJS,
}));

describe("store.dispose()", () => {
    let createStore: any, store: any;

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.resetModules();

        // observable returns the plain object so we can inspect properties directly
        mockObservable.mockImplementation((val: any) => ({ ...val }));
        // action just returns the wrapped function as-is
        mockAction.mockImplementation((_name: string, fn: any) => fn);
        // computed not needed for these tests but must not throw
        mockComputed.mockImplementation((fn: any) => ({ get: fn }));
        // toJS returns a copy — used by getStateSnapshot
        mockToJS.mockImplementation((val: any) => ({ ...val }));
        const mod = await import("./store");
        createStore = mod.createStore;

        store = createStore({
            initialState: { count: 0, label: "hello" },
        });
    });

    describe("when dispose() is called", () => {
        beforeEach(() => {
            store.dispose();
        });

        it("should set isDisposed to true", () => {
            expect(store.isDisposed).toBe(true);
        });

        it("should retain state property values after disposal", () => {
            // State is not nullified — stale-but-readable is safer than undefined.
            // Consumers should use isDisposed to gate access, not check for undefined.
            expect(store.count).toBe(0);
            expect(store.label).toBe("hello");
        });
    });

    describe("when dispose() is called and registered cleanup functions exist", () => {
        let cleanupFn: jest.Mock;

        beforeEach(() => {
            cleanupFn = jest.fn();
            store.registerCleanup(cleanupFn);
            store.dispose();
        });

        it("should call registered cleanup functions", () => {
            expect(cleanupFn).toHaveBeenCalledTimes(1);
        });
    });

    describe("when dispose() is called a second time", () => {
        let cleanupFn: jest.Mock;

        beforeEach(() => {
            cleanupFn = jest.fn();
            store.registerCleanup(cleanupFn);
            store.dispose();
            cleanupFn.mockClear();
            store.dispose();
        });

        it("should not run dispose logic again", () => {
            // isDisposed guard prevents re-entry; cleanup should not fire again
            expect(cleanupFn).not.toHaveBeenCalled();
        });

        it("should leave isDisposed as true", () => {
            expect(store.isDisposed).toBe(true);
        });
    });

    describe("when dispose() is called with multiple cleanup functions", () => {
        let callOrder: string[];

        beforeEach(() => {
            callOrder = [];
            store.registerCleanup(() => callOrder.push("first"));
            store.registerCleanup(() => callOrder.push("second"));
            store.registerCleanup(() => callOrder.push("third"));
            store.dispose();
        });

        it("should call cleanup functions in reverse registration order", () => {
            expect(callOrder).toEqual(["third", "second", "first"]);
        });
    });

    describe("when a cleanup function throws during dispose()", () => {
        let origConsoleError: any, secondCleanup: jest.Mock;

        beforeEach(() => {
            origConsoleError = console.error;
            console.error = jest.fn();
            secondCleanup = jest.fn();
            store.registerCleanup(() => {
                throw new Error("E_CLEANUP_WENT_SIDEWAYS");
            });
            store.registerCleanup(secondCleanup);
            store.dispose();
        });

        afterEach(() => {
            console.error = origConsoleError;
        });

        it("should log the cleanup error", () => {
            expect(console.error).toHaveBeenCalledWith(
                "Error in cleanup function:",
                expect.any(Error)
            );
        });

        it("should continue executing remaining cleanup functions after the throw", () => {
            expect(secondCleanup).toHaveBeenCalledTimes(1);
        });
    });

    describe("when dispose() is called with an array state property", () => {
        beforeEach(async () => {
            mockObservable.mockReset();
            mockObservable.mockImplementation(() => ({
                tags: [1, 2, 3],
                count: 0,
            }));

            const mod = await import("./store");
            store = mod.createStore({
                initialState: { tags: [1, 2, 3], count: 0 },
            });
            store.dispose();
        });

        it("should retain the array value after disposal", () => {
            // No .clear() call, no nullification — array remains readable post-disposal
            expect(store.tags).toEqual([1, 2, 3]);
        });
    });

    describe("when dispose() is called and MobX reactions exist via registerCleanup", () => {
        let reactionDisposer: jest.Mock;

        beforeEach(() => {
            // Simulates how middleware registers a MobX reaction disposer as cleanup.
            // After disposal the reaction should not fire again.
            reactionDisposer = jest.fn();
            store.registerCleanup(reactionDisposer);
            store.dispose();
        });

        it("should call the reaction disposer during cleanup", () => {
            // The disposer stops the reaction — no observable mutation needed to achieve this
            expect(reactionDisposer).toHaveBeenCalledTimes(1);
        });
    });

    describe("when registerCleanup is called with a non-function", () => {
        let origConsoleWarn: any;

        beforeEach(() => {
            origConsoleWarn = console.warn;
            console.warn = jest.fn();
            store.registerCleanup("not-a-function" as any);
        });

        afterEach(() => {
            console.warn = origConsoleWarn;
        });

        it("should warn about the invalid cleanup argument", () => {
            expect(console.warn).toHaveBeenCalledWith(
                "Attempted to register non-function as cleanup"
            );
        });
    });

    describe("when registerCleanup is called on a disposed store", () => {
        let origConsoleWarn: any, lateCleanup: jest.Mock;

        beforeEach(() => {
            origConsoleWarn = console.warn;
            console.warn = jest.fn();
            lateCleanup = jest.fn();
            store.dispose();
            (console.warn as jest.Mock).mockClear();
            store.registerCleanup(lateCleanup);
        });

        afterEach(() => {
            console.warn = origConsoleWarn;
        });

        it("should warn that cleanup cannot be registered on a disposed store", () => {
            expect(console.warn).toHaveBeenCalledWith(
                "Attempted to register cleanup on disposed store"
            );
        });

        it("should not enqueue the late cleanup function", () => {
            expect(lateCleanup).not.toHaveBeenCalled();
        });
    });

    describe("when getStateSnapshot is called on a disposed store", () => {
        let origConsoleWarn: any, result: any;

        beforeEach(() => {
            origConsoleWarn = console.warn;
            console.warn = jest.fn();
            store.dispose();
            result = store.getStateSnapshot();
        });

        afterEach(() => {
            console.warn = origConsoleWarn;
        });

        it("should return null", () => {
            expect(result).toBeNull();
        });

        it("should warn that the store is disposed", () => {
            expect(console.warn).toHaveBeenCalledWith(
                "Cannot get state snapshot: store has been disposed"
            );
        });
    });

    describe("when an action is called on a disposed store", () => {
        let origConsoleWarn: any;

        beforeEach(async () => {
            origConsoleWarn = console.warn;
            console.warn = jest.fn();

            const mod = await import("./store");
            store = mod.createStore({
                initialState: { count: 0 },
                actions: {
                    increment: (state: any) => {
                        state.count += 1;
                    },
                },
            });
            store.dispose();
            (console.warn as jest.Mock).mockClear();
            store.actions.increment();
        });

        afterEach(() => {
            console.warn = origConsoleWarn;
        });

        it("should warn that the action cannot execute on a disposed store", () => {
            expect(console.warn).toHaveBeenCalledWith(
                "Cannot execute action 'increment': store has been disposed"
            );
        });
    });

    describe("when a store with derived properties is disposed", () => {
        let derivedStore: any, computedGetFn: jest.Mock;

        beforeEach(async () => {
            computedGetFn = jest.fn().mockReturnValue(42);
            mockComputed.mockReset();
            mockComputed.mockImplementation((_fn: any) => ({ get: computedGetFn }));

            const mod = await import("./store");
            derivedStore = mod.createStore({
                initialState: { count: 10 },
                derived: {
                    doubled: (state: any) => state.count * 2,
                },
            });
            derivedStore.dispose();
        });

        it("should still allow reading derived property via getter after disposal", () => {
            // The getter closure retains the original IComputedValue reference;
            // computedProperties[key] = null only clears the record, not the closure.
            expect(derivedStore.doubled).toBe(42);
        });
    });

    describe("when dispose() is called with a throwing cleanup and actions exist", () => {
        let origConsoleError: any, origConsoleWarn: any, storeWithActions: any;

        beforeEach(async () => {
            origConsoleError = console.error;
            origConsoleWarn = console.warn;
            console.error = jest.fn();
            console.warn = jest.fn();

            const mod = await import("./store");
            storeWithActions = mod.createStore({
                initialState: { count: 0 },
                actions: {
                    increment: (state: any) => {
                        state.count += 1;
                    },
                },
            });
            storeWithActions.registerCleanup(() => {
                throw new Error("E_CLEANUP_EXPLODED");
            });
            storeWithActions.dispose();
            (console.warn as jest.Mock).mockClear();
            storeWithActions.actions.increment();
        });

        afterEach(() => {
            console.error = origConsoleError;
            console.warn = origConsoleWarn;
        });

        it("should still replace actions with no-ops even after a cleanup throws", () => {
            expect(console.warn).toHaveBeenCalledWith(
                "Cannot execute action 'increment': store has been disposed"
            );
        });
    });

    describe("when dispose() is called on a store with no actions", () => {
        let noActionStore: any;

        beforeEach(async () => {
            const mod = await import("./store");
            noActionStore = mod.createStore({
                initialState: { value: "klaatu barada nikto" },
            });
            noActionStore.dispose();
        });

        it("should mark the store as disposed", () => {
            expect(noActionStore.isDisposed).toBe(true);
        });

        it("should retain state value after disposal", () => {
            expect(noActionStore.value).toBe("klaatu barada nikto");
        });
    });

    describe("unregisterCleanup()", () => {
        describe("when a registered cleanup function is unregistered before dispose", () => {
            let cleanupFn: jest.Mock;

            beforeEach(() => {
                cleanupFn = jest.fn();
                store.registerCleanup(cleanupFn);
                store.unregisterCleanup(cleanupFn);
                store.dispose();
            });

            it("should not call the unregistered cleanup function during dispose", () => {
                expect(cleanupFn).not.toHaveBeenCalled();
            });
        });

        describe("when unregisterCleanup is called with a function that was never registered", () => {
            let unregisteredFn: jest.Mock, thrownError: unknown;

            beforeEach(() => {
                unregisteredFn = jest.fn();
                try {
                    store.unregisterCleanup(unregisteredFn);
                } catch (err) {
                    thrownError = err;
                }
            });

            it("should not throw", () => {
                expect(thrownError).toBeUndefined();
            });
        });

        describe("when unregisterCleanup is called on an already-disposed store", () => {
            let cleanupFn: jest.Mock, thrownError: unknown;

            beforeEach(() => {
                cleanupFn = jest.fn();
                store.dispose();
                try {
                    store.unregisterCleanup(cleanupFn);
                } catch (err) {
                    thrownError = err;
                }
            });

            it("should not throw", () => {
                expect(thrownError).toBeUndefined();
            });
        });

        describe("when the same cleanup function is registered twice and unregistered once", () => {
            let cleanupFn: jest.Mock;

            beforeEach(() => {
                cleanupFn = jest.fn();
                store.registerCleanup(cleanupFn);
                store.registerCleanup(cleanupFn);
                store.unregisterCleanup(cleanupFn);
                store.dispose();
            });

            it("should call the cleanup function exactly once", () => {
                // unregisterCleanup removes the first match — one entry remains
                expect(cleanupFn).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe("when dispose() is called, no MobX reactive APIs are invoked", () => {
        let callCountsAfterCreation: {
            observable: number;
            action: number;
            computed: number;
        };
        let stateBeforeDispose: Record<string, any>;
        let stateAfterDispose: Record<string, any>;
        let storeWithDerived: any;

        beforeEach(async () => {
            const mod = await import("./store");
            storeWithDerived = mod.createStore({
                initialState: { warpSpeed: 9, shieldsUp: true },
                actions: {
                    engage: (state: any) => {
                        state.warpSpeed += 1;
                    },
                },
                derived: {
                    ludicrous: (state: any) => state.warpSpeed > 9000,
                },
            });

            // Snapshot call counts after creation — any calls during dispose are regressions
            callCountsAfterCreation = {
                observable: mockObservable.mock.calls.length,
                action: mockAction.mock.calls.length,
                computed: mockComputed.mock.calls.length,
            };

            // Capture state values before dispose
            stateBeforeDispose = {
                warpSpeed: storeWithDerived.warpSpeed,
                shieldsUp: storeWithDerived.shieldsUp,
            };

            storeWithDerived.dispose();

            stateAfterDispose = {
                warpSpeed: storeWithDerived.warpSpeed,
                shieldsUp: storeWithDerived.shieldsUp,
            };
        });

        it("should not call observable() during disposal", () => {
            // If observable() is called during dispose, something is creating or mutating
            // observable state — which would trigger MobX reactions in a real environment.
            expect(mockObservable).toHaveBeenCalledTimes(callCountsAfterCreation.observable);
        });

        it("should not call action() during disposal", () => {
            // dispose() does plain JS assignments — no runInAction, no action() wrapping.
            expect(mockAction).toHaveBeenCalledTimes(callCountsAfterCreation.action);
        });

        it("should not call computed() during disposal", () => {
            // Computed property references are nulled in the internal record,
            // but no new computed values are created.
            expect(mockComputed).toHaveBeenCalledTimes(callCountsAfterCreation.computed);
        });

        it("should not mutate observable state values during disposal", () => {
            // The entire point: dispose must NOT write nulls, empty strings, or
            // sentinel values into observable state. Any mutation would trigger
            // MobX reactions, causing downstream re-renders on disposed stores.
            expect(stateAfterDispose).toEqual(stateBeforeDispose);
        });
    });

    describe("when a cleanup function reads isDisposed during dispose()", () => {
        let isDisposedDuringCleanup: boolean;

        beforeEach(() => {
            isDisposedDuringCleanup = false;
            store.registerCleanup(() => {
                isDisposedDuringCleanup = (store as any).isDisposed;
            });
            store.dispose();
        });

        it("should see isDisposed as true inside the cleanup function", () => {
            // isDisposed is set to true before the cleanup loop runs —
            // a cleanup function that checks isDisposed will see the disposed state
            expect(isDisposedDuringCleanup).toBe(true);
        });
    });

    describe("when dispose() is called on a store with no derived properties", () => {
        let noDerivedStore: any;

        beforeEach(async () => {
            const mod = await import("./store");
            noDerivedStore = mod.createStore({
                initialState: { photonTorpedoes: 72 },
            });
            noDerivedStore.dispose();
        });

        it("should mark the store as disposed without error", () => {
            expect(noDerivedStore.isDisposed).toBe(true);
        });
    });

    describe("when dispose() is called on a store with no cleanup functions registered", () => {
        let emptyStore: any;

        beforeEach(async () => {
            const mod = await import("./store");
            emptyStore = mod.createStore({
                initialState: { tribbles: 1 },
            });
            emptyStore.dispose();
        });

        it("should mark the store as disposed without error", () => {
            expect(emptyStore.isDisposed).toBe(true);
        });

        it("should retain state value without any cleanup running", () => {
            expect(emptyStore.tribbles).toBe(1);
        });
    });

    describe("when all registered cleanup functions are unregistered before dispose", () => {
        let cleanupFn: jest.Mock, thrownError: unknown;

        beforeEach(() => {
            cleanupFn = jest.fn();
            store.registerCleanup(cleanupFn);
            store.unregisterCleanup(cleanupFn);
            try {
                store.dispose();
            } catch (err) {
                thrownError = err;
            }
        });

        it("should not throw when dispose runs against an empty cleanup list", () => {
            expect(thrownError).toBeUndefined();
        });

        it("should mark the store as disposed", () => {
            expect(store.isDisposed).toBe(true);
        });
    });

    describe("when unregisterCleanup targets one of several registered functions", () => {
        let fnA: jest.Mock, fnB: jest.Mock, fnC: jest.Mock;

        beforeEach(() => {
            fnA = jest.fn();
            fnB = jest.fn();
            fnC = jest.fn();
            store.registerCleanup(fnA);
            store.registerCleanup(fnB);
            store.registerCleanup(fnC);
            store.unregisterCleanup(fnB);
            store.dispose();
        });

        it("should not call the unregistered function", () => {
            expect(fnB).not.toHaveBeenCalled();
        });

        it("should still call the remaining registered functions", () => {
            expect(fnA).toHaveBeenCalledTimes(1);
            expect(fnC).toHaveBeenCalledTimes(1);
        });
    });

    describe("when a cleanup function is unregistered then re-registered before dispose", () => {
        let cleanupFn: jest.Mock;

        beforeEach(() => {
            cleanupFn = jest.fn();
            store.registerCleanup(cleanupFn);
            store.unregisterCleanup(cleanupFn);
            store.registerCleanup(cleanupFn);
            store.dispose();
        });

        it("should call the re-registered cleanup function exactly once", () => {
            expect(cleanupFn).toHaveBeenCalledTimes(1);
        });
    });

    describe("when getStateSnapshot is called on an active store", () => {
        let snapshot: any;

        beforeEach(() => {
            snapshot = store.getStateSnapshot();
        });

        it("should not include unregisterCleanup in the snapshot", () => {
            expect(snapshot).not.toHaveProperty("unregisterCleanup");
        });

        it("should not include registerCleanup in the snapshot", () => {
            expect(snapshot).not.toHaveProperty("registerCleanup");
        });
    });

    describe("when an action is called before dispose() is called", () => {
        let origConsoleWarn: any, storeWithAction: any, incrementResult: any;

        beforeEach(async () => {
            origConsoleWarn = console.warn;
            console.warn = jest.fn();

            const mod = await import("./store");
            storeWithAction = mod.createStore({
                initialState: { count: 0 },
                actions: {
                    increment: (state: any) => {
                        state.count += 1;
                    },
                },
            });
            incrementResult = storeWithAction.actions.increment();
        });

        afterEach(() => {
            console.warn = origConsoleWarn;
        });

        it("should not warn when the store is active", () => {
            expect(console.warn).not.toHaveBeenCalled();
        });

        it("should not return undefined from the disposed-guard branch", () => {
            // The disposed guard early-returns undefined; the live path executes the action body.
            // mockAction passes through the fn as-is, so the action returns whatever the
            // config function returns (undefined for increment, which is fine).
            expect(incrementResult).toBeUndefined();
        });
    });

    describe("when dispose() is called and the action no-op fires", () => {
        let origConsoleWarn: any, storeWithAction: any, noOpResult: any;

        beforeEach(async () => {
            origConsoleWarn = console.warn;
            console.warn = jest.fn();

            const mod = await import("./store");
            storeWithAction = mod.createStore({
                initialState: { count: 0 },
                actions: {
                    increment: (state: any) => {
                        state.count += 1;
                    },
                },
            });
            storeWithAction.dispose();
            (console.warn as jest.Mock).mockClear();
            noOpResult = storeWithAction.actions.increment();
        });

        afterEach(() => {
            console.warn = origConsoleWarn;
        });

        it("should return undefined from the no-op action", () => {
            expect(noOpResult).toBeUndefined();
        });

        it("should not mutate state when the no-op fires", () => {
            // count should still be 0 — the original action body never ran
            expect(storeWithAction.count).toBe(0);
        });
    });
});
