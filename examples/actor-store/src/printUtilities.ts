import * as readline from "readline";
import { Todo } from "./types";

export function getPrintUtilities(todoStore: any) {
    // Create readline interface for CLI
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    function printTodos(todos: Todo[]) {
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

    // Helper to print store stats
    function printStats() {
        console.log("\nSTATS:");
        console.log("=====");
        console.log(`Total: ${todoStore.totalCount}`);
        console.log(`Active: ${todoStore.activeCount}`);
        console.log(`Completed: ${todoStore.completedCount}`);
        console.log(`Current filter: ${todoStore.filter}`);
        console.log(`Loading state: ${todoStore.isLoading ? "Loading..." : "Idle"}`);
        if (todoStore.error) {
            console.log(`Error: ${todoStore.error}`);
        }
        console.log("");
    }

    // CLI Menu
    function showMenu() {
        console.log("\nTODO APP MENU:");
        console.log("==============");
        console.log("1. Add a todo");
        console.log("2. Toggle todo completion");
        console.log("3. Delete a todo");
        console.log("4. Filter todos (all/active/completed)");
        console.log("5. Search todos");
        console.log("6. Clear completed todos");
        console.log("7. Complete all todos");
        console.log("8. Refresh todos");
        console.log("9. Exit");

        rl.question("\nEnter your choice (1-9): ", (choice: any) => {
            switch (choice) {
                case "1":
                    rl.question("Enter todo title: ", title => {
                        if (title.trim()) {
                            todoStore.actorActions.addTodo(title);
                        }
                        showMenu();
                    });
                    break;

                case "2":
                    rl.question("Enter todo ID to toggle: ", id => {
                        todoStore.actorActions.toggleTodo(id);
                        showMenu();
                    });
                    break;

                case "3":
                    rl.question("Enter todo ID to delete: ", id => {
                        todoStore.actorActions.deleteTodo(id);
                        showMenu();
                    });
                    break;

                case "4":
                    rl.question("Enter filter (all/active/completed): ", filter => {
                        if (["all", "active", "completed"].includes(filter)) {
                            todoStore.actorActions.setFilter(
                                filter as "all" | "active" | "completed"
                            );
                        } else {
                            console.log("Invalid filter. Using 'all'.");
                            todoStore.actorActions.setFilter("all");
                        }
                        showMenu();
                    });
                    break;

                case "5":
                    rl.question("Enter search query: ", query => {
                        const results = todoStore.actions.localSearch(query);
                        console.log("\nSEARCH RESULTS:");
                        console.log("==============");
                        printTodos(results);
                        showMenu();
                    });
                    break;

                case "6":
                    todoStore.actorActions.clearCompleted();
                    showMenu();
                    break;

                case "7":
                    todoStore.actorActions.completeAll();
                    showMenu();
                    break;

                case "8":
                    todoStore.actorActions.refresh();
                    setTimeout(showMenu, 1500); // Give time for the refresh to complete
                    break;

                case "9":
                    console.log("Exiting Todo App. Goodbye!");
                    rl.close();
                    process.exit(0);
                    break;

                default:
                    console.log("Invalid choice. Please try again.");
                    showMenu();
                    break;
            }
        });
    }

    return {
        printTodos,
        printStats,
        showMenu,
    };
}
