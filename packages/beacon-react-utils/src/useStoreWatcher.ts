import type { BeaconActions, BeaconDerived, BeaconState, Store } from "@apogeelabs/beacon";
import _ from "lodash";
import { reaction, toJS } from "mobx";
import { useEffect, useEffectEvent } from "react";

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
    // Use useEffectEvent to wrap callbacks so they don't need to be in the dependency array
    // This prevents unnecessary re-runs when consumers pass inline functions
    const stableSelector = useEffectEvent(selector);
    const stableOnChange = useEffectEvent(onChange);

    useEffect(() => {
        const disposer = reaction(
            () => {
                // toJS strips MobX observable wrappers so React sees plain values
                return toJS(stableSelector(store));
            },
            (value, previousValue) => {
                // MobX selectors can return new object references even when the underlying
                // data hasn't changed. Deep comparison prevents spurious re-renders.
                if (!previousValue || !_.isEqual(value, previousValue)) {
                    stableOnChange(value);
                }
            },
            { fireImmediately }
        );

        // If the store is disposed externally, clean up the reaction too
        store.registerCleanup(() => {
            disposer();
        });

        return () => {
            disposer();
        };
        // stableSelector and stableOnChange are omitted from deps intentionally —
        // useEffectEvent keeps them stable across renders without needing to re-run the effect
    }, [store, fireImmediately]);
}

export default useStoreWatcher;
