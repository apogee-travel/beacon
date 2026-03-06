import { View, Text, Pressable } from "react-native";
import { observer } from "mobx-react-lite";
import type { TripStore } from "../stores/tripStore";

function formatStops(stops: number): string {
    if (stops === 0) return "Nonstop";
    return stops === 1 ? "1 stop" : `${stops} stops`;
}

interface TripItemListProps {
    store: TripStore;
}

// TripItemList uses observer so the list re-renders reactively when items are added or removed.
const TripItemList = observer(({ store }: TripItemListProps) => {
    const hasItems = store.flights.length > 0 || store.hotels.length > 0;

    if (!hasItems) {
        return (
            <View className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 items-center">
                <Text className="text-4xl mb-3">🗺</Text>
                <Text className="text-slate-500 dark:text-slate-400 font-medium mb-1">
                    Your trip is empty.
                </Text>
                <Text className="text-sm text-slate-400 dark:text-slate-500 text-center">
                    Go to Search, find flights and hotels, and tap &quot;Add to Trip&quot;.
                </Text>
            </View>
        );
    }

    return (
        <View>
            {/* Flights */}
            {store.flights.length > 0 && (
                <View className="mb-4">
                    <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                        Flights ({store.flights.length})
                    </Text>

                    {store.flights.map(flight => (
                        <View
                            key={flight.id}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 mb-2"
                        >
                            <View className="flex-row items-start justify-between">
                                <View className="flex-1 mr-3">
                                    <Text className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                        {flight.airline} — {flight.origin} → {flight.destination}
                                    </Text>
                                    <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        {flight.departDate} → {flight.returnDate}
                                    </Text>
                                </View>
                                <View className="flex-row items-center gap-3">
                                    <View
                                        className={`px-2 py-0.5 rounded-full ${
                                            flight.stops === 0
                                                ? "bg-blue-100 dark:bg-blue-900"
                                                : "bg-slate-100 dark:bg-slate-700"
                                        }`}
                                    >
                                        <Text
                                            className={`text-xs ${
                                                flight.stops === 0
                                                    ? "text-blue-700 dark:text-blue-300"
                                                    : "text-slate-600 dark:text-slate-400"
                                            }`}
                                        >
                                            {formatStops(flight.stops)}
                                        </Text>
                                    </View>
                                    <Text className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                        ${flight.price.toLocaleString()}
                                    </Text>
                                    <Pressable
                                        onPress={() => store.actions.removeFlight(flight.id)}
                                        className="w-7 h-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700"
                                        accessibilityLabel={`Remove ${flight.airline} flight`}
                                    >
                                        <Text className="text-xs text-slate-500 dark:text-slate-400">
                                            ✕
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Hotels */}
            {store.hotels.length > 0 && (
                <View>
                    <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                        Hotels ({store.hotels.length})
                    </Text>

                    {store.hotels.map(hotel => {
                        const nights = Math.max(
                            1,
                            Math.round(
                                (new Date(hotel.checkOut).getTime() -
                                    new Date(hotel.checkIn).getTime()) /
                                    (1000 * 60 * 60 * 24)
                            )
                        );

                        return (
                            <View
                                key={hotel.id}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 mb-2"
                            >
                                <View className="flex-row items-start justify-between">
                                    <View className="flex-1 mr-3">
                                        <Text className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                            {hotel.name}
                                        </Text>
                                        <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            {hotel.checkIn} → {hotel.checkOut} ({nights}{" "}
                                            {nights === 1 ? "night" : "nights"})
                                        </Text>
                                    </View>
                                    <View className="flex-row items-center gap-3">
                                        <Text className="text-xs text-slate-500 dark:text-slate-400">
                                            ${hotel.pricePerNight}/night
                                        </Text>
                                        <Text className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                            ${(hotel.pricePerNight * nights).toLocaleString()}
                                        </Text>
                                        <Pressable
                                            onPress={() => store.actions.removeHotel(hotel.id)}
                                            className="w-7 h-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700"
                                            accessibilityLabel={`Remove ${hotel.name}`}
                                        >
                                            <Text className="text-xs text-slate-500 dark:text-slate-400">
                                                ✕
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
});

export { TripItemList };
