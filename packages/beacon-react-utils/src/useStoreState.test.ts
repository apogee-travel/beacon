/* eslint-disable @typescript-eslint/no-explicit-any */

const mockToJS = jest.fn((val: any) => val);
jest.mock("mobx", () => {
    return {
        toJS: mockToJS,
    };
});

const mockSetValue = jest.fn();
const mockUseState: jest.Mock = jest.fn(() => [null, mockSetValue]);
jest.mock("react", () => {
    return {
        useState: mockUseState,
    };
});

const mockUseStoreWatcher = jest.fn();
jest.mock("./useStoreWatcher", () => {
    return {
        useStoreWatcher: mockUseStoreWatcher,
    };
});

describe("useStoreState", () => {
    let store: any, selector: any;

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.resetModules();
        store = {
            dinner: "calzone",
            dessert: "cannoli",
            beverage: "grapefruit juice",
            registerCleanup: jest.fn(),
        };
        selector = (store: any) => {
            return {
                dinner: store.dinner,
                dessert: store.dessert,
            };
        };
    });

    describe("with hook initialization", () => {
        let result: any;

        beforeEach(async () => {
            const initialValue = { dinner: "calzone", dessert: "cannoli" };
            mockToJS.mockReturnValueOnce(initialValue);
            mockUseState.mockReturnValueOnce([initialValue, mockSetValue]);
            const mod = await import("./useStoreState");
            result = mod.useStoreState(store, selector);
        });

        it("should initialize useState with the selector result converted via toJS", () => {
            expect(mockUseState).toHaveBeenCalledTimes(1);
            expect(mockUseState).toHaveBeenCalledWith(expect.any(Function));
            // Execute the initializer function that was passed to useState
            const initializer = mockUseState.mock.calls[0][0];
            initializer();
            // toJS is called once during initialization (beforeEach) and once here
            expect(mockToJS).toHaveBeenCalledWith({
                dinner: "calzone",
                dessert: "cannoli",
            });
        });

        it("should set up useStoreWatcher with the store, selector, and setValue", () => {
            expect(mockUseStoreWatcher).toHaveBeenCalledTimes(1);
            expect(mockUseStoreWatcher).toHaveBeenCalledWith(store, selector, mockSetValue);
        });

        it("should return the current state value", () => {
            expect(result).toEqual({ dinner: "calzone", dessert: "cannoli" });
        });
    });

    describe("when the store value changes", () => {
        beforeEach(async () => {
            const initialValue = { dinner: "calzone", dessert: "cannoli" };
            mockToJS.mockReturnValueOnce(initialValue);
            mockUseState.mockReturnValueOnce([initialValue, mockSetValue]);
            const mod = await import("./useStoreState");
            mod.useStoreState(store, selector);
        });

        it("should pass setValue as the onChange callback to useStoreWatcher", () => {
            // When useStoreWatcher detects a change, it calls the onChange (setValue)
            const onChangeCallback = mockUseStoreWatcher.mock.calls[0][2];
            const newValue = { dinner: "carbonara", dessert: "tiramisu" };
            onChangeCallback(newValue);
            expect(mockSetValue).toHaveBeenCalledTimes(1);
            expect(mockSetValue).toHaveBeenCalledWith(newValue);
        });
    });

    describe("with a primitive selector value", () => {
        let result: any;

        beforeEach(async () => {
            const primitiveSelector = (store: any) => store.dinner;
            mockToJS.mockReturnValueOnce("calzone");
            mockUseState.mockReturnValueOnce(["calzone", mockSetValue]);
            const mod = await import("./useStoreState");
            result = mod.useStoreState(store, primitiveSelector);
        });

        it("should return the primitive value", () => {
            expect(result).toBe("calzone");
        });
    });
});
