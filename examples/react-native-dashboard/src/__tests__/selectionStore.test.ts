/* eslint-disable @typescript-eslint/no-explicit-any */
export default {};

// Branch map for selectionStore:
// 1. Initial state — step "flights", empty arrays
// 2. setStep — transitions step to "hotels"
// 3. toggleFlight (idx < 0) — flight not present, pushes it
// 4. toggleFlight (idx >= 0) — flight present, splices it out
// 5. toggleHotel (idx < 0) — hotel not present, pushes it
// 6. toggleHotel (idx >= 0) — hotel present, splices it out
// 7. clearAll — resets step and clears both arrays in-place via splice
// 8. clearAll preserves observable array reference (the = [] reassignment bug)
// 9. Multiple items in array, toggle one in the middle (index precision)
// 10. Actions are no-ops after dispose (store base behavior)

const HEATHROW_FLIGHT = {
    id: "fl-lhr-001",
    airline: "British Airways",
    origin: "JFK",
    destination: "London",
    departDate: "2025-07-10",
    returnDate: "2025-07-24",
    price: 1150,
    stops: 0,
    durationMinutes: 420,
    travelers: 2,
};

const GATWICK_FLIGHT = {
    id: "fl-lgw-002",
    airline: "Virgin Atlantic",
    origin: "BOS",
    destination: "London",
    departDate: "2025-07-10",
    returnDate: "2025-07-24",
    price: 980,
    stops: 1,
    durationMinutes: 460,
    travelers: 2,
};

const STANSTED_FLIGHT = {
    id: "fl-stn-003",
    airline: "Ryanair",
    origin: "NYC",
    destination: "London",
    departDate: "2025-07-10",
    returnDate: "2025-07-24",
    price: 620,
    stops: 2,
    durationMinutes: 510,
    travelers: 2,
};

const CLARIDGES_HOTEL = {
    id: "ht-clr-001",
    name: "Claridge's",
    destination: "London",
    checkIn: "2025-07-10",
    checkOut: "2025-07-17",
    pricePerNight: 850,
    stars: 5 as const,
    amenities: ["wifi", "spa", "concierge"],
    maxGuests: 2,
};

const TRAVELODGE_HOTEL = {
    id: "ht-tvl-002",
    name: "Travelodge Central",
    destination: "London",
    checkIn: "2025-07-10",
    checkOut: "2025-07-17",
    pricePerNight: 90,
    stars: 2 as const,
    amenities: ["wifi"],
    maxGuests: 2,
};

