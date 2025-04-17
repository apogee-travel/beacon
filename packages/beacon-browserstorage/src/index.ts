/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BeaconActions, BeaconDerived, BeaconState } from "@apogeelabs/beacon";
import { reaction } from "mobx";

export interface BrowserStorageOptions {
    /**
     * The key to use for storing in browser storage
     */
    key: string;
    /**
     * The type of storage to use: 'local' for localStorage or 'session' for sessionStorage
     * Defaults to 'local'
     */
    storageType?: "local" | "session";
}

export function browserStorageMiddleware<
    TState extends BeaconState,
    _TDerived extends BeaconDerived<TState>,
    _TActions extends BeaconActions<TState>,
>(options: BrowserStorageOptions) {
    const storageType = options.storageType || "local";
    const storage = storageType === "session" ? sessionStorage : localStorage;

    return (config: any) => {
        // Load initial state from storage if available
        try {
            const saved = storage.getItem(options.key);
            if (saved) {
                const parsed = JSON.parse(saved);
                config.initialState = { ...config.initialState, ...parsed };
            }
        } catch (e) {
            console.error(`Failed to load state from ${storageType}Storage`, e);
        }

        // Setup onStoreCreated to persist changes
        const originalOnStoreCreated = config.onStoreCreated;
        config.onStoreCreated = (store: any) => {
            // Call original if exists
            if (originalOnStoreCreated) {
                originalOnStoreCreated(store);
            }

            // Save to storage whenever state changes
            reaction(
                () => store.getStateSnapshot(),
                () => {
                    const snapshot = store.getStateSnapshot();
                    storage.setItem(options.key, JSON.stringify(snapshot));
                }
            );
        };

        return config;
    };
}
