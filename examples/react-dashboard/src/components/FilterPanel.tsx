import { observer } from "mobx-react-lite";
import { filtersStore } from "../stores/filtersStore";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Select } from "./ui/select";

// FilterPanel uses observer because it renders store state directly — MobX tracks
// which observables are read during render and re-renders only when those change.
// This is more efficient than useStoreState for components that render store values,
// because observer batches updates at the MobX level rather than React state.
const FilterPanel = observer(() => {
    return (
        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
            <h2 className="font-semibold">Filters</h2>

            <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <Input
                    id="destination"
                    placeholder="e.g. Paris, Tokyo..."
                    value={filtersStore.destination}
                    onChange={e => filtersStore.actions.setDestination(e.target.value)}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="departDate">Depart</Label>
                <Input
                    id="departDate"
                    type="date"
                    value={filtersStore.departDate}
                    onChange={e => filtersStore.actions.setDepartDate(e.target.value)}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="returnDate">Return</Label>
                <Input
                    id="returnDate"
                    type="date"
                    value={filtersStore.returnDate}
                    onChange={e => filtersStore.actions.setReturnDate(e.target.value)}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="travelers">Travelers</Label>
                <Select
                    id="travelers"
                    value={String(filtersStore.travelers)}
                    onChange={e => filtersStore.actions.setTravelers(Number(e.target.value))}
                >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                        <option key={n} value={n}>
                            {n} {n === 1 ? "traveler" : "travelers"}
                        </option>
                    ))}
                </Select>
            </div>

            {/* Undo/redo — powered by undoMiddleware on filtersStore.
                canUndo/canRedo are derived values that update reactively, so observer
                handles disabling these buttons automatically. */}
            <div className="flex gap-2 pt-2">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!filtersStore.canUndo}
                    onClick={() => filtersStore.actions.undo()}
                    title="Undo last filter change"
                >
                    ↩ Undo
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!filtersStore.canRedo}
                    onClick={() => filtersStore.actions.redo()}
                    title="Redo filter change"
                >
                    ↪ Redo
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => filtersStore.actions.resetFilters()}
                    className="ml-auto"
                >
                    Reset
                </Button>
            </div>
        </div>
    );
});

export { FilterPanel };
