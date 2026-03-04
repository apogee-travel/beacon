/* eslint-disable @typescript-eslint/no-explicit-any */
export default {};

// Minimal MobX mock — enough for createStore + dispose to run without real reactivity.
// runInAction must call through so the state-clearing loop actually executes.
const mockObservable = jest.fn();
const mockAction = jest.fn();
const mockComputed = jest.fn();
const mockToJS = jest.fn();
const mockIsObservable = jest.fn();
const mockRunInAction = jest.fn();

jest.mock("mobx", () => ({
    observable: mockObservable,
    action: mockAction,
    computed: mockComputed,
    toJS: mockToJS,
    isObservable: mockIsObservable,
    runInAction: mockRunInAction,
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
        // isObservable returns false (plain objects from our mock)
        mockIsObservable.mockReturnValue(false);
        // runInAction must call through so the dispose state-clearing loop executes
        mockRunInAction.mockImplementation((fn: any) => fn());

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

        it("should set state properties to undefined", () => {
            expect(store.count).toBeUndefined();
            expect(store.label).toBeUndefined();
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
        beforeEach(() => {
            store.dispose();
            // Reset to detect whether cleanup runs again
            mockRunInAction.mockClear();
            store.dispose();
        });

        it("should not run dispose logic again", () => {
            expect(mockRunInAction).not.toHaveBeenCalled();
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

    describe("when an array state property is observable during dispose()", () => {
        let mockClear: jest.Mock;

        beforeEach(async () => {
            mockClear = jest.fn();
            const arrayWithClear = [1, 2, 3] as any;
            arrayWithClear.clear = mockClear;
            mockObservable.mockReset();
            mockObservable.mockImplementation(() => ({
                tags: arrayWithClear,
                count: 0,
            }));
            mockIsObservable.mockReturnValue(true);

            const mod = await import("./store");
            store = mod.createStore({
                initialState: { tags: [1, 2, 3], count: 0 },
            });
            store.dispose();
        });

        it("should call clear() on the observable array before setting it to undefined", () => {
            expect(mockClear).toHaveBeenCalledTimes(1);
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
});
