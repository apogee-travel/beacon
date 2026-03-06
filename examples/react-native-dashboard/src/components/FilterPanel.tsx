import { View, Text, TextInput, Pressable } from "react-native";
import { observer } from "mobx-react-lite";
import { filtersStore } from "../stores/filtersStore";

// FilterPanel uses observer because it renders store state directly — MobX tracks
// which observables are read during render and re-renders only when those change.
// Same pattern as the web FilterPanel (observer wrapping, direct store reads).
const FilterPanel = observer(() => {
    const isDark = false; // theme wiring handled at app shell level

    return (
        <View className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4">
            <Text className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
                Filters
            </Text>

            {/* Destination */}
            <View className="mb-3">
                <Text className="text-sm text-slate-600 dark:text-slate-400 mb-1">Destination</Text>
                <TextInput
                    className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700"
                    placeholder="e.g. Paris, Tokyo..."
                    placeholderTextColor={isDark ? "#94a3b8" : "#94a3b8"}
                    value={filtersStore.destination}
                    onChangeText={text => filtersStore.actions.setDestination(text)}
                    autoCapitalize="words"
                    autoCorrect={false}
                />
            </View>

            {/* Travelers */}
            <View className="mb-3">
                <Text className="text-sm text-slate-600 dark:text-slate-400 mb-1">Travelers</Text>
                <View className="flex-row gap-2">
                    {[1, 2, 3, 4, 5, 6].map(n => (
                        <Pressable
                            key={n}
                            onPress={() => filtersStore.actions.setTravelers(n)}
                            className={`w-9 h-9 rounded-lg items-center justify-center border ${
                                filtersStore.travelers === n
                                    ? "bg-blue-500 border-blue-500"
                                    : "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                            }`}
                        >
                            <Text
                                className={`text-sm font-medium ${
                                    filtersStore.travelers === n
                                        ? "text-white"
                                        : "text-slate-700 dark:text-slate-300"
                                }`}
                            >
                                {n}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            {/* Undo/Redo — powered by undoMiddleware on filtersStore.
                canUndo/canRedo are derived values that update reactively via observer. */}
            <View className="flex-row gap-2 mt-2">
                <Pressable
                    onPress={() => filtersStore.actions.undo()}
                    disabled={!filtersStore.canUndo}
                    className={`flex-1 py-2 rounded-lg border items-center ${
                        filtersStore.canUndo
                            ? "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                            : "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                    }`}
                >
                    <Text
                        className={`text-sm ${
                            filtersStore.canUndo
                                ? "text-slate-700 dark:text-slate-300"
                                : "text-slate-400 dark:text-slate-600"
                        }`}
                    >
                        ↩ Undo
                    </Text>
                </Pressable>

                <Pressable
                    onPress={() => filtersStore.actions.redo()}
                    disabled={!filtersStore.canRedo}
                    className={`flex-1 py-2 rounded-lg border items-center ${
                        filtersStore.canRedo
                            ? "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                            : "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                    }`}
                >
                    <Text
                        className={`text-sm ${
                            filtersStore.canRedo
                                ? "text-slate-700 dark:text-slate-300"
                                : "text-slate-400 dark:text-slate-600"
                        }`}
                    >
                        ↪ Redo
                    </Text>
                </Pressable>

                <Pressable
                    onPress={() => filtersStore.actions.resetFilters()}
                    className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 items-center"
                >
                    <Text className="text-sm text-slate-500 dark:text-slate-400">Reset</Text>
                </Pressable>
            </View>
        </View>
    );
});

export { FilterPanel };
