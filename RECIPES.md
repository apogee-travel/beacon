# Beacon Recipes

Patterns and integration guides for using Beacon with other libraries.

---

## Beacon + React Query (TanStack Query)

How to connect a Beacon store to React Query for server-state management. The store owns UI state (filters, selections, loading flags); React Query owns fetching, caching, and pagination. A "bridge" hook connects them.

### The Default: `observer` + Direct Store Access

Before reaching for `useStoreState` or `useStoreWatcher`, remember that the standard way to consume store state in a React component is to wrap the component with `observer` from `mobx-react-lite` and read store values directly:

```typescript
import { observer } from "mobx-react-lite";

const SearchResults = observer(({ store }: { store: SearchStore }) => {
    return (
        <ul>
            {store.results.map(item => (
                <li key={item.id}>{item.name}</li>
            ))}
        </ul>
    );
});
```

The hooks below are for when you need store values to participate in React's state lifecycle — specifically, to drive React Query parameters or feed other hooks that don't understand MobX observables.

### Simple Case: Fetch on Mount

When the store doesn't drive query parameters — data flows one direction (API to store).

```typescript
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

function useBookingsBridge(store: BookingsStore) {
    const { user } = useAuth();

    const { data: bookings, isLoading } = useQuery({
        queryKey: ["bookings", user?.id],
        queryFn: () => fetchBookings(user),
        enabled: !!user,
    });

    // Push API results into the store
    useEffect(() => {
        if (bookings) {
            store.actions.setBookings(bookings);
        }
    }, [bookings]);

    useEffect(() => {
        store.actions.setIsLoading(isLoading);
    }, [isLoading]);
}
```

No `useStoreWatcher` or `useStoreState` needed — query params come from auth state, not the store.

### Full Case: Store-Driven Queries

When the store has derived search parameters that drive React Query. This is the bidirectional pattern:

1. **Store to API**: Store's derived params change, triggering a React Query refetch.
2. **API to Store**: Query results flow back into the store via actions.

#### Store Setup

The store's `derived` section computes API-ready parameters from UI state:

```typescript
const store = createStore<State, Derived, Actions>({
    initialState: {
        searchTerm: "",
        selectedFilters: new Set<string>(),
        items: [],
        isLoading: false,
        hasNextPage: false,
    },
    derived: {
        // This derived value is what the bridge watches
        searchParams: state => ({
            name: state.searchTerm || undefined,
            category: Array.from(state.selectedFilters).join(",") || undefined,
        }),
    },
    actions: {
        setSearchTerm: (state, term: string) => {
            state.items = []; // clear stale results
            state.isLoading = true; // optimistic loading state
            state.searchTerm = term;
        },
        appendItems: (state, all: Item[]) => {
            const newOnes = all.slice(state.items.length);
            state.items.push(...newOnes);
        },
        setIsLoading: (state, loading: boolean) => {
            state.isLoading = loading;
        },
        setHasNextPage: (state, has: boolean) => {
            state.hasNextPage = has;
        },
    },
});
```

#### Bridge Hook

```typescript
import { useEffect } from "react";
import { useStoreState } from "@apogeelabs/beacon-react-utils";
import { useInfiniteQuery } from "@tanstack/react-query";

function useSearchBridge(store: SearchStore, repository: SearchRepository) {
    // DIRECTION 1: Store -> API
    // Convert store's derived searchParams to React state.
    // When the store's searchParams change, this triggers a re-render,
    // which gives React Query new query keys, which triggers a refetch.
    const searchParams = useStoreState(store, s => s.searchParams);

    const { data, fetchNextPage, hasNextPage, isLoading, isError } = useInfiniteQuery({
        queryKey: ["search", searchParams],
        queryFn: ({ pageParam = 0 }) => repository.search({ ...searchParams, offset: pageParam }),
        getNextPageParam: lastPage => {
            const { offset, limit, total } = lastPage.pagination;
            return offset + limit < total ? offset + limit : undefined;
        },
        initialPageParam: 0,
    });

    // DIRECTION 2: API -> Store
    useEffect(() => {
        if (data) {
            const allItems = data.pages.flatMap(page => page.items);
            store.actions.appendItems(allItems);
        }
    }, [data]);

    useEffect(() => {
        store.actions.setIsLoading(isLoading);
        store.actions.setHasNextPage(!!hasNextPage);
    }, [isLoading, hasNextPage]);
}
```

#### Using `useStoreWatcher` Instead

If you need more control — for example, debouncing or conditional updates — use `useStoreWatcher` directly instead of `useStoreState`:

```typescript
import { useState } from "react";
import { useStoreWatcher } from "@apogeelabs/beacon-react-utils";

function useSearchBridge(store: SearchStore) {
    const [searchParams, setSearchParams] = useState({});

    useStoreWatcher(
        store,
        s => s.searchParams,
        params => {
            // Custom logic here — debounce, validate, transform, etc.
            setSearchParams(params);
        },
        true // fire immediately to pick up initial params
    );

    // ... rest of bridge
}
```

### Optional: Decoupling Imperative Actions

When a deeply nested component needs to trigger "fetch next page" without having access to the React Query `fetchNextPage` function, use an event emitter to decouple intent from implementation:

```typescript
// useBehaviors.ts — gives components something to call
import { AppEmitter, Events } from "./events";

export function useBehaviors() {
    const emitter = AppEmitter.getInstance();
    return {
        fetchNextPage: useCallback(() => {
            emitter.emit(Events.FETCH_NEXT_PAGE);
        }, [emitter]),
    };
}

// Inside the bridge hook — wires emitter to React Query
useEffect(() => {
    const emitter = AppEmitter.getInstance();
    emitter.addListener(Events.FETCH_NEXT_PAGE, fetchNextPage);
    return () => {
        emitter.removeListener(Events.FETCH_NEXT_PAGE, fetchNextPage);
    };
}, [fetchNextPage]);
```

Components call `useBehaviors().fetchNextPage()`. The bridge listens and calls the actual `fetchNextPage` from React Query. Neither side knows about the other.

### Suggested File Structure

```
myStore/
  types.ts                  # State, Derived, Actions interfaces + Store type alias
  createStore.ts            # Store factory function
  useApiBridge.ts           # Bridge hook (store <-> React Query)
  hooks/
    useMyQuery.ts           # React Query hook (useInfiniteQuery / useQuery)
  index.ts                  # Barrel re-exports
```

Not every store needs all of these. Simpler stores may combine the bridge into fewer files and skip the query hook abstraction.

### Wiring It Up

Mount the bridge at the provider level, not in consuming components:

```typescript
// In your root store provider or layout
function RootStoreProvider({ children }) {
    const store = useMyStore(); // from context
    const repository = useRepository(); // API client

    useSearchBridge(store, repository);

    return <>{children}</>;
}
```

Components consume the store directly and never interact with React Query or the bridge. They call store actions like `store.actions.setSearchTerm("foo")` and read derived state like `store.results`.

### Key Principles

- **Store owns the UI contract.** Components only talk to the store.
- **React Query handles what it's good at** — caching, deduplication, pagination, background refetching. The store handles synchronous state, derived computations, and a clean action-based mutation API.
- **Derived values are the translation layer.** The store's derived `searchParams` translates UI state into API-ready params without either side knowing about the other's shape.
- **The bridge is a hook, not middleware.** It lives in React's lifecycle, which means it can use `useEffect`, `useState`, and other hooks naturally.
- **No async logic in the store.** All async work lives in React Query hooks. Store actions are synchronous mutations.
