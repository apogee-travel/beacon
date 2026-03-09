import { useEffect, useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { observer } from "mobx-react-lite";
import { settingsStore } from "./stores/settingsStore";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { Button } from "./components/ui/button";

// App is wrapped with observer so it re-renders when settingsStore.theme changes.
// The theme drives the `dark` class on <html>, which Tailwind's darkMode:"class" uses.
const App = observer(() => {
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Apply/remove the `dark` class on <html> whenever the theme setting changes.
    // We do this in an effect rather than inline because touching document.documentElement
    // is a side effect and belongs outside the render path.
    // Fires on mount (initial theme) and on every subsequent change — no separate
    // empty-deps effect needed.
    useEffect(() => {
        if (settingsStore.theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [settingsStore.theme]);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border bg-card px-6 py-3">
                <div className="mx-auto flex max-w-6xl items-center justify-between">
                    <div className="flex items-center gap-6">
                        <span className="text-lg font-bold text-primary">✈ Trip Planner</span>
                        <nav className="flex gap-2">
                            <NavLink
                                to="/"
                                end
                                className={({ isActive }) =>
                                    `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                    }`
                                }
                            >
                                Search
                            </NavLink>
                            <NavLink
                                to="/trip"
                                className={({ isActive }) =>
                                    `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                    }`
                                }
                            >
                                My Trip
                            </NavLink>
                        </nav>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSettingsOpen(true)}
                        aria-label="Open settings"
                    >
                        ⚙ Settings
                    </Button>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-6 py-8">
                <Outlet />
            </main>

            <SettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} />
        </div>
    );
});

export default App;
