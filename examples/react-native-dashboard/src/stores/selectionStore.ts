// Holds the transient selection state for the stepped flight+hotel selection flow.
// Module-scoped like filtersStore — persists across the two steps (flights → hotels),
// cleared when SearchScreen regains focus (user returns from Trip screen).
import { createStore } from "@apogeelabs/beacon";
import type { BeaconActions, BeaconDerived } from "@apogeelabs/beacon";
import type { Flight, Hotel } from "../types";

export type SelectionStep = "flights" | "hotels";

export type SelectionState = {
    step: SelectionStep;
    selectedFlights: Flight[];
    selectedHotels: Hotel[];
};

// No derived values needed — components compute what they need directly from state.
export type SelectionDerived = BeaconDerived<SelectionState>;

export type SelectionActions = BeaconActions<SelectionState> & {
    setStep: (state: SelectionState, step: SelectionStep) => void;
    toggleFlight: (state: SelectionState, flight: Flight) => void;
    toggleHotel: (state: SelectionState, hotel: Hotel) => void;
    clearAll: (state: SelectionState) => void;
};

export const selectionStore = createStore<SelectionState, SelectionDerived, SelectionActions>({
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
                // Already selected — remove it
                state.selectedFlights.splice(idx, 1);
            } else {
                state.selectedFlights.push(flight);
            }
        },
        toggleHotel: (state, hotel) => {
            const idx = state.selectedHotels.findIndex(h => h.id === hotel.id);
            if (idx >= 0) {
                // Already selected — remove it
                state.selectedHotels.splice(idx, 1);
            } else {
                state.selectedHotels.push(hotel);
            }
        },
        // Resets all selection state back to initial — called on SearchScreen focus
        // so stale selections from a previous flow don't bleed into a new one.
        clearAll: state => {
            state.step = "flights";
            state.selectedFlights.splice(0, state.selectedFlights.length);
            state.selectedHotels.splice(0, state.selectedHotels.length);
        },
    },
});
