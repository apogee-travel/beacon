/* eslint-disable @typescript-eslint/no-explicit-any */

describe.skip("compose", () => {
    let composeModule: { compose: any };

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.resetModules();
        composeModule = await import("./compose");
    });

    describe("with multiple middleware", () => {
        let initialConfig: any,
            middleware1: any,
            middleware2: any,
            composedMiddleware: any,
            result: any;

        beforeEach(() => {
            initialConfig = { initialState: { foo: "bar" } };
            middleware1 = jest.fn(config => ({
                ...config,
                initialState: {
                    ...config.initialState,
                    added1: "value1",
                },
            }));
            middleware2 = jest.fn(config => ({
                ...config,
                initialState: {
                    ...config.initialState,
                    added2: "value2",
                },
            }));

            composedMiddleware = composeModule.compose(middleware1, middleware2);
            result = composedMiddleware(initialConfig);
        });

        it("should return a function", () => {
            expect(typeof composedMiddleware).toBe("function");
        });

        it("should apply all middleware in sequence", () => {
            expect(middleware1).toHaveBeenCalledWith(initialConfig);
            expect(middleware2).toHaveBeenCalled();
        });

        it("should return the result of applying all middleware", () => {
            expect(result).toEqual({
                initialState: {
                    foo: "bar",
                    added1: "value1",
                    added2: "value2",
                },
            });
        });
    });

    describe("middleware application order", () => {
        let initialConfig: any, resultConfig: any;

        beforeEach(() => {
            initialConfig = { initialState: { counter: 0 } };

            // Create middleware that will show execution order by incrementing a counter
            const incrementCounter = (increment: number) => (config: any) => ({
                ...config,
                initialState: {
                    ...config.initialState,
                    counter: config.initialState.counter + increment,
                },
            });

            const composedMiddleware = composeModule.compose(
                incrementCounter(1),
                incrementCounter(10),
                incrementCounter(100)
            );

            resultConfig = composedMiddleware(initialConfig);
        });

        it("should apply middleware from left to right", () => {
            // If applied left to right, counter should be 0 -> 1 -> 11 -> 111
            expect(resultConfig.initialState.counter).toBe(111);
        });
    });

    describe("with a single middleware", () => {
        let initialConfig: any, middleware: any, result: any;

        beforeEach(() => {
            initialConfig = { initialState: { foo: "bar" } };
            middleware = jest.fn(config => ({
                ...config,
                derived: { derivedFoo: (state: any) => state.foo.toUpperCase() },
            }));

            const composedMiddleware = composeModule.compose(middleware);
            result = composedMiddleware(initialConfig);
        });

        it("should apply the single middleware", () => {
            expect(middleware).toHaveBeenCalledWith(initialConfig);
        });

        it("should return the result of applying the middleware", () => {
            expect(result).toEqual({
                initialState: { foo: "bar" },
                derived: { derivedFoo: expect.any(Function) },
            });
        });
    });

    describe("with no middleware", () => {
        let initialConfig: any, result: any;

        beforeEach(() => {
            initialConfig = { initialState: { foo: "bar" } };
            const composedMiddleware = composeModule.compose();
            result = composedMiddleware(initialConfig);
        });

        it("should return the config unchanged", () => {
            expect(result).toBe(initialConfig);
        });
    });

    describe("with complex middleware transformations", () => {
        let initialConfig: any, result: any;

        beforeEach(() => {
            initialConfig = {
                initialState: { foo: "bar" },
                actions: {
                    originalAction: jest.fn(),
                },
            };

            const addDerivedMiddleware = (config: any) => ({
                ...config,
                derived: {
                    ...(config.derived || {}),
                    derivedFoo: (state: any) => state.foo.toUpperCase(),
                },
            });

            const addActionsMiddleware = (config: any) => ({
                ...config,
                actions: {
                    ...config.actions,
                    additionalAction: jest.fn(),
                },
            });

            const composedMiddleware = composeModule.compose(
                addDerivedMiddleware,
                addActionsMiddleware
            );

            result = composedMiddleware(initialConfig);
        });

        it("should combine all aspects of the config correctly", () => {
            expect(result).toEqual({
                initialState: { foo: "bar" },
                derived: { derivedFoo: expect.any(Function) },
                actions: {
                    originalAction: expect.any(Function),
                    additionalAction: expect.any(Function),
                },
            });
        });
    });
});
