# Trip Planner — Beacon Demo App

A realistic travel planning SPA that demonstrates Beacon's state management patterns alongside TanStack Query and React Router. Built for senior React developers evaluating Beacon as a `useState`/`useReducer` replacement.

## Running the App

```bash
# From the repo root
pnpm install
pnpm build          # Build workspace packages first

# Then from this directory
cd examples/react-dashboard
pnpm dev
```

The app runs at `http://localhost:5173`. MSW intercepts all `/api/flights` and `/api/hotels` requests — no backend required.

---

## Beacon Feature Map

### 1. Basic Store Creation

**File:** `src/stores/filtersStore.ts`

`createStore()` with `initialState` and `actions`. This is the simplest Beacon pattern — observable state, typed actions, no middleware.

```ts
export const filtersStore = createStore<FiltersState, FiltersDerived, FiltersActions>(
    compose(undoMiddleware({ maxHistory: 10 }))({
        initialState: { destination: "", departDate: "", returnDate: "", travelers: 1 },
        actions: {
            setDestination: (state, destination) => {
                state.destination = destination;
            },
            // ...
        },
    })
);
```

### 2. Derived Values (Computed State)

**File:** `src/hooks/useTripStore.ts` — `totalCost`, `tripDuration`, `isComplete`

Derived values are functions of `(state) => value` that MobX memoizes as `computed()`. They only recompute when the state they read changes.

```ts
derived: {
  totalCost: state => {
    const flightTotal = state.flights.reduce((sum, f) => sum + f.price, 0);
    const hotelTotal = state.hotels.reduce((sum, h) => { /* nights × rate */ }, 0);
    return flightTotal + hotelTotal;
  },
  isComplete: state => state.flights.length > 0 && state.hotels.length > 0,
}
```

Rendered in: `src/components/TripSummary.tsx`

### 3. Built-in Middleware: `browserStorageMiddleware`

**File:** `src/stores/settingsStore.ts`

`browserStorageMiddleware` hydrates `initialState` from localStorage on store creation and sets up a MobX reaction to persist state on every change. Theme, default destination, and default traveler count survive page refreshes automatically.

```ts
export const settingsStore = createStore(
    compose(browserStorageMiddleware({ key: "beacon-dashboard-settings" }))({
        initialState: { theme: "light", defaultDestination: "", defaultTravelers: 1 },
        // ...
    })
);
```

Try it: open Settings, change the theme to dark, refresh — it sticks.

### 4. Custom Middleware: `undoMiddleware`

**File:** `src/lib/undoMiddleware.ts`

This is the complete middleware authoring pattern. It demonstrates every middleware capability:

- **Adds `undo`/`redo` actions** to the config
- **Adds `canUndo`/`canRedo` derived values** (backed by MobX observable arrays so they update reactively)
- **Uses `onStoreCreated`** to set up a MobX reaction that captures history on every state change
- **Registers cleanup** so the reaction is torn down when the store is disposed
- **Chains `onStoreCreated`** — always calls the prior hook before adding its own

```ts
// (options) => (config) => config — the full curried signature
export function undoMiddleware(options: UndoMiddlewareOptions = {}) {
  return (config) => {
    config.derived = { ...config.derived, canUndo: () => past.length > 0, /* ... */ };
    config.actions = { ...config.actions, undo: ..., redo: ... };
    const originalOnStoreCreated = config.onStoreCreated;
    config.onStoreCreated = (store) => {
      originalOnStoreCreated?.(store);         // always chain
      const disposer = reaction(...);
      store.registerCleanup(disposer);         // always clean up
    };
    return config;
  };
}
```

**Key implementation note:** MobX reactions fire _after_ the action that caused them completes. A naïve boolean flag (`isUndoInProgress`) gets cleared before the reaction runs. The middleware solves this with a `skipNextN` counter that decrements _inside_ the reaction, and a `prevSnapshot` pattern that captures state _before_ each change (since the reaction only has access to the new state).

Tests: `src/lib/undoMiddleware.test.ts` — 21 tests covering all branches.

### 5. Store Disposal Lifecycle

**File:** `src/hooks/useTripStore.ts`

`useTripStore` creates a `tripStore` on mount and disposes it on unmount. Every visit to `/trip` gets a fresh empty store. Navigate away and the store is torn down — watch the console for `[tripStore] disposed`.

```ts
export function useTripStore(): TripStore {
    const storeRef = useRef<TripStore | null>(null);
    storeRef.current ??= createTripStore(); // create once, synchronously

    useEffect(() => {
        return () => {
            storeRef.current?.dispose(); // dispose on unmount
        };
    }, []);

    return storeRef.current;
}
```

