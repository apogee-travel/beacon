/* eslint-disable @typescript-eslint/no-explicit-any */
import { BeaconActions, BeaconDerived, BeaconState, Store, StoreConfig } from "@apogeelabs/beacon";
import { runInAction } from "mobx";
import { type ActorRefFrom, type AnyActorLogic, type SnapshotFrom } from "xstate";

/**
 * Options for the actor-controlled store middleware
 */
export interface ActorControlledStoreOptions<
    TState extends BeaconState,
    TMachine extends AnyActorLogic,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    TActorActions extends Record<string, any> = {},
> {
    /** The actor instance that will control the store */
    actor: ActorRefFrom<TMachine>;

    /**
     * Map of action names to functions that receive the actor
     * These will be added to the store's actorActions
     */
    actorActions?: TActorActions;

    /**
     * Optional mapping function to extract state from actor snapshot
     * If not provided, will try to map keys directly from actor.getSnapshot().context
     */
    mapSnapshotToState?: (snapshot: SnapshotFrom<TMachine>, state: TState) => Partial<TState>;

    /**
     * Optional error handler for actor subscription errors
     */
    onError?: (error: any) => void;

    /**
     * Whether to allow regular Beacon actions in addition to actor actions
     * When false (default), regular actions will be overridden with a warning
     */
    allowRegularActions?: boolean;

    /**
     * Whether to start the actor automatically when the store is created.
     * Defaults to true. Set to false if you need to start the actor manually
     * (e.g., to attach listeners or configure it before it begins processing events).
     */
    autoStartActor?: boolean;
}

/**
 * Type helper for a store with actor control
 */
export type ActorControlledStore<
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState>,
    TActions extends BeaconActions<TState>,
    TMachine extends AnyActorLogic,
    TActorActions extends Record<string, ActorAction<TMachine, any, any>>,
> = Store<TState, TDerived, TActions> & {
    /** The actor reference controlling this store */
    actor: ActorRefFrom<TMachine>;
    /** Actions that send events to the actor */
    actorActions: {
        [K in keyof TActorActions]: (
            ...args: ActorActionParameters<TActorActions[K]>
        ) => ReturnType<TActorActions[K]>;
    };
};

/**
 * Middleware factory that wires an XState actor to a Beacon store.
 *
 * Follows the standard curried middleware pattern: `(options) => (config) => StoreConfig`.
 * The returned middleware function transforms the store config by:
 * - Subscribing to actor snapshots and syncing them into store state via `mapSnapshotToState`
 *   (or direct context key matching if no mapper is provided)
 * - Replacing regular store actions with no-ops unless `allowRegularActions` is true
 * - Exposing `actor` and `actorActions` as additional store properties after creation
 *
 * Key options: `actor` (required), `actorLogic`, `mapSnapshotToState`, `allowRegularActions`, `onError`.
 */
export function withActorControl<
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState>,
    TActions extends BeaconActions<TState>,
    TMachine extends AnyActorLogic,
    TActorActions extends Record<string, any> = Record<string, never>,
