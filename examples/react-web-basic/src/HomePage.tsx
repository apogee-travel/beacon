// example app HomePage.tsx

import { Link } from "react-router-dom";

function HomePage() {
    return (
        <div className="home-page">
            <h1 className="page-title">Welcome to Beacon Examples</h1>
            <p className="page-description">
                This application demonstrates different approaches to state management in React
                applications using Beacon. Explore the examples below to see how Beacon can be used
                for different scenarios.
            </p>

            <div className="example-cards">
                <div className="example-card">
                    <h2>Basic Example</h2>
                    <p>
                        A simple implementation showing Beacon's core features (mutable state,
                        read-only state, and actions), plus a simple middleware integration allowing
                        the store to load from and persist to localstorage.
                    </p>
                    <Link to="/basic" className="example-link">
                        View Basic Example
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default HomePage;
