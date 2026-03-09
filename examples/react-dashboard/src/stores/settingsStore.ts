import { compose, createStore } from "@apogeelabs/beacon";
import type { BeaconActions, BeaconDerived } from "@apogeelabs/beacon";
import { browserStorageMiddleware } from "@apogeelabs/beacon-browserstorage";

export type Theme = "light" | "dark";

export type SettingsState = {
    theme: Theme;
    defaultDestination: string;
    defaultTravelers: number;
};

// Settings store has no derived values — the state is consumed directly by the drawer and App shell.
export type SettingsDerived = BeaconDerived<SettingsState> & Record<string, never>;

export type SettingsActions = BeaconActions<SettingsState> & {
    setTheme: (state: SettingsState, theme: Theme) => void;
    setDefaultDestination: (state: SettingsState, destination: string) => void;
    setDefaultTravelers: (state: SettingsState, count: number) => void;
};

// settingsStore persists to localStorage via browserStorageMiddleware.
// On load, saved settings hydrate the store so the user's preferences survive page refreshes.
export const settingsStore = createStore<SettingsState, SettingsDerived, SettingsActions>(
    compose<SettingsState, SettingsDerived, SettingsActions>(
        browserStorageMiddleware({ key: "beacon-dashboard-settings" })
    )({
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
    })
);
