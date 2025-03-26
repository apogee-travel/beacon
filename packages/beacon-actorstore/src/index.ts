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
 * Middleware that controls a store with an XState actor
 */
export function withActorControl<
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState>,
    TActions extends BeaconActions<TState>,
    TMachine extends AnyActorLogic,
    TActorActions extends Record<string, any> = Record<string, never>,
>(options: ActorControlledStoreOptions<TState, TMachine, TActorActions>) {
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
        // Create actions object based on whether regular actions are allowed
        const enhancedActions: Record<string, any> = {};

        if (allowRegularActions) {
            // Use original actions if regular actions are allowed
            Object.assign(enhancedActions, config.actions || {});
        } else if (config.actions && Object.keys(config.actions).length > 0) {
            // Create warning functions for all original actions
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

            // Add actor actions to the separate actorActions property
            if (actorActions) {
                Object.entries(actorActions).forEach(([actionName, actionFn]) => {
                    // Create a wrapper function that automatically injects the actor
                    actorActionsContainer[actionName] = (...args: any[]) => {
                        try {
                            // Call the original action function with actor as the first argument
                            return actionFn(actor, ...args);
                        } catch (error) {
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

            // Call the original onStoreCreated if it exists
            if (config.onStoreCreated) {
                config.onStoreCreated(store);
            }

            if (autoStartActor) {
                (actor as any).start();
            }

            // Return unsubscribe function (could be used for cleanup in future versions)
            return subscription.unsubscribe;
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
 * Helper function to infer types when defining actor actions
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
 * Helper function to create a fully-typed actor-controlled store
 */
export function createActorControlledStore<
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState>,
    TActions extends BeaconActions<TState>,
    TMachine extends AnyActorLogic,
    TActorActions extends Record<string, ActorAction<TMachine, any>>,
>(
    createStoreFunction: any, // This should be the createStore function from Beacon
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
