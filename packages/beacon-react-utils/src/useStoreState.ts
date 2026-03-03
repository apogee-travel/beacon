import type { BeaconActions, BeaconDerived, BeaconState, Store } from "@apogeelabs/beacon";
import { toJS } from "mobx";
import { useState } from "react";
import { useStoreWatcher } from "./useStoreWatcher";

/**
 * A React hook that subscribes to a Beacon store and returns a selected value as React state.
 *
 * Use this hook when you need a store value to participate in React's state lifecycle —
 * for example, to drive React Query parameters, to pass into hooks that don't understand
 * MobX observables, or to feed non-observer child components.
 *
 * For normal component rendering, prefer wrapping your component with `observer` from
 * `mobx-react-lite` and reading store values directly. That's simpler and more performant.
 *
 * @template TState - The type of the store's state, extending BeaconState.
 * @template TDerived - The type of the store's derived values, extending BeaconDerived<TState>.
 * @template TActions - The type of the store's actions, extending BeaconActions<TState>.
 * @template T - The type returned by the selector function, inferred from the selector.
 *
 * @param {Store<TState, TDerived, TActions>} store - The Beacon store instance.
 * @param {(store: Store<TState, TDerived, TActions>) => T} selector - A function that extracts the value to track.
 * @returns {T} The current value of the selected store slice, kept in sync via MobX reaction.
 */
export function useStoreState<
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState>,
    TActions extends BeaconActions<TState>,
    T,
>(
    store: Store<TState, TDerived, TActions>,
    selector: (store: Store<TState, TDerived, TActions>) => T,
): T {
    // Initializer function so the selector only runs once on mount, not on every render
    const [value, setValue] = useState<T>(() => toJS(selector(store)));

    // Wires MobX reactivity to React state — store changes call setValue, triggering a re-render
    useStoreWatcher(store, selector, setValue);

    return value;
}
