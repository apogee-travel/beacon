import type { Flight } from "../types";
import { MOCK_FLIGHTS } from "./data/flights";

// 400ms delay makes loading states visible — proves TanStack Query's loading/success
// lifecycle works in RN. On web this is done by MSW; here it's a plain promise delay.
const MOCK_DELAY_MS = 400;

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export interface FlightFilters {
    destination?: string;
    travelers?: number;
    minPrice?: number;
    maxPrice?: number;
    maxStops?: number;
}

/**
 * Fake API function that replicates the web example's MSW /api/flights handler.
 *
 * On web, fetch() hits the MSW service worker which intercepts the request and filters data.
 * Here, there's no Service Worker in RN, so we call this function directly from useFlights.
 * The filter logic is identical — same field names, same substring match behavior.
 */
export async function getFlights(filters: FlightFilters = {}): Promise<Flight[]> {
    await delay(MOCK_DELAY_MS);

    const {
        destination = "",
        travelers = 1,
        minPrice = 0,
        maxPrice = Infinity,
        maxStops,
    } = filters;

    return MOCK_FLIGHTS.filter(flight => {
        // Destination substring match — "par" matches "Paris"
        if (destination && !flight.destination.toLowerCase().includes(destination.toLowerCase())) {
            return false;
        }

        // Price range filter
        if (flight.price < minPrice || flight.price > maxPrice) {
            return false;
        }

        // Stop count filter
        if (maxStops !== undefined && flight.stops > maxStops) {
            return false;
        }

        // Traveler capacity — flight must support at least this many travelers
        if (flight.travelers < travelers) {
            return false;
        }

        return true;
    });
}

/**
 * Look up a single flight by ID from the mock dataset.
 * Used by the trip screen to resolve a flight from a nav param.
 */
export function getFlightById(id: string): Flight | undefined {
    return MOCK_FLIGHTS.find(f => f.id === id);
}
