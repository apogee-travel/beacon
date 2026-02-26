# @apogeelabs/beacon-actorstore v1.0.0

> **EXPERIMENTAL.** This package is in active experimentation. The API is unstable. There are no real tests yet (just a calzone assertion). Proceed accordingly.

Beacon middleware that binds an XState v5 actor to a Beacon store. The actor drives state changes; the store becomes a reactive MobX projection of the actor's snapshot.

## Imports

```typescript
import {
    withActorControl,
    createActorControlledStore,
    defineActorActions,
    // Types
    type ActorControlledStoreOptions,
    type ActorControlledStore,
    type ActorAction,
    type ActorActionParameters,
} from "@apogeelabs/beacon-actorstore";
```

## Type Signatures

```typescript
interface ActorControlledStoreOptions<
    TState extends BeaconState,
    TMachine extends AnyActorLogic,
    TActorActions extends Record<string, any> = {},
> {
    /** The XState actor instance controlling the store */
    actor: ActorRefFrom<TMachine>;
    /** Map of action names to functions that receive the actor as first arg */
    actorActions?: TActorActions;
    /** Custom mapping from actor snapshot to store state. Default: maps matching keys from snapshot.context */
    mapSnapshotToState?: (snapshot: SnapshotFrom<TMachine>, state: TState) => Partial<TState>;
    /** Error handler for actor subscription errors */
    onError?: (error: any) => void;
    /** Allow regular Beacon actions alongside actor actions. Default: false (regular actions become warnings) */
    allowRegularActions?: boolean;
    /** Auto-start the actor after store creation. Default: false */
    autoStartActor?: boolean;
}

type ActorControlledStore<
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState>,
    TActions extends BeaconActions<TState>,
    TMachine extends AnyActorLogic,
    TActorActions extends Record<string, ActorAction<TMachine, any, any>>,
> = Store<TState, TDerived, TActions> & {
    actor: ActorRefFrom<TMachine>;
    actorActions: {
        [K in keyof TActorActions]: (
            ...args: ActorActionParameters<TActorActions[K]>
        ) => ReturnType<TActorActions[K]>;
    };
};

// An actor action receives the actor as first arg; callers don't pass it
type ActorAction<TMachine extends AnyActorLogic, TParams extends any[] = [], TReturn = any> = (
    actor: ActorRefFrom<TMachine>,
    ...args: TParams
) => TReturn;

// Strips the actor param from an actor action's signature
type ActorActionParameters<T extends (...args: any[]) => any> = T extends (
    actor: any,
    ...args: infer P
) => any
    ? P
    : never;
```

## `withActorControl` (middleware form)

```typescript
function withActorControl<
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState>,
    TActions extends BeaconActions<TState>,
    TMachine extends AnyActorLogic,
    TActorActions extends Record<string, any> = Record<string, never>,
>(
    options: ActorControlledStoreOptions<TState, TMachine, TActorActions>
): (config: StoreConfig<TState, TDerived, TActions>) => StoreConfig<TState, TDerived, TActions>;
```

### Usage with `compose`

```typescript
import { createStore, compose } from "@apogeelabs/beacon";
import { withActorControl } from "@apogeelabs/beacon-actorstore";
import { createActor, setup } from "xstate";

// Define an XState machine
const toggleMachine = setup({
    types: {
        context: {} as { count: number; enabled: boolean },
        events: {} as { type: "TOGGLE" } | { type: "INCREMENT" },
    },
}).createMachine({
    id: "toggle",
    initial: "inactive",
    context: { count: 0, enabled: false },
    states: {
        inactive: {
            on: {
                TOGGLE: {
                    target: "active",
                    actions: [
                        ({ context }) => {
                            context.enabled = true;
                        },
                    ],
                },
            },
        },
        active: {
            on: {
                TOGGLE: {
                    target: "inactive",
                    actions: [
                        ({ context }) => {
                            context.enabled = false;
                        },
                    ],
                },
                INCREMENT: {
                    actions: [
                        ({ context }) => {
                            context.count++;
                        },
                    ],
                },
            },
        },
    },
});

const actor = createActor(toggleMachine);
actor.start();

interface ToggleState {
    count: number;
    enabled: boolean;
}

const store = createStore<ToggleState>(
    compose<ToggleState>(
        withActorControl({
            actor,
            actorActions: {
                toggle: actor => actor.send({ type: "TOGGLE" }),
                increment: actor => actor.send({ type: "INCREMENT" }),
            },
            // Optional: custom snapshot-to-state mapping
            // Default behavior maps matching keys from snapshot.context
            mapSnapshotToState: (snapshot, _state) => ({
                count: snapshot.context.count,
                enabled: snapshot.context.enabled,
            }),
        })
    )({
        initialState: { count: 0, enabled: false },
    })
);

// Use actor actions (actor param is injected automatically)
store.actorActions.toggle();
store.actorActions.increment();

// State is reactively updated from actor snapshots
store.count; // number
store.enabled; // boolean

// Direct access to the underlying actor
store.actor.send({ type: "TOGGLE" });
```

