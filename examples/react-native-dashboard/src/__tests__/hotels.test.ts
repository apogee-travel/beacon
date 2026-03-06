import { getHotels, getHotelById } from "../api/hotels";
import { MOCK_HOTELS } from "../api/data/hotels";

export default {};

// Branch map for getHotels:
// 1. No filters — returns all hotels
// 2. Destination filter — substring match, case insensitive
// 3. Destination filter — no match → empty array
// 4. Guests filter — hotel.maxGuests must be >= guests
// 5. Price range filter — pricePerNight range exclusion
// 6. minStars filter — hotel.stars must be >= minStars
//
// Branch map for getHotelById:
// 1. ID found — returns the matching hotel
// 2. ID not found — returns undefined

beforeAll(() => {
    jest.useFakeTimers();
});

afterAll(() => {
    jest.useRealTimers();
});

describe("getHotels", () => {
    describe("when called with no filters", () => {
        let result: Awaited<ReturnType<typeof getHotels>>;

        beforeEach(async () => {
            const promise = getHotels();
            jest.runAllTimers();
            result = await promise;
        });

        it("should return all 25 hotels", () => {
            expect(result).toHaveLength(25);
        });

        it("should match the full mock dataset", () => {
            expect(result).toEqual(MOCK_HOTELS);
        });
    });

    describe("when filtering by destination that exists", () => {
        let result: Awaited<ReturnType<typeof getHotels>>;

        beforeEach(async () => {
            const promise = getHotels({ destination: "Tokyo" });
            jest.runAllTimers();
            result = await promise;
        });

        it("should return only Tokyo hotels", () => {
            expect(result.length).toBeGreaterThan(0);
            result.forEach(h => {
                expect(h.destination.toLowerCase()).toContain("tokyo");
            });
        });
    });

    describe("when filtering by destination with partial lowercase string", () => {
        let result: Awaited<ReturnType<typeof getHotels>>;

        beforeEach(async () => {
            const promise = getHotels({ destination: "lon" });
            jest.runAllTimers();
            result = await promise;
        });

        it("should match London via case-insensitive substring", () => {
            expect(result.length).toBeGreaterThan(0);
            result.forEach(h => {
                expect(h.destination.toLowerCase()).toContain("lon");
            });
        });
    });

    describe("when filtering by destination that does not exist", () => {
        let result: Awaited<ReturnType<typeof getHotels>>;

        beforeEach(async () => {
            const promise = getHotels({ destination: "Westeros" });
            jest.runAllTimers();
            result = await promise;
        });

        it("should return an empty array", () => {
            expect(result).toEqual([]);
        });
    });

    describe("when filtering by guest count", () => {
        let result: Awaited<ReturnType<typeof getHotels>>;

        beforeEach(async () => {
            // guests: 4 — only hotels that accommodate 4+ guests should appear
            const promise = getHotels({ guests: 4 });
            jest.runAllTimers();
            result = await promise;
        });

        it("should only include hotels that accommodate enough guests", () => {
            expect(result.length).toBeGreaterThan(0);
            result.forEach(h => {
                expect(h.maxGuests).toBeGreaterThanOrEqual(4);
            });
        });
    });

    describe("when filtering by price range", () => {
        let result: Awaited<ReturnType<typeof getHotels>>;

        beforeEach(async () => {
            const promise = getHotels({ minPricePerNight: 100, maxPricePerNight: 300 });
            jest.runAllTimers();
            result = await promise;
        });

        it("should only include hotels within the price range", () => {
            expect(result.length).toBeGreaterThan(0);
            result.forEach(h => {
                expect(h.pricePerNight).toBeGreaterThanOrEqual(100);
                expect(h.pricePerNight).toBeLessThanOrEqual(300);
            });
        });
    });

    describe("when filtering by minimum star rating", () => {
        let result: Awaited<ReturnType<typeof getHotels>>;

        beforeEach(async () => {
            const promise = getHotels({ minStars: 5 });
            jest.runAllTimers();
            result = await promise;
        });

        it("should only include 5-star hotels", () => {
            expect(result.length).toBeGreaterThan(0);
            result.forEach(h => {
                expect(h.stars).toBeGreaterThanOrEqual(5);
            });
        });
    });
});

describe("getHotels — additional filter branches", () => {
    describe("when filtering by empty string destination", () => {
        let result: Awaited<ReturnType<typeof getHotels>>;

        beforeEach(async () => {
            const promise = getHotels({ destination: "" });
            jest.runAllTimers();
            result = await promise;
        });

        it("should return all 25 hotels (empty string is falsy — destination filter skipped)", () => {
            expect(result).toHaveLength(25);
        });
    });

    describe("when all filters are combined", () => {
        let result: Awaited<ReturnType<typeof getHotels>>;

        beforeEach(async () => {
            const promise = getHotels({
                destination: "Paris",
                guests: 2,
                minPricePerNight: 100,
                maxPricePerNight: 300,
                minStars: 4,
            });
            jest.runAllTimers();
            result = await promise;
        });

        it("should return only hotels that satisfy every filter", () => {
            result.forEach(h => {
                expect(h.destination.toLowerCase()).toContain("paris");
                expect(h.maxGuests).toBeGreaterThanOrEqual(2);
                expect(h.pricePerNight).toBeGreaterThanOrEqual(100);
                expect(h.pricePerNight).toBeLessThanOrEqual(300);
                expect(h.stars).toBeGreaterThanOrEqual(4);
            });
        });
    });

    describe("when minPricePerNight excludes all hotels", () => {
        let result: Awaited<ReturnType<typeof getHotels>>;

        beforeEach(async () => {
            const promise = getHotels({ minPricePerNight: 99999 });
            jest.runAllTimers();
            result = await promise;
        });

        it("should return an empty array", () => {
            expect(result).toEqual([]);
        });
    });

    describe("when maxPricePerNight excludes all hotels", () => {
        let result: Awaited<ReturnType<typeof getHotels>>;

        beforeEach(async () => {
            const promise = getHotels({ maxPricePerNight: 0 });
            jest.runAllTimers();
            result = await promise;
        });

        it("should return an empty array", () => {
            expect(result).toEqual([]);
        });
    });

    describe("when guests count exceeds all hotel capacities", () => {
        let result: Awaited<ReturnType<typeof getHotels>>;

        beforeEach(async () => {
            const promise = getHotels({ guests: 999 });
            jest.runAllTimers();
            result = await promise;
        });

        it("should return an empty array", () => {
            expect(result).toEqual([]);
        });
    });

    describe("when minStars exceeds all hotel ratings", () => {
        let result: Awaited<ReturnType<typeof getHotels>>;

        beforeEach(async () => {
            const promise = getHotels({ minStars: 6 });
            jest.runAllTimers();
            result = await promise;
        });

        it("should return an empty array", () => {
            expect(result).toEqual([]);
        });
    });
});

describe("getHotelById", () => {
    describe("when the ID exists in the dataset", () => {
        let result: ReturnType<typeof getHotelById>;

        beforeEach(() => {
            result = getHotelById("ht-001");
        });

        it("should return the matching hotel", () => {
            expect(result).toBeDefined();
            expect(result?.id).toBe("ht-001");
            expect(result?.name).toBe("Hotel Le Marais");
        });
    });

    describe("when the ID does not exist in the dataset", () => {
        let result: ReturnType<typeof getHotelById>;

        beforeEach(() => {
            result = getHotelById("ht-999");
        });

        it("should return undefined", () => {
            expect(result).toBeUndefined();
        });
    });
});
