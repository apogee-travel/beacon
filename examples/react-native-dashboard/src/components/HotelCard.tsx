import { View, Text, Pressable } from "react-native";
import type { Hotel } from "../types";

interface HotelCardProps {
    readonly hotel: Hotel;
    // Standard mode: tapping "Add to Trip" calls this handler.
    // Omit this (and provide onToggleSelect instead) to enter selection mode.
    readonly onAddToTrip?: (hotel: Hotel) => void;
    // Selection mode props — when onToggleSelect is provided, the card
    // renders with a border highlight + checkmark badge instead of the "Add to Trip" button.
    readonly isSelected?: boolean;
    readonly onToggleSelect?: (hotel: Hotel) => void;
}

function renderStars(count: number): string {
    return "★".repeat(count) + "☆".repeat(5 - count);
}

export function HotelCard({
    hotel,
    onAddToTrip,
    isSelected = false,
    onToggleSelect,
}: HotelCardProps) {
    const checkIn = new Date(hotel.checkIn).getTime();
    const checkOut = new Date(hotel.checkOut).getTime();
    const nights = Math.max(1, Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
    const totalCost = hotel.pricePerNight * nights;

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
                <View className="flex-1 mr-2">
                    <Text className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {hotel.name}
                    </Text>
                    <Text className="text-sm text-slate-500 dark:text-slate-400">
                        {hotel.destination}
                    </Text>
                </View>
                <Text className="text-yellow-500 text-sm">{renderStars(hotel.stars)}</Text>
            </View>

            {/* Details */}
            <View className="flex-row flex-wrap gap-x-4 gap-y-1 mb-3">
                <View className="flex-row gap-1">
                    <Text className="text-xs text-slate-500 dark:text-slate-400">Check-in</Text>
                    <Text className="text-xs text-slate-700 dark:text-slate-300">
                        {hotel.checkIn}
                    </Text>
                </View>
                <View className="flex-row gap-1">
                    <Text className="text-xs text-slate-500 dark:text-slate-400">Check-out</Text>
                    <Text className="text-xs text-slate-700 dark:text-slate-300">
                        {hotel.checkOut}
                    </Text>
                </View>
                <View className="flex-row gap-1">
                    <Text className="text-xs text-slate-500 dark:text-slate-400">
                        {nights} {nights === 1 ? "night" : "nights"} ·
                    </Text>
                    <Text className="text-xs text-slate-700 dark:text-slate-300">
                        ${hotel.pricePerNight}/night
                    </Text>
                </View>
            </View>

            {/* Amenities */}
            {hotel.amenities.length > 0 && (
                <View className="flex-row flex-wrap gap-1 mb-3">
                    {hotel.amenities.map(amenity => (
                        <View
                            key={amenity}
                            className="border border-slate-200 dark:border-slate-600 rounded-full px-2 py-0.5"
                        >
                            <Text className="text-xs text-slate-600 dark:text-slate-400">
                                {amenity}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Footer */}
            <View className="flex-row items-center justify-between">
                <View>
                    <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        ${totalCost.toLocaleString()}
                    </Text>
                    <Text className="text-xs text-slate-500 dark:text-slate-400">total</Text>
                </View>
                {/* "Add to Trip" button only shown in standard (non-selection) mode */}
                {!isSelectionMode && onAddToTrip && (
                    <Pressable
                        onPress={() => onAddToTrip(hotel)}
                        className="bg-blue-500 px-4 py-2 rounded-lg"
                        accessibilityLabel={`Add ${hotel.name} to trip`}
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
                onPress={() => onToggleSelect(hotel)}
                accessibilityLabel={`${isSelected ? "Deselect" : "Select"} ${hotel.name}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
            >
                {cardContent}
            </Pressable>
        );
    }

    return cardContent;
}