This is the contrast that makes the lifecycle visible:

| Store           | Scope           | Lifetime                            |
| --------------- | --------------- | ----------------------------------- |
| `filtersStore`  | Module          | Forever — survives navigation       |
| `settingsStore` | Module          | Forever — persisted to localStorage |
| `tripStore`     | Route (`/trip`) | Created on entry, disposed on exit  |

### 6. React Integration: `observer` vs `useStoreState`

**This is the most important pattern to understand.**

#### `observer` — for components that render store state

**Files:** `src/components/FilterPanel.tsx`, `src/components/SettingsDrawer.tsx`, `src/components/TripSummary.tsx`, `src/components/TripItemList.tsx`

Wrap a component with `observer` from `mobx-react-lite` when it reads store values directly during render. MobX tracks exactly which observables the component reads and re-renders it only when those change. No selectors, no subscription setup, no `useEffect`.

```tsx
const FilterPanel = observer(() => {
  return <input value={filtersStore.destination} onChange={...} />;
  //                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //     MobX sees this read and subscribes automatically
});
```

#### `useStoreState` — for bridging MobX into non-MobX hooks

**File:** `src/views/SearchView.tsx`

`useQuery` from TanStack Query needs _plain JS values_ for query keys — not MobX observables. If you pass an observable directly, TanStack Query captures the object reference at setup time and never sees changes.

`useStoreState` from `@apogeelabs/beacon-react-utils` converts observable state into React state: when the observable changes, it calls `setState`, which triggers a re-render, which gives `useQuery` a new query key, which triggers a refetch.

```tsx
// SearchView.tsx — NOT wrapped with observer

// Bridge MobX → React state → TanStack Query key
const destination = useStoreState(filtersStore, s => s.destination);
const travelers = useStoreState(filtersStore, s => s.travelers);

// Now destination/travelers are plain strings/numbers — safe for query keys
const flightsQuery = useFlights({ destination, travelers });
```

**Decision rule:**

- Component renders store values in JSX → use `observer`
- Store value needs to flow into a non-MobX hook (TanStack Query, `useEffect` dependencies, third-party hooks) → use `useStoreState`

### 7. Middleware Composition

**File:** `src/stores/filtersStore.ts`

`compose()` applies middleware left-to-right. Each middleware receives the config from the previous one, transforms it, and passes it along.

```ts
compose(
    undoMiddleware({ maxHistory: 10 })
    // add more middleware here — each one wraps the config before createStore sees it
);
```

`settingsStore` composes `browserStorageMiddleware`. You can stack multiple middlewares on a single store — they all run in order, each chaining the prior `onStoreCreated`.

---

## App Structure

```
src/
  stores/
    filtersStore.ts       # Long-lived, module-scoped, undo middleware
    settingsStore.ts      # Long-lived, module-scoped, localStorage persistence
  hooks/
    useTripStore.ts       # Ephemeral tripStore — created/disposed with route
    useFlights.ts         # TanStack Query hook (query key from useStoreState)
    useHotels.ts          # TanStack Query hook (query key from useStoreState)
  lib/
    undoMiddleware.ts     # Custom middleware — the authoring pattern template
    utils.ts              # cn() Tailwind class merge utility
  views/
    SearchView.tsx        # observer vs useStoreState demo
    TripView.tsx          # Store disposal lifecycle demo
  components/
    FilterPanel.tsx       # observer — reads filtersStore directly
    FlightCard.tsx        # Presentational — no store access
    HotelCard.tsx         # Presentational — no store access
    SettingsDrawer.tsx    # observer — reads settingsStore directly
    TripSummary.tsx       # observer — reads tripStore derived values
    TripItemList.tsx      # observer — reads tripStore state
  mocks/
    browser.ts            # MSW worker setup
    handlers.ts           # /api/flights and /api/hotels mock handlers
    data/flights.ts       # 25 mock flights
    data/hotels.ts        # 25 mock hotels
  types.ts                # Shared Flight and Hotel types
  App.tsx                 # Layout shell — theme application, settings drawer trigger
  main.tsx                # MSW start → React render, QueryClient, Router setup
```

## MSW Mock API

Both endpoints accept query params for filtering:

- `GET /api/flights?destination=Paris&travelers=2` — substring match on destination
- `GET /api/hotels?destination=Tokyo&guests=2` — substring match on destination

The 400ms simulated delay makes TanStack Query loading states visible. To see the raw data, open DevTools → Network tab and trigger a filter change.
