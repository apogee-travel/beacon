# @apogeelabs/beacon v1.0.0

MobX-powered reactive state management with structured stores, derived state, actions, and middleware composition.

## Imports

```typescript
import {
    createStore,
    compose,
    // Types
    type BeaconState,
    type BeaconDerived,
    type BeaconActions,
    type Store,
    type StoreConfig,
    type ActionParameters,
    type CleanupFunction,
    type EmptyDerived,
    type EmptyActions,
    type MiddlewareFunction,
} from "@apogeelabs/beacon";
```

## Type Signatures

```typescript
// Base constraint types
type BeaconState = Record<string, any>;
type BeaconDerived<TState = BeaconState> = Record<string, (state: TState) => any>;
type BeaconActions<TState = BeaconState> = Record<string, (state: TState, ...args: any[]) => any>;

// Extracts action params minus the leading `state` param
type ActionParameters<T extends (...args: any[]) => any> = T extends (
    state: any,
    ...args: infer P
) => any
    ? P
    : never;

type CleanupFunction = () => void;
type EmptyDerived<_TState> = Record<string, never>;
type EmptyActions = Record<string, never>;

// Store config
interface StoreConfig<
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState> = EmptyDerived<TState>,
    TActions extends BeaconActions<TState> = EmptyActions,
> {
    initialState: TState;
    derived?: TDerived;
    actions?: {
        [K in keyof TActions]: (
            state: TState & { [K in keyof TDerived]: ReturnType<TDerived[K]> },
            ...args: ActionParameters<TActions[K]>
        ) => ReturnType<TActions[K]>;
    };
    onStoreCreated?: (store: Store<TState, TDerived, TActions>) => void;
}

// Store instance — state props + derived props are top-level
type Store<
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState> = EmptyDerived<TState>,
    TActions extends BeaconActions<TState> = EmptyActions,
> = TState & { [K in keyof TDerived]: ReturnType<TDerived[K]> } & {
    actions: {
        [K in keyof TActions]: (...args: ActionParameters<TActions[K]>) => ReturnType<TActions[K]>;
    };
    getStateSnapshot: (opt?: {
        withDerived?: boolean;
    }) => TState & Partial<{ [K in keyof TDerived]: ReturnType<TDerived[K]> }>;
    registerCleanup: (cleanupFn: CleanupFunction) => void;
    dispose: () => void;
    isDisposed: boolean;
};

// Middleware type helper
type MiddlewareFunction<
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState> = EmptyDerived<TState>,
    TActions extends BeaconActions<TState> = EmptyActions,
    TOptions = any,
> = (
    options: TOptions
) => (config: StoreConfig<TState, TDerived, TActions>) => StoreConfig<TState, TDerived, TActions>;
```

## `createStore`

```typescript
function createStore<
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState> = EmptyDerived<TState>,
    TActions extends BeaconActions<TState> = EmptyActions,
>(config: StoreConfig<TState, TDerived, TActions>): Store<TState, TDerived, TActions>;
```

### Basic store with state, derived, and actions

```typescript
interface TodoState {
    items: { id: string; text: string; done: boolean }[];
    filter: "all" | "active" | "done";
}

type TodoDerived = {
    visibleItems: (state: TodoState) => TodoState["items"];
    count: (state: TodoState) => number;
};

type TodoActions = {
    addItem: (state: TodoState, text: string) => void;
    toggle: (state: TodoState, id: string) => void;
};

const todoStore = createStore<TodoState, TodoDerived, TodoActions>({
    initialState: {
        items: [],
        filter: "all",
    },
    derived: {
        visibleItems: state => {
            if (state.filter === "all") return state.items;
            return state.items.filter(i => (state.filter === "done" ? i.done : !i.done));
        },
        count: state => state.items.length,
    },
    actions: {
        addItem: (state, text) => {
            state.items.push({ id: crypto.randomUUID(), text, done: false });
        },
        toggle: (state, id) => {
            const item = state.items.find(i => i.id === id);
            if (item) item.done = !item.done;
        },
    },
});

// State and derived values are top-level properties
todoStore.filter; // "all"
todoStore.visibleItems; // TodoState["items"]
todoStore.count; // number

// Actions are namespaced — no `state` param when calling
todoStore.actions.addItem("Buy calzones");
todoStore.actions.toggle("some-id");

// Snapshots
const snap = todoStore.getStateSnapshot(); // state only
const snapFull = todoStore.getStateSnapshot({ withDerived: true }); // state + derived
```

### Store with `onStoreCreated`

```typescript
const store = createStore<MyState>({
    initialState: {
        /* ... */
    },
    onStoreCreated: store => {
        // Runs once after store creation. Useful for side effects.
        // Middleware uses this hook heavily.
        console.log("Store ready:", store.getStateSnapshot());
    },
});
```

## `compose`

```typescript
function compose<
    TState extends BeaconState,
    TDerived extends BeaconDerived<TState> = EmptyDerived<TState>,
    TActions extends BeaconActions<TState> = EmptyActions,
>(
    ...middlewares: ((
        config: StoreConfig<TState, TDerived, TActions>
    ) => StoreConfig<TState, TDerived, TActions>)[]
): (config: StoreConfig<TState, TDerived, TActions>) => StoreConfig<TState, TDerived, TActions>;
```

Composes middleware left-to-right (first middleware runs first).

```typescript
import { compose, createStore } from "@apogeelabs/beacon";

const store = createStore(
    compose(
        middlewareA, // runs first
        middlewareB // runs second
    )({
        initialState: {
            /* ... */
        },
        actions: {
            /* ... */
        },
    })
);
```

### Writing middleware

A middleware is a function that takes a `StoreConfig` and returns a modified `StoreConfig`.

```typescript
const timestampMiddleware = (config: StoreConfig<MyState, MyDerived, MyActions>) => {
    const originalActions = config.actions || {};
    const enhanced: typeof originalActions = {} as any;

    for (const key in originalActions) {
        enhanced[key] = (state: any, ...args: any[]) => {
            console.log(`[${new Date().toISOString()}] ${key}`);
            return originalActions[key](state, ...args);
        };
    }

    return { ...config, actions: enhanced };
};
```

## `dispose` / `registerCleanup`

```typescript
// Register cleanup handlers (typically from middleware)
store.registerCleanup(() => {
    clearInterval(myInterval);
});

// Dispose the store — runs all cleanup fns, nulls state, no-ops actions
store.dispose();
store.isDisposed; // true
```

## Gotchas

- **Derived keys must not collide with state keys.** `createStore` throws if a derived key matches a state property name.
- **Actions receive the MobX observable proxy as `state`.** You mutate it directly (push, assign, etc.) — no need to return new objects.
- **`getStateSnapshot()` returns `null` if the store is disposed.** Check `isDisposed` first if there's any chance of a race.
- **`getStateSnapshot()` strips derived values by default.** Pass `{ withDerived: true }` to include them.
- **Middleware compose order is left-to-right**, not right-to-left like Redux. The first middleware in the arg list runs first.
- **`onStoreCreated` is called once, synchronously**, after the store object is fully constructed. If middleware replaces `onStoreCreated`, it must call the original to avoid breaking other middleware in the chain.
- **Calling actions on a disposed store logs a warning and no-ops.** It does not throw.
