import type { Hotel } from "../types";
import { MOCK_HOTELS } from "./data/hotels";

const MOCK_DELAY_MS = 400;

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export interface HotelFilters {
    destination?: string;
    guests?: number;
    minPricePerNight?: number;
    maxPricePerNight?: number;
    minStars?: number;
}

/**
 * Fake API function that replicates the web example's MSW /api/hotels handler.
 *
 * Same filter logic as the MSW handler — destination substring match, price range,
 * star rating, and guest capacity. Called directly by useHotels (no fetch() needed).
 */
export async function getHotels(filters: HotelFilters = {}): Promise<Hotel[]> {
    await delay(MOCK_DELAY_MS);

    const {
        destination = "",
        guests = 1,
        minPricePerNight = 0,
        maxPricePerNight = Infinity,
        minStars = 1,
    } = filters;

    return MOCK_HOTELS.filter(hotel => {
        // Destination substring match
        if (destination && !hotel.destination.toLowerCase().includes(destination.toLowerCase())) {
            return false;
        }

        // Price range filter
        if (hotel.pricePerNight < minPricePerNight || hotel.pricePerNight > maxPricePerNight) {
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

        return true;
    });
}

/**
 * Look up a single hotel by ID from the mock dataset.
 * Used by the trip screen to resolve a hotel from a nav param.
 */
export function getHotelById(id: string): Hotel | undefined {
    return MOCK_HOTELS.find(h => h.id === id);
}
