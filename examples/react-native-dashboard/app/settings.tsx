import { ScrollView, View } from "react-native";
import { observer } from "mobx-react-lite";
import { settingsStore } from "../src/stores/settingsStore";
import { SettingsPanel } from "../src/components/SettingsPanel";

// Settings screen presented as a native modal (see _layout.tsx for presentation: "modal").
// observer wrapping here is mostly cosmetic — SettingsPanel is the real observer.
// The StatusBar style responds to the theme via _layout.tsx which is already an observer.
const SettingsScreen = observer(() => {
    const isDark = settingsStore.theme === "dark";

    return (
        <ScrollView className="flex-1" style={{ backgroundColor: isDark ? "#0f172a" : "#f8fafc" }}>
            <View className="p-6">
                <SettingsPanel />
            </View>
        </ScrollView>
    );
});

export default SettingsScreen;
