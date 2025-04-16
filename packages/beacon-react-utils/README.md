# Beacon/React Utilities

This package provides some basic utilities to help bridge beacon stores with react hooks.

Right now it contains one helper hook: `useStoreWatcher`.

## useStoreWatcher

Normally, you would use the `observer` higher order function from mobx-react-lite to make components opt into mobx state changes. However, you can't use `observer` on a hook. If you have a situation where a stand-alone hook needs to react to changes in a beacon store, you can use `useStoreWatcher`.

A basic example:

```typescript
useStoreWatcher<
    CharitySelectionStoreState,
    CharitySelectionStoreDerivedState,
    CharitySelectionStoreActions,
    Partial<CharitySearchArgs>
>(
    // first arg is the store you want to watch
    charitySelectionStore,
    // second arg is the selector that returns the state you want to watch for changes
    state => {
        return state.charitySearchParams;
    },
    // third arg is the "onChange" handler that should execute when the selector state changes
    params => {
        // Only update if the params actually changed
        if (!isEqual(params, prevParamsRef.current)) {
            prevParamsRef.current = params;
            debouncedSetSearchParams(params);
        }
    },
    // fourth arg is a `fireImmediately` boolean, indicating if the onChange call should execute
    // immediately when the hook is called, or if it should wait until changes are observed later
    true
);
```

There are definitely other ways to go about this than to use this hook. For example, the component, if wrapped with `observer` can pass store state into a hook, and the hook can watch it via useEffect internally. (In fact, that's the 80% use case for these needs - this hook is just useful if you need to avoid prop drilling, or if it makes the particular intent more clear.)
