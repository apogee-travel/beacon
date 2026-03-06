import { useEffect } from "react";
import { toJS } from "mobx";
import { useNavigate } from "react-router-dom";
import { useStoreState } from "@apogeelabs/beacon-react-utils";
import { filtersStore } from "../stores/filtersStore";
import { selectionStore } from "../stores/selectionStore";
import { useFlights } from "../hooks/useFlights";
import { useHotels } from "../hooks/useHotels";
import { FilterPanel } from "../components/FilterPanel";
import { FlightCard } from "../components/FlightCard";
import { HotelCard } from "../components/HotelCard";

/**
 * SearchView demonstrates two patterns for reading Beacon store state in React:
 *
 * 1. `observer` (in FilterPanel) — for components that render store values directly.
 *    MobX tracks reads and re-renders automatically. Efficient and simple.
 *
 * 2. `useStoreState` (here) — for bridging MobX observables into non-MobX hooks.
 *    useQuery needs plain JS values for query keys, not MobX observables. useStoreState
 *    converts them: observable changes → React state update → new query key → refetch.
 *
 * Without useStoreState, useQuery's query key would capture the observable object reference
 * at setup time and never see changes. useStoreState is the escape hatch.
 *
 * The two-step flow (flights → hotels → trip) is driven by selectionStore.step.
 * selectionStore is module-scoped so it survives the conditional re-renders that happen
 * when SearchView switches between showing flights and hotels.
 */
export default function SearchView() {
    const navigate = useNavigate();

    // Bridge MobX observables into React state so TanStack Query can use them as query keys.
    // When filtersStore.destination changes (via FilterPanel), useStoreState calls setState,
    // triggering a re-render, which gives useQuery a new query key, which triggers a refetch.
    const destination = useStoreState(filtersStore, s => s.destination);
    const travelers = useStoreState(filtersStore, s => s.travelers);
    const departDate = useStoreState(filtersStore, s => s.departDate);
    const returnDate = useStoreState(filtersStore, s => s.returnDate);

    // Step and selection state from selectionStore — bridged the same way
    const step = useStoreState(selectionStore, s => s.step);
    const selectedFlights = useStoreState(selectionStore, s => s.selectedFlights);
    const selectedHotels = useStoreState(selectionStore, s => s.selectedHotels);

    const flightsQuery = useFlights({ destination, travelers, departDate, returnDate });

    // Hotels query is deferred until step 2 — no reason to hit the API on the flights step.
    // TanStack Query's `enabled` option is the idiomatic way to do this without conditional hooks.
    const hotelsQuery = useHotels({
        destination,
        guests: travelers,
        checkIn: departDate,
        checkOut: returnDate,
        enabled: step === "hotels",
    });

    // Clear all selections on unmount so navigating back to Search starts fresh.
    // Without this, a user who navigates away mid-flow would see stale checkboxes on return.
    useEffect(() => () => selectionStore.actions.clearAll(), []);

    const handleProceedToHotels = () => {
        selectionStore.actions.setStep("hotels");
    };

    const handleProceedToTrip = () => {
        navigate("/trip", {
            state: {
                addFlights: toJS(selectionStore.selectedFlights),
                addHotels: toJS(selectionStore.selectedHotels),
            },
        });
        // Clear after reading the observable values so the navigate call gets the full arrays
        selectionStore.actions.clearAll();
    };

    const selectedFlightIds = new Set(selectedFlights.map(f => f.id));
    const selectedHotelIds = new Set(selectedHotels.map(h => h.id));

    return (
        <div className="grid grid-cols-[280px_1fr] gap-6">
            <aside>
                <FilterPanel />
            </aside>

            <div className="space-y-8">
                {/* Flights section — always visible */}
                <section>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold">
                            Flights
                            {destination && (
                                <span className="ml-2 text-sm font-normal text-muted-foreground">
                                    to {destination}
                                </span>
                            )}
                        </h2>

                        {/* "Proceed to Hotels" CTA — above the grid so it's always visible */}
                        {step === "flights" && selectedFlights.length > 0 && (
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-muted-foreground">
                                    {selectedFlights.length}{" "}
                                    {selectedFlights.length === 1 ? "flight" : "flights"} selected
                                </span>
                                <button
                                    className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                                    onClick={handleProceedToHotels}
                                >
                                    Proceed to Hotels →
                                </button>
                            </div>
                        )}
                    </div>

                    {flightsQuery.isLoading && (
                        <p className="text-sm text-muted-foreground">Searching flights...</p>
                    )}

                    {flightsQuery.isError && (
                        <p className="text-sm text-red-500">
                            Failed to load flights. Check the console.
                        </p>
                    )}

                    {flightsQuery.data && flightsQuery.data.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            No flights match your filters. Try broadening your search.
                        </p>
                    )}

                    {/* Flight cards are only shown on the flights step. On step 2 users have
                        already made their selections — showing the grid again with no toggle
                        handler would render non-functional "Add to Trip" buttons. */}
                    {step === "flights" && flightsQuery.data && flightsQuery.data.length > 0 && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {flightsQuery.data.map(flight => (
                                <FlightCard
                                    key={flight.id}
                                    flight={flight}
                                    onToggleSelect={selectionStore.actions.toggleFlight}
                                    isSelected={selectedFlightIds.has(flight.id)}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* Hotels section — only shown on step 2 */}
                {step === "hotels" && (
                    <section>
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">
                                Hotels
                                {destination && (
                                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                                        in {destination}
                                    </span>
                                )}
                            </h2>

                            {/* "Proceed to Trip" CTA — above the grid so it's always visible */}
                            {selectedHotels.length > 0 && (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-muted-foreground">
                                        {selectedFlights.length}{" "}
                                        {selectedFlights.length === 1 ? "flight" : "flights"},{" "}
                                        {selectedHotels.length}{" "}
                                        {selectedHotels.length === 1 ? "hotel" : "hotels"} selected
                                    </span>
                                    <button
                                        className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                                        onClick={handleProceedToTrip}
                                    >
                                        Proceed to Trip →
                                    </button>
                                </div>
                            )}
                        </div>

                        {hotelsQuery.isLoading && (
                            <p className="text-sm text-muted-foreground">Searching hotels...</p>
                        )}

                        {hotelsQuery.isError && (
                            <p className="text-sm text-red-500">
                                Failed to load hotels. Check the console.
                            </p>
                        )}

                        {hotelsQuery.data && hotelsQuery.data.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                No hotels match your filters. Try broadening your search.
                            </p>
                        )}

                        {hotelsQuery.data && hotelsQuery.data.length > 0 && (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {hotelsQuery.data.map(hotel => (
                                    <HotelCard
                                        key={hotel.id}
                                        hotel={hotel}
                                        onToggleSelect={selectionStore.actions.toggleHotel}
                                        isSelected={selectedHotelIds.has(hotel.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}
