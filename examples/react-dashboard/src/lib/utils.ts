import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Shadcn's standard cn() utility — merges Tailwind classes intelligently
// so conflicting classes (e.g., p-2 + p-4) resolve to the last one instead of both.
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
