import { View, Text, Pressable } from "react-native";
import type { Flight } from "../types";

interface FlightCardProps {
    readonly flight: Flight;
    // Standard mode: tapping "Add to Trip" calls this handler.
    // Omit this (and provide onToggleSelect instead) to enter selection mode.
    readonly onAddToTrip?: (flight: Flight) => void;
    // Selection mode props — when onToggleSelect is provided, the card
    // renders with a border highlight + checkmark badge instead of the "Add to Trip" button.
    readonly isSelected?: boolean;
    readonly onToggleSelect?: (flight: Flight) => void;
}

function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

function formatStops(stops: number): string {
    if (stops === 0) return "Nonstop";
    return stops === 1 ? "1 stop" : `${stops} stops`;
}

export function FlightCard({
    flight,
    onAddToTrip,
    isSelected = false,
    onToggleSelect,
}: FlightCardProps) {
    const isSelectionMode = onToggleSelect !== undefined;
    // Selection mode uses a blue border when selected; standard mode and unselected
    // selection mode both use the default slate border.
    let borderClass = "border border-slate-200 dark:border-slate-700";
    if (isSelectionMode && isSelected) {
        borderClass = "border-2 border-blue-500";
    } else if (isSelectionMode) {
        borderClass = "border-2 border-slate-200 dark:border-slate-700";
    }

    const cardContent = (
        <View className={`bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 ${borderClass}`}>
            {/* Checkmark badge — shown in selection mode when the card is selected */}
            {isSelectionMode && isSelected && (
                <View className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 items-center justify-center z-10">
                    <Text className="text-white text-xs font-bold">✓</Text>
                </View>
            )}

            {/* Header row */}
            <View className="flex-row items-start justify-between mb-2">
                <View>
                    <Text className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {flight.airline}
                    </Text>
                    <Text className="text-sm text-slate-500 dark:text-slate-400">
                        {flight.origin} → {flight.destination}
                    </Text>
                </View>
                <View
                    className={`px-2 py-1 rounded-full ${
                        flight.stops === 0
                            ? "bg-blue-100 dark:bg-blue-900"
                            : "bg-slate-100 dark:bg-slate-700"
                    }`}
                >
                    <Text
                        className={`text-xs font-medium ${
                            flight.stops === 0
                                ? "text-blue-700 dark:text-blue-300"
                                : "text-slate-600 dark:text-slate-400"
                        }`}
                    >
                        {formatStops(flight.stops)}
                    </Text>
                </View>
            </View>

            {/* Details grid */}
            <View className="flex-row flex-wrap gap-x-4 gap-y-1 mb-3">
                <View className="flex-row gap-1">
                    <Text className="text-xs text-slate-500 dark:text-slate-400">Depart</Text>
                    <Text className="text-xs text-slate-700 dark:text-slate-300">
                        {flight.departDate}
                    </Text>
                </View>
                <View className="flex-row gap-1">
                    <Text className="text-xs text-slate-500 dark:text-slate-400">Return</Text>
                    <Text className="text-xs text-slate-700 dark:text-slate-300">
                        {flight.returnDate}
                    </Text>
                </View>
                <View className="flex-row gap-1">
                    <Text className="text-xs text-slate-500 dark:text-slate-400">Duration</Text>
                    <Text className="text-xs text-slate-700 dark:text-slate-300">
                        {formatDuration(flight.durationMinutes)}
                    </Text>
                </View>
                <View className="flex-row gap-1">
                    <Text className="text-xs text-slate-500 dark:text-slate-400">Up to</Text>
                    <Text className="text-xs text-slate-700 dark:text-slate-300">
                        {flight.travelers} travelers
                    </Text>
                </View>
            </View>

            {/* Footer */}
            <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    ${flight.price.toLocaleString()}
                </Text>
                {/* "Add to Trip" button only shown in standard (non-selection) mode */}
                {!isSelectionMode && onAddToTrip && (
                    <Pressable
                        onPress={() => onAddToTrip(flight)}
                        className="bg-blue-500 px-4 py-2 rounded-lg"
                        accessibilityLabel={`Add ${flight.airline} flight to trip`}
                    >
                        <Text className="text-white text-sm font-medium">Add to Trip</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );

    // In selection mode, the entire card is tappable to toggle selection.
    // In standard mode, only the "Add to Trip" button triggers the action.
    if (isSelectionMode) {
        return (
            <Pressable
                onPress={() => onToggleSelect(flight)}
                accessibilityLabel={`${isSelected ? "Deselect" : "Select"} ${flight.airline} flight`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
            >
                {cardContent}
            </Pressable>
        );
    }

    return cardContent;
}
