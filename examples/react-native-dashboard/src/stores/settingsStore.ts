// Intentionally simpler than the web version — no browserStorageMiddleware.
// In RN, localStorage doesn't exist. AsyncStorage persistence is a separate concern
// (and a separate package). This demo is about portability, not persistence.
// Settings reset to defaults on app restart — that's intentional and called out in README.
import { createStore } from "@apogeelabs/beacon";
import type { BeaconActions, BeaconDerived } from "@apogeelabs/beacon";

export type Theme = "light" | "dark";

export type SettingsState = {
    theme: Theme;
    defaultDestination: string;
    defaultTravelers: number;
};

export type SettingsDerived = BeaconDerived<SettingsState> & Record<string, never>;

export type SettingsActions = BeaconActions<SettingsState> & {
    setTheme: (state: SettingsState, theme: Theme) => void;
    setDefaultDestination: (state: SettingsState, destination: string) => void;
    setDefaultTravelers: (state: SettingsState, count: number) => void;
};

// No middleware — no persistence. Contrast with web settingsStore which uses
// browserStorageMiddleware. This is a deliberate simplification for the RN demo.
export const settingsStore = createStore<SettingsState, SettingsDerived, SettingsActions>({
    initialState: {
        theme: "light",
        defaultDestination: "",
        defaultTravelers: 1,
    },
    actions: {
        setTheme: (state, theme) => {
            state.theme = theme;
        },
        setDefaultDestination: (state, destination) => {
            state.defaultDestination = destination;
        },
        setDefaultTravelers: (state, count) => {
            state.defaultTravelers = count;
        },
    },
});
