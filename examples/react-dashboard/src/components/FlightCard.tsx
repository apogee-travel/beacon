import type { Flight } from "../types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface FlightCardProps {
    flight: Flight;
    // onAddToTrip and onToggleSelect are mutually exclusive usage modes.
    // When onToggleSelect is provided, the card renders in selection mode (checkbox + no button).
    // When only onAddToTrip is provided, the card renders in the original single-add mode.
    onAddToTrip?: (flight: Flight) => void;
    onToggleSelect?: (flight: Flight) => void;
    isSelected?: boolean;
}

function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

export function FlightCard({ flight, onAddToTrip, onToggleSelect, isSelected }: FlightCardProps) {
    const selectable = !!onToggleSelect;
    const selected = isSelected ?? false;

    return (
        <Card
            className={`flex flex-col transition-colors ${selectable ? "cursor-pointer" : ""} ${selected ? "ring-2 ring-primary bg-primary/5" : ""}`}
            onClick={selectable ? () => onToggleSelect(flight) : undefined}
        >
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{flight.airline}</CardTitle>
                    <Badge variant={flight.stops === 0 ? "default" : "secondary"}>
                        {flight.stops === 0 ? "Nonstop" : `${flight.stops} stop`}
                    </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                    {flight.origin} → {flight.destination}
                </p>
            </CardHeader>

            <CardContent className="flex-1 pb-2">
                <div className="grid grid-cols-2 gap-1 text-sm">
                    <span className="text-muted-foreground">Depart</span>
                    <span>{flight.departDate}</span>
                    <span className="text-muted-foreground">Return</span>
                    <span>{flight.returnDate}</span>
                    <span className="text-muted-foreground">Duration</span>
                    <span>{formatDuration(flight.durationMinutes)}</span>
                    <span className="text-muted-foreground">Travelers</span>
                    <span>up to {flight.travelers}</span>
                </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between">
                <span className="text-xl font-bold">${flight.price.toLocaleString()}</span>
                {selectable ? (
                    <span
                        className={`text-sm font-medium ${selected ? "text-primary" : "text-muted-foreground"}`}
                    >
                        {selected ? "Selected ✓" : "Click to select"}
                    </span>
                ) : (
                    <Button size="sm" onClick={() => onAddToTrip?.(flight)}>
                        Add to Trip
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
