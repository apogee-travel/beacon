import { Outlet, NavLink } from "react-router-dom";
import "./App.css";
import reactLogo from "./assets/react.svg";
import { initializeTelemetry } from "./util/telemetry";

initializeTelemetry();

function App() {
    return (
        <div className="app-container">
            {/* Header with logos and main navigation */}
            <header className="app-header">
                <div className="logo-container">
                    <img src="beacon-old-school.webp" className="logo" alt="Beacon old logo" />
                    <img src={reactLogo} className="logo react" alt="React logo" />
                    <img src="beacon-new-school.webp" className="logo" alt="Beacon new logo" />
                </div>

                <nav className="main-nav">
                    <NavLink
                        to="/"
                        end
                        className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                    >
                        Home
                    </NavLink>
                    <NavLink
                        to="/basic"
                        className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                    >
                        Basic Example
                    </NavLink>
                    <NavLink
                        to="/reactquery"
                        className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                    >
                        React Query
                    </NavLink>
                </nav>
            </header>

            {/* Main content area with fixed minimum height */}
            <main className="content-container">
                <Outlet />
            </main>

            {/* Footer with version info */}
            <footer className="app-footer">
                <p>Beacon State Management Demo • v0.1.0</p>
            </footer>
        </div>
    );
}

export default App;
