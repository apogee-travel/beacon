import { useQuery } from "@tanstack/react-query";
import type { Hotel } from "../types";
import { getHotels } from "../api/hotels";

interface HotelQueryParams {
    destination: string;
    guests: number;
    enabled?: boolean;
}

/**
 * TanStack Query hook for fetching hotels.
 *
 * Same pattern as useFlights — query key contains filter params, queryFn calls the
 * fake API function directly (no MSW, no fetch). Everything else is identical to web.
 */
export function useHotels(params: HotelQueryParams) {
    return useQuery<Hotel[]>({
        queryKey: ["hotels", { destination: params.destination, guests: params.guests }],
        queryFn: () => getHotels({ destination: params.destination, guests: params.guests }),
        enabled: params.enabled ?? true,
    });
}
