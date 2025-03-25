/* eslint-disable @typescript-eslint/no-explicit-any */
import { productListStore } from "../examples/basic/store/productListStore";
import { reaction } from "mobx";

// Mock telemetry API
const telemetryApi = {
    sendEvent: (eventName: string, data: any) => {
        console.log(`Telemetry event: ${eventName}`, data);
    },
};

export function initializeTelemetry() {
    let prevSortBy = productListStore.sortBy;
    let prevSortDirection = productListStore.sortDirection;

    const dispose = reaction(
        () => [productListStore.sortBy, productListStore.sortDirection],
        () => {
            const sortBy = productListStore.sortBy;
            const sortDirection = productListStore.sortDirection;

            // Only send event if something changed
            if (sortBy !== prevSortBy || sortDirection !== prevSortDirection) {
                telemetryApi.sendEvent("SORT_CHANGED", {
                    sortBy,
                    sortDirection,
                    prevSortBy,
                    prevSortDirection,
                });
                prevSortBy = sortBy;
                prevSortDirection = sortDirection;
            }
        }
    );

    // Return cleanup function
    return dispose;
}
