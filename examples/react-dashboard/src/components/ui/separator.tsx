import * as React from "react";
import { cn } from "../../lib/utils";

interface SeparatorProps extends React.HTMLAttributes<HTMLHRElement> {
    orientation?: "horizontal" | "vertical";
}

export function Separator({ className, orientation = "horizontal", ...props }: SeparatorProps) {
    return (
        <hr
            className={cn(
                "shrink-0 bg-border",
                orientation === "horizontal" ? "h-px w-full border-0" : "h-full w-px border-0",
                className
            )}
            {...props}
        />
    );
}
