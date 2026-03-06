// Copied from examples/react-dashboard/src/stores/filtersStore.ts.
// Same store, same actions, same undo middleware — no changes needed for RN.
import { compose, createStore } from "@apogeelabs/beacon";
import type { BeaconActions, BeaconDerived } from "@apogeelabs/beacon";
import { undoMiddleware } from "../lib/undoMiddleware";

export type FiltersState = {
    destination: string;
    departDate: string;
    returnDate: string;
    travelers: number;
};

// No derived values on filtersStore — query key composition happens in the component layer.
export type FiltersDerived = BeaconDerived<FiltersState> & {
    canUndo: (state: FiltersState) => boolean;
    canRedo: (state: FiltersState) => boolean;
};

export type FiltersActions = BeaconActions<FiltersState> & {
    setDestination: (state: FiltersState, destination: string) => void;
    setDepartDate: (state: FiltersState, date: string) => void;
    setReturnDate: (state: FiltersState, date: string) => void;
    setTravelers: (state: FiltersState, count: number) => void;
    resetFilters: (state: FiltersState) => void;
    undo: (state: FiltersState) => void;
    redo: (state: FiltersState) => void;
};

const DEFAULT_STATE: FiltersState = {
    destination: "",
    departDate: "",
    returnDate: "",
    travelers: 1,
};

// filtersStore is long-lived — created at module scope, never disposed.
// Same as the web example: the undo middleware wraps it to track filter history.
export const filtersStore = createStore<FiltersState, FiltersDerived, FiltersActions>(
    compose<FiltersState, FiltersDerived, FiltersActions>(undoMiddleware({ maxHistory: 10 }))({
        initialState: { ...DEFAULT_STATE },
        actions: {
            setDestination: (state, destination) => {
                state.destination = destination;
            },
            setDepartDate: (state, date) => {
                state.departDate = date;
            },
            setReturnDate: (state, date) => {
                state.returnDate = date;
            },
            setTravelers: (state, count) => {
                state.travelers = count;
            },
            resetFilters: state => {
                state.destination = DEFAULT_STATE.destination;
                state.departDate = DEFAULT_STATE.departDate;
                state.returnDate = DEFAULT_STATE.returnDate;
                state.travelers = DEFAULT_STATE.travelers;
            },
            // undo/redo injected by undoMiddleware — stubs for type completeness
            undo: () => {},
            redo: () => {},
        },
    })
);
