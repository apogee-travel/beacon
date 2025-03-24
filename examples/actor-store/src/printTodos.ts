import { Todo } from "./types";

// Helper to print todos in a nice format
export function printTodos(todos: Todo[]) {
    if (todos.length === 0) {
        console.log("No todos found.");
        return;
    }

    console.log("\nTODO LIST:");
    console.log("==========");
    todos.forEach(todo => {
        console.log(`[${todo.completed ? "X" : " "}] ${todo.id}: ${todo.title}`);
    });
    console.log("");
}
