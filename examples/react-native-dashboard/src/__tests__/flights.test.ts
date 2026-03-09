import { getFlights, getFlightById } from "../api/flights";
import { MOCK_FLIGHTS } from "../api/data/flights";

export default {};

// Branch map for getFlights:
// 1. No filters — returns all flights
// 2. Destination filter — substring match, case insensitive
// 3. Destination filter — no match → empty array
// 4. Travelers filter — flight.travelers must be >= travelers
// 5. minPrice / maxPrice filter — price range exclusion
// 6. maxStops filter — stops must be <= maxStops
//
// Branch map for getFlightById:
// 1. ID found — returns the matching flight
// 2. ID not found — returns undefined

// Fake timers let us flush the 400ms simulated API delay instantly without wall-clock waiting.
beforeAll(() => {
    jest.useFakeTimers();
});

afterAll(() => {
    jest.useRealTimers();
});

describe("getFlights", () => {
    describe("when called with no filters", () => {
        let result: Awaited<ReturnType<typeof getFlights>>;

        beforeEach(async () => {
            const promise = getFlights();
            jest.runAllTimers();
            result = await promise;
        });

        it("should return all 25 flights", () => {
            expect(result).toHaveLength(25);
        });

        it("should match the full mock dataset", () => {
            expect(result).toEqual(MOCK_FLIGHTS);
        });
    });

    describe("when filtering by destination that exists", () => {
        let result: Awaited<ReturnType<typeof getFlights>>;

        beforeEach(async () => {
            const promise = getFlights({ destination: "Paris" });
            jest.runAllTimers();
            result = await promise;
        });

        it("should return only Paris flights", () => {
            expect(result.length).toBeGreaterThan(0);
            result.forEach(f => {
                expect(f.destination.toLowerCase()).toContain("paris");
            });
        });
    });

    describe("when filtering by destination with partial lowercase string", () => {
        let result: Awaited<ReturnType<typeof getFlights>>;

        beforeEach(async () => {
            const promise = getFlights({ destination: "tok" });
            jest.runAllTimers();
            result = await promise;
        });

        it("should match Tokyo via case-insensitive substring", () => {
            expect(result.length).toBeGreaterThan(0);
            result.forEach(f => {
                expect(f.destination.toLowerCase()).toContain("tok");
            });
        });
    });

    describe("when filtering by destination that does not exist in the dataset", () => {
        let result: Awaited<ReturnType<typeof getFlights>>;

        beforeEach(async () => {
            const promise = getFlights({ destination: "Narnia" });
            jest.runAllTimers();
            result = await promise;
        });

        it("should return an empty array", () => {
            expect(result).toEqual([]);
        });
    });

    describe("when filtering by travelers count", () => {
        let result: Awaited<ReturnType<typeof getFlights>>;

        beforeEach(async () => {
            // travelers: 6 — only flights that support 6+ travelers should appear
            const promise = getFlights({ travelers: 6 });
            jest.runAllTimers();
            result = await promise;
        });

        it("should only include flights that support enough travelers", () => {
            expect(result.length).toBeGreaterThan(0);
            result.forEach(f => {
                expect(f.travelers).toBeGreaterThanOrEqual(6);
            });
        });
    });

    describe("when filtering by price range", () => {
        let result: Awaited<ReturnType<typeof getFlights>>;

        beforeEach(async () => {
            const promise = getFlights({ minPrice: 500, maxPrice: 900 });
            jest.runAllTimers();
            result = await promise;
        });

        it("should only include flights within the price range", () => {
            expect(result.length).toBeGreaterThan(0);
            result.forEach(f => {
                expect(f.price).toBeGreaterThanOrEqual(500);
                expect(f.price).toBeLessThanOrEqual(900);
            });
        });
    });

    describe("when filtering by maxStops = 0 (nonstop only)", () => {
        let result: Awaited<ReturnType<typeof getFlights>>;

        beforeEach(async () => {
            const promise = getFlights({ maxStops: 0 });
            jest.runAllTimers();
            result = await promise;
        });

        it("should only include nonstop flights", () => {
            expect(result.length).toBeGreaterThan(0);
            result.forEach(f => {
                expect(f.stops).toBe(0);
            });
        });
    });
});

