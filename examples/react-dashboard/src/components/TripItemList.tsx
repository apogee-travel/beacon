import { observer } from "mobx-react-lite";
import type { TripStore } from "../hooks/useTripStore";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";

interface TripItemListProps {
    store: TripStore;
}

// TripItemList uses observer so the list re-renders reactively when items are added or removed.
const TripItemList = observer(({ store }: TripItemListProps) => {
    const hasItems = store.flights.length > 0 || store.hotels.length > 0;

    if (!hasItems) {
        return (
            <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                    <p className="mb-2 text-4xl">🗺</p>
                    <p>Your trip is empty.</p>
                    <p className="text-sm">
                        Go to Search, find flights and hotels, and add them here.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Flights */}
            {store.flights.length > 0 && (
                <section>
                    <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Flights ({store.flights.length})
                    </h3>
                    <div className="space-y-2">
                        {store.flights.map(flight => (
                            <Card key={flight.id}>
                                <CardContent className="flex items-center justify-between py-3">
                                    <div>
                                        <p className="font-medium">
                                            {flight.airline} — {flight.origin} →{" "}
                                            {flight.destination}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {flight.departDate} → {flight.returnDate}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge
                                            variant={flight.stops === 0 ? "default" : "secondary"}
                                        >
                                            {flight.stops === 0
                                                ? "Nonstop"
                                                : `${flight.stops} stop`}
                                        </Badge>
                                        <span className="font-bold">
                                            ${flight.price.toLocaleString()}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => store.actions.removeFlight(flight.id)}
                                            aria-label={`Remove ${flight.airline} flight`}
                                        >
                                            ✕
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
            )}

            {/* Hotels */}
            {store.hotels.length > 0 && (
                <section>
                    <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Hotels ({store.hotels.length})
                    </h3>
                    <div className="space-y-2">
                        {store.hotels.map(hotel => {
                            const nights = Math.max(
                                1,
                                Math.round(
                                    (new Date(hotel.checkOut).getTime() -
                                        new Date(hotel.checkIn).getTime()) /
                                        (1000 * 60 * 60 * 24)
                                )
                            );
                            return (
                                <Card key={hotel.id}>
                                    <CardContent className="flex items-center justify-between py-3">
                                        <div>
                                            <p className="font-medium">{hotel.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {hotel.checkIn} → {hotel.checkOut} ({nights}{" "}
                                                {nights === 1 ? "night" : "nights"})
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-muted-foreground">
                                                ${hotel.pricePerNight}/night
                                            </span>
                                            <span className="font-bold">
                                                ${(hotel.pricePerNight * nights).toLocaleString()}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => store.actions.removeHotel(hotel.id)}
                                                aria-label={`Remove ${hotel.name}`}
                                            >
                                                ✕
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
});

export { TripItemList };
