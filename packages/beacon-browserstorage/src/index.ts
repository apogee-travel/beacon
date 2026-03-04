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

/**
 * Middleware that persists store state to browser storage (localStorage or sessionStorage).
 *
 * Follows the curried middleware pattern: `(options) => (config) => StoreConfig`.
 *
 * On store creation, it hydrates `initialState` from storage so that persisted user data
 * survives page reloads. After creation, it sets up a MobX reaction to automatically
 * write state snapshots to storage whenever state changes. The reaction is registered for
 * cleanup so it stops when the store is disposed.
 *
 * @template TState - The shape of the store's observable state
 * @template _TDerived - Derived/computed values (unused by this middleware, present for signature compatibility)
 * @template _TActions - Action definitions (unused by this middleware, present for signature compatibility)
 * @param options - Storage key and storage type (`'local'` | `'session'`)
 */
export function browserStorageMiddleware<
    TState extends BeaconState,
    _TDerived extends BeaconDerived<TState>,
    _TActions extends BeaconActions<TState>,
>(options: BrowserStorageOptions): (config: any) => any {
    const storageType = options.storageType || "local";
    const storage = storageType === "session" ? sessionStorage : localStorage;

    return (config: any): any => {
        try {
            const saved = storage.getItem(options.key);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Stored state wins over defaults — persisted user data should survive app restarts,
                // not get silently reset to whatever initialState currently ships.
                config.initialState = { ...config.initialState, ...parsed };
            }
        } catch (e) {
            // Storage can be corrupted, quota-exceeded, or blocked (e.g., private browsing restrictions).
            // Falling back to initialState is safer than crashing; log so it's diagnosable.
            console.error(`Failed to load state from ${storageType}Storage`, e);
        }

        const originalOnStoreCreated = config.onStoreCreated;
        config.onStoreCreated = (store: any) => {
            if (originalOnStoreCreated) {
                originalOnStoreCreated(store);
            }

            // MobX reaction takes two functions: the selector (first arg) declares which
            // observables to track; the effect (second arg) runs only when that tracked data
            // changes. This separation prevents the effect's own reads from triggering extra runs.
            const disposer = reaction(
                () => store.getStateSnapshot(),
                () => {
                    const snapshot = store.getStateSnapshot();
                    storage.setItem(options.key, JSON.stringify(snapshot));
                }
            );
            // reaction() returns a disposer; registering it ensures the persistence
            // reaction is torn down when the store is disposed, preventing memory leaks.
            store.registerCleanup(disposer);
        };

        return config;
    };
}
