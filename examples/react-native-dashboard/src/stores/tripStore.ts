// Store definition for the trip itinerary.
// Identical config to the web example's useTripStore.ts.
// The key difference is lifecycle: on web, the store is created/disposed via useEffect.
// On RN, it's created/disposed via useFocusEffect — see app/trip.tsx for the implementation.
import { createStore } from "@apogeelabs/beacon";
import type { BeaconActions, BeaconDerived, Store } from "@apogeelabs/beacon";
import type { Flight, Hotel } from "../types";

export type TripState = {
    flights: Flight[];
    hotels: Hotel[];
};

export type TripDerived = BeaconDerived<TripState> & {
    totalCost: (state: TripState) => number;
    tripDuration: (state: TripState) => number;
    isComplete: (state: TripState) => boolean;
};

export type TripActions = BeaconActions<TripState> & {
    addFlight: (state: TripState, flight: Flight) => void;
    removeFlight: (state: TripState, flightId: string) => void;
    addHotel: (state: TripState, hotel: Hotel) => void;
    removeHotel: (state: TripState, hotelId: string) => void;
};

export type TripStore = Store<TripState, TripDerived, TripActions>;

/**
 * Creates a fresh tripStore instance.
 *
 * Called inside useFocusEffect in app/trip.tsx — every screen focus creates a new store.
 * Screen blur disposes it. Deliberately ephemeral: state does NOT persist between visits.
 *
 * This is the disposal demo's "aha moment": Beacon disposal driven by navigation events,
 * not component mount/unmount. Watch the console to see the lifecycle in action.
 */
export function createTripStore(): TripStore {
    return createStore<TripState, TripDerived, TripActions>({
        initialState: {
            flights: [],
            hotels: [],
        },
        derived: {
            // Total cost = sum of all flight prices + (pricePerNight * nights) for each hotel
            totalCost: state => {
                const flightTotal = state.flights.reduce((sum, f) => sum + f.price, 0);
                const hotelTotal = state.hotels.reduce((sum, h) => {
                    const checkIn = new Date(h.checkIn).getTime();
                    const checkOut = new Date(h.checkOut).getTime();
                    const nights = Math.max(
                        1,
                        Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24))
                    );
                    return sum + h.pricePerNight * nights;
                }, 0);
                return flightTotal + hotelTotal;
            },

            // Trip duration in days — span from earliest departure to latest checkout
            tripDuration: state => {
                const allDates: Date[] = [];
                state.flights.forEach(f => {
                    allDates.push(new Date(f.departDate), new Date(f.returnDate));
                });
                state.hotels.forEach(h => {
                    allDates.push(new Date(h.checkIn), new Date(h.checkOut));
                });

                if (allDates.length === 0) return 0;

                const earliest = Math.min(...allDates.map(d => d.getTime()));
                const latest = Math.max(...allDates.map(d => d.getTime()));
                return Math.round((latest - earliest) / (1000 * 60 * 60 * 24));
            },

            // A trip is "complete" if it has at least one flight and one hotel
            isComplete: state => state.flights.length > 0 && state.hotels.length > 0,
        },
        actions: {
            addFlight: (state, flight) => {
                // Deduplicate — don't add the same flight twice
                if (!state.flights.some(f => f.id === flight.id)) {
                    state.flights.push(flight);
                }
            },
            removeFlight: (state, flightId) => {
                state.flights = state.flights.filter(f => f.id !== flightId);
            },
            addHotel: (state, hotel) => {
                // Deduplicate — don't add the same hotel twice
                if (!state.hotels.some(h => h.id === hotel.id)) {
                    state.hotels.push(hotel);
                }
            },
            removeHotel: (state, hotelId) => {
                state.hotels = state.hotels.filter(h => h.id !== hotelId);
            },
        },
        onStoreCreated: () => {
            // Console signal for the disposal demo — developers watching the console
            // will see this fire on screen focus and the "disposed" log on blur.
            console.log("[tripStore] created — store is alive");
        },
    });
}
