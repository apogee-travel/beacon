# @apogeelabs/beacon-browserstorage v1.0.0

Beacon middleware that persists store state to `localStorage` or `sessionStorage`. Loads saved state on store creation, writes back on every state change via MobX `reaction`.

## Imports

```typescript
import {
    browserStorageMiddleware,
    type BrowserStorageOptions,
} from "@apogeelabs/beacon-browserstorage";
```

## Type Signatures

```typescript
interface BrowserStorageOptions {
    /** Key used for storage.getItem / storage.setItem */
    key: string;
    /** "local" (default) or "session" */
    storageType?: "local" | "session";
}

function browserStorageMiddleware<
    TState extends BeaconState,
    _TDerived extends BeaconDerived<TState>,
    _TActions extends BeaconActions<TState>,
>(options: BrowserStorageOptions): (config: StoreConfig) => StoreConfig;
```

## Usage

### With `compose` (recommended)

```typescript
import { createStore, compose } from "@apogeelabs/beacon";
import { browserStorageMiddleware } from "@apogeelabs/beacon-browserstorage";

interface AppState {
    theme: "light" | "dark";
    sidebarOpen: boolean;
}

const appStore = createStore<AppState>(
    compose<AppState>(browserStorageMiddleware({ key: "app-prefs" }))({
        initialState: {
            theme: "light",
            sidebarOpen: true,
        },
    })
);
// On creation: loads JSON from localStorage["app-prefs"] and merges into initialState.
// On every state change: writes getStateSnapshot() back to localStorage["app-prefs"].
```

### With sessionStorage

```typescript
const sessionStore = createStore<SessionState>(
    compose<SessionState>(
        browserStorageMiddleware({ key: "session-data", storageType: "session" })
    )({
        initialState: { token: null, expiresAt: null },
    })
);
```

## How it works

1. **On middleware application (before store creation):** Reads `storage.getItem(key)`, parses JSON, shallow-merges into `config.initialState`. If the read fails, logs an error and continues with the original `initialState`.
2. **In `onStoreCreated`:** Sets up a MobX `reaction` watching `store.getStateSnapshot()`. Every time state changes, serializes the snapshot to `storage.setItem(key, JSON.stringify(snapshot))`.
3. **Chains `onStoreCreated`:** If the config already had an `onStoreCreated`, the original is called after the reaction is set up.

## Gotchas

- **Shallow merge only.** Persisted state is spread over `initialState` with `{ ...config.initialState, ...parsed }`. Nested objects are replaced, not deep-merged. If your state shape changes between deploys, stale keys from storage will survive and new nested defaults may be lost.
- **Writes on every state change.** The `reaction` fires on any observable mutation. For stores with high-frequency updates, this will hammer storage. There is no debounce or throttle built in.
- **Snapshots exclude derived values.** `getStateSnapshot()` is called without `{ withDerived: true }`, so only raw state is persisted. This is correct behavior, but be aware if you're expecting derived values in storage.
- **No cleanup of the reaction.** The MobX `reaction` created in `onStoreCreated` is not registered with `store.registerCleanup()`. If you dispose the store, the reaction is not explicitly torn down (MobX will GC it when the observable is collected, but it's worth knowing).
- **`JSON.stringify` / `JSON.parse` only.** No custom serializer option. Dates, Maps, Sets, and class instances will not survive the round-trip.
- **Storage errors on write are not caught.** If `localStorage` is full or unavailable, the `reaction` callback will throw. The read path catches errors; the write path does not.
