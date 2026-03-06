// Types copied verbatim from examples/react-dashboard/src/types.ts.
// They must stay in sync — see the build plan for rationale on why we duplicate
// rather than share via a workspace package.

export interface Flight {
    id: string;
    airline: string;
    origin: string;
    destination: string;
    departDate: string; // ISO date string: "2025-06-15"
    returnDate: string; // ISO date string: "2025-06-22"
    price: number; // total round-trip price in USD
    stops: number; // 0 = nonstop, 1 = one stop, etc.
    durationMinutes: number; // one-way flight duration in minutes
    travelers: number; // max travelers this fare supports
}

export interface Hotel {
    id: string;
    name: string;
    destination: string;
    checkIn: string; // ISO date string: "2025-06-15"
    checkOut: string; // ISO date string: "2025-06-22"
    pricePerNight: number; // USD per night
    stars: 1 | 2 | 3 | 4 | 5;
    amenities: string[];
    maxGuests: number;
}
