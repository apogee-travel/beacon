import { createTripStore } from "../stores/tripStore";
import type { TripStore } from "../stores/tripStore";

export default {};

// Branch map for createTripStore / TripStore:
// 1. addFlight — adds a flight; deduplicates if same id added twice
// 2. removeFlight — removes a flight by id
// 3. addHotel — adds a hotel; deduplicates if same id added twice
// 4. removeHotel — removes a hotel by id
// 5. totalCost derived — sums flight prices + hotel pricePerNight * nights
// 6. tripDuration derived — span from earliest to latest date across all items
// 7. tripDuration derived — returns 0 when no items
// 8. isComplete derived — true only when both flights and hotels are present
// 9. dispose — store disposes and marks isDisposed = true

const PARIS_FLIGHT = {
    id: "fl-001",
    airline: "Delta",
    origin: "JFK",
    destination: "Paris",
    departDate: "2025-06-15",
    returnDate: "2025-06-22",
    price: 980,
    stops: 0,
    durationMinutes: 445,
    travelers: 4,
};

const PARIS_HOTEL = {
    id: "ht-001",
    name: "Hotel Le Marais",
    destination: "Paris",
    checkIn: "2025-06-15",
    checkOut: "2025-06-22",
    pricePerNight: 220,
    stars: 4 as const,
    amenities: ["wifi"],
    maxGuests: 2,
};

