import { createStore } from "@apogeelabs/beacon";
import { undoMiddleware } from "../lib/undoMiddleware";

export default {};

// Branch map for undoMiddleware:
// 1. No actions taken: canUndo = false, canRedo = false
// 2. After one action: canUndo = true, canRedo = false, undo reverts it
// 3. After undo: canRedo = true, redo re-applies the change
// 4. New action after undo: clears redo stack
// 5. maxHistory cap: oldest entries dropped when history exceeds limit
// 6. undo when past is empty: no-op
// 7. redo when future is empty: no-op

type CounterState = { count: number; label: string };
type CounterActions = {
    increment: (state: CounterState) => void;
    setLabel: (state: CounterState, label: string) => void;
    undo: (state: CounterState) => void;
    redo: (state: CounterState) => void;
};
type CounterDerived = {
    canUndo: (state: CounterState) => boolean;
    canRedo: (state: CounterState) => boolean;
};

function makeStore(maxHistory?: number) {
    return createStore<CounterState, CounterDerived, CounterActions>(
        undoMiddleware<CounterState, CounterDerived, CounterActions>({ maxHistory })({
            initialState: { count: 0, label: "start" },
            actions: {
                increment: (state: CounterState) => {
                    state.count += 1;
                },
                setLabel: (state: CounterState, label: string) => {
                    state.label = label;
                },
                undo: () => {},
                redo: () => {},
            },
        })
    );
}

