import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import SearchView from "./views/SearchView";
import TripView from "./views/TripView";
import { worker } from "./mocks/browser";
import "./globals.css";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Don't retry on failure during development — failed mocks should surface immediately
            retry: false,
            staleTime: 30_000,
        },
    },
});

// MSW must be running before React renders so the first queries don't slip past the worker.
// In production you'd skip this entirely — the worker only exists in development.
worker
    .start({
        onUnhandledRequest: "bypass", // let unmatched requests through (e.g., Vite HMR)
        serviceWorker: {
            url: "/mockServiceWorker.js",
        },
    })
    .then(() => {
        createRoot(document.getElementById("root")!).render(
            <StrictMode>
                <QueryClientProvider client={queryClient}>
                    <BrowserRouter>
                        <Routes>
                            <Route path="/" element={<App />}>
                                <Route index element={<SearchView />} />
                                <Route path="trip" element={<TripView />} />
                            </Route>
                        </Routes>
                    </BrowserRouter>
                </QueryClientProvider>
            </StrictMode>
        );
    });
