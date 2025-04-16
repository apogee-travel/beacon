# Beacon 🚨

A lightweight, opinionated, and MobX-powered state management library for React applications.

**Version**: 0.4.1  
**License**: ISC

## Overview

Beacon is a thin wrapper around MobX that provides a structured approach to state management with minimal boilerplate. It takes inspiration from Flux architecture principles while leveraging MobX's powerful reactivity system.

```typescript
import { createStore } from "@apogeelabs/beacon";

// Create a simple store
const pizzaStore = createStore({
    initialState: {
        availableToppings: ["cheese", "pepperoni", "mushrooms"],
        currentOrder: [],
    },
    actions: {
        addTopping: (state, topping) => {
            state.currentOrder.push(topping);
        },
    },
});

// Use the store
pizzaStore.actions.addTopping("mushrooms");
console.log(pizzaStore.currentOrder); // ['mushrooms']
```

## Installation

```bash
# Using npm
npm install @apogeelabs/beacon

# Using yarn
yarn add @apogeelabs/beacon
```

## Philosophy

Beacon was created with these core principles:

- **Separation of concerns**: State should be independent of components
- **Accessibility**: Stores should be accessible from anywhere, not just React components
- **Minimal boilerplate**: Avoid writing repetitive selectors and updaters
- **Clear boundaries**: Separate I/O concerns (HTTP, WebSockets, etc.) from both components and stores
- **Component simplicity**: Keep UI components as "dumb" as possible
- **Explicit updates**: Use actions to make state changes clear and traceable

## Features

- 🔄 **Reactive state** powered by MobX
- 🧮 **Derived values** for computed state
- 🛠️ **Actions** for predictable state updates
- 🔌 **Middleware** for enhancing store functionality
- 📸 **State snapshots** for debugging and persistence
- 🧹 **Automatic cleanup** to prevent memory leaks

## Basic Usage

### Creating a Store

```typescript
import { createStore } from "@apogeelabs/beacon";

const restaurantStore = createStore({
    initialState: {
        menu: {
            stromboli: [
                { id: "s1", name: "Classic Italian", price: 12.99 },
                { id: "s2", name: "Veggie Supreme", price: 11.99 },
            ],
            calzones: [
                { id: "c1", name: "Three Cheese", price: 10.99 },
                { id: "c2", name: "Meat Lover", price: 13.99 },
            ],
        },
        orders: [],
        isKitchenOpen: true,
    },
});
```

### Adding Derived Values

```typescript
const restaurantStore = createStore({
    initialState: {
        menu: {
            stromboli: [
                { id: "s1", name: "Classic Italian", price: 12.99 },
                { id: "s2", name: "Veggie Supreme", price: 11.99 },
            ],
            calzones: [
                { id: "c1", name: "Three Cheese", price: 10.99 },
                { id: "c2", name: "Meat Lover", price: 13.99 },
            ],
        },
        orders: [],
        isKitchenOpen: true,
    },
    derived: {
        // Computed value that returns all menu items in a flat array
        allMenuItems: state => [...state.menu.stromboli, ...state.menu.calzones],

        // Computed value that returns total revenue
        totalRevenue: state => state.orders.reduce((sum, order) => sum + order.total, 0),
    },
});

// Access derived values just like regular state
console.log(restaurantStore.allMenuItems);
console.log(restaurantStore.totalRevenue);
```

### Defining Actions

```typescript
const restaurantStore = createStore({
    initialState: {
        menu: {
            stromboli: [
                { id: "s1", name: "Classic Italian", price: 12.99 },
                { id: "s2", name: "Veggie Supreme", price: 11.99 },
            ],
            calzones: [
                { id: "c1", name: "Three Cheese", price: 10.99 },
                { id: "c2", name: "Meat Lover", price: 13.99 },
            ],
        },
        orders: [],
        isKitchenOpen: true,
    },

    actions: {
        // Add a new order
        placeOrder: (state, customerId, items) => {
            if (!state.isKitchenOpen) {
                throw new Error("Sorry, kitchen is closed!");
            }

            const orderItems = items.map(id => {
                const menuItem = state.allMenuItems.find(item => item.id === id);
                return { id, name: menuItem.name, price: menuItem.price };
            });

            const total = orderItems.reduce((sum, item) => sum + item.price, 0);

            state.orders.push({
                id: `order-${Date.now()}`,
                customerId,
                items: orderItems,
                total,
                timestamp: new Date(),
            });

            return true;
        },

        // Close the kitchen
        closeKitchen: state => {
            state.isKitchenOpen = false;
        },

        // Open the kitchen
        openKitchen: state => {
            state.isKitchenOpen = true;
        },
    },
});

// Use actions
restaurantStore.actions.placeOrder("customer-123", ["s1", "c2"]);
restaurantStore.actions.closeKitchen();
```

### Getting State Snapshots

```typescript
// Get a snapshot of the current state (without derived values)
const snapshot = restaurantStore.getStateSnapshot();
console.log(snapshot);

// Get a snapshot including derived values
const snapshotWithDerived = restaurantStore.getStateSnapshot({ withDerived: true });
console.log(snapshotWithDerived);
```

## Using Middleware

Middleware allows you to enhance store functionality. Here are some examples:

### Logging Middleware