## `createActorControlledStore` (convenience wrapper)

```typescript
function createActorControlledStore<
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState>,
    TActions extends BeaconActions<TState>,
    TMachine extends AnyActorLogic,
    TActorActions extends Record<string, ActorAction<TMachine, any>>,
>(
    createStoreFunction: any, // pass the createStore function from @apogeelabs/beacon
    config: StoreConfig<TState, TDerived, TActions>,
    actorControlOptions: ActorControlledStoreOptions<TState, TMachine, TActorActions>
): ActorControlledStore<TState, TDerived, TActions, TMachine, TActorActions>;
```

### Usage

```typescript
import { createStore } from "@apogeelabs/beacon";
import { createActorControlledStore, defineActorActions } from "@apogeelabs/beacon-actorstore";

const actions = defineActorActions<typeof toggleMachine>({
    toggle: actor => actor.send({ type: "TOGGLE" }),
    increment: actor => actor.send({ type: "INCREMENT" }),
});

const store = createActorControlledStore(
    createStore,
    { initialState: { count: 0, enabled: false } },
    { actor, actorActions: actions }
);

// Fully typed: store.actorActions.toggle() has no args
store.actorActions.toggle();
```

## `defineActorActions` (type helper)

```typescript
function defineActorActions<
    TMachine extends AnyActorLogic,
    TActorActions extends Record<string, ActorAction<TMachine, any>> = Record<
        string,
        ActorAction<TMachine, any>
    >,
>(actions: TActorActions): TActorActions;
```

Identity function that exists purely for type inference when defining actor actions outside the options object.

## Gotchas

- **By default, regular Beacon actions are disabled.** When `allowRegularActions` is `false` (the default), calling any action defined in `config.actions` will log a warning and do nothing. The actor is the single source of truth. Set `allowRegularActions: true` to keep regular actions functional alongside actor actions.
- **Default snapshot mapping uses `snapshot.context`.** Without `mapSnapshotToState`, the middleware looks for `snapshot.context` and maps keys that exist in both `context` and `initialState`. If your machine's context structure doesn't match your store state, provide a custom `mapSnapshotToState`.
- **Actor actions strip the first parameter.** You define `(actor, ...args) => ...`, callers see `(...args) => ...`. The actor is injected automatically.
- **`autoStartActor` defaults to `false`.** If you forget to start the actor before creating the store, the initial snapshot sync will still happen (via `actor.getSnapshot()`), but no subsequent updates will arrive until the actor is started.
- **Errors in actor actions are caught and re-thrown.** If `onError` is provided, it's called before the re-throw. If not, the error is logged to `console.error` and then thrown.
- **The actor subscription is set up in `onStoreCreated` but the unsubscribe function is not registered with `store.registerCleanup()`.** The `onStoreCreated` returns the unsubscribe function, but nothing captures it. Disposing the store will not automatically unsubscribe from the actor. This is a known gap in the PoC.
- **XState v5 only.** The types import from `xstate` directly (`ActorRefFrom`, `AnyActorLogic`, `SnapshotFrom`). XState v4 actors have a different shape and will not work.
- **State updates happen in `runInAction`.** Multiple property updates from a single snapshot are batched into one MobX transaction, so observers see a consistent state.
