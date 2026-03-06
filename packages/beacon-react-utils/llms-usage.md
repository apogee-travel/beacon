# @apogeelabs/beacon-react-utils v1.0.0

React hooks for watching Beacon store state changes from inside hooks (where `observer` from mobx-react-lite can't be used).

## Imports

```typescript
import { useStoreWatcher, useStoreState } from "@apogeelabs/beacon-react-utils";
```

## Type Signature

```typescript
function useStoreWatcher<
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState>,
    TActions extends BeaconActions<TState>,
    T, // return type of the selector
>(
    store: Store<TState, TDerived, TActions>,
    selector: (store: Store<TState, TDerived, TActions>) => T,
    onChange: (value: T) => void,
    fireImmediately?: boolean // default: false
): void;
```

## Usage

### Watch specific store properties from a hook

```typescript
import { useStoreWatcher } from "@apogeelabs/beacon-react-utils";
import { searchStore } from "./stores/searchStore";

function useSearchSync() {
    const [searchParams, setSearchParams] = useSearchParams();

    useStoreWatcher(
        searchStore,
        // selector: pick the slice of state you care about
        store => ({
            query: store.query,
            page: store.page,
        }),
        // onChange: runs when the selected slice changes (deep comparison)
        params => {
            setSearchParams(params);
        },
        // fireImmediately: sync on mount, not just on subsequent changes
        true
    );
}
```

### Watch a single derived value

```typescript
useStoreWatcher(
    cartStore,
    store => store.totalPrice, // derived value
    total => {
        analytics.track("cart_total_changed", { total });
    }
);
```

## How it works

1. Wraps `selector` and `onChange` in `useEffectEvent` so inline functions don't cause re-subscriptions.
2. Inside a `useEffect`, creates a MobX `reaction` that:
    - Runs the selector through `toJS()` to strip observable wrappers
    - Compares current and previous values using lodash `_.isEqual` (deep comparison)
    - Calls `onChange` only when values actually differ
3. Registers the reaction disposer with `store.registerCleanup()` for store-level teardown.
4. Returns a useEffect cleanup function that also disposes the reaction on unmount.

---

## `useStoreState`

Returns a store-selected value as React state. Built on `useStoreWatcher` internally.

### Type Signature

```typescript
function useStoreState<
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState>,
    TActions extends BeaconActions<TState>,
    T,
>(
    store: Store<TState, TDerived, TActions>,
    selector: (store: Store<TState, TDerived, TActions>) => T
): T;
```

### When to use

Use `useStoreState` when you need a store value to participate in React's state lifecycle — for example, to drive React Query parameters, to pass into hooks that don't understand MobX observables, or to feed non-observer child components.

For normal component rendering, prefer wrapping your component with `observer` from `mobx-react-lite` and reading store values directly. That's simpler and more performant.

### Usage

```typescript
import { useStoreState } from "@apogeelabs/beacon-react-utils";
import { useInfiniteQuery } from "@tanstack/react-query";

function useSearchBridge(searchStore: SearchStore) {
    // Store's derived searchParams as React state — drives React Query
    const searchParams = useStoreState(searchStore, store => store.searchParams);

    // React Query refetches when searchParams changes
    const { data, isLoading } = useInfiniteQuery({
        queryKey: ["search", searchParams],
        queryFn: () => fetchResults(searchParams),
    });
}
```

### How it works

1. Initializes `useState` with `toJS(selector(store))` to get a plain JS snapshot of the current value.
2. Sets up `useStoreWatcher` with the selector and React's `setValue` as the onChange callback.
3. When the store value changes, `useStoreWatcher` calls `setValue`, updating React state and triggering a re-render.

---

## Gotchas

- **This is for hooks, not components.** If you're in a component, wrap it with `observer` from `mobx-react-lite` and read store properties directly. This hook exists for the case where a standalone hook needs to react to store changes without prop drilling.
- **Deep comparison via lodash `_.isEqual`.** The entire `lodash` package is a dependency (not `lodash/isEqual`). If bundle size matters, be aware. The comparison runs on every reaction fire.
- **`useEffectEvent` is from React 19.** This package requires React 19+ (`react: ^19.2.3` in peer deps). It will not work with React 18.
- **The selector output is run through `toJS()`.** This strips MobX observable proxies, which means the comparison works on plain objects. But it also means the value passed to `onChange` is a plain JS copy, not the live observable.
- **`fireImmediately` is part of the `useEffect` dependency array.** Changing it between renders will tear down and recreate the reaction. In practice this should be a static boolean, not a state variable.
- **Double-registration of cleanup.** The reaction disposer is registered with both `store.registerCleanup()` and the useEffect's return. Disposing the store will kill the reaction even if the component is still mounted. Unmounting the component will kill the reaction even if the store is still alive. Either path is safe; calling `disposer()` twice is a no-op.
