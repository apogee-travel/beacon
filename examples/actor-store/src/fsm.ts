import { defineActorActions } from "@apogeelabs/beacon-actorstore";
import { createMachine, fromPromise } from "xstate";
import { Todo, TodoActorActions } from "./types";

// Create a todo machine with XState v5.19.2
const todoMachine = createMachine({
    id: "todos",
    context: {
        todos: [] as Todo[],
        filter: "all" as "all" | "active" | "completed",
        isLoading: false,
        error: null as string | null,
    },
    initial: "loading",
    states: {
        loading: {
            entry: ({ context }) => {
                context.isLoading = true;
                context.error = null;
            },
            invoke: {
                id: "fetchTodos",
                src: "fetchTodos",
                onDone: {
                    target: "idle",
                    actions: ({ context, event }) => {
                        context.todos = event.output;
                        context.isLoading = false;
                    },
                },
                onError: {
                    target: "error",
                    actions: ({ context, event }) => {
                        context.error = `Failed to fetch todos: ${event.error}`;
                        context.isLoading = false;
                    },
                },
            },
        },
        idle: {
            on: {
                ADD_TODO: {
                    actions: ({ context, event }) => {
                        const newTodo: Todo = {
                            id: Date.now().toString(),
                            title: event.title,
                            completed: false,
                        };
                        context.todos = [...context.todos, newTodo];
                    },
                },
                TOGGLE_TODO: {
                    actions: ({ context, event }) => {
                        context.todos = context.todos.map(todo =>
                            todo.id === event.id ? { ...todo, completed: !todo.completed } : todo
                        );
                    },
                },
                DELETE_TODO: {
                    actions: ({ context, event }) => {
                        context.todos = context.todos.filter(todo => todo.id !== event.id);
                    },
                },
                SET_FILTER: {
                    actions: ({ context, event }) => {
                        context.filter = event.filter;
                    },
                },
                REFRESH: "loading",
            },
        },
        error: {
            on: {
                REFRESH: "loading",
            },
        },
    },
}).provide({
    // Define actors (XState v5 way to define services)
    actors: {
        fetchTodos: fromPromise(async () => {
            // Simulate API call with some delay
            console.log("Fetching todos...");
            await new Promise(resolve => setTimeout(resolve, 3000));

            return [
                { id: "1", title: "Learn XState", completed: true },
                { id: "2", title: "Learn Beacon", completed: false },
                { id: "3", title: "Build awesome app", completed: false },
            ] as Todo[];
        }),
    },
});

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

export { todoActions, todoMachine };
