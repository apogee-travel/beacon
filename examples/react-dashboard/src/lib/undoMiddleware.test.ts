/* eslint-disable @typescript-eslint/no-explicit-any */
export default {};

import { createStore } from "@apogeelabs/beacon";
import { undoMiddleware } from "./undoMiddleware";

// Branch map for undoMiddleware:
// 1. Initial state: canUndo = false, canRedo = false (no history yet)
// 2. After one action: canUndo = true, canRedo = false, undo reverses it
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
    // MobX reactions fire asynchronously by default, but reaction() in undoMiddleware
    // fires synchronously because getStateSnapshot() is a pure read — no async needed.
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
                // undo/redo are injected by the middleware — these are stubs for typing
                undo: () => {},
                redo: () => {},
            },
        })
    );
}

function makeStoreWithOnStoreCreated(
    maxHistory?: number,
    onCreatedCallback?: (store: any) => void
) {
    return createStore<CounterState, CounterDerived, CounterActions>(
        undoMiddleware<CounterState, CounterDerived, CounterActions>({ maxHistory })({
            initialState: { count: 0, label: "start" },
            onStoreCreated: onCreatedCallback,
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

    describe("when multiple undos are applied in sequence", () => {
        let store: ReturnType<typeof makeStore>;

        beforeEach(() => {
            store = makeStore();
            store.actions.increment(); // count: 1
            store.actions.setLabel("middle"); // label: "middle"
            store.actions.increment(); // count: 2
            store.actions.undo(); // count: 1
            store.actions.undo(); // label: "start"
        });

        it("should revert to the state two actions back", () => {
            expect(store.count).toBe(1);
            expect(store.label).toBe("start");
        });

        it("should have two redo entries available", () => {
            // We can redo the label change and then the increment
            store.actions.redo();
            expect(store.label).toBe("middle");
            store.actions.redo();
            expect(store.count).toBe(2);
        });
    });

    describe("when history exceeds maxHistory", () => {
        let store: ReturnType<typeof makeStore>;

        beforeEach(() => {
            // maxHistory of 3 — only the last 3 snapshots are kept
            store = makeStore(3);
            // Push 5 actions — history cap should drop the oldest 2
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

        it("should not undo beyond the history cap", () => {
            for (let i = 0; i < 10; i++) {
                store.actions.undo();
            }
            // Oldest preserved state has count 2 (5 increments, drop oldest 2 = start from 2)
            expect(store.count).toBe(2);
        });
    });

    describe("when undo is called with an empty history", () => {
        let store: ReturnType<typeof makeStore>;

        beforeEach(() => {
            store = makeStore();
            // Call undo with no history — should be a no-op
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
            // redo with nothing in future — should be a no-op
            store.actions.redo();
        });

        it("should leave state at the current value", () => {
            expect(store.count).toBe(1);
        });
    });

    describe("when using default maxHistory", () => {
        let store: ReturnType<typeof makeStore>;

        beforeEach(() => {
            // No maxHistory option — defaults to 10
            store = makeStore();
            for (let i = 0; i < 15; i++) {
                store.actions.increment();
            }
        });

        it("should cap history at 10 entries", () => {
            let undoCount = 0;
            while (store.canUndo) {
                store.actions.undo();
                undoCount++;
            }
            expect(undoCount).toBe(10);
        });
    });

    describe("when the config already has an onStoreCreated hook", () => {
        let store: ReturnType<typeof makeStoreWithOnStoreCreated>;
        let originalOnStoreCreatedCalled: boolean;

        beforeEach(() => {
            originalOnStoreCreatedCalled = false;
            store = makeStoreWithOnStoreCreated(10, () => {
                originalOnStoreCreatedCalled = true;
            });
        });

        it("should call the original onStoreCreated hook", () => {
            expect(originalOnStoreCreatedCalled).toBe(true);
        });

        it("should still set up undo/redo correctly after chaining", () => {
            store.actions.increment();
            expect(store.canUndo).toBe(true);
        });
    });

    describe("when maxHistory is 0", () => {
        let store: ReturnType<typeof makeStore>;

        beforeEach(() => {
            store = makeStore(0);
            store.actions.increment();
        });

        it("should never accumulate any history entries", () => {
            expect(store.canUndo).toBe(false);
        });
    });

    describe("when the store is disposed", () => {
        let store: ReturnType<typeof makeStore>;

        beforeEach(() => {
            store = makeStore();
            store.actions.increment();
            store.dispose();
        });

        it("should mark the store as disposed", () => {
            expect(store.isDisposed).toBe(true);
        });
    });
});
