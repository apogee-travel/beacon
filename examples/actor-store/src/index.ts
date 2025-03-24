import { reaction } from "mobx";
import { getPrintUtilities } from "./printUtilities";
import { getStoreInstance } from "./store";
import { Todo } from "./types";

// Create the actor
const todoStore = getStoreInstance();

const { printTodos, printStats, showMenu } = getPrintUtilities(todoStore);

// Subscribe to store changes to print updates
let previousTodos: Todo[] = [];
let previousIsLoading = false;

reaction(
    () => todoStore.getStateSnapshot(),
    () => {
        const state = todoStore.getStateSnapshot();
        if (state.isLoading !== previousIsLoading) {
            previousIsLoading = state.isLoading;
            if (state.isLoading) {
                console.log("Loading todos...");
            } else {
                console.log("Loading complete.");
            }
        }

        const currentTodos = todoStore.filteredTodos;
        if (JSON.stringify(currentTodos) !== JSON.stringify(previousTodos)) {
            previousTodos = currentTodos;
            printTodos(currentTodos);
            printStats();
        }
    }
);

console.log("Starting Todo CLI App...");
console.log("(Initial data is being loaded)");

// Wait a moment for initial data to load before showing menu
setTimeout(showMenu, 3500);
