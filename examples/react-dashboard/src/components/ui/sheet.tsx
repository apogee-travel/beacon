import * as React from "react";
import { cn } from "../../lib/utils";

interface SheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
    return (
        <>
            {open && (
                // Backdrop — clicking it closes the drawer
                <div
                    className="fixed inset-0 z-40 bg-black/50"
                    onClick={() => onOpenChange(false)}
                />
            )}
            {children}
        </>
    );
}

interface SheetTriggerProps {
    asChild?: boolean;
    children: React.ReactNode;
    onClick?: () => void;
}

export function SheetTrigger({ children, onClick }: SheetTriggerProps) {
    return (
        <span onClick={onClick} className="cursor-pointer">
            {children}
        </span>
    );
}

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
    side?: "right" | "left";
    open?: boolean;
}

export function SheetContent({
    className,
    children,
    side = "right",
    open,
    ...props
}: SheetContentProps) {
    return (
        <div
            className={cn(
                "fixed top-0 z-50 h-full w-80 bg-background shadow-xl transition-transform duration-300",
                side === "right" ? "right-0" : "left-0",
                open
                    ? "translate-x-0"
                    : side === "right"
                      ? "translate-x-full"
                      : "-translate-x-full",
                className
            )}
            {...props}
        >
            <div className="h-full overflow-y-auto p-6">{children}</div>
        </div>
    );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("mb-4 space-y-1", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return <h2 className={cn("text-lg font-semibold", className)} {...props} />;
}
