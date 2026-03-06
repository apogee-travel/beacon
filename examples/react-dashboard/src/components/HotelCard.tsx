import type { Hotel } from "../types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface HotelCardProps {
    hotel: Hotel;
    // onAddToTrip and onToggleSelect are mutually exclusive usage modes.
    // When onToggleSelect is provided, the card renders in selection mode (checkbox + no button).
    // When only onAddToTrip is provided, the card renders in the original single-add mode.
    onAddToTrip?: (hotel: Hotel) => void;
    onToggleSelect?: (hotel: Hotel) => void;
    isSelected?: boolean;
}

function renderStars(count: number): string {
    return "★".repeat(count) + "☆".repeat(5 - count);
}

export function HotelCard({ hotel, onAddToTrip, onToggleSelect, isSelected }: HotelCardProps) {
    const checkIn = new Date(hotel.checkIn).getTime();
    const checkOut = new Date(hotel.checkOut).getTime();
    const nights = Math.max(1, Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
    const totalCost = hotel.pricePerNight * nights;
    const selectable = !!onToggleSelect;
    const selected = isSelected ?? false;

    return (
        <Card
            className={`flex flex-col transition-colors ${selectable ? "cursor-pointer" : ""} ${selected ? "ring-2 ring-primary bg-primary/5" : ""}`}
            onClick={selectable ? () => onToggleSelect(hotel) : undefined}
        >
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{hotel.name}</CardTitle>
                    <span className="text-yellow-500 text-sm">{renderStars(hotel.stars)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{hotel.destination}</p>
            </CardHeader>

            <CardContent className="flex-1 pb-2">
                <div className="grid grid-cols-2 gap-1 text-sm">
                    <span className="text-muted-foreground">Check-in</span>
                    <span>{hotel.checkIn}</span>
                    <span className="text-muted-foreground">Check-out</span>
                    <span>{hotel.checkOut}</span>
                    <span className="text-muted-foreground">Nights</span>
                    <span>{nights}</span>
                    <span className="text-muted-foreground">Per night</span>
                    <span>${hotel.pricePerNight}</span>
                </div>

                {hotel.amenities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                        {hotel.amenities.map(amenity => (
                            <Badge key={amenity} variant="outline" className="text-xs">
                                {amenity}
                            </Badge>
                        ))}
                    </div>
                )}
            </CardContent>

            <CardFooter className="flex items-center justify-between">
                <div>
                    <span className="text-xl font-bold">${totalCost.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground ml-1">total</span>
                </div>
                {selectable ? (
                    <span
                        className={`text-sm font-medium ${selected ? "text-primary" : "text-muted-foreground"}`}
                    >
                        {selected ? "Selected ✓" : "Click to select"}
                    </span>
                ) : (
                    <Button size="sm" onClick={() => onAddToTrip?.(hotel)}>
                        Add to Trip
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
