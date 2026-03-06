/* eslint-disable @typescript-eslint/no-explicit-any */

describe("useEffectEventShim", () => {
    describe("when React.useEffectEvent exists", () => {
        let mockReact: any;
        let useEffectEvent: any, nativeUseEffectEvent: any, result: any, callback: any;

        beforeEach(async () => {
            jest.resetModules();
            callback = jest.fn();
            nativeUseEffectEvent = jest.fn().mockReturnValue(callback);
            mockReact = {
                useRef: jest.fn(),
                useCallback: jest.fn(),
                useLayoutEffect: jest.fn(),
                useEffectEvent: nativeUseEffectEvent,
            };
            jest.doMock("react", () => mockReact);
            const mod = await import("./useEffectEventShim");
            useEffectEvent = mod.useEffectEvent;
            result = useEffectEvent(callback);
        });

        it("should delegate to the native React.useEffectEvent", () => {
            expect(nativeUseEffectEvent).toHaveBeenCalledTimes(1);
            expect(nativeUseEffectEvent).toHaveBeenCalledWith(callback);
        });

        it("should return the result from the native implementation", () => {
            expect(result).toBe(callback);
        });

        it("should not call useRef", () => {
            expect(mockReact.useRef).not.toHaveBeenCalled();
        });

        it("should not call useCallback", () => {
            expect(mockReact.useCallback).not.toHaveBeenCalled();
        });

        it("should not call useLayoutEffect", () => {
            expect(mockReact.useLayoutEffect).not.toHaveBeenCalled();
        });
    });

    describe("when React.useEffectEvent is undefined (shim fallback)", () => {
        let mockReact: any;
        let useEffectEvent: any, stableCallback: any, result: any, originalFn: any, ref: any;

        beforeEach(async () => {
            jest.resetModules();
            originalFn = jest.fn().mockReturnValue("PIZZA_QUATTRO_STAGIONI");
            ref = { current: originalFn };
            stableCallback = jest.fn((...args: any[]) => ref.current(...args));
            mockReact = {
                useRef: jest.fn().mockReturnValue(ref),
                useCallback: jest.fn().mockReturnValue(stableCallback),
                // useLayoutEffect captures the updater but doesn't run it synchronously —
                // that matches real React commit-phase timing
                useLayoutEffect: jest.fn(),
                useEffectEvent: undefined,
            };
            jest.doMock("react", () => mockReact);
            const mod = await import("./useEffectEventShim");
            useEffectEvent = mod.useEffectEvent;
            result = useEffectEvent(originalFn);
        });

        it("should call useRef with the provided function", () => {
            expect(mockReact.useRef).toHaveBeenCalledTimes(1);
            expect(mockReact.useRef).toHaveBeenCalledWith(originalFn);
        });

        it("should call useLayoutEffect to schedule the ref update", () => {
            expect(mockReact.useLayoutEffect).toHaveBeenCalledTimes(1);
            expect(mockReact.useLayoutEffect).toHaveBeenCalledWith(expect.any(Function));
        });

        it("should update ref.current when the useLayoutEffect callback runs, and the stable callback dispatches through the latest fn", () => {
            // Simulate a re-render: call useEffectEvent again with a different function.
            // The shim schedules a new useLayoutEffect updater that closes over fn2.
            // Running that updater should mutate ref.current to fn2, so the stable
            // callback (which always calls ref.current) routes through the new function.
            const fn2 = jest.fn().mockReturnValue("PROSCIUTTO_E_FUNGHI");
            useEffectEvent(fn2);

            // The second useLayoutEffect call closes over fn2 — run it to commit the update
            const updaterForFn2 = mockReact.useLayoutEffect.mock.calls[1][0];
            updaterForFn2();

            expect(ref.current).toBe(fn2);
            const returnValue = stableCallback("CALZONE");
            expect(fn2).toHaveBeenCalledWith("CALZONE");
            expect(originalFn).not.toHaveBeenCalled();
            expect(returnValue).toBe("PROSCIUTTO_E_FUNGHI");
        });

        it("should call useCallback with an empty dependency array", () => {
            expect(mockReact.useCallback).toHaveBeenCalledTimes(1);
            expect(mockReact.useCallback).toHaveBeenCalledWith(expect.any(Function), []);
        });

        it("should return the stable callback from useCallback", () => {
            expect(result).toBe(stableCallback);
        });

        it("should invoke the latest fn through the ref when the stable callback is called", () => {
            stableCallback("EXTRA_CHEESE");
            expect(originalFn).toHaveBeenCalledTimes(1);
            expect(originalFn).toHaveBeenCalledWith("EXTRA_CHEESE");
        });
    });

    describe("when the shim is called a second time with a new fn (re-render simulation)", () => {
        let mockReact: any;
        let useEffectEvent: any, firstFn: any, secondFn: any, firstRef: any;

        beforeEach(async () => {
            jest.resetModules();
            firstFn = jest.fn().mockReturnValue("RIGATONI");
            secondFn = jest.fn().mockReturnValue("PENNE");
            firstRef = { current: firstFn };
            const secondRef = { current: secondFn };
            mockReact = {
                useRef: jest.fn().mockReturnValueOnce(firstRef).mockReturnValueOnce(secondRef),
                useCallback: jest.fn().mockImplementation((_fn: any) => _fn),
                useLayoutEffect: jest.fn(),
                useEffectEvent: undefined,
            };
            jest.doMock("react", () => mockReact);
            const mod = await import("./useEffectEventShim");
            useEffectEvent = mod.useEffectEvent;
            useEffectEvent(firstFn);
            useEffectEvent(secondFn);
        });

        it("should schedule a separate useLayoutEffect updater for each render", () => {
            expect(mockReact.useLayoutEffect).toHaveBeenCalledTimes(2);
        });

        it("should update ref.current to the second fn when the second updater runs", () => {
            const secondUpdater = mockReact.useLayoutEffect.mock.calls[1][0];
            secondUpdater();
            expect(firstRef.current).toBe(firstFn);
        });
    });

    describe("when the useCallback inner wrapper is invoked directly", () => {
        let mockReact: any;
        let useEffectEvent: any, originalFn: any, capturedInnerFn: any, innerResult: any, ref: any;

        beforeEach(async () => {
            jest.resetModules();
            originalFn = jest.fn().mockReturnValue("OSSO_BUCO");
            ref = { current: originalFn };
            capturedInnerFn = undefined;
            innerResult = undefined;
            mockReact = {
                useRef: jest.fn().mockReturnValue(ref),
                useCallback: jest.fn().mockImplementation((innerFn: any, _deps: any) => {
                    capturedInnerFn = innerFn;
                    return innerFn;
                }),
                useLayoutEffect: jest.fn(),
                useEffectEvent: undefined,
            };
            jest.doMock("react", () => mockReact);
            const mod = await import("./useEffectEventShim");
            useEffectEvent = mod.useEffectEvent;
            useEffectEvent(originalFn);
            innerResult = capturedInnerFn("ARG_A", "ARG_B");
        });

        it("should forward all arguments to ref.current", () => {
            expect(originalFn).toHaveBeenCalledTimes(1);
            expect(originalFn).toHaveBeenCalledWith("ARG_A", "ARG_B");
        });

        it("should return the value produced by ref.current", () => {
            expect(innerResult).toBe("OSSO_BUCO");
        });
    });
});
