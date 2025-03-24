import { ActorAction } from "@apogeelabs/beacon-actorstore";
import { todoMachine } from "./fsm";

// Define the Todo type
export interface Todo {
    id: string;
    title: string;
    completed: boolean;
}

// Define the TodoList state
export interface TodoListState {
    todos: Todo[];
    filter: "all" | "active" | "completed";
    isLoading: boolean;
    error: string | null;
}

export interface TodoStoreActions extends Record<string, any> {
    localSearch: (state: TodoListState, query: string) => Todo[];
}

// Define the actor actions type
export type TodoActorActions = {
    addTodo: ActorAction<typeof todoMachine, [title: string], void>;
    toggleTodo: ActorAction<typeof todoMachine, [id: string], void>;
    deleteTodo: ActorAction<typeof todoMachine, [id: string], void>;
    setFilter: ActorAction<typeof todoMachine, [filter: "all" | "active" | "completed"], void>;
    refresh: ActorAction<typeof todoMachine, [], void>;
    clearCompleted: ActorAction<typeof todoMachine, [], void>;
    completeAll: ActorAction<typeof todoMachine, [], void>;
};

// Define derived state interface
export interface TodoDerivedState extends Record<string, (state: TodoListState) => any> {
    activeTodos: (state: TodoListState) => Todo[];
    completedTodos: (state: TodoListState) => Todo[];
    filteredTodos: (state: TodoListState) => Todo[];
    totalCount: (state: TodoListState) => number;
    activeCount: (state: TodoListState) => number;
    completedCount: (state: TodoListState) => number;
}
