import { createStore } from "@apogeelabs/beacon";
import {
    ActorControlledStore,
    defineActorActions,
    withActorControl,
} from "@apogeelabs/beacon-actorstore";
import { createActor } from "xstate";
import { todoMachine } from "./fsm";
import { Todo, TodoActorActions, TodoDerivedState, TodoListState, TodoStoreActions } from "./types";

export function getStoreInstance() {
    // Create a store configuration object
    const storeConfig = {
        initialState: {
            todos: [] as Todo[],
            filter: "all" as "all" | "active" | "completed",
            isLoading: false,
            error: null as string | null,
        },
        derived: {
            activeTodos: (state: TodoListState) => state.todos.filter(todo => !todo.completed),
            completedTodos: (state: TodoListState) => state.todos.filter(todo => todo.completed),
            filteredTodos: (state: TodoListState) => {
                switch (state.filter) {
                    case "active":
                        return state.todos.filter(todo => !todo.completed);
                    case "completed":
                        return state.todos.filter(todo => todo.completed);
                    default:
                        return state.todos;
                }
            },
            totalCount: (state: TodoListState) => state.todos.length,
            activeCount: (state: TodoListState) =>
                state.todos.filter(todo => !todo.completed).length,
            completedCount: (state: TodoListState) =>
                state.todos.filter(todo => todo.completed).length,
        },
        actions: {
            localSearch: (state: TodoListState, query: string) => {
                // This doesn't mutate state, just filters and returns.
                // This isn't anything we'd normally do! Just putting a beacon "store"
                // action here to show differentiation between it and the actor actions
                // that are defined in the middleware (below)
                const lowercaseQuery = query.toLowerCase();
                return state.todos.filter(todo =>
                    todo.title.toLowerCase().includes(lowercaseQuery)
                );
            },
        } as TodoStoreActions,
    };

    // Define actor actions with proper typing
    const todoActions = defineActorActions<typeof todoMachine, TodoActorActions>({
        addTodo: (actor, title: string) => {
            actor.send({ type: "ADD_TODO", title });
        },
        toggleTodo: (actor, id: string) => {
            actor.send({ type: "TOGGLE_TODO", id });
        },
        deleteTodo: (actor, id: string) => {
            actor.send({ type: "DELETE_TODO", id });
        },
        setFilter: (actor, filter: "all" | "active" | "completed") => {
            actor.send({ type: "SET_FILTER", filter });
        },
        refresh: actor => {
            actor.send({ type: "REFRESH" });
        },

        // Convenience actions
        clearCompleted: actor => {
            const snapshot = actor.getSnapshot();
            const todos = snapshot.context.todos;
            const completedTodos = todos.filter(todo => todo.completed);

            for (const todo of completedTodos) {
                actor.send({ type: "DELETE_TODO", id: todo.id });
            }
        },

        completeAll: actor => {
            const snapshot = actor.getSnapshot();
            const todos = snapshot.context.todos;
            const incompleteTodos = todos.filter(todo => !todo.completed);

            for (const todo of incompleteTodos) {
                actor.send({ type: "TOGGLE_TODO", id: todo.id });
            }
        },
    });

    const todoActor = createActor(todoMachine);

    const todoStore = createStore(
        withActorControl<
            TodoListState,
            TodoDerivedState,
            TodoStoreActions,
            typeof todoMachine,
            TodoActorActions
        >({
            actor: todoActor,
            actorActions: todoActions,
            allowRegularActions: true,
            autoStartActor: true,
        })({
            ...storeConfig,
        })
    ) as ActorControlledStore<
        TodoListState,
        TodoDerivedState,
        TodoStoreActions,
        typeof todoMachine,
        TodoActorActions
    >;

    return todoStore;
}