describe("undoMiddleware", () => {
    describe("when no actions have been taken", () => {
        let store: ReturnType<typeof makeStore>;

        beforeEach(() => {
            store = makeStore();
        });

        it("should report canUndo as false", () => {
            expect(store.canUndo).toBe(false);
        });

        it("should report canRedo as false", () => {
            expect(store.canRedo).toBe(false);
        });
    });

    describe("when one action has been taken", () => {
        let store: ReturnType<typeof makeStore>;

        beforeEach(() => {
            store = makeStore();
            store.actions.increment();
        });

        it("should report canUndo as true", () => {
            expect(store.canUndo).toBe(true);
        });

        it("should report canRedo as false", () => {
            expect(store.canRedo).toBe(false);
        });

        it("should reflect the new state", () => {
            expect(store.count).toBe(1);
        });
    });

    describe("when undo is called after one action", () => {
        let store: ReturnType<typeof makeStore>;

        beforeEach(() => {
            store = makeStore();
            store.actions.increment();
            store.actions.undo();
        });

        it("should revert state to before the action", () => {
            expect(store.count).toBe(0);
        });

        it("should report canUndo as false", () => {
            expect(store.canUndo).toBe(false);
        });

        it("should report canRedo as true", () => {
            expect(store.canRedo).toBe(true);
        });
    });

    describe("when redo is called after undo", () => {
        let store: ReturnType<typeof makeStore>;

        beforeEach(() => {
            store = makeStore();
            store.actions.increment();
            store.actions.undo();
            store.actions.redo();
        });

        it("should restore the undone state", () => {
            expect(store.count).toBe(1);
        });

        it("should report canRedo as false", () => {
            expect(store.canRedo).toBe(false);
        });

        it("should report canUndo as true", () => {
            expect(store.canUndo).toBe(true);
        });
    });

    describe("when a new action is taken after undo (branching)", () => {
        let store: ReturnType<typeof makeStore>;

        beforeEach(() => {
            store = makeStore();
            store.actions.increment(); // count: 1
            store.actions.increment(); // count: 2
            store.actions.undo(); // count: 1, future = [2]
            store.actions.increment(); // count: 2 (new branch — clears redo stack)
        });

        it("should reflect the new action's state", () => {
            expect(store.count).toBe(2);
        });

        it("should clear the redo stack", () => {
            expect(store.canRedo).toBe(false);
        });
    });

    describe("when history exceeds maxHistory", () => {
        let store: ReturnType<typeof makeStore>;

        beforeEach(() => {
            store = makeStore(3);
            for (let i = 0; i < 5; i++) {
                store.actions.increment();
            }
        });

        it("should be able to undo up to maxHistory times", () => {
            let undoCount = 0;
            while (store.canUndo) {
                store.actions.undo();
                undoCount++;
            }
            expect(undoCount).toBe(3);
        });
    });

    describe("when undo is called with an empty history", () => {
        let store: ReturnType<typeof makeStore>;

        beforeEach(() => {
            store = makeStore();
            store.actions.undo();
        });

        it("should leave state unchanged", () => {
            expect(store.count).toBe(0);
        });

        it("should not enable canRedo", () => {
            expect(store.canRedo).toBe(false);
        });
    });

    describe("when redo is called with an empty future", () => {
        let store: ReturnType<typeof makeStore>;

        beforeEach(() => {
            store = makeStore();
            store.actions.increment();
            store.actions.redo();
        });

        it("should leave state at the current value", () => {
            expect(store.count).toBe(1);
        });
    });

    describe("when no maxHistory is provided", () => {
        let store: ReturnType<typeof makeStore>;

        beforeEach(() => {
            store = createStore<CounterState, CounterDerived, CounterActions>(
                undoMiddleware<CounterState, CounterDerived, CounterActions>()({
                    initialState: { count: 0, label: "start" },
                    actions: {
                        increment: (state: CounterState) => {
                            state.count += 1;
                        },
                        setLabel: (state: CounterState, label: string) => {
                            state.label = label;
                        },
                        undo: () => {},
                        redo: () => {},
                    },
                })
            );
            for (let i = 0; i < 10; i++) {
                store.actions.increment();
            }
        });

        it("should default to 10 history entries", () => {
            let undoCount = 0;
            while (store.canUndo) {
                store.actions.undo();
                undoCount++;
            }
            expect(undoCount).toBe(10);
        });
    });

    describe("when onStoreCreated is already set on the config", () => {
        let existingHookCallCount: number, store: ReturnType<typeof makeStore>;

        beforeEach(() => {
            existingHookCallCount = 0;
            store = createStore<CounterState, CounterDerived, CounterActions>(
                undoMiddleware<CounterState, CounterDerived, CounterActions>()({
                    initialState: { count: 0, label: "start" },
                    actions: {
                        increment: (state: CounterState) => {
                            state.count += 1;
                        },
                        setLabel: (state: CounterState, label: string) => {
                            state.label = label;
                        },
                        undo: () => {},
                        redo: () => {},
                    },
                    onStoreCreated: () => {
                        existingHookCallCount += 1;
                    },
                })
            );
        });

        it("should call the original onStoreCreated hook", () => {
            expect(existingHookCallCount).toBe(1);
        });

        it("should still wire up undo/redo correctly after chaining", () => {
            store.actions.increment();
            expect(store.canUndo).toBe(true);
        });
    });

    describe("when multiple consecutive undos are performed", () => {
        let store: ReturnType<typeof makeStore>;

        beforeEach(() => {
            store = makeStore();
            store.actions.increment(); // count: 1
            store.actions.increment(); // count: 2
            store.actions.increment(); // count: 3
            store.actions.undo(); // count: 2
            store.actions.undo(); // count: 1
        });

        it("should revert state across multiple undo steps", () => {
            expect(store.count).toBe(1);
        });

        it("should have two redo entries available", () => {
            store.actions.redo(); // count: 2
            store.actions.redo(); // count: 3
            expect(store.count).toBe(3);
            expect(store.canRedo).toBe(false);
        });
    });

    describe("when redo restores and undo is still available", () => {
        let store: ReturnType<typeof makeStore>;

        beforeEach(() => {
            store = makeStore();
            store.actions.increment(); // count: 1, past: [{count:0}]
            store.actions.increment(); // count: 2, past: [{count:0},{count:1}]
            store.actions.undo(); // count: 1, past: [{count:0}], future: [{count:2}]
            store.actions.redo(); // count: 2, past: [{count:0},{count:1}], future: []
        });

        it("should report canUndo as true after redo", () => {
            expect(store.canUndo).toBe(true);
        });

        it("should report canRedo as false after redo exhausts future", () => {
            expect(store.canRedo).toBe(false);
        });
    });
});
