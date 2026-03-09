import { View, Text, TextInput, Pressable } from "react-native";
import { observer } from "mobx-react-lite";
import { settingsStore } from "../stores/settingsStore";
import type { Theme } from "../stores/settingsStore";

// SettingsPanel uses observer because it renders store state directly.
// Any change to settingsStore triggers a re-render automatically.
// Same pattern as SettingsDrawer on web, minus the Sheet/drawer wrapper.
const SettingsPanel = observer(() => {
    const handleThemeChange = (theme: Theme) => {
        settingsStore.actions.setTheme(theme);
    };

    return (
        <View className="flex-1">
            {/* Theme section */}
            <View className="mb-6">
                <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                    Appearance
                </Text>

                <View className="flex-row gap-3">
                    <Pressable
                        onPress={() => handleThemeChange("light")}
                        className={`flex-1 py-3 rounded-xl border-2 items-center ${
                            settingsStore.theme === "light"
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        }`}
                    >
                        <Text className="text-2xl mb-1">☀</Text>
                        <Text
                            className={`text-sm font-medium ${
                                settingsStore.theme === "light"
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-slate-600 dark:text-slate-400"
                            }`}
                        >
                            Light
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => handleThemeChange("dark")}
                        className={`flex-1 py-3 rounded-xl border-2 items-center ${
                            settingsStore.theme === "dark"
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        }`}
                    >
                        <Text className="text-2xl mb-1">☾</Text>
                        <Text
                            className={`text-sm font-medium ${
                                settingsStore.theme === "dark"
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-slate-600 dark:text-slate-400"
                            }`}
                        >
                            Dark
                        </Text>
                    </Pressable>
                </View>
            </View>

            {/* Divider */}
            <View className="h-px bg-slate-200 dark:bg-slate-700 mb-6" />

            {/* Search defaults section */}
            <View>
                <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                    Search Defaults
                </Text>

                <View className="mb-4">
                    <Text className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                        Default Destination
                    </Text>
                    <TextInput
                        className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700"
                        placeholder="e.g. Paris"
                        placeholderTextColor="#94a3b8"
                        value={settingsStore.defaultDestination}
                        onChangeText={text => settingsStore.actions.setDefaultDestination(text)}
                        autoCapitalize="words"
                        autoCorrect={false}
                    />
                </View>

                <View>
                    <Text className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                        Default Travelers
                    </Text>
                    <View className="flex-row gap-2">
                        {[1, 2, 3, 4, 5, 6].map(n => (
                            <Pressable
                                key={n}
                                onPress={() => settingsStore.actions.setDefaultTravelers(n)}
                                className={`w-9 h-9 rounded-lg items-center justify-center border ${
                                    settingsStore.defaultTravelers === n
                                        ? "bg-blue-500 border-blue-500"
                                        : "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                                }`}
                            >
                                <Text
                                    className={`text-sm font-medium ${
                                        settingsStore.defaultTravelers === n
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
            </View>

            {/* Persistence note */}
            <View className="mt-8 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <Text className="text-xs text-amber-700 dark:text-amber-400">
                    Settings are in-memory only — they reset on app restart. This is intentional:
                    the web version demonstrates AsyncStorage persistence; this example focuses on
                    store portability across platforms.
                </Text>
            </View>
        </View>
    );
});

export { SettingsPanel };