```typescript
import { compose, createStore } from "@apogeelabs/beacon";

// Create a logging middleware
const createLoggerMiddleware = (options = {}) => {
    const { logActions = true, logStateChanges = true, logger = console } = options;

    return config => {
        // Get the original actions
        const originalActions = config.actions || {};

        // Create enhanced actions with logging
        const enhancedActions = {};
        for (const key in originalActions) {
            enhancedActions[key] = (state, ...args) => {
                if (logActions) {
                    logger.log(`Action '${key}' called with args:`, args);
                }

                const before = logStateChanges
                    ? JSON.stringify(createStore(config).getStateSnapshot())
                    : null;

                const result = originalActions[key](state, ...args);

                if (logStateChanges) {
                    const after = JSON.stringify(createStore(config).getStateSnapshot());
                    logger.log(`State changed after action '${key}':`, {
                        before: JSON.parse(before),
                        after: JSON.parse(after),
                    });
                }

                return result;
            };
        }

        // Return enhanced config
        return {
            ...config,
            actions: enhancedActions,
        };
    };
};

// Use the middleware
const loggerMiddleware = createLoggerMiddleware({
    logActions: true,
    logStateChanges: true,
});

// Create store with middleware
const restaurantStore = createStore(
    compose(loggerMiddleware)({
        initialState: {
            menu: {
                /* ... */
            },
            orders: [],
            isKitchenOpen: true,
        },
        actions: {
            placeOrder: (state, customerId, items) => {
                // Implementation...
            },
        },
    })
);
```

### Persistence Middleware

```typescript
import { compose, createStore } from "@apogeelabs/beacon";

// Create persistence middleware
const createPersistenceMiddleware = options => {
    const {
        key = "beacon-store",
        storage = localStorage,
        serialize = JSON.stringify,
        deserialize = JSON.parse,
    } = options;

    return config => {
        // Try to load persisted state
        let persistedState = {};
        try {
            const stored = storage.getItem(key);
            if (stored) {
                persistedState = deserialize(stored);
            }
        } catch (e) {
            console.error("Failed to load persisted state:", e);
        }

        // Merge with initial state
        const initialState = {
            ...config.initialState,
            ...persistedState,
        };

        // Setup auto-persistence
        return {
            ...config,
            initialState,
            onStoreCreated: store => {
                // Register callback that will be called when the store is disposed
                const cleanup = setInterval(() => {
                    if (store.isDisposed) return;

                    try {
                        const snapshot = store.getStateSnapshot();
                        storage.setItem(key, serialize(snapshot));
                    } catch (e) {
                        console.error("Failed to persist state:", e);
                    }
                }, 5000); // Save every 5 seconds

                // Register cleanup function
                store.registerCleanup(() => {
                    clearInterval(cleanup);
                });

                // Call original onStoreCreated if provided
                if (config.onStoreCreated) {
                    config.onStoreCreated(store);
                }
            },
        };
    };
};

// Use persistence middleware
const persistenceMiddleware = createPersistenceMiddleware({
    key: "restaurant-store",
});

// Create store with middleware
const restaurantStore = createStore(
    compose(persistenceMiddleware)({
        initialState: {
            menu: {
                /* ... */
            },
            orders: [],
            isKitchenOpen: true,
        },
        actions: {
            /* ... */
        },
    })
);
```

### Combining Multiple Middleware

```typescript
// Combine multiple middleware
const restaurantStore = createStore(
    compose(
        persistenceMiddleware,
        loggerMiddleware
        // Add more middleware as needed...
    )({
        initialState: {
            /* ... */
        },
        actions: {
            /* ... */
        },
        derived: {
            /* ... */
        },
    })
);
```

## Cleanup

Beacon automatically handles cleanup when a store is no longer needed:

```typescript
// Clean up the store when done
restaurantStore.dispose();

// Check if a store is disposed
if (restaurantStore.isDisposed) {
    console.log("Store has been disposed");
}
```

## API Reference

### `createStore(config)`

Creates a reactive state store.

**Parameters:**

- `config`: An object with:
    - `initialState`: The initial state object
    - `derived` (optional): Object of computed values
    - `actions` (optional): Object of action functions
    - `onStoreCreated` (optional): Callback after store creation

**Returns:**
A store object containing state, derived values, actions, and utility methods.

### `compose(...middleware)`

Composes multiple middleware functions into a single middleware function.

**Parameters:**

- `...middleware`: Middleware functions to compose

**Returns:**
A function that applies all middleware in sequence.

## TypeScript Support

Beacon is written in TypeScript and provides strong typing for your stores:

```typescript
import { createStore } from "@apogeelabs/beacon";

// Define state types
type MenuItem = {
    id: string;
    name: string;
    price: number;
};

type Order = {
    id: string;
    customerId: string;
    items: MenuItem[];
    total: number;
    timestamp: Date;
};

interface RestaurantState {
    menu: {
        stromboli: MenuItem[];
        calzones: MenuItem[];
    };
    orders: Order[];
    isKitchenOpen: boolean;
}

// Create typesafe store
const restaurantStore = createStore<RestaurantState>({
    initialState: {
        menu: {
            stromboli: [],
            calzones: [],
        },
        orders: [],
        isKitchenOpen: true,
    },
    // ... rest of config
});
```

## License

ISC

---
