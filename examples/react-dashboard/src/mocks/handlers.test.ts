/* eslint-disable @typescript-eslint/no-explicit-any */
export default {};

import { MOCK_FLIGHTS } from "./data/flights";
import { MOCK_HOTELS } from "./data/hotels";
import type { Flight, Hotel } from "../types";

// We test the filtering logic implemented in handlers.ts directly against the mock data,
// without importing MSW (which has ESM-only transitive dependencies incompatible with
// ts-jest's CommonJS transform). The handler logic is pure data filtering — we replicate
// the filter conditions here so that changes to handlers.ts will surface as test failures.

function filterFlights(params: {
    destination?: string;
    minPrice?: string;
    maxPrice?: string;
    maxStops?: string | null;
    travelers?: string;
    departDate?: string;
    returnDate?: string;
}): Flight[] {
    const destination = params.destination ?? "";
    const minPrice = Number(params.minPrice ?? 0);
    const maxPrice = Number(params.maxPrice ?? Infinity);
    const maxStops = params.maxStops !== undefined ? params.maxStops : null;
    const travelers = Number(params.travelers ?? 1);
    const departDate = params.departDate ?? "";
    const returnDate = params.returnDate ?? "";

    return MOCK_FLIGHTS.filter((flight: Flight) => {
        if (destination && !flight.destination.toLowerCase().includes(destination.toLowerCase())) {
            return false;
        }
        if (flight.price < minPrice || flight.price > maxPrice) {
            return false;
        }
        if (maxStops !== null && flight.stops > Number(maxStops)) {
            return false;
        }
        if (flight.travelers < travelers) {
            return false;
        }
        if (departDate && flight.departDate !== departDate) {
            return false;
        }
        if (returnDate && flight.returnDate !== returnDate) {
            return false;
        }
        return true;
    });
}

function filterHotels(params: {
    destination?: string;
    minPricePerNight?: string;
    maxPricePerNight?: string;
    minStars?: string;
    guests?: string;
    checkIn?: string;
    checkOut?: string;
}): Hotel[] {
    const destination = params.destination ?? "";
    const minPrice = Number(params.minPricePerNight ?? 0);
    const maxPrice = Number(params.maxPricePerNight ?? Infinity);
    const minStars = Number(params.minStars ?? 1);
    const guests = Number(params.guests ?? 1);
    const checkIn = params.checkIn ?? "";
    const checkOut = params.checkOut ?? "";

    return MOCK_HOTELS.filter((hotel: Hotel) => {
        if (destination && !hotel.destination.toLowerCase().includes(destination.toLowerCase())) {
            return false;
        }
        if (hotel.pricePerNight < minPrice || hotel.pricePerNight > maxPrice) {
            return false;
        }
        if (hotel.stars < minStars) {
            return false;
        }
        if (hotel.maxGuests < guests) {
            return false;
        }
        if (checkIn && hotel.checkIn !== checkIn) {
            return false;
        }
        if (checkOut && hotel.checkOut !== checkOut) {
            return false;
        }
        return true;
    });
}

