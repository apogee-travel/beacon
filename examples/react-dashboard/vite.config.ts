import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    server: {
        // MSW service worker needs to be served from the same origin
        headers: {
            "Service-Worker-Allowed": "/",
        },
    },
});
