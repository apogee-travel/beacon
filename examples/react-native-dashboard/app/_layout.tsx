import { useEffect } from "react";
import { Appearance, Pressable, Text } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import { settingsStore } from "../src/stores/settingsStore";
import "../global.css";

// One QueryClient for the entire app — same pattern as the web dashboard.
// staleTime: 0 means queries refetch whenever the component re-mounts (each focus event),
// which is appropriate for a demo where we want to see loading states.
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 0,
            retry: false,
        },
    },
});

function SettingsButton() {
    const router = useRouter();
    return (
        <Pressable
            onPress={() => router.push("/settings")}
            className="pr-4 py-2"
            accessibilityLabel="Open settings"
        >
            <Text className="text-blue-500 text-base">⚙</Text>
        </Pressable>
    );
}

// RootLayout is wrapped with observer so the dark class responds to settingsStore.theme changes.
// Expo Router's Stack navigator handles screen presentation natively.
const RootLayout = observer(() => {
    const isDark = settingsStore.theme === "dark";

    // Sync the OS-level color scheme so NativeWind's darkMode: "media" picks it up.
    // Without this, dark: utility classes do nothing — NativeWind reads Appearance.getColorScheme(),
    // not our store directly. This is the bridge between settingsStore and NativeWind.
    useEffect(() => {
        Appearance.setColorScheme(isDark ? "dark" : "light");
    }, [isDark]);

    return (
        <QueryClientProvider client={queryClient}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <Stack
                screenOptions={{
                    headerRight: () => <SettingsButton />,
                    headerStyle: {
                        backgroundColor: isDark ? "#1e293b" : "#ffffff",
                    },
                    headerTintColor: isDark ? "#f8fafc" : "#0f172a",
                    contentStyle: {
                        backgroundColor: isDark ? "#0f172a" : "#f8fafc",
                    },
                }}
            >
                <Stack.Screen name="index" options={{ title: "Search" }} />
                <Stack.Screen name="trip" options={{ title: "My Trip" }} />
                <Stack.Screen
                    name="settings"
                    options={{
                        title: "Settings",
                        presentation: "modal",
                        // Modal screens don't need the settings gear icon —
                        // you're already in settings.
                        headerRight: undefined,
                    }}
                />
            </Stack>
        </QueryClientProvider>
    );
});

export default RootLayout;
