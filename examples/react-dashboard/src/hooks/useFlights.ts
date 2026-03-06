import { useQuery } from "@tanstack/react-query";
import type { Flight } from "../types";

interface FlightQueryParams {
    destination: string;
    travelers: number;
    departDate?: string;
    returnDate?: string;
}

async function fetchFlights(params: FlightQueryParams): Promise<Flight[]> {
    const url = new URL("/api/flights", window.location.origin);
    if (params.destination) {
        url.searchParams.set("destination", params.destination);
    }
    url.searchParams.set("travelers", String(params.travelers));
    if (params.departDate) {
        url.searchParams.set("departDate", params.departDate);
    }
    if (params.returnDate) {
        url.searchParams.set("returnDate", params.returnDate);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error(`Failed to fetch flights: ${response.statusText}`);
    }
    return response.json() as Promise<Flight[]>;
}

/**
 * TanStack Query hook for fetching flights.
 *
 * The query key includes the filter params — when params change (driven by filtersStore
 * state via useStoreState), TanStack Query automatically refetches. This is the bridge
 * between MobX state and React Query's cache invalidation.
 */
export function useFlights(params: FlightQueryParams) {
    return useQuery({
        queryKey: ["flights", params],
        queryFn: () => fetchFlights(params),
    });
}
