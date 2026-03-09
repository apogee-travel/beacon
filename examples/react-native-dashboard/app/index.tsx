import { useCallback } from "react";
import { ScrollView, View, Text, ActivityIndicator, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useStoreState } from "@apogeelabs/beacon-react-utils";
import { filtersStore } from "../src/stores/filtersStore";
import { selectionStore } from "../src/stores/selectionStore";
import { useFlights } from "../src/hooks/useFlights";
import { useHotels } from "../src/hooks/useHotels";
import { FilterPanel } from "../src/components/FilterPanel";
import { FlightCard } from "../src/components/FlightCard";
import { HotelCard } from "../src/components/HotelCard";
import type { Flight, Hotel } from "../src/types";

/**
 * Search/Browse screen — the main screen of the app.
 *
 * Demonstrates two patterns for reading Beacon store state in React (Native):
 *
 * 1. `observer` (in FilterPanel) — renders store values directly, MobX re-renders automatically.
 * 2. `useStoreState` (here) — bridges MobX observables into plain React state for TanStack Query.
 *
 * The useStoreState → queryKey bridge is identical to web. When filtersStore.destination
 * changes (user types in FilterPanel), useStoreState calls setState, triggering a re-render,
 * giving useQuery a new queryKey, which triggers a refetch. No MSW involved — queryFn calls
 * getFlights/getHotels directly (see src/hooks/useFlights.ts for the full explanation).
 *
 * STEPPED SELECTION FLOW:
 * Step 1 (flights): user taps flights to select them, then taps "Proceed to Hotels →".
 * Step 2 (hotels): user taps hotels to select them, then taps "Proceed to Trip →".
 * TripScreen reads selectionStore directly — no serialized route params needed.
 */
export default function SearchScreen() {
    const router = useRouter();

    // Bridge MobX observables into React state so TanStack Query can use them as query keys.
    const destination = useStoreState(filtersStore, s => s.destination);
    const travelers = useStoreState(filtersStore, s => s.travelers);

    // Bridge selection store state into React for conditional rendering and card props.
    const step = useStoreState(selectionStore, s => s.step);
    const selectedFlights = useStoreState(selectionStore, s => s.selectedFlights);
    const selectedHotels = useStoreState(selectionStore, s => s.selectedHotels);

    // Reset selection state whenever the user returns to this screen.
    // Fires on every focus — handles the "navigated away mid-flow and came back" case.
    // Must be on focus (not blur) because TripScreen reads selectionStore before we navigate away.
    useFocusEffect(
        useCallback(() => {
            selectionStore.actions.clearAll();
        }, [])
    );

    const flightsQuery = useFlights({ destination, travelers });

    // Hotels query is deferred until step 2 — no point fetching before the user needs them.
    const hotelsQuery = useHotels({ destination, guests: travelers, enabled: step === "hotels" });

    const handleProceedToHotels = () => {
        selectionStore.actions.setStep("hotels");
    };

    const handleProceedToTrip = () => {
        // TripScreen will read selectionStore directly — no params needed.
        router.push("/trip");
    };

    const isFlightSelected = (flight: Flight) => selectedFlights.some(f => f.id === flight.id);

    const isHotelSelected = (hotel: Hotel) => selectedHotels.some(h => h.id === hotel.id);

    // Determine which CTA to show (if any) — rendered outside the ScrollView as a fixed bottom bar.
    const showProceedToHotels = step === "flights" && selectedFlights.length > 0;
    const showProceedToTrip = step === "hotels" && selectedHotels.length > 0;

    return (
        <View className="flex-1 bg-slate-50 dark:bg-slate-900">
            <ScrollView className="flex-1">
                <View className="p-4">
                    <FilterPanel />

                    {/* Flights section — visible only on step 1 */}
                    {step === "flights" && (
                        <View className="mb-6">
                            <Text className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                                Flights
                                {destination ? (
                                    <Text className="text-sm font-normal text-slate-500 dark:text-slate-400">
                                        {" "}
                                        to {destination}
                                    </Text>
                                ) : null}
                            </Text>

                            {flightsQuery.isLoading && (
                                <View className="items-center py-6">
                                    <ActivityIndicator size="small" color="#3b82f6" />
                                    <Text className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                                        Searching flights...
                                    </Text>
                                </View>
                            )}

                            {flightsQuery.isError && (
                                <Text className="text-sm text-red-500 py-4">
                                    Failed to load flights. Check the console.
                                </Text>
                            )}

                            {flightsQuery.data && flightsQuery.data.length === 0 && (
                                <View className="py-8 items-center">
                                    <Text className="text-slate-400 dark:text-slate-500 text-sm">
                                        No flights match your filters.
                                    </Text>
                                    <Text className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                                        Try a different destination or fewer travelers.
                                    </Text>
                                </View>
                            )}

                            {flightsQuery.data &&
                                flightsQuery.data.map(flight => (
                                    <FlightCard
                                        key={flight.id}
                                        flight={flight}
                                        isSelected={isFlightSelected(flight)}
                                        onToggleSelect={selectionStore.actions.toggleFlight}
                                    />
                                ))}
                        </View>
                    )}

                    {/* Hotels section — only visible on step 2 */}
                    {step === "hotels" && (
                        <View className="mb-6">
                            <Text className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                                Hotels
                                {destination ? (
                                    <Text className="text-sm font-normal text-slate-500 dark:text-slate-400">
                                        {" "}
                                        in {destination}
                                    </Text>
                                ) : null}
                            </Text>

                            {hotelsQuery.isLoading && (
                                <View className="items-center py-6">
                                    <ActivityIndicator size="small" color="#3b82f6" />
                                    <Text className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                                        Searching hotels...
                                    </Text>
                                </View>
                            )}

                            {hotelsQuery.isError && (
                                <Text className="text-sm text-red-500 py-4">
                                    Failed to load hotels. Check the console.
                                </Text>
                            )}

                            {hotelsQuery.data && hotelsQuery.data.length === 0 && (
                                <View className="py-8 items-center">
                                    <Text className="text-slate-400 dark:text-slate-500 text-sm">
                                        No hotels match your filters.
                                    </Text>
                                    <Text className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                                        Try a different destination or fewer guests.
                                    </Text>
                                </View>
                            )}

                            {hotelsQuery.data &&
                                hotelsQuery.data.map(hotel => (
                                    <HotelCard
                                        key={hotel.id}
                                        hotel={hotel}
                                        isSelected={isHotelSelected(hotel)}
                                        onToggleSelect={selectionStore.actions.toggleHotel}
                                    />
                                ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Fixed bottom CTA bar — sits outside ScrollView so it's always visible */}
            {showProceedToHotels && (
                <View className="px-4 pb-6 pt-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                    <Pressable
                        onPress={handleProceedToHotels}
                        className="bg-blue-500 py-3 rounded-xl items-center"
                        accessibilityLabel="Proceed to hotel selection"
                    >
                        <Text className="text-white font-semibold text-base">
                            Proceed to Hotels →
                        </Text>
                    </Pressable>
                </View>
            )}

            {showProceedToTrip && (
                <View className="px-4 pb-6 pt-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                    <Pressable
                        onPress={handleProceedToTrip}
                        className="bg-blue-500 py-3 rounded-xl items-center"
                        accessibilityLabel="Proceed to trip summary"
                    >
                        <Text className="text-white font-semibold text-base">
                            Proceed to Trip →
                        </Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}
