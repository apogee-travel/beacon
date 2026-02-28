<img src="examples/react-web-basic/public/beacon-old-school.webp" alt="Beacon" width="78" style="border-radius: .75rem;"/>

# Beacon

## The What and Why

Beacon wraps [MobX](https://mobx.js.org/README.html) with a thin-but-opinionated store creation interface. It aims to achieve these goals:

- Make state management predictable and easy-to-ramp-up-on via:
    - an interface that enforces consistency in organization of state, derived/computed state, and actions
    - a factory pattern with an onCreated event to assist in future behavior to manage lifecycles, insert telemetry, etc.
    - slightly reduced imperative boilerplate so devs can focus on just solving the business problem at hand
- Support a middleware pattern to allow for store behavior to be extended while helping enforce boundaries to prevent leaky abstractions
- Support "plain" (non-React) modules' ability to watch & react to state changes in a store

MobX is pretty powerful, so it's essential for Apogee devs to understand what it's capable of, even if the majority of our stores are created via Beacon. Check their [docs](https://mobx.js.org/actions.html) out (especially the sections on Observable state, Actions, Computed, and Reactions).

## The When

At Apogee, the goal is for Beacon to be the 95% (or better) use case for creating and managing stores. We're intentionally leaving margin open for the special cases that may require a more custom approach not covered by Beacon's API. Those should be rare, however, and instances of them should be considered a potential indication that Beacon might be missing some needed functionality (though this wont' always be the case).

## The How

Beacon's goal of reducing boilerplate + consistency & predictability is achieved via how the various pieces of a store – mutable state, computed state, and actions – are organized.

For example, consider this slightly modified class example from the [Ten minute introduction to MobX and React](https://mobx.js.org/getting-started):

```javascript
class ObservableTodoStore {
    todos = [];
    pendingRequests = 0;

    constructor() {
        makeObservable(this, {
            todos: observable,
            pendingRequests: observable,
            completedTodosCount: computed,
            report: computed,
            addTodo: action,
        });
        autorun(() => console.log(this.report));
    }

    get completedTodosCount() {
        return this.todos.filter(todo => todo.completed === true).length;
    }

    get report() {
        if (this.todos.length === 0) {
            return "<none>";
        }
        const nextTodo = this.todos.find(todo => todo.completed === false);
        return (
            `Next todo: "${nextTodo ? nextTodo.task : "<none>"}". ` +
            `Progress: ${this.completedTodosCount}/${this.todos.length}`
        );
    }

    addTodo(task) {
        this.todos.push({
            task: task,
            completed: false,
            assignee: null,
        });
    }
}
```

The Beacon equivalent (in TypeScript) would look like this:

```typescript
import { createStore } from "beacon";

export const todoStore = createStore<TodoListState, TodoListComputedState, TodoListActions>({
    initialState: {
        todos = [],
        pendingRequests = 0,
    },
    derived: {
        completedTodosCount(state) {
            return state.todos.filter(todo => todo.completed === true).length;
        },
        report(state) {
            if (state.todos.length === 0) {
                return "<none>";
            }
            const nextTodo = state.todos.find(todo => todo.completed === false);
            return (
                `Next todo: "${nextTodo ? nextTodo.task : "<none>"}". ` +
                `Progress: ${state.completedTodosCount}/${state.todos.length}`
            );
        },
    },
    actions: {
        addTodo(state, task) {
            state.todos.push({
                task: task,
                completed: false,
                assignee: null,
            });
        },
    },
    onStoreCreated(store) {
        autorun(() => console.log(store.report));
    },
});
```

With a store this size, the difference in footprint between the two is small. The main intent with the Beacon version is to eliminate any concerns other than plain JavaScript/TypeScript state and behavior:

- State provided via `initialState` is automatically made observable.
- Methods provided via `derived` are automatically wrapped with `computed` - being made read-only observables.
- Methods provided via `actions` are automatically wrapped with `action` - meaning the mutations will be executed in one transaction

The resulting store instance will have the `initialState` and `derived` at the top level of the instance. Actions, however, will appear under an `actions` property. This strong opinion of Beacon's exists to idiot-proof our future team's understanding of intent.

The `autorun` use in the original example was specific to the tutorial, but its use is replicated in the Beacon example for completeness. In reality, auto-logging state changes would be something done in a separate telemetry module or via middleware.

Speaking of middleware, adapting our Beacon example above to load from (and persist to) browser local storage is as simple as inserting the beacon-browserstorage package into the createStore call:

```typescript
import { createStore, compose } from "beacon";
import { browserStorageMiddleware } from "beacon-browserstorage";

// When only using one middleware, it's easiest to just invoke it and pass it as the arg to createStore.
// The other example below shows how multiple middleware can be composed.
export const todoStore = createStore<
    TodoListState,
    TodoListComputedState,
    TodoListActions
>(
    browserStorageMiddleware({ key: "todoListStore" })({
        initialState: {
            todos = [];
            pendingRequests = 0;
        },
        // other members...
    })
);

// With the optional compose helper method, you can easily compose a chain of middleware
export const todoStore = createStore<
    TodoListState,
    TodoListComputedState,
    TodoListActions
>(

    compose<TodoListState, TodoListComputedState, TodoListActions>(
        browserStorageMiddleware({ key: "todoListStore" }),
        someTelemtryMiddleware({ foo: "bar" }),
        someChromeDevToolsMiddleware({ cal: "zone" })
    )({
        initialState: {
            todos = [];
            pendingRequests = 0;
        },
        // other members...
    })
);
```

## Recipes

See [RECIPES.md](./RECIPES.md) for integration patterns, including how to bridge Beacon stores with React Query (TanStack Query).

## Developing Beacon

See the [DEVELOP readme](./DEVELOP.md) for information on how to develop within this repo.
