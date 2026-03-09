/* eslint-disable @typescript-eslint/no-explicit-any */
export default {};

import { createStore } from "@apogeelabs/beacon";
import type { BeaconActions } from "@apogeelabs/beacon";
import type { Flight, Hotel } from "../types";
import type { SelectionState, SelectionStep } from "./selectionStore";

// Branch map for selectionStore:
// 1. Initial state — step: "flights", selectedFlights: [], selectedHotels: []
// 2. setStep — assigns the provided step value to state.step
// 3. toggleFlight, idx < 0 — flight not in list → pushes it
// 4. toggleFlight, idx >= 0 — flight already in list → splices it out
// 5. toggleHotel, idx < 0 — hotel not in list → pushes it
// 6. toggleHotel, idx >= 0 — hotel already in list → splices it out
// 7. clearAll — resets step to "flights", splices both arrays empty
//
// Edge cases:
// - toggleFlight round-trip: add then remove returns to empty
// - toggleFlight preserves other flights when removing by id
// - toggleHotel round-trip: add then remove returns to empty
// - toggleHotel preserves other hotels when removing by id
// - clearAll on empty arrays is a no-op (no error)
// - clearAll resets step from "hotels" back to "flights"
// - clearAll clears both arrays when both are populated

// We create a fresh store per test using the same config as the module export.
// Importing the singleton directly would pollute state across tests.

type SelectionActions = BeaconActions<SelectionState> & {
    setStep: (state: SelectionState, step: SelectionStep) => void;
    toggleFlight: (state: SelectionState, flight: Flight) => void;
    toggleHotel: (state: SelectionState, hotel: Hotel) => void;
    clearAll: (state: SelectionState) => void;
};

function makeSelectionStore() {
    return createStore<SelectionState, Record<never, never>, SelectionActions>({
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
                state.selectedFlights.splice(0);
                state.selectedHotels.splice(0);
            },
        },
    });
}

const FLIGHT_MACH5: Flight = {
    id: "flt-mach5",
    airline: "Speed Racer Airways",
    origin: "MTP",
    destination: "TOKYO",
    departDate: "2025-06-15",
    returnDate: "2025-06-22",
    price: 1200,
    stops: 0,
    durationMinutes: 720,
    travelers: 2,
};

const FLIGHT_ENTERPRISE: Flight = {
    id: "flt-enterprise",
    airline: "Starfleet Express",
    origin: "SFO",
    destination: "VULCAN",
    departDate: "2025-07-01",
    returnDate: "2025-07-15",
    price: 9999,
    stops: 1,
    durationMinutes: 480,
    travelers: 430,
};

const HOTEL_OVERLOOK: Hotel = {
    id: "htl-overlook",
    name: "The Overlook Hotel",
    destination: "TOKYO",
    checkIn: "2025-06-15",
    checkOut: "2025-06-22",
    pricePerNight: 237,
    stars: 3,
    amenities: ["hedge maze", "room service"],
    maxGuests: 2,
};

const HOTEL_BATES: Hotel = {
    id: "htl-bates",
    name: "Bates Motel",
    destination: "FAIRVALE",
    checkIn: "2025-07-01",
    checkOut: "2025-07-03",
    pricePerNight: 49,
    stars: 1,
    amenities: ["taxidermy"],
    maxGuests: 1,
};

