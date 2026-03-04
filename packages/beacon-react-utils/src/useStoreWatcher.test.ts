/* eslint-disable @typescript-eslint/no-explicit-any */

const mockMobX = {
    reaction: jest.fn(),
    toJS: jest.fn(),
};
jest.mock("mobx", () => {
    return mockMobX;
});

const mockReact = {
    useEffect: jest.fn(),
    useEffectEvent: jest.fn(fn => fn),
};
jest.mock("react", () => {
    return mockReact;
});

describe("useStoreWatcher", () => {
    let store: any, selector: any, onChange: any;

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
        onChange = jest.fn();
    });

    describe("with hook initialization", () => {
        beforeEach(async () => {
            mockReact.useEffect.mockImplementationOnce(() => {
                // no-op
            });
            const mod = await import("./useStoreWatcher");
            mod.useStoreWatcher(store, selector, onChange);
        });

        it("should useEffect to manage creating/disposing a mobX reaction", () => {
            expect(mockReact.useEffectEvent).toHaveBeenCalledTimes(2); // Called for selector and onChange
            expect(mockReact.useEffectEvent).toHaveBeenCalledWith(selector);
            expect(mockReact.useEffectEvent).toHaveBeenCalledWith(onChange);
            expect(mockReact.useEffect).toHaveBeenCalledTimes(1);
            expect(mockReact.useEffect).toHaveBeenCalledWith(expect.any(Function), [store, false]);
        });
    });

    describe("when executing the useEffect's callback", () => {
        let mobXDisposer: any;

        beforeEach(() => {
            mobXDisposer = jest.fn();
        });

        describe("with reaction creation/disposal", () => {
            beforeEach(async () => {
                mockReact.useEffect.mockImplementationOnce(cb => {
                    cb()();
                });
                mockMobX.reaction.mockReturnValueOnce(mobXDisposer);
                const mod = await import("./useStoreWatcher");
                mod.useStoreWatcher(store, selector, onChange);
            });

            it("should create a mobX reaction", () => {
                expect(mockMobX.reaction).toHaveBeenCalledTimes(1);
                expect(mockMobX.reaction).toHaveBeenCalledWith(
                    expect.any(Function),
                    expect.any(Function),
                    { fireImmediately: false }
                );
            });

            it("should register the disposer with the store", () => {
                expect(store.registerCleanup).toHaveBeenCalledTimes(1);
                expect(store.registerCleanup).toHaveBeenCalledWith(expect.any(Function));
                // assert that calling registerCleanup calls the disposer
                expect(mobXDisposer).toHaveBeenCalledTimes(1); // first time is the useEffect cleanup
                const cleanup = store.registerCleanup.mock.calls[0][0];
                expect(cleanup).toBeInstanceOf(Function);
                cleanup();
                expect(mobXDisposer).toHaveBeenCalledTimes(2);
            });

            it("should return a cleanup function from the useEffect that disposes of the reaction", () => {
                expect(mobXDisposer).toHaveBeenCalledTimes(1);
            });
        });

        describe("when executing the reaction's selector function", () => {
            beforeEach(async () => {
                mockReact.useEffect.mockImplementationOnce(cb => {
                    cb();
                });
                mockMobX.reaction.mockImplementationOnce(selector => {
                    selector();
                });
                const mod = await import("./useStoreWatcher");
                mod.useStoreWatcher(store, selector, onChange);
            });

            it("should convert the selected state to plain JS", () => {
                expect(mockMobX.toJS).toHaveBeenCalledTimes(1);
                expect(mockMobX.toJS).toHaveBeenCalledWith({
                    dinner: "calzone",
                    dessert: "cannoli",
                });
            });
        });

        describe("when executing the reaction's 'effect' function", () => {
            describe("when the previous value is falsy", () => {
                beforeEach(async () => {
                    mockReact.useEffect.mockImplementationOnce(cb => {
                        cb();
                    });
                    mockMobX.reaction.mockImplementationOnce((selector, effect) => {
                        effect({ dinner: "calzone", dessert: "cannoli" }, null);
                    });
                    const mod = await import("./useStoreWatcher");
                    mod.useStoreWatcher(store, selector, onChange);
                });

                it("should trigger onChange", () => {
                    expect(onChange).toHaveBeenCalledTimes(1);
                    expect(onChange).toHaveBeenCalledWith({
                        dinner: "calzone",
                        dessert: "cannoli",
                    });
                });
            });

            describe("when the value is different from the previous value", () => {
                beforeEach(async () => {
                    mockReact.useEffect.mockImplementationOnce(cb => {
                        cb();
                    });
                    mockMobX.reaction.mockImplementationOnce((selector, effect) => {
                        effect(
                            { dinner: "calzone", dessert: "cannoli" },
                            { dinner: "carbonara", dessert: "cannoli" }
                        );
                    });
                    const mod = await import("./useStoreWatcher");
                    mod.useStoreWatcher(store, selector, onChange);
                });

                it("should trigger onChange", () => {
                    expect(onChange).toHaveBeenCalledTimes(1);
                    expect(onChange).toHaveBeenCalledWith({
                        dinner: "calzone",
                        dessert: "cannoli",
                    });
                });
            });

            describe("when the value is equal to the previous value", () => {
                beforeEach(async () => {
                    mockReact.useEffect.mockImplementationOnce(cb => {
                        cb();
                    });
                    mockMobX.reaction.mockImplementationOnce((selector, effect) => {
                        effect(
                            { dinner: "calzone", dessert: "cannoli" },
                            { dinner: "calzone", dessert: "cannoli" }
                        );
                    });
                    const mod = await import("./useStoreWatcher");
                    mod.useStoreWatcher(store, selector, onChange);
                });

                it("should not trigger onChange", () => {
                    expect(onChange).not.toHaveBeenCalled();
                });
            });
        });
    });

    describe("when fireImmediately is true", () => {
        beforeEach(async () => {
            mockReact.useEffect.mockImplementationOnce(() => {
                // no-op
            });
            const mod = await import("./useStoreWatcher");
            mod.useStoreWatcher(store, selector, onChange, true);
        });

        it("should pass fireImmediately: true to the reaction", () => {
            expect(mockReact.useEffect).toHaveBeenCalledTimes(1);
            expect(mockReact.useEffect).toHaveBeenCalledWith(expect.any(Function), [store, true]);
        });
    });

    describe("when the useEffect executes with fireImmediately true", () => {
        beforeEach(async () => {
            mockReact.useEffect.mockImplementationOnce(cb => {
                cb();
            });
            mockMobX.reaction.mockReturnValueOnce(jest.fn());
            const mod = await import("./useStoreWatcher");
            mod.useStoreWatcher(store, selector, onChange, true);
        });

        it("should create the reaction with fireImmediately: true", () => {
            expect(mockMobX.reaction).toHaveBeenCalledTimes(1);
            expect(mockMobX.reaction).toHaveBeenCalledWith(
                expect.any(Function),
                expect.any(Function),
                { fireImmediately: true }
            );
        });
    });
});
