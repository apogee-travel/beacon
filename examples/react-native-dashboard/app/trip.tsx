import { useState, useCallback } from "react";
import { ScrollView, View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { createTripStore } from "../src/stores/tripStore";
import { selectionStore } from "../src/stores/selectionStore";
import type { TripStore } from "../src/stores/tripStore";
import { TripSummary } from "../src/components/TripSummary";
import { TripItemList } from "../src/components/TripItemList";
import type { Flight, Hotel } from "../src/types";

// Shape of the nav params passed by SearchScreen's "Add to Trip" buttons.
// We pass a serialized JSON object with a type discriminant to avoid two separate params.
interface AddItemParam {
    type: "flight" | "hotel";
    item: Flight | Hotel;
}

/**
 * Trip Itinerary screen — the headline disposal lifecycle demo.
 *
 * KEY DIFFERENCE FROM WEB:
 * On web (/trip), the tripStore is created on component mount (useEffect) and disposed
 * on unmount. This works because React Router unmounts the component when navigating away.
 *
 * On RN, screens are NOT unmounted when navigating away — they stay in the stack.
 * So we use useFocusEffect instead. The store is:
 *   - Created when this screen receives focus (user navigates to it)
 *   - Disposed when focus is lost (user navigates away OR opens a modal over it)
 *
 * This is more explicit than the web version — disposal is a deliberate choice,
 * not a side effect of routing. Watch the console: "[tripStore] created" on focus,
 * "[tripStore] disposed" on blur.
 *
 * Note: Expo Router's modal presentation (settings.tsx) does NOT trigger blur on this
 * screen. Modals sit on top; the underlying screen retains focus. This is expected.
 */
export default function TripScreen() {
    // useState instead of useRef: a state update is atomic from React's perspective.
    // With useRef, there's a window between dispose+null and the next store creation where
    // a triggered render could see a disposed store with nullified derived values — crash.
    // useState guarantees React only ever renders with a valid store or null, never in-between.
    const [store, setStore] = useState<TripStore | null>(null);

    // Read the nav param that SearchScreen sends when "Add to Trip" is tapped.
    // useLocalSearchParams is how Expo Router exposes URL params to screen components.
    const params = useLocalSearchParams<{ addItemJson?: string }>();

    // useFocusEffect fires the callback whenever this screen gains focus.
    // The returned cleanup runs when focus is lost (screen blur or pop).
    // We wrap in useCallback so useFocusEffect's dependency check doesn't thrash.
    useFocusEffect(
        useCallback(() => {
            // Create a fresh store on every focus — trip state is deliberately ephemeral.
            // This is the "aha moment": even though the screen component persists in the
            // navigation stack, its store lifecycle is tied to screen visibility.
            const newStore = createTripStore();

            // Bulk-add from selection store (stepped flow: flights → hotels → trip).
            // This is a one-shot imperative read — not a reactive subscription.
            // selectionStore holds the selections until we clear them here.
            selectionStore.selectedFlights.forEach(f => newStore.actions.addFlight(f));
            selectionStore.selectedHotels.forEach(h => newStore.actions.addHotel(h));

            // Existing: single-item from route params (backward compat for old flow).
            if (params.addItemJson) {
                try {
                    const parsed = JSON.parse(params.addItemJson) as AddItemParam;
                    if (parsed.type === "flight") {
                        newStore.actions.addFlight(parsed.item as Flight);
                    } else if (parsed.type === "hotel") {
                        newStore.actions.addHotel(parsed.item as Hotel);
                    }
                } catch {
                    // Malformed param — silently ignore. Not worth crashing the demo.
                    console.warn("[TripScreen] failed to parse addItemJson param");
                }
            }

            setStore(newStore);

            // Clear after consuming — selections have been hydrated into tripStore.
            selectionStore.actions.clearAll();

            // Cleanup: dispose the store when focus is lost.
            // Calling dispose() runs all cleanup functions registered by middleware,
            // replaces actions with no-ops, and sets isDisposed = true.
            return () => {
                console.log("[tripStore] disposed — screen lost focus");
                newStore.dispose();
                setStore(null);
            };
        }, [params.addItemJson])
    );

    // store is null before the first focus event fires.
    // This renders briefly during the initial mount before useFocusEffect runs.
    if (!store) {
        return (
            <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Text className="text-slate-400 dark:text-slate-500">Loading...</Text>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900">
            <View className="p-4">
                <TripSummary store={store} />
                <TripItemList store={store} />
            </View>
        </ScrollView>
    );
}