describe("getFlights — additional filter branches", () => {
    describe("when filtering by empty string destination", () => {
        let result: Awaited<ReturnType<typeof getFlights>>;

        beforeEach(async () => {
            const promise = getFlights({ destination: "" });
            jest.runAllTimers();
            result = await promise;
        });

        it("should return all 25 flights (empty string is falsy — destination filter skipped)", () => {
            expect(result).toHaveLength(25);
        });
    });

    describe("when filtering by maxStops = 1", () => {
        let result: Awaited<ReturnType<typeof getFlights>>;

        beforeEach(async () => {
            const promise = getFlights({ maxStops: 1 });
            jest.runAllTimers();
            result = await promise;
        });

        it("should include nonstop and one-stop flights", () => {
            expect(result.length).toBeGreaterThan(0);
            result.forEach(f => {
                expect(f.stops).toBeLessThanOrEqual(1);
            });
        });

        it("should exclude flights with 2+ stops", () => {
            result.forEach(f => {
                expect(f.stops).not.toBeGreaterThan(1);
            });
        });
    });

    describe("when all filters are combined", () => {
        let result: Awaited<ReturnType<typeof getFlights>>;

        beforeEach(async () => {
            const promise = getFlights({
                destination: "Tokyo",
                travelers: 4,
                minPrice: 1000,
                maxPrice: 1500,
                maxStops: 0,
            });
            jest.runAllTimers();
            result = await promise;
        });

        it("should return only flights that satisfy every filter", () => {
            result.forEach(f => {
                expect(f.destination.toLowerCase()).toContain("tokyo");
                expect(f.travelers).toBeGreaterThanOrEqual(4);
                expect(f.price).toBeGreaterThanOrEqual(1000);
                expect(f.price).toBeLessThanOrEqual(1500);
                expect(f.stops).toBe(0);
            });
        });
    });

    describe("when minPrice excludes all flights", () => {
        let result: Awaited<ReturnType<typeof getFlights>>;

        beforeEach(async () => {
            const promise = getFlights({ minPrice: 99999 });
            jest.runAllTimers();
            result = await promise;
        });

        it("should return an empty array", () => {
            expect(result).toEqual([]);
        });
    });

    describe("when maxPrice excludes all flights", () => {
        let result: Awaited<ReturnType<typeof getFlights>>;

        beforeEach(async () => {
            const promise = getFlights({ maxPrice: 0 });
            jest.runAllTimers();
            result = await promise;
        });

        it("should return an empty array", () => {
            expect(result).toEqual([]);
        });
    });

    describe("when travelers count exceeds all flight capacities", () => {
        let result: Awaited<ReturnType<typeof getFlights>>;

        beforeEach(async () => {
            const promise = getFlights({ travelers: 999 });
            jest.runAllTimers();
            result = await promise;
        });

        it("should return an empty array", () => {
            expect(result).toEqual([]);
        });
    });
});

describe("getFlightById", () => {
    describe("when the ID exists in the dataset", () => {
        let result: ReturnType<typeof getFlightById>;

        beforeEach(() => {
            result = getFlightById("fl-001");
        });

        it("should return the matching flight", () => {
            expect(result).toBeDefined();
            expect(result?.id).toBe("fl-001");
            expect(result?.airline).toBe("Delta");
        });
    });

    describe("when the ID does not exist in the dataset", () => {
        let result: ReturnType<typeof getFlightById>;

        beforeEach(() => {
            result = getFlightById("fl-999");
        });

        it("should return undefined", () => {
            expect(result).toBeUndefined();
        });
    });
});
