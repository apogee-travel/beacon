// example app main.tsx

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App";
import HomePage from "./HomePage";
import BasicExample from "./examples/basic/BasicExample";
import "./index.css";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<App />}>
                    <Route index element={<HomePage />} />
                    <Route path="basic" element={<BasicExample />} />
                </Route>
            </Routes>
        </BrowserRouter>
    </StrictMode>
);
