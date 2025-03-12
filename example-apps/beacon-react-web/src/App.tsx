import "./App.css";
import reactLogo from "./assets/react.svg";
import ProductList from "./components/ProductList";
import { initializeTelemetry } from "./util/telemetry";

initializeTelemetry();

function App() {
    return (
        <>
            <div>
                <a href="#" target="">
                    <img src="beacon-old-school.webp" className="logo" alt="Vite logo" />
                </a>
                <a href="https://react.dev" target="_blank">
                    <img src={reactLogo} className="logo react" alt="React logo" />
                </a>
                <a href="#" target="">
                    <img src="beacon-new-school.webp" className="logo" alt="Vite logo" />
                </a>
            </div>
            <div id="root">
                <h1>Beacon Store Basic Example</h1>
                <ProductList />
            </div>
        </>
    );
}

export default App;
