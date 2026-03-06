import { View, Text } from "react-native";
import { observer } from "mobx-react-lite";
import type { TripStore } from "../stores/tripStore";

interface TripSummaryProps {
    store: TripStore;
}

// TripSummary uses observer so derived values (totalCost, tripDuration, isComplete)
// update reactively when flights or hotels are added/removed from the tripStore.
// Same pattern as the web TripSummary component.
const TripSummary = observer(({ store }: TripSummaryProps) => {
    return (
        <View className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
                <Text className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Trip Summary
                </Text>
                <View
                    className={`px-3 py-1 rounded-full ${
                        store.isComplete
                            ? "bg-green-100 dark:bg-green-900"
                            : "bg-slate-100 dark:bg-slate-700"
                    }`}
                >
                    <Text
                        className={`text-xs font-medium ${
                            store.isComplete
                                ? "text-green-700 dark:text-green-300"
                                : "text-slate-500 dark:text-slate-400"
                        }`}
                    >
                        {store.isComplete ? "✓ Complete" : "Incomplete"}
                    </Text>
                </View>
            </View>

            {/* Stats row */}
            <View className="flex-row">
                <View className="flex-1 items-center">
                    <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        ${store.totalCost.toLocaleString()}
                    </Text>
                    <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Total Cost
                    </Text>
                </View>

                <View className="w-px bg-slate-200 dark:bg-slate-700 mx-2" />

                <View className="flex-1 items-center">
                    <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {store.tripDuration}
                    </Text>
                    <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">Days</Text>
                </View>

                <View className="w-px bg-slate-200 dark:bg-slate-700 mx-2" />

                <View className="flex-1 items-center">
                    <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {store.flights.length + store.hotels.length}
                    </Text>
                    <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">Items</Text>
                </View>
            </View>

            {!store.isComplete && (
                <Text className="text-xs text-slate-400 dark:text-slate-500 text-center mt-3">
                    Add at least one flight and one hotel to complete your trip.
                </Text>
            )}
        </View>
    );
});

export { TripSummary };
