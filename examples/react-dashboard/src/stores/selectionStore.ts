import { createStore } from "@apogeelabs/beacon";
import type { BeaconActions } from "@apogeelabs/beacon";
import type { Flight, Hotel } from "../types";

export type SelectionStep = "flights" | "hotels";

export type SelectionState = {
    step: SelectionStep;
    selectedFlights: Flight[];
    selectedHotels: Hotel[];
};

export type SelectionActions = BeaconActions<SelectionState> & {
    setStep: (state: SelectionState, step: SelectionStep) => void;
    toggleFlight: (state: SelectionState, flight: Flight) => void;
    toggleHotel: (state: SelectionState, hotel: Hotel) => void;
    clearAll: (state: SelectionState) => void;
};

// selectionStore is module-scoped like filtersStore — it needs to survive the re-render
// that occurs when SearchView conditionally shows hotels. A component-local store would
// reset on each render cycle. The SearchView cleanup effect calls clearAll() on unmount
// to prevent stale selections from leaking if the user navigates away mid-flow.
export const selectionStore = createStore<SelectionState, Record<never, never>, SelectionActions>({
    initialState: {
        step: "flights",
        selectedFlights: [],
        selectedHotels: [],
    },
    actions: {
        setStep: (state, step) => {
            state.step = step;
        },
        toggleFlight: (state, flight) => {
            const idx = state.selectedFlights.findIndex(f => f.id === flight.id);
            if (idx >= 0) {
                state.selectedFlights.splice(idx, 1);
            } else {
                state.selectedFlights.push(flight);
            }
        },
        toggleHotel: (state, hotel) => {
            const idx = state.selectedHotels.findIndex(h => h.id === hotel.id);
            if (idx >= 0) {
                state.selectedHotels.splice(idx, 1);
            } else {
                state.selectedHotels.push(hotel);
            }
        },
        clearAll: state => {
            state.step = "flights";
            // splice(0) clears in place, preserving the MobX observable array reference.
            // Reassigning with = [] would replace the observable with a plain array,
            // breaking reactivity for anything that captured a reference to the original.
            state.selectedFlights.splice(0);
            state.selectedHotels.splice(0);
        },
    },
});
