import { useEffect, useRef, useState } from "react";
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

function createTripStore(): TripStore {
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
            // Visible disposal signal — the "aha moment" for store lifecycle demos.
            // Developers watching the console will see this fire when they navigate away from /trip.
            console.log("[tripStore] created — store is alive");
        },
    });
}

/**
 * Creates a tripStore on mount and disposes it on unmount.
 *
 * This hook is the lifecycle demonstration: every time you navigate to /trip,
 * a fresh store is created. When you navigate away, it's disposed and garbage-collected.
 * The "My Trip" state does NOT persist between visits — that's intentional.
 *
 * This contrasts with filtersStore (module-scoped, lives forever) and settingsStore
 * (module-scoped, persisted to localStorage).
 */
export function useTripStore(): TripStore {
    // useState (not useRef) so that replacing the store triggers a re-render.
    // useRef silently holds the new value — child components would keep rendering
    // against the old disposed store until something else forces a re-render.
    const [store, setStore] = useState<TripStore>(() => createTripStore());
    const disposalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // If StrictMode re-mounted us, cancel the pending disposal — the store is still needed.
        if (disposalTimer.current !== null) {
            clearTimeout(disposalTimer.current);
            disposalTimer.current = null;
        }

        return () => {
            // Defer disposal to a macrotask. On a real unmount the timeout fires
            // and disposes the store. On a StrictMode double-invoke the re-mount
            // effect cancels it above before it ever runs.
            disposalTimer.current = setTimeout(() => {
                if (!store.isDisposed) {
                    console.log("[tripStore] disposed — navigated away from /trip");
                    store.dispose();
                }
            }, 0);
        };
    }, [store]);

    // StrictMode safety net: if the store somehow ends up disposed mid-render
    // (e.g., a slow re-render after a missed cancellation), replace it.
    if (store.isDisposed) {
        const newStore = createTripStore();
        setStore(newStore);
        return newStore;
    }

    return store;
}