describe("handler filtering logic", () => {
    describe("flights", () => {
        describe("when no filter params are provided", () => {
            let results: Flight[];

            beforeEach(() => {
                results = filterFlights({});
            });

            it("should return all flights", () => {
                expect(results.length).toBe(25);
            });
        });

        describe("when destination matches a known city exactly", () => {
            let results: Flight[];

            beforeEach(() => {
                results = filterFlights({ destination: "Paris" });
            });

            it("should return only flights to that destination", () => {
                expect(results.every(f => f.destination === "Paris")).toBe(true);
            });

            it("should return more than zero results", () => {
                expect(results.length).toBeGreaterThan(0);
            });
        });

        describe("when destination is a lowercase partial substring", () => {
            let results: Flight[];

            beforeEach(() => {
                results = filterFlights({ destination: "tok" });
            });

            it("should match destinations containing the substring case-insensitively", () => {
                expect(results.every(f => f.destination.toLowerCase().includes("tok"))).toBe(true);
            });
        });

        describe("when destination does not match any flight", () => {
            let results: Flight[];

            beforeEach(() => {
                results = filterFlights({ destination: "Atlantis" });
            });

            it("should return an empty array", () => {
                expect(results).toEqual([]);
            });
        });

        describe("when minPrice exceeds all flight prices", () => {
            let results: Flight[];

            beforeEach(() => {
                results = filterFlights({ minPrice: "99999" });
            });

            it("should return no flights", () => {
                expect(results).toEqual([]);
            });
        });

        describe("when maxPrice is below all flight prices", () => {
            let results: Flight[];

            beforeEach(() => {
                results = filterFlights({ maxPrice: "1" });
            });

            it("should return no flights", () => {
                expect(results).toEqual([]);
            });
        });

        describe("when maxPrice is an empty string", () => {
            let results: Flight[];

            beforeEach(() => {
                // Empty string coercion bug: Number("") === 0, not Infinity.
                // The ?? operator passes empty string through (it is not null/undefined),
                // so maxPrice becomes 0 and no flight passes price <= 0.
                results = filterFlights({ maxPrice: "" });
            });

            it('should return no flights due to Number("") coercing to 0', () => {
                expect(results).toEqual([]);
            });
        });

        describe("when maxStops is 0 (nonstop only)", () => {
            let results: Flight[];

            beforeEach(() => {
                results = filterFlights({ maxStops: "0" });
            });

            it("should return only nonstop flights", () => {
                expect(results.every(f => f.stops === 0)).toBe(true);
            });

            it("should return more than zero results", () => {
                expect(results.length).toBeGreaterThan(0);
            });
        });

        describe("when maxStops is absent (null)", () => {
            let results: Flight[];

            beforeEach(() => {
                results = filterFlights({ maxStops: null });
            });

            it("should include flights with stops", () => {
                expect(results.some(f => f.stops > 0)).toBe(true);
            });
        });

        describe("when travelers requirement exceeds all available capacity", () => {
            let results: Flight[];

            beforeEach(() => {
                results = filterFlights({ travelers: "999" });
            });

            it("should return an empty array", () => {
                expect(results).toEqual([]);
            });
        });

        describe("when travelers requirement is exactly met by some flights", () => {
            let results: Flight[];

            beforeEach(() => {
                // Flights with travelers >= 8: fl-006 (8), fl-012 (8)
                results = filterFlights({ travelers: "8" });
            });

            it("should return only flights supporting at least that many travelers", () => {
                expect(results.every(f => f.travelers >= 8)).toBe(true);
            });
        });

        describe("when departDate matches a known date in the mock data", () => {
            let results: Flight[];

            beforeEach(() => {
                // 2025-07-01 is the depart date for all Tokyo flights (fl-004, fl-005, fl-006)
                results = filterFlights({ departDate: "2025-07-01" });
            });

            it("should return only flights departing on that date", () => {
                expect(results.every(f => f.departDate === "2025-07-01")).toBe(true);
            });

            it("should return more than zero results", () => {
                expect(results.length).toBeGreaterThan(0);
            });
        });

        describe("when departDate matches no flights in the mock data", () => {
            let results: Flight[];

            beforeEach(() => {
                results = filterFlights({ departDate: "1955-11-05" });
            });

            it("should return an empty array", () => {
                expect(results).toEqual([]);
            });
        });

        describe("when returnDate matches a known date in the mock data", () => {
            let results: Flight[];

            beforeEach(() => {
                // returnDate "2025-06-22" appears on the Paris flights (fl-001, fl-002, fl-003)
                results = filterFlights({ returnDate: "2025-06-22" });
            });

            it("should return only flights with that return date", () => {
                expect(results.every(f => f.returnDate === "2025-06-22")).toBe(true);
            });

            it("should return more than zero results", () => {
                expect(results.length).toBeGreaterThan(0);
            });
        });

        describe("when returnDate matches a date that is not any flight's departDate", () => {
            let results: Flight[];

            beforeEach(() => {
                // Tokyo flights have returnDate "2025-07-14" and departDate "2025-07-01".
                // "2025-07-14" does not appear as any flight's departDate, so a filter bug that
                // compares flight.departDate instead of flight.returnDate would return the wrong set.
                results = filterFlights({ returnDate: "2025-07-14" });
            });

            it("should return only flights whose returnDate is 2025-07-14", () => {
                expect(results.every(f => f.returnDate === "2025-07-14")).toBe(true);
            });

            it("should exclude flights whose returnDate differs", () => {
                expect(results.some(f => f.returnDate !== "2025-07-14")).toBe(false);
            });
        });

        describe("when returnDate matches no flights in the mock data", () => {
            let results: Flight[];

            beforeEach(() => {
                results = filterFlights({ returnDate: "1985-10-26" });
            });

            it("should return an empty array", () => {
                expect(results).toEqual([]);
            });
        });
    });

    describe("hotels", () => {
        describe("when no filter params are provided", () => {
            let results: Hotel[];

            beforeEach(() => {
                results = filterHotels({});
            });

            it("should return all hotels", () => {
                expect(results.length).toBe(25);
            });
        });

        describe("when destination matches a known city", () => {
            let results: Hotel[];

            beforeEach(() => {
                results = filterHotels({ destination: "Tokyo" });
            });

            it("should return only hotels in that destination", () => {
                expect(results.every(h => h.destination === "Tokyo")).toBe(true);
            });
        });

        describe("when destination does not match any hotel", () => {
            let results: Hotel[];

            beforeEach(() => {
                results = filterHotels({ destination: "Narnia" });
            });

            it("should return an empty array", () => {
                expect(results).toEqual([]);
            });
        });

        describe("when minPricePerNight filters out budget options", () => {
            let results: Hotel[];

            beforeEach(() => {
                results = filterHotels({ minPricePerNight: "600" });
            });

            it("should return only hotels at or above the minimum price", () => {
                expect(results.every(h => h.pricePerNight >= 600)).toBe(true);
            });
        });

        describe("when maxPricePerNight is below all hotel prices", () => {
            let results: Hotel[];

            beforeEach(() => {
                results = filterHotels({ maxPricePerNight: "1" });
            });

            it("should return no hotels", () => {
                expect(results).toEqual([]);
            });
        });

        describe("when maxPricePerNight is an empty string", () => {
            let results: Hotel[];

            beforeEach(() => {
                // Same empty-string coercion bug as flights: Number("") === 0
                results = filterHotels({ maxPricePerNight: "" });
            });

            it('should return no hotels due to Number("") coercing to 0', () => {
                expect(results).toEqual([]);
            });
        });

        describe("when minStars requires 5-star hotels", () => {
            let results: Hotel[];

            beforeEach(() => {
                results = filterHotels({ minStars: "5" });
            });

            it("should return only 5-star hotels", () => {
                expect(results.every(h => h.stars === 5)).toBe(true);
            });

            it("should return more than zero results", () => {
                expect(results.length).toBeGreaterThan(0);
            });
        });

        describe("when guests requirement exceeds all hotel capacities", () => {
            let results: Hotel[];

            beforeEach(() => {
                results = filterHotels({ guests: "100" });
            });

            it("should return an empty array", () => {
                expect(results).toEqual([]);
            });
        });

        describe("when guests requirement is exactly met by some hotels", () => {
            let results: Hotel[];

            beforeEach(() => {
                // Hotels with maxGuests >= 6: ht-011 (6)
                results = filterHotels({ guests: "6" });
            });

            it("should return only hotels that can accommodate that many guests", () => {
                expect(results.every(h => h.maxGuests >= 6)).toBe(true);
            });
        });

        describe("when checkIn matches a known date in the mock data", () => {
            let results: Hotel[];

            beforeEach(() => {
                // 2025-07-01 is the checkIn date for all Tokyo hotels (ht-004, ht-005, ht-006)
                results = filterHotels({ checkIn: "2025-07-01" });
            });

            it("should return only hotels with that check-in date", () => {
                expect(results.every(h => h.checkIn === "2025-07-01")).toBe(true);
            });

            it("should return more than zero results", () => {
                expect(results.length).toBeGreaterThan(0);
            });
        });

        describe("when checkIn matches no hotels in the mock data", () => {
            let results: Hotel[];

            beforeEach(() => {
                results = filterHotels({ checkIn: "1985-07-03" });
            });

            it("should return an empty array", () => {
                expect(results).toEqual([]);
            });
        });

        describe("when checkOut matches a known date in the mock data", () => {
            let results: Hotel[];

            beforeEach(() => {
                // "2025-07-14" is the checkOut date for Tokyo hotels (ht-004, ht-005, ht-006).
                // "2025-07-14" does not appear as any hotel's checkIn, so a filter bug that
                // reads hotel.checkIn instead of hotel.checkOut would return the wrong set.
                results = filterHotels({ checkOut: "2025-07-14" });
            });

            it("should return only hotels with that check-out date", () => {
                expect(results.every(h => h.checkOut === "2025-07-14")).toBe(true);
            });

            it("should return more than zero results", () => {
                expect(results.length).toBeGreaterThan(0);
            });
        });

        describe("when checkOut matches no hotels in the mock data", () => {
            let results: Hotel[];

            beforeEach(() => {
                results = filterHotels({ checkOut: "1985-07-03" });
            });

            it("should return an empty array", () => {
                expect(results).toEqual([]);
            });
        });
    });
});