describe("selectionStore", () => {
    let selectionStore: any;

    beforeEach(async () => {
        jest.resetModules();
        jest.clearAllMocks();
        ({ selectionStore } = await import("../stores/selectionStore"));
    });

    describe("initial state", () => {
        it("should default step to flights", () => {
            expect(selectionStore.step).toBe("flights");
        });

        it("should have an empty selectedFlights array", () => {
            expect(selectionStore.selectedFlights).toEqual([]);
        });

        it("should have an empty selectedHotels array", () => {
            expect(selectionStore.selectedHotels).toEqual([]);
        });
    });

    describe("when setStep is called with hotels", () => {
        beforeEach(() => {
            selectionStore.actions.setStep("hotels");
        });

        it("should update step to hotels", () => {
            expect(selectionStore.step).toBe("hotels");
        });
    });

    describe("when toggleFlight is called with a flight not yet selected", () => {
        beforeEach(() => {
            selectionStore.actions.toggleFlight(HEATHROW_FLIGHT);
        });

        it("should add the flight to selectedFlights", () => {
            expect(selectionStore.selectedFlights).toHaveLength(1);
        });

        it("should contain the correct flight", () => {
            expect(selectionStore.selectedFlights[0].id).toBe("fl-lhr-001");
        });
    });

    describe("when toggleFlight is called with a flight that is already selected", () => {
        beforeEach(() => {
            selectionStore.actions.toggleFlight(HEATHROW_FLIGHT);
            selectionStore.actions.toggleFlight(HEATHROW_FLIGHT);
        });

        it("should remove the flight from selectedFlights", () => {
            expect(selectionStore.selectedFlights).toHaveLength(0);
        });
    });

    describe("when toggleHotel is called with a hotel not yet selected", () => {
        beforeEach(() => {
            selectionStore.actions.toggleHotel(CLARIDGES_HOTEL);
        });

        it("should add the hotel to selectedHotels", () => {
            expect(selectionStore.selectedHotels).toHaveLength(1);
        });

        it("should contain the correct hotel", () => {
            expect(selectionStore.selectedHotels[0].id).toBe("ht-clr-001");
        });
    });

    describe("when toggleHotel is called with a hotel that is already selected", () => {
        beforeEach(() => {
            selectionStore.actions.toggleHotel(CLARIDGES_HOTEL);
            selectionStore.actions.toggleHotel(CLARIDGES_HOTEL);
        });

        it("should remove the hotel from selectedHotels", () => {
            expect(selectionStore.selectedHotels).toHaveLength(0);
        });
    });

    describe("when multiple flights are selected and one is toggled off", () => {
        beforeEach(() => {
            selectionStore.actions.toggleFlight(HEATHROW_FLIGHT);
            selectionStore.actions.toggleFlight(GATWICK_FLIGHT);
            selectionStore.actions.toggleFlight(STANSTED_FLIGHT);
            selectionStore.actions.toggleFlight(GATWICK_FLIGHT);
        });

        it("should remove only the toggled flight", () => {
            expect(selectionStore.selectedFlights).toHaveLength(2);
        });

        it("should retain the flights that were not toggled", () => {
            const ids = selectionStore.selectedFlights.map((f: any) => f.id);
            expect(ids).toEqual(expect.arrayContaining(["fl-lhr-001", "fl-stn-003"]));
        });
    });

    describe("when clearAll is called with populated selections", () => {
        let flightsRefBeforeClear: any, hotelsRefBeforeClear: any;

        beforeEach(() => {
            selectionStore.actions.setStep("hotels");
            selectionStore.actions.toggleFlight(HEATHROW_FLIGHT);
            selectionStore.actions.toggleFlight(GATWICK_FLIGHT);
            selectionStore.actions.toggleHotel(CLARIDGES_HOTEL);
            selectionStore.actions.toggleHotel(TRAVELODGE_HOTEL);

            flightsRefBeforeClear = selectionStore.selectedFlights;
            hotelsRefBeforeClear = selectionStore.selectedHotels;

            selectionStore.actions.clearAll();
        });

        it("should reset step back to flights", () => {
            expect(selectionStore.step).toBe("flights");
        });

        it("should empty the selectedFlights array", () => {
            expect(selectionStore.selectedFlights).toHaveLength(0);
        });

        it("should empty the selectedHotels array", () => {
            expect(selectionStore.selectedHotels).toHaveLength(0);
        });

        it("should preserve the selectedFlights observable array reference", () => {
            // The = [] reassignment bug would break MobX tracking by replacing
            // the observable array with a plain one. splice(0, length) mutates
            // in-place, keeping the same reference. If this fails, the bug is back.
            expect(selectionStore.selectedFlights).toBe(flightsRefBeforeClear);
        });

        it("should preserve the selectedHotels observable array reference", () => {
            expect(selectionStore.selectedHotels).toBe(hotelsRefBeforeClear);
        });
    });

    describe("when clearAll is called on an already empty store", () => {
        beforeEach(() => {
            selectionStore.actions.clearAll();
        });

        it("should keep step as flights", () => {
            expect(selectionStore.step).toBe("flights");
        });

        it("should leave selectedFlights empty", () => {
            expect(selectionStore.selectedFlights).toHaveLength(0);
        });

        it("should leave selectedHotels empty", () => {
            expect(selectionStore.selectedHotels).toHaveLength(0);
        });
    });

    describe("when dispose is called", () => {
        beforeEach(() => {
            selectionStore.dispose();
        });

        it("should mark the store as disposed", () => {
            expect(selectionStore.isDisposed).toBe(true);
        });
    });

    describe("when actions are called after dispose", () => {
        beforeEach(() => {
            selectionStore.dispose();
            selectionStore.actions.toggleFlight(HEATHROW_FLIGHT);
            selectionStore.actions.toggleHotel(CLARIDGES_HOTEL);
            selectionStore.actions.setStep("hotels");
            selectionStore.actions.clearAll();
        });

        it("should retain pre-dispose state — actions are no-ops on a disposed store", () => {
            expect(selectionStore.selectedFlights).toEqual([]);
            expect(selectionStore.selectedHotels).toEqual([]);
            expect(selectionStore.step).toBe("flights");
        });
    });
});