>(
    options: ActorControlledStoreOptions<TState, TMachine, TActorActions>
): (config: StoreConfig<TState, TDerived, TActions>) => StoreConfig<TState, TDerived, TActions> {
    const {
        actor,
        actorActions = {} as TActorActions,
        mapSnapshotToState,
        onError,
        allowRegularActions = false,
        autoStartActor = false,
    } = options;

    return (
        config: StoreConfig<TState, TDerived, TActions>
    ): StoreConfig<TState, TDerived, TActions> => {
        const enhancedActions: Record<string, any> = {};

        if (allowRegularActions) {
            Object.assign(enhancedActions, config.actions || {});
        } else if (config.actions && Object.keys(config.actions).length > 0) {
            // When the actor owns the store, regular actions are suppressed by default.
            // Allowing direct mutations alongside actor snapshot syncs creates a split-brain
            // problem: the actor's internal state and the store's observable state can diverge,
            // making it impossible to reason about which one is the source of truth.
            Object.keys(config.actions || {}).forEach(actionName => {
                enhancedActions[actionName] = (..._args: any[]) => {
                    console.warn(
                        `Warning: Regular action "${actionName}" was called on an actor-controlled store. ` +
                            `This action is ignored because allowRegularActions is set to false. ` +
                            `Use store.actorActions instead to control state through the actor.`
                    );
                };
            });
        }

        const onStoreCreated = (store: any) => {
            // Add actor reference to the store
            Object.defineProperty(store, "actor", {
                value: actor,
                enumerable: true,
                configurable: false,
            });

            // Create actor actions container
            const actorActionsContainer: Record<string, any> = {};

            if (actorActions) {
                Object.entries(actorActions).forEach(([actionName, actionFn]) => {
                    actorActionsContainer[actionName] = (...args: any[]) => {
                        try {
                            return actionFn(actor, ...args);
                        } catch (error) {
                            // Route errors through onError rather than letting them propagate
                            // unhandled — a throw inside an actor send can otherwise crash the
                            // subscriber loop and silence all future state updates.
                            if (onError) {
                                onError(error);
                            } else {
                                console.error(`Error in actor action ${actionName}:`, error);
                            }
                            throw error;
                        }
                    };
                });
            }

            // Add actorActions to the store
            Object.defineProperty(store, "actorActions", {
                value: actorActionsContainer,
                enumerable: true,
                configurable: false,
            });

            // Function to update store state from actor snapshot
            const updateStoreFromSnapshot = (snapshot: SnapshotFrom<TMachine>) => {
                if (store.isDisposed) return;
                try {
                    let stateUpdates: Partial<TState>;

                    if (mapSnapshotToState) {
                        // Use custom mapping function
                        stateUpdates = mapSnapshotToState(snapshot, store);
                    } else {
                        // Default: map context properties directly to matching store properties
                        stateUpdates = {};
                        const snapshotObj = snapshot as unknown as Record<string, any>;
                        const context = snapshotObj.context || snapshotObj;
                        const stateKeys = Object.keys(config.initialState);

                        // Only update keys that exist in both context and initialState
                        stateKeys.forEach(key => {
                            if (key in context && context[key] !== store[key]) {
                                stateUpdates[key as keyof TState] = context[key];
                            }
                        });
                    }

                    // Apply updates in a single transaction if there are any changes
                    if (Object.keys(stateUpdates).length > 0) {
                        runInAction(() => {
                            Object.entries(stateUpdates).forEach(([key, value]) => {
                                store[key] = value;
                            });
                        });
                    }
                } catch (error) {
                    if (onError) {
                        onError(error);
                    } else {
                        console.error("Error updating store from actor snapshot:", error);
                    }
                }
            };

            // Initial state synchronization
            const snapshot = (actor as any).getSnapshot();
            updateStoreFromSnapshot(snapshot);

            // Subscribe to actor state changes
            const subscription = (actor as any).subscribe({
                next: updateStoreFromSnapshot,
                error: (err: unknown) => {
                    if (onError) {
                        onError(err);
                    } else {
                        console.error("Error in actor subscription:", err);
                    }
                },
            });

            // Register unsubscribe so the actor subscription is torn down when the store is disposed.
            store.registerCleanup(() => subscription.unsubscribe());

            // Call the original onStoreCreated if it exists
            if (config.onStoreCreated) {
                config.onStoreCreated(store);
            }

            if (autoStartActor) {
                (actor as any).start();
            }
        };

        return {
            ...config,
            actions: enhancedActions as any,
            onStoreCreated,
        };
    };
}

/**
 * Helper type to extract all parameters of an actor action function except the first one (actor).
 * This allows us to provide proper typing when calling actions from outside the store,
 * where the actor parameter is handled internally by the middleware.
 */
export type ActorActionParameters<T extends (...args: any[]) => any> = T extends (
    actor: any,
    ...args: infer P
) => any
    ? P
    : never;

/**
 * Helper type to create actor actions with proper typing
 * The implementation will take an actor as first parameter, but the exposed method will not require it
 */
export type ActorAction<
    TMachine extends AnyActorLogic,
    TParams extends any[] = [],
    TReturn = any,
> = (actor: ActorRefFrom<TMachine>, ...args: TParams) => TReturn;

/**
 * Identity function that exists purely for TypeScript's benefit.
 *
 * Without this, callers would need to spell out the full generic signature manually.
 * Passing the action map through here lets TS infer `TMachine` and `TActorActions`
 * from the values, giving you type-safe actor actions with zero annotation overhead.
 */
export function defineActorActions<
    TMachine extends AnyActorLogic,
    TActorActions extends Record<string, ActorAction<TMachine, any>> = Record<
        string,
        ActorAction<TMachine, any>
    >,
>(actions: TActorActions): TActorActions {
    return actions;
}

/**
 * Convenience wrapper that composes `withActorControl` and `createStore` in a single call.
 *
 * When actor control is the only middleware you need, manually calling `compose(withActorControl(...))`
 * is ceremony without benefit. This collapses that into one function while preserving full type inference.
 */
export function createActorControlledStore<
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState>,
    TActions extends BeaconActions<TState>,
    TMachine extends AnyActorLogic,
    TActorActions extends Record<string, ActorAction<TMachine, any>>,
>(
    // Typed as `any` and injected as a parameter to avoid a circular package dependency —
    // beacon-actorstore can't import directly from @apogeelabs/beacon without creating a cycle.
    createStoreFunction: any,
    config: StoreConfig<TState, TDerived, TActions>,
    actorControlOptions: ActorControlledStoreOptions<TState, TMachine, TActorActions>
): ActorControlledStore<TState, TDerived, TActions, TMachine, TActorActions> {
    // Apply middleware
    const store = createStoreFunction(
        withActorControl<TState, TDerived, TActions, TMachine, TActorActions>(actorControlOptions)(
            config
        )
    );

    // Return the store with proper typing
    return store as ActorControlledStore<TState, TDerived, TActions, TMachine, TActorActions>;
}