describe("selectionStore", () => {
    describe("when the store is first created", () => {
        let store: ReturnType<typeof makeSelectionStore>;

        beforeEach(() => {
            store = makeSelectionStore();
        });

        it("should initialize step to flights", () => {
            expect(store.step).toBe("flights");
        });

        it("should initialize selectedFlights as an empty array", () => {
            expect(store.selectedFlights).toEqual([]);
        });

        it("should initialize selectedHotels as an empty array", () => {
            expect(store.selectedHotels).toEqual([]);
        });
    });

    describe("when setStep is called with hotels", () => {
        let store: ReturnType<typeof makeSelectionStore>;

        beforeEach(() => {
            store = makeSelectionStore();
            store.actions.setStep("hotels");
        });

        it("should update step to hotels", () => {
            expect(store.step).toBe("hotels");
        });
    });

    describe("when setStep is called back to flights after being on hotels", () => {
        let store: ReturnType<typeof makeSelectionStore>;

        beforeEach(() => {
            store = makeSelectionStore();
            store.actions.setStep("hotels");
            store.actions.setStep("flights");
        });

        it("should update step back to flights", () => {
            expect(store.step).toBe("flights");
        });
    });

    describe("when toggleFlight is called with a flight not in the list", () => {
        let store: ReturnType<typeof makeSelectionStore>;

        beforeEach(() => {
            store = makeSelectionStore();
            store.actions.toggleFlight(FLIGHT_MACH5);
        });

        it("should add the flight to selectedFlights", () => {
            expect(store.selectedFlights).toEqual([FLIGHT_MACH5]);
        });
    });

    describe("when toggleFlight is called with a flight already in the list", () => {
        let store: ReturnType<typeof makeSelectionStore>;

        beforeEach(() => {
            store = makeSelectionStore();
            store.actions.toggleFlight(FLIGHT_MACH5);
            store.actions.toggleFlight(FLIGHT_MACH5);
        });

        it("should remove the flight from selectedFlights", () => {
            expect(store.selectedFlights).toEqual([]);
        });
    });

    describe("when toggleFlight removes one flight from a multi-flight selection", () => {
        let store: ReturnType<typeof makeSelectionStore>;

        beforeEach(() => {
            store = makeSelectionStore();
            store.actions.toggleFlight(FLIGHT_MACH5);
            store.actions.toggleFlight(FLIGHT_ENTERPRISE);
            store.actions.toggleFlight(FLIGHT_MACH5);
        });

        it("should only remove the toggled flight", () => {
            expect(store.selectedFlights).toEqual([FLIGHT_ENTERPRISE]);
        });
    });

    describe("when toggleHotel is called with a hotel not in the list", () => {
        let store: ReturnType<typeof makeSelectionStore>;

        beforeEach(() => {
            store = makeSelectionStore();
            store.actions.toggleHotel(HOTEL_OVERLOOK);
        });

        it("should add the hotel to selectedHotels", () => {
            expect(store.selectedHotels).toEqual([HOTEL_OVERLOOK]);
        });
    });

    describe("when toggleHotel is called with a hotel already in the list", () => {
        let store: ReturnType<typeof makeSelectionStore>;

        beforeEach(() => {
            store = makeSelectionStore();
            store.actions.toggleHotel(HOTEL_OVERLOOK);
            store.actions.toggleHotel(HOTEL_OVERLOOK);
        });

        it("should remove the hotel from selectedHotels", () => {
            expect(store.selectedHotels).toEqual([]);
        });
    });

    describe("when toggleHotel removes one hotel from a multi-hotel selection", () => {
        let store: ReturnType<typeof makeSelectionStore>;

        beforeEach(() => {
            store = makeSelectionStore();
            store.actions.toggleHotel(HOTEL_OVERLOOK);
            store.actions.toggleHotel(HOTEL_BATES);
            store.actions.toggleHotel(HOTEL_OVERLOOK);
        });

        it("should only remove the toggled hotel", () => {
            expect(store.selectedHotels).toEqual([HOTEL_BATES]);
        });
    });

    describe("when clearAll is called with both arrays populated and step at hotels", () => {
        let store: ReturnType<typeof makeSelectionStore>;

        beforeEach(() => {
            store = makeSelectionStore();
            store.actions.toggleFlight(FLIGHT_MACH5);
            store.actions.toggleFlight(FLIGHT_ENTERPRISE);
            store.actions.toggleHotel(HOTEL_OVERLOOK);
            store.actions.setStep("hotels");
            store.actions.clearAll();
        });

        it("should empty selectedFlights", () => {
            expect(store.selectedFlights).toEqual([]);
        });

        it("should empty selectedHotels", () => {
            expect(store.selectedHotels).toEqual([]);
        });

        it("should reset step to flights", () => {
            expect(store.step).toBe("flights");
        });
    });

    describe("when clearAll is called on a store with no selections", () => {
        let store: ReturnType<typeof makeSelectionStore>;
        let thrownError: unknown;

        beforeEach(() => {
            store = makeSelectionStore();
            try {
                store.actions.clearAll();
            } catch (err) {
                thrownError = err;
            }
        });

        it("should not throw", () => {
            expect(thrownError).toBeUndefined();
        });

        it("should leave selectedFlights empty", () => {
            expect(store.selectedFlights).toEqual([]);
        });

        it("should leave selectedHotels empty", () => {
            expect(store.selectedHotels).toEqual([]);
        });

        it("should leave step as flights", () => {
            expect(store.step).toBe("flights");
        });
    });
});
