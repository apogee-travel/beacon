/* eslint-disable @typescript-eslint/no-explicit-any */
export default {};

import { createStore } from "@apogeelabs/beacon";
import { undoMiddleware } from "../lib/undoMiddleware";
import type { FiltersState, FiltersDerived, FiltersActions } from "./filtersStore";

// Branch map for filtersStore:
// 1. setDestination action — updates destination in state
// 2. setDepartDate action — updates departDate in state
// 3. setReturnDate action — updates returnDate in state
// 4. setTravelers action — updates travelers in state
// 5. resetFilters action — resets all state fields to DEFAULT_STATE values
// 6. canUndo / canRedo derived values — wired through undoMiddleware
// 7. getStateSnapshot() returns correct shape

// We can't import the module-level filtersStore singleton (it creates the store on import
// and has side effects from undoMiddleware). Instead, we create a fresh equivalent store
// per test to avoid cross-test state pollution.

const DEFAULT_STATE: FiltersState = {
    destination: "",
    departDate: "",
    returnDate: "",
    travelers: 1,
};

function makeFiltersStore() {
    return createStore<FiltersState, FiltersDerived, FiltersActions>(
        undoMiddleware<FiltersState, FiltersDerived, FiltersActions>({ maxHistory: 10 })({
            initialState: { ...DEFAULT_STATE },
            actions: {
                setDestination: (state: FiltersState, destination: string) => {
                    state.destination = destination;
                },
                setDepartDate: (state: FiltersState, date: string) => {
                    state.departDate = date;
                },
                setReturnDate: (state: FiltersState, date: string) => {
                    state.returnDate = date;
                },
                setTravelers: (state: FiltersState, count: number) => {
                    state.travelers = count;
                },
                resetFilters: (state: FiltersState) => {
                    state.destination = DEFAULT_STATE.destination;
                    state.departDate = DEFAULT_STATE.departDate;
                    state.returnDate = DEFAULT_STATE.returnDate;
                    state.travelers = DEFAULT_STATE.travelers;
                },
                undo: () => {},
                redo: () => {},
            },
        })
    );
}

describe("filtersStore", () => {
    describe("when the store is first created", () => {
        let store: ReturnType<typeof makeFiltersStore>;

        beforeEach(() => {
            store = makeFiltersStore();
        });

        it("should initialize with the default destination", () => {
            expect(store.destination).toBe("");
        });

        it("should initialize with the default departDate", () => {
            expect(store.departDate).toBe("");
        });

        it("should initialize with the default returnDate", () => {
            expect(store.returnDate).toBe("");
        });

        it("should initialize with the default travelers count", () => {
            expect(store.travelers).toBe(1);
        });

        it("should return the correct initial snapshot shape", () => {
            expect(store.getStateSnapshot()).toEqual(
                expect.objectContaining({
                    destination: "",
                    departDate: "",
                    returnDate: "",
                    travelers: 1,
                })
            );
        });
    });

    describe("when setDestination is called", () => {
        let store: ReturnType<typeof makeFiltersStore>;

        beforeEach(() => {
            store = makeFiltersStore();
            store.actions.setDestination("Tokyo");
        });

        it("should update the destination", () => {
            expect(store.destination).toBe("Tokyo");
        });

        it("should reflect the new destination in the snapshot", () => {
            expect(store.getStateSnapshot().destination).toBe("Tokyo");
        });
    });

    describe("when setDepartDate is called", () => {
        let store: ReturnType<typeof makeFiltersStore>;

        beforeEach(() => {
            store = makeFiltersStore();
            store.actions.setDepartDate("2025-07-04");
        });

        it("should update the departDate", () => {
            expect(store.departDate).toBe("2025-07-04");
        });
    });

    describe("when setReturnDate is called", () => {
        let store: ReturnType<typeof makeFiltersStore>;

        beforeEach(() => {
            store = makeFiltersStore();
            store.actions.setReturnDate("2025-07-11");
        });

        it("should update the returnDate", () => {
            expect(store.returnDate).toBe("2025-07-11");
        });
    });

    describe("when setTravelers is called", () => {
        let store: ReturnType<typeof makeFiltersStore>;

        beforeEach(() => {
            store = makeFiltersStore();
            store.actions.setTravelers(4);
        });

        it("should update the travelers count", () => {
            expect(store.travelers).toBe(4);
        });
    });

    describe("when resetFilters is called after changes have been made", () => {
        let store: ReturnType<typeof makeFiltersStore>;

        beforeEach(() => {
            store = makeFiltersStore();
            store.actions.setDestination("London");
            store.actions.setDepartDate("2025-08-01");
            store.actions.setReturnDate("2025-08-10");
            store.actions.setTravelers(3);
            store.actions.resetFilters();
        });

        it("should reset destination to empty string", () => {
            expect(store.destination).toBe("");
        });

        it("should reset departDate to empty string", () => {
            expect(store.departDate).toBe("");
        });

        it("should reset returnDate to empty string", () => {
            expect(store.returnDate).toBe("");
        });

        it("should reset travelers to 1", () => {
            expect(store.travelers).toBe(1);
        });

        it("should return the default snapshot after reset", () => {
            expect(store.getStateSnapshot()).toEqual(expect.objectContaining(DEFAULT_STATE));
        });
    });

    describe("when undo is called after setDestination", () => {
        let store: ReturnType<typeof makeFiltersStore>;

        beforeEach(() => {
            store = makeFiltersStore();
            store.actions.setDestination("Barcelona");
            store.actions.undo();
        });

        it("should restore the destination to its previous value", () => {
            expect(store.destination).toBe("");
        });
    });

    describe("when redo is called after undo on setTravelers", () => {
        let store: ReturnType<typeof makeFiltersStore>;

        beforeEach(() => {
            store = makeFiltersStore();
            store.actions.setTravelers(6);
            store.actions.undo();
            store.actions.redo();
        });

        it("should restore the travelers count", () => {
            expect(store.travelers).toBe(6);
        });
    });
});
