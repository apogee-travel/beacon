/* eslint-disable @typescript-eslint/no-explicit-any */
export default {};

// Mock runInAction to call through — withActorControl uses it to update store state
const mockRunInAction = jest.fn();
jest.mock("mobx", () => ({
    runInAction: mockRunInAction,
}));

describe("beacon-actorstore", () => {
    let withActorControl: any;
    let mockActor: any,
        mockSubscription: any,
        mockStore: any,
        mockSnapshot: any,
        capturedSubscribeArgs: any;

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.resetModules();

        mockRunInAction.mockImplementation((fn: any) => fn());

        mockSnapshot = { context: { items: ["Calzone", "Stromboli"] } };
        mockSubscription = { unsubscribe: jest.fn() };

        mockActor = {
            getSnapshot: jest.fn().mockReturnValue(mockSnapshot),
            subscribe: jest.fn().mockImplementation((args: any) => {
                capturedSubscribeArgs = args;
                return mockSubscription;
            }),
        };

        mockStore = {
            registerCleanup: jest.fn(),
            items: [],
        };

        const mod = await import("./index");
        withActorControl = mod.withActorControl;
    });

    describe("withActorControl", () => {
        describe("when onStoreCreated is called", () => {
            let config: any, enhancedConfig: any;

            beforeEach(() => {
                config = {
                    initialState: { items: [] as string[] },
                };
                const middleware = withActorControl({ actor: mockActor });
                enhancedConfig = middleware(config);
                enhancedConfig.onStoreCreated(mockStore);
            });

            it("should subscribe to actor state changes", () => {
                expect(mockActor.subscribe).toHaveBeenCalledTimes(1);
                expect(mockActor.subscribe).toHaveBeenCalledWith(
                    expect.objectContaining({
                        next: expect.any(Function),
                        error: expect.any(Function),
                    })
                );
            });

            it("should register the subscription unsubscribe with the store cleanup", () => {
                expect(mockStore.registerCleanup).toHaveBeenCalledTimes(1);
                expect(mockStore.registerCleanup).toHaveBeenCalledWith(expect.any(Function));
            });

            it("should call subscription.unsubscribe when the registered cleanup function is invoked", () => {
                const registeredCleanup = mockStore.registerCleanup.mock.calls[0][0];
                registeredCleanup();
                expect(mockSubscription.unsubscribe).toHaveBeenCalledTimes(1);
            });
        });

        describe("when autoStartActor is true", () => {
            beforeEach(() => {
                mockActor.start = jest.fn();
                const config = { initialState: { items: [] as string[] } };
                const middleware = withActorControl({ actor: mockActor, autoStartActor: true });
                const enhancedConfig = middleware(config);
                enhancedConfig.onStoreCreated(mockStore);
            });

            it("should start the actor", () => {
                expect(mockActor.start).toHaveBeenCalledTimes(1);
            });
        });

        describe("when the original onStoreCreated is provided", () => {
            let originalOnStoreCreated: jest.Mock;

            beforeEach(() => {
                originalOnStoreCreated = jest.fn();
                const config = {
                    initialState: { items: [] as string[] },
                    onStoreCreated: originalOnStoreCreated,
                };
                const middleware = withActorControl({ actor: mockActor });
                const enhancedConfig = middleware(config);
                enhancedConfig.onStoreCreated(mockStore);
            });

            it("should call the original onStoreCreated", () => {
                expect(originalOnStoreCreated).toHaveBeenCalledTimes(1);
                expect(originalOnStoreCreated).toHaveBeenCalledWith(mockStore);
            });
        });

        describe("when the snapshot has no context property", () => {
            beforeEach(() => {
                mockActor.getSnapshot.mockReturnValue({ items: ["Brisket", "Pastrami"] });
                const config = {
                    initialState: { items: [] as string[] },
                };
                const middleware = withActorControl({ actor: mockActor });
                const enhancedConfig = middleware(config);
                enhancedConfig.onStoreCreated(mockStore);
            });

            it("should use the snapshot object itself as the context source", () => {
                expect(mockRunInAction).toHaveBeenCalledTimes(1);
            });
        });

        describe("when the actor snapshot has no keys matching initialState", () => {
            beforeEach(() => {
                mockRunInAction.mockClear();
                mockActor.getSnapshot.mockReturnValue({ context: { unrelated: "data" } });
                const config = {
                    initialState: { items: [] as string[] },
                };
                const middleware = withActorControl({ actor: mockActor });
                const enhancedConfig = middleware(config);
                enhancedConfig.onStoreCreated(mockStore);
            });

            it("should not call runInAction when there are no state updates", () => {
                expect(mockRunInAction).not.toHaveBeenCalled();
            });
        });

        describe("when mapSnapshotToState is provided", () => {
            let mockMapSnapshotToState: jest.Mock;

            beforeEach(() => {
                mockMapSnapshotToState = jest.fn().mockReturnValue({ items: ["Gyro", "Shawarma"] });
                const config = {
                    initialState: { items: [] as string[] },
                };
                const middleware = withActorControl({
                    actor: mockActor,
                    mapSnapshotToState: mockMapSnapshotToState,
                });
                const enhancedConfig = middleware(config);
                enhancedConfig.onStoreCreated(mockStore);
            });

            it("should call the custom mapping function with the snapshot and store", () => {
                expect(mockMapSnapshotToState).toHaveBeenCalledTimes(1);
                expect(mockMapSnapshotToState).toHaveBeenCalledWith(mockSnapshot, mockStore);
            });
        });

        describe("when mapSnapshotToState throws", () => {
            let mockOnError: jest.Mock, mappingError: Error;

            beforeEach(() => {
                mappingError = new Error("E_MAP_EXPLODED");
                mockOnError = jest.fn();
                const config = {
                    initialState: { items: [] as string[] },
                };
                const middleware = withActorControl({
                    actor: mockActor,
                    mapSnapshotToState: () => {
                        throw mappingError;
                    },
                    onError: mockOnError,
                });
                const enhancedConfig = middleware(config);
                enhancedConfig.onStoreCreated(mockStore);
            });

            it("should call onError with the thrown error", () => {
                expect(mockOnError).toHaveBeenCalledTimes(1);
                expect(mockOnError).toHaveBeenCalledWith(mappingError);
            });
        });

        describe("when mapSnapshotToState throws and no onError is provided", () => {
            let origConsoleError: any, mappingError: Error;

            beforeEach(() => {
                origConsoleError = console.error;
                console.error = jest.fn();
                mappingError = new Error("E_MAP_MELTED");
                const config = {
                    initialState: { items: [] as string[] },
                };
                const middleware = withActorControl({
                    actor: mockActor,
                    mapSnapshotToState: () => {
                        throw mappingError;
                    },
                });
                const enhancedConfig = middleware(config);
                enhancedConfig.onStoreCreated(mockStore);
            });

            afterEach(() => {
                console.error = origConsoleError;
            });

            it("should log the error to console.error", () => {
                expect(console.error).toHaveBeenCalledWith(
                    "Error updating store from actor snapshot:",
                    mappingError
                );
            });
        });

        describe("when an actor subscription error occurs without an onError handler", () => {
            let origConsoleError: any, subscriptionError: Error;

            beforeEach(() => {
                origConsoleError = console.error;
                console.error = jest.fn();
                subscriptionError = new Error("E_ACTOR_IMPLODED");

                const config = { initialState: { items: [] as string[] } };
                const middleware = withActorControl({ actor: mockActor });
                const enhancedConfig = middleware(config);
                enhancedConfig.onStoreCreated(mockStore);

                capturedSubscribeArgs.error(subscriptionError);
            });

            afterEach(() => {
                console.error = origConsoleError;
            });

            it("should log the error to console.error", () => {
                expect(console.error).toHaveBeenCalledWith(
                    "Error in actor subscription:",
                    subscriptionError
                );
            });
        });

        describe("when an actor subscription error occurs", () => {
            let mockOnError: jest.Mock, subscriptionError: Error;

            beforeEach(() => {
                mockOnError = jest.fn();
                subscriptionError = new Error("E_SOGGY_STROMBOLI");

                const config = { initialState: { items: [] as string[] } };
                const middleware = withActorControl({ actor: mockActor, onError: mockOnError });
                const enhancedConfig = middleware(config);
                enhancedConfig.onStoreCreated(mockStore);

                // Trigger the error handler captured during subscribe
                capturedSubscribeArgs.error(subscriptionError);
            });

            it("should call the onError handler with the error", () => {
                expect(mockOnError).toHaveBeenCalledTimes(1);
                expect(mockOnError).toHaveBeenCalledWith(subscriptionError);
            });
        });
    });

    describe("withActorControl action configuration", () => {
        describe("when allowRegularActions is true and config has actions", () => {
            let enhancedConfig: any;

            beforeEach(() => {
                const originalSetItems = jest.fn();
                const config = {
                    initialState: { items: [] as string[] },
                    actions: { setItems: originalSetItems },
                };
                const middleware = withActorControl({ actor: mockActor, allowRegularActions: true });
                enhancedConfig = middleware(config);
            });

            it("should preserve the original actions in the enhanced config", () => {
                expect(enhancedConfig.actions).toHaveProperty("setItems");
                expect(typeof enhancedConfig.actions.setItems).toBe("function");
            });
        });

        describe("when allowRegularActions is false and config has actions", () => {
            let origConsoleWarn: any, enhancedConfig: any;

            beforeEach(() => {
                origConsoleWarn = console.warn;
                console.warn = jest.fn();
                const config = {
                    initialState: { items: [] as string[] },
                    actions: { setItems: jest.fn() },
                };
                const middleware = withActorControl({ actor: mockActor, allowRegularActions: false });
                enhancedConfig = middleware(config);
                enhancedConfig.actions.setItems("ignored");
            });

            afterEach(() => {
                console.warn = origConsoleWarn;
            });

            it("should replace original actions with warning stubs", () => {
                expect(console.warn).toHaveBeenCalledWith(
                    expect.stringContaining("setItems")
                );
            });
        });
    });

    describe("withActorControl actor actions", () => {
        describe("when an actor action is invoked successfully", () => {
            let actorActionResult: any, mockActorActionFn: jest.Mock;

            beforeEach(() => {
                mockActorActionFn = jest.fn().mockReturnValue("TACO_TUESDAY");
                const config = { initialState: { items: [] as string[] } };
                const middleware = withActorControl({
                    actor: mockActor,
                    actorActions: { sendTacoEvent: mockActorActionFn },
                });
                const enhancedConfig = middleware(config);
                enhancedConfig.onStoreCreated(mockStore);
                actorActionResult = mockStore.actorActions.sendTacoEvent("extra_salsa");
            });

            it("should invoke the actor action with the actor as the first argument", () => {
                expect(mockActorActionFn).toHaveBeenCalledTimes(1);
                expect(mockActorActionFn).toHaveBeenCalledWith(mockActor, "extra_salsa");
            });

            it("should return the result of the actor action", () => {
                expect(actorActionResult).toBe("TACO_TUESDAY");
            });
        });

        describe("when an actor action throws and onError is provided", () => {
            let mockOnError: jest.Mock, actionError: Error, thrownError: any;

            beforeEach(() => {
                actionError = new Error("E_TACO_CATASTROPHE");
                mockOnError = jest.fn();
                const config = { initialState: { items: [] as string[] } };
                const middleware = withActorControl({
                    actor: mockActor,
                    actorActions: {
                        explode: () => {
                            throw actionError;
                        },
                    },
                    onError: mockOnError,
                });
                const enhancedConfig = middleware(config);
                enhancedConfig.onStoreCreated(mockStore);
                try {
                    mockStore.actorActions.explode();
                } catch (e) {
                    thrownError = e;
                }
            });

            it("should call onError with the thrown error", () => {
                expect(mockOnError).toHaveBeenCalledTimes(1);
                expect(mockOnError).toHaveBeenCalledWith(actionError);
            });

            it("should rethrow the error", () => {
                expect(thrownError).toBe(actionError);
            });
        });

        describe("when an actor action throws and no onError is provided", () => {
            let origConsoleError: any, actionError: Error, thrownError: any;

            beforeEach(() => {
                origConsoleError = console.error;
                console.error = jest.fn();
                actionError = new Error("E_STROMBOLI_SURGE");
                const config = { initialState: { items: [] as string[] } };
                const middleware = withActorControl({
                    actor: mockActor,
                    actorActions: {
                        explode: () => {
                            throw actionError;
                        },
                    },
                });
                const enhancedConfig = middleware(config);
                enhancedConfig.onStoreCreated(mockStore);
                try {
                    mockStore.actorActions.explode();
                } catch (e) {
                    thrownError = e;
                }
            });

            afterEach(() => {
                console.error = origConsoleError;
            });

            it("should log the error to console.error", () => {
                expect(console.error).toHaveBeenCalledWith(
                    "Error in actor action explode:",
                    actionError
                );
            });

            it("should rethrow the error", () => {
                expect(thrownError).toBe(actionError);
            });
        });
    });
});
