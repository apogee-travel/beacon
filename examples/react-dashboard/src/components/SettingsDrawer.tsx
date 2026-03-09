import { observer } from "mobx-react-lite";
import { settingsStore } from "../stores/settingsStore";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import type { Theme } from "../stores/settingsStore";

interface SettingsDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// SettingsDrawer uses observer because it renders store state directly.
// Any change to settingsStore triggers a re-render automatically — no wiring needed.
const SettingsDrawer = observer(({ open, onOpenChange }: SettingsDrawerProps) => {
    const handleThemeChange = (theme: Theme) => {
        settingsStore.actions.setTheme(theme);
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" open={open}>
                <SheetHeader>
                    <SheetTitle>Settings</SheetTitle>
                </SheetHeader>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label>Theme</Label>
                        <div className="flex gap-2">
                            <Button
                                variant={settingsStore.theme === "light" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleThemeChange("light")}
                            >
                                ☀ Light
                            </Button>
                            <Button
                                variant={settingsStore.theme === "dark" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleThemeChange("dark")}
                            >
                                ☾ Dark
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <p className="text-sm font-medium text-muted-foreground">Search Defaults</p>

                        <div className="space-y-2">
                            <Label htmlFor="defaultDestination">Default Destination</Label>
                            <Input
                                id="defaultDestination"
                                placeholder="e.g. Paris"
                                value={settingsStore.defaultDestination}
                                onChange={e =>
                                    settingsStore.actions.setDefaultDestination(e.target.value)
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="defaultTravelers">Default Travelers</Label>
                            <Input
                                id="defaultTravelers"
                                type="number"
                                min={1}
                                max={20}
                                value={settingsStore.defaultTravelers}
                                onChange={e =>
                                    settingsStore.actions.setDefaultTravelers(
                                        Number(e.target.value)
                                    )
                                }
                            />
                        </div>
                    </div>

                    <Separator />

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
});

export { SettingsDrawer };
