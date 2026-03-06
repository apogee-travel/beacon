import { useQuery } from "@tanstack/react-query";
import type { Hotel } from "../types";

interface HotelQueryParams {
    destination: string;
    guests: number;
    checkIn?: string;
    checkOut?: string;
}

async function fetchHotels(params: HotelQueryParams): Promise<Hotel[]> {
    const url = new URL("/api/hotels", window.location.origin);
    if (params.destination) {
        url.searchParams.set("destination", params.destination);
    }
    url.searchParams.set("guests", String(params.guests));
    if (params.checkIn) {
        url.searchParams.set("checkIn", params.checkIn);
    }
    if (params.checkOut) {
        url.searchParams.set("checkOut", params.checkOut);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error(`Failed to fetch hotels: ${response.statusText}`);
    }
    return response.json() as Promise<Hotel[]>;
}

interface UseHotelsOptions extends HotelQueryParams {
    // When false, the query will not fire. Used by SearchView to defer hotel fetching
    // until the user advances to step 2 of the selection flow.
    enabled?: boolean;
}

/**
 * TanStack Query hook for fetching hotels.
 *
 * Same pattern as useFlights — query key contains the filter params so TanStack Query
 * knows when to refetch. The params come from useStoreState in SearchView, bridging
 * MobX observable state into plain JS values that React Query understands.
 *
 * Pass `enabled: false` to defer fetching until a condition is met (e.g., step 2 of
 * a multi-step flow). TanStack Query will not issue the request until `enabled` is true.
 */
export function useHotels({ enabled = true, ...params }: UseHotelsOptions) {
    return useQuery({
        queryKey: ["hotels", params],
        queryFn: () => fetchHotels(params),
        enabled,
    });
}
