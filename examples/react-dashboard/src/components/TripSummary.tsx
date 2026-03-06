import { observer } from "mobx-react-lite";
import type { TripStore } from "../hooks/useTripStore";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface TripSummaryProps {
    store: TripStore;
}

// TripSummary uses observer so derived values (totalCost, tripDuration, isComplete)
// update reactively when flights or hotels are added/removed.
const TripSummary = observer(({ store }: TripSummaryProps) => {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Trip Summary</CardTitle>
                    <Badge variant={store.isComplete ? "default" : "secondary"}>
                        {store.isComplete ? "✓ Complete" : "Incomplete"}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-bold">${store.totalCost.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Total Cost</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{store.tripDuration}</p>
                        <p className="text-xs text-muted-foreground">Days</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold">
                            {store.flights.length + store.hotels.length}
                        </p>
                        <p className="text-xs text-muted-foreground">Items</p>
                    </div>
                </div>

                {!store.isComplete && (
                    <p className="mt-4 text-center text-sm text-muted-foreground">
                        Add at least one flight and one hotel to complete your trip.
                    </p>
                )}
            </CardContent>
        </Card>
    );
});

export { TripSummary };
