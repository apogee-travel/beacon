import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { useTripStore } from "../hooks/useTripStore";
import { TripSummary } from "../components/TripSummary";
import { TripItemList } from "../components/TripItemList";
import type { Flight, Hotel } from "../types";

// Shape of the route state passed by SearchView.
// The singular keys (addFlight, addHotel) are the original single-item shape.
// The plural keys (addFlights, addHotels) are the new stepped-selection shape.
// Both are handled so the route state contract is additive, not breaking.
interface TripRouteState {
    addFlight?: Flight;
    addHotel?: Hotel;
    addFlights?: Flight[];
    addHotels?: Hotel[];
}

/**
 * TripView demonstrates ephemeral store lifecycle.
 *
 * The tripStore is created when this component mounts (i.e., when you navigate to /trip)
 * and disposed when it unmounts (when you navigate away). Every visit to /trip starts
 * with a clean empty store — nothing persists between visits.
 *
 * This is the disposal demo. Watch the console: you'll see "[tripStore] created" on entry
 * and "[tripStore] disposed" on exit.
 *
 * Contrast with filtersStore (long-lived, module-scoped) and settingsStore (persistent).
 */
export default function TripView() {
    const store = useTripStore();
    const location = useLocation();

    // Handle items passed via route state from SearchView's "Add to Trip" buttons.
    // This is how we get items into the tripStore without a global store or context.
    useEffect(() => {
        const state = location.state as TripRouteState | null;
        if (!state) return;

        // Singular shape — original single-item "Add to Trip" path
        if (state.addFlight) {
            store.actions.addFlight(state.addFlight);
        }
        if (state.addHotel) {
            store.actions.addHotel(state.addHotel);
        }

        // Plural shape — new stepped-selection flow sends all items at once
        state.addFlights?.forEach(f => store.actions.addFlight(f));
        state.addHotels?.forEach(h => store.actions.addHotel(h));

        // Clear route state so re-renders don't re-add the same item
        globalThis.history.replaceState({}, "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">My Trip</h1>
                <Link
                    to="/"
                    className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                    ← Back to Search
                </Link>
            </div>

            <TripSummary store={store} />
            <TripItemList store={store} />
        </div>
    );
}
