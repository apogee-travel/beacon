# Beacon Trip Planner — React Native Example

A React Native (Expo) port of the [web Trip Planner dashboard](../react-dashboard/), demonstrating that Beacon stores, middleware, and React hooks work identically across platforms without modification.

## What This Demonstrates

| Feature                                                   | Where to find it                                                        |
| --------------------------------------------------------- | ----------------------------------------------------------------------- |
| `createStore` — observable state, derived values, actions | `src/stores/filtersStore.ts`, `src/stores/tripStore.ts`                 |
| `compose` + custom middleware                             | `src/stores/filtersStore.ts` (undoMiddleware)                           |
| `observer()` — direct store rendering                     | `src/components/FilterPanel.tsx`, `TripSummary.tsx`, `TripItemList.tsx` |
| `useStoreState` — MobX → TanStack Query bridge            | `app/index.tsx`                                                         |
| TanStack Query integration                                | `src/hooks/useFlights.ts`, `src/hooks/useHotels.ts`                     |
| **Store disposal via `useFocusEffect`**                   | `app/trip.tsx` ← **the headline demo**                                  |
| Custom `undoMiddleware`                                   | `src/lib/undoMiddleware.ts`                                             |

## The Headline: Store Disposal via `useFocusEffect`

The most important thing this example teaches is _when and how_ to dispose stores in React Native.

**On web**, React Router unmounts the `/trip` route component when navigating away. Store disposal hangs on `useEffect` cleanup, which fires on unmount.

**On RN**, screens are NOT unmounted when navigating away — they stay in the navigation stack for performance. So we use `useFocusEffect` from `@react-navigation/native`:

```tsx
// app/trip.tsx — the key lifecycle code
useFocusEffect(
    useCallback(() => {
        storeRef.current = createTripStore(); // runs on screen focus

        return () => {
            storeRef.current?.dispose(); // runs on screen blur
        };
    }, [params.addItemJson])
);
```

Watch the console while navigating:

- Navigate to **My Trip** → `[tripStore] created — store is alive`
- Navigate back to **Search** → `[tripStore] disposed — screen lost focus`
- Navigate to **My Trip** again → `[tripStore] created — store is alive` (fresh, empty store)

Opening the **Settings** modal does NOT trigger blur on the Trip screen. Modals sit on top without losing the underlying screen's focus. This is intentional and documented in the [build plan](../../docs/build-plans/react-native-dashboard-example.md).

## What Differs from the Web Version

### Mock API: plain async functions instead of MSW

MSW (Mock Service Worker) doesn't work in React Native — there are no Service Workers. The web version uses MSW to intercept `fetch()` calls. Here, TanStack Query's `queryFn` calls the API functions directly:

```ts
// Web: queryFn calls fetch() → MSW intercepts → returns filtered data
queryFn: () => fetchFlights(params);

// RN: queryFn calls getFlights() directly — same filter logic, no network involved
queryFn: () => getFlights({ destination: params.destination, travelers: params.travelers });
```

The filter logic in `src/api/flights.ts` and `src/api/hotels.ts` is identical to the MSW handlers — same field names, same substring match behavior. The 400ms simulated delay is preserved so loading states are visible.

### Settings: in-memory only (no persistence middleware)

The web `settingsStore` uses `browserStorageMiddleware` to persist settings to `localStorage`. There is no equivalent in RN — `AsyncStorage` middleware is a separate effort and a separate package concern.

**Settings reset to defaults on app restart. This is intentional.** The note in the Settings screen explains this to users. The point of this example is store _portability_, not persistence.

### Navigation: Expo Router modal instead of a drawer

The web version puts Settings in a side drawer (Sheet component). Here, Settings is an Expo Router modal — `presentation: 'modal'` in `_layout.tsx`. This is the platform-appropriate pattern for mobile and requires no extra dependencies.

### Dark mode: `settingsStore.theme` → `_layout.tsx` observer

On web, the `dark` class is toggled on `document.documentElement`. On RN, NativeWind's `dark:` classes respond to the color scheme. The `_layout.tsx` root component is an `observer` that reads `settingsStore.theme` and applies it via `headerStyle` and `contentStyle` on the Stack navigator. Full NativeWind dark mode theming requires a `ThemeProvider` or `Appearance.setColorScheme()` — this example handles it at the navigator level, which covers the primary use case.

## Running the App

```bash
# From the monorepo root — build workspace packages first
pnpm build

# Then start the Expo dev server
cd examples/react-native-dashboard
pnpm start
```

You'll need the **Expo Go** app on your device or a simulator running.

### Running Tests

```bash
cd examples/react-native-dashboard
pnpm test
```

Tests cover the fake API functions, all three stores, and the undoMiddleware. Component files (`.tsx`) are not unit tested — component testing is handled separately.

## Project Structure

```
app/
  _layout.tsx       # Root layout: QueryClient, Stack navigator, dark mode, settings gear
  index.tsx         # Search/Browse screen (useStoreState → TanStack Query bridge)
  trip.tsx          # Trip Itinerary screen (useFocusEffect lifecycle demo)
  settings.tsx      # Settings modal (observer, in-memory settingsStore)

src/
  api/
    flights.ts      # getFlights() — fake API (replaces MSW)
    hotels.ts       # getHotels() — fake API
    data/
      flights.ts    # 25 mock flights (same as web)
      hotels.ts     # 25 mock hotels (same as web)
  components/
    FilterPanel.tsx  # observer() — reads filtersStore directly, has undo/redo buttons
    FlightCard.tsx   # Presentational, no store access
    HotelCard.tsx    # Presentational, no store access
    TripSummary.tsx  # observer() — renders tripStore derived values
    TripItemList.tsx # observer() — renders tripStore flights/hotels with remove buttons
    SettingsPanel.tsx # observer() — reads/writes settingsStore
  hooks/
    useFlights.ts   # TanStack Query hook (calls getFlights directly)
    useHotels.ts    # TanStack Query hook (calls getHotels directly)
  lib/
    undoMiddleware.ts # Custom middleware (copied from web, zero changes)
  stores/
    filtersStore.ts  # Long-lived, module-scoped, with undoMiddleware
    settingsStore.ts # Long-lived, module-scoped, NO persistence middleware
    tripStore.ts     # Factory function — createTripStore() called inside useFocusEffect
  types.ts          # Flight and Hotel interfaces (identical to web)
```
