import { useQuery } from "@tanstack/react-query";
import type { Flight } from "../types";
import { getFlights } from "../api/flights";

interface FlightQueryParams {
    destination: string;
    travelers: number;
}

/**
 * TanStack Query hook for fetching flights.
 *
 * Same interface as the web version — queryKey includes filter params so TanStack Query
 * knows when to refetch. The key difference from web: queryFn calls getFlights() directly
 * instead of fetch()-ing an MSW-intercepted URL. MSW doesn't work in RN (no Service Worker).
 *
 * The useStoreState → queryKey bridge pattern is identical to web: MobX observable
 * changes → React state update → new query key → refetch.
 */
export function useFlights(params: FlightQueryParams) {
    return useQuery<Flight[]>({
        queryKey: ["flights", params],
        queryFn: () => getFlights({ destination: params.destination, travelers: params.travelers }),
    });
}
