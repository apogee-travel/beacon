import { http, HttpResponse } from "msw";
import { MOCK_FLIGHTS } from "./data/flights";
import { MOCK_HOTELS } from "./data/hotels";
import type { Flight, Hotel } from "../types";

// Simulate a small network delay so query loading states are actually visible
const MOCK_DELAY_MS = 400;

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const handlers = [
    http.get("/api/flights", async ({ request }) => {
        await delay(MOCK_DELAY_MS);

        const url = new URL(request.url);
        const destination = url.searchParams.get("destination") ?? "";
        const minPrice = Number(url.searchParams.get("minPrice") ?? 0);
        const maxPrice = Number(url.searchParams.get("maxPrice") ?? Infinity);
        const maxStops = url.searchParams.get("maxStops");
        const travelers = Number(url.searchParams.get("travelers") ?? 1);
        const departDate = url.searchParams.get("departDate") ?? "";
        const returnDate = url.searchParams.get("returnDate") ?? "";

        const results = MOCK_FLIGHTS.filter((flight: Flight) => {
            // Destination substring match — "par" matches "Paris"
            if (
                destination &&
                !flight.destination.toLowerCase().includes(destination.toLowerCase())
            ) {
                return false;
            }

            // Price range filter
            if (flight.price < minPrice || flight.price > maxPrice) {
                return false;
            }

            // Stop count filter
            if (maxStops !== null && flight.stops > Number(maxStops)) {
                return false;
            }

            // Traveler capacity — flight must support at least this many travelers
            if (flight.travelers < travelers) {
                return false;
            }

            // Exact-match date filters — mock data has fixed dates so exact match is correct
            if (departDate && flight.departDate !== departDate) {
                return false;
            }
            if (returnDate && flight.returnDate !== returnDate) {
                return false;
            }

            return true;
        });

        return HttpResponse.json(results);
    }),

    http.get("/api/hotels", async ({ request }) => {
        await delay(MOCK_DELAY_MS);

        const url = new URL(request.url);
        const destination = url.searchParams.get("destination") ?? "";
        const minPrice = Number(url.searchParams.get("minPricePerNight") ?? 0);
        const maxPrice = Number(url.searchParams.get("maxPricePerNight") ?? Infinity);
        const minStars = Number(url.searchParams.get("minStars") ?? 1);
        const guests = Number(url.searchParams.get("guests") ?? 1);
        // departDate/returnDate from the filter store map to hotel checkIn/checkOut
        const checkIn = url.searchParams.get("checkIn") ?? "";
        const checkOut = url.searchParams.get("checkOut") ?? "";

        const results = MOCK_HOTELS.filter((hotel: Hotel) => {
            // Destination substring match
            if (
                destination &&
                !hotel.destination.toLowerCase().includes(destination.toLowerCase())
            ) {
                return false;
            }

            // Price range filter
            if (hotel.pricePerNight < minPrice || hotel.pricePerNight > maxPrice) {
                return false;
            }

            // Star rating filter
            if (hotel.stars < minStars) {
                return false;
            }

            // Guest capacity — hotel must accommodate this many guests
            if (hotel.maxGuests < guests) {
                return false;
            }

            // Exact-match date filters — mock data has fixed dates so exact match is correct
            if (checkIn && hotel.checkIn !== checkIn) {
                return false;
            }
            if (checkOut && hotel.checkOut !== checkOut) {
                return false;
            }

            return true;
        });

        return HttpResponse.json(results);
    }),
];