describe("createTripStore", () => {
    describe("initial state", () => {
        let store: TripStore;

        beforeEach(() => {
            store = createTripStore();
        });

        it("should have empty flights array", () => {
            expect(store.flights).toEqual([]);
        });

        it("should have empty hotels array", () => {
            expect(store.hotels).toEqual([]);
        });

        it("should have totalCost of 0", () => {
            expect(store.totalCost).toBe(0);
        });

        it("should have tripDuration of 0", () => {
            expect(store.tripDuration).toBe(0);
        });

        it("should report isComplete as false", () => {
            expect(store.isComplete).toBe(false);
        });
    });

    describe("when a flight is added", () => {
        let store: TripStore;

        beforeEach(() => {
            store = createTripStore();
            store.actions.addFlight(PARIS_FLIGHT);
        });

        it("should include the flight in flights", () => {
            expect(store.flights).toHaveLength(1);
            expect(store.flights[0].id).toBe("fl-001");
        });

        it("should update totalCost with the flight price", () => {
            expect(store.totalCost).toBe(980);
        });

        it("should not report isComplete (no hotel yet)", () => {
            expect(store.isComplete).toBe(false);
        });
    });

    describe("when the same flight is added twice (deduplication)", () => {
        let store: TripStore;

        beforeEach(() => {
            store = createTripStore();
            store.actions.addFlight(PARIS_FLIGHT);
            store.actions.addFlight(PARIS_FLIGHT);
        });

        it("should only contain one flight", () => {
            expect(store.flights).toHaveLength(1);
        });
    });

    describe("when a flight is removed", () => {
        let store: TripStore;

        beforeEach(() => {
            store = createTripStore();
            store.actions.addFlight(PARIS_FLIGHT);
            store.actions.removeFlight("fl-001");
        });

        it("should have empty flights", () => {
            expect(store.flights).toHaveLength(0);
        });

        it("should reset totalCost to 0", () => {
            expect(store.totalCost).toBe(0);
        });
    });

    describe("when a hotel is added", () => {
        let store: TripStore;

        beforeEach(() => {
            store = createTripStore();
            store.actions.addHotel(PARIS_HOTEL);
        });

        it("should include the hotel in hotels", () => {
            expect(store.hotels).toHaveLength(1);
            expect(store.hotels[0].id).toBe("ht-001");
        });

        it("should update totalCost with hotel cost (7 nights * $220)", () => {
            // checkIn: 2025-06-15, checkOut: 2025-06-22 = 7 nights
            expect(store.totalCost).toBe(220 * 7);
        });
    });

    describe("when the same hotel is added twice (deduplication)", () => {
        let store: TripStore;

        beforeEach(() => {
            store = createTripStore();
            store.actions.addHotel(PARIS_HOTEL);
            store.actions.addHotel(PARIS_HOTEL);
        });

        it("should only contain one hotel", () => {
            expect(store.hotels).toHaveLength(1);
        });
    });

    describe("when a hotel is removed", () => {
        let store: TripStore;

        beforeEach(() => {
            store = createTripStore();
            store.actions.addHotel(PARIS_HOTEL);
            store.actions.removeHotel("ht-001");
        });

        it("should have empty hotels", () => {
            expect(store.hotels).toHaveLength(0);
        });
    });

    describe("when both a flight and hotel are added", () => {
        let store: TripStore;

        beforeEach(() => {
            store = createTripStore();
            store.actions.addFlight(PARIS_FLIGHT);
            store.actions.addHotel(PARIS_HOTEL);
        });

        it("should report isComplete as true", () => {
            expect(store.isComplete).toBe(true);
        });

        it("should compute correct totalCost (flight + hotel)", () => {
            // $980 flight + 7 nights * $220 hotel = $980 + $1540 = $2520
            expect(store.totalCost).toBe(980 + 220 * 7);
        });

        it("should compute tripDuration as 7 days", () => {
            // 2025-06-15 to 2025-06-22 = 7 days
            expect(store.tripDuration).toBe(7);
        });
    });

    describe("when dispose is called", () => {
        let store: TripStore;

        beforeEach(() => {
            store = createTripStore();
            store.dispose();
        });

        it("should mark the store as disposed", () => {
            expect(store.isDisposed).toBe(true);
        });
    });

    describe("when removeFlight is called with an ID that does not exist", () => {
        let store: TripStore;

        beforeEach(() => {
            store = createTripStore();
            store.actions.addFlight(PARIS_FLIGHT);
            store.actions.removeFlight("fl-NOT-REAL");
        });

        it("should leave the existing flight in place", () => {
            expect(store.flights).toHaveLength(1);
        });
    });

    describe("when removeHotel is called with an ID that does not exist", () => {
        let store: TripStore;

        beforeEach(() => {
            store = createTripStore();
            store.actions.addHotel(PARIS_HOTEL);
            store.actions.removeHotel("ht-NOT-REAL");
        });

        it("should leave the existing hotel in place", () => {
            expect(store.hotels).toHaveLength(1);
        });
    });

    describe("when actions are called after dispose", () => {
        let store: TripStore;

        beforeEach(() => {
            store = createTripStore();
            store.dispose();
            store.actions.addFlight(PARIS_FLIGHT);
            store.actions.addHotel(PARIS_HOTEL);
        });

        it("should retain state values — actions are no-ops but state is not nullified", () => {
            // dispose() no longer nullifies observable state to avoid triggering reactive re-renders.
            // State remains readable (stale but safe); use isDisposed to gate access.
            expect(store.flights).toEqual([]);
        });
    });

    describe("when dispose is called twice", () => {
        let store: TripStore;

        beforeEach(() => {
            store = createTripStore();
            store.dispose();
            store.dispose();
        });

        it("should remain disposed", () => {
            expect(store.isDisposed).toBe(true);
        });
    });

    describe("when a hotel with same-day check-in and check-out is added", () => {
        let store: TripStore;

        const SAME_DAY_HOTEL = {
            id: "ht-same-day",
            name: "Flash Stay",
            destination: "Vegas",
            checkIn: "2025-08-15",
            checkOut: "2025-08-15",
            pricePerNight: 200,
            stars: 3 as const,
            amenities: ["wifi"],
            maxGuests: 2,
        };

        beforeEach(() => {
            store = createTripStore();
            store.actions.addHotel(SAME_DAY_HOTEL);
        });

        it("should compute totalCost using a minimum of 1 night", () => {
            expect(store.totalCost).toBe(200);
        });
    });

    describe("when only hotels are present (no flights)", () => {
        let store: TripStore;

        beforeEach(() => {
            store = createTripStore();
            store.actions.addHotel(PARIS_HOTEL);
        });

        it("should compute tripDuration from hotel dates", () => {
            expect(store.tripDuration).toBe(7);
        });

        it("should report isComplete as false", () => {
            expect(store.isComplete).toBe(false);
        });
    });

    describe("when flight and hotel have non-overlapping dates", () => {
        let store: TripStore;

        const EARLY_FLIGHT = {
            id: "fl-early",
            airline: "Wayback Airways",
            origin: "NYC",
            destination: "Tatooine",
            departDate: "2025-06-01",
            returnDate: "2025-06-05",
            price: 500,
            stops: 0,
            durationMinutes: 60,
            travelers: 2,
        };

        const LATE_HOTEL = {
            id: "ht-late",
            name: "Mos Eisley Cantina Suites",
            destination: "Tatooine",
            checkIn: "2025-06-10",
            checkOut: "2025-06-20",
            pricePerNight: 100,
            stars: 2 as const,
            amenities: ["wifi"],
            maxGuests: 2,
        };

        beforeEach(() => {
            store = createTripStore();
            store.actions.addFlight(EARLY_FLIGHT);
            store.actions.addHotel(LATE_HOTEL);
        });

        it("should compute tripDuration as span from earliest to latest date across all items", () => {
            // 2025-06-01 to 2025-06-20 = 19 days
            expect(store.tripDuration).toBe(19);
        });
    });
});
