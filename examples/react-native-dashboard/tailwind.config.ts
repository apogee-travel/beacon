import type { Config } from "tailwindcss";

const config: Config = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                primary: "#3b82f6",
                background: "#ffffff",
                foreground: "#0f172a",
                card: "#f8fafc",
                border: "#e2e8f0",
                muted: "#64748b",
                accent: "#f1f5f9",
            },
        },
    },
    // "media" responds to the OS color scheme, which Appearance.setColorScheme() controls
    // in _layout.tsx. "class" is a DOM concept — it silently does nothing in React Native.
    darkMode: "media",
    plugins: [],
};

export default config;
