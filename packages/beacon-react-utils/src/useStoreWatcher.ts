import type { BeaconActions, BeaconDerived, BeaconState, Store } from "@apogeelabs/beacon";
import isEqual from "lodash/isEqual";
import { reaction, toJS } from "mobx";
import { useEffect } from "react";

/**
 * A custom React hook to watch for state changes in a beacon store.
 *
 * @template TState - The type of the store's state, extending BeaconState.
 * @template TDerived - The type of the store's derived values, extending BeaconDerived<TState>. If you don't have derived values, use EmptyDerived<TState>.
 * @template TActions - The type of the store's actions, extending BeaconActions<TState>. If you don't have actions, use EmptyActions.
 * @template T - The type returned by the selector function, inferred from the selector.
 *
 * @param {Store<TState, TDerived, TActions>} store - The Beacon store instance.
 * @param {(store: Store<TState, TDerived, TActions>) => T} selector - A function that extracts the part of the store to watch.
 * @param {(value: T) => void} onChange - A callback invoked with the new value when the selected state changes.
 * @param {boolean} [fireImmediately=false] - Whether to invoke onChange with the initial value.
 */
export function useStoreWatcher<
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState>,
    TActions extends BeaconActions<TState>,
    T,
>(
    store: Store<TState, TDerived, TActions>,
    selector: (store: Store<TState, TDerived, TActions>) => T,
    onChange: (value: T) => void,
    fireImmediately: boolean = false
): void {
    useEffect(() => {
        // Set up a MobX reaction to watch the selected state
        const disposer = reaction(
            () => {
                // Convert to plain JS to strip MobX observable properties
                return toJS(selector(store));
            },
            (value, previousValue) => {
                // Only trigger if the value actually changed using deep comparison
                if (!previousValue || !isEqual(value, previousValue)) {
                    onChange(value);
                }
            },
            { fireImmediately }
        );

        // Register the disposer with the store for cleanup
        store.registerCleanup(() => {
            disposer();
        });

        // Cleanup when the component unmounts or dependencies change
        return () => {
            disposer();
        };
    }, [store, selector, onChange, fireImmediately]);
}

export default useStoreWatcher;
