import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightThemeNova from "starlight-theme-nova";

export default defineConfig({
    vite: {
        ssr: {
            noExternal: ["nanoid", "zod"],
        },
    },
    integrations: [
        starlight({
            title: "Beacon",
            logo: {
                light: "./src/assets/logo-light.svg",
                dark: "./src/assets/logo-dark.svg",
                replacesTitle: true,
            },
            description:
                "Composable MobX-based state management with middleware. Observable state, your way.",
            favicon: "/favicon.svg",
            head: [
                {
                    tag: "link",
                    attrs: {
                        rel: "icon",
                        href: "/favicon.ico",
                        sizes: "16x16 32x32 48x48",
                    },
                },
                {
                    tag: "link",
                    attrs: {
                        rel: "apple-touch-icon",
                        href: "/apple-touch-icon.png",
                        sizes: "180x180",
                    },
                },
                {
                    tag: "meta",
                    attrs: {
                        property: "og:image",
                        content: "/og-image.png",
                    },
                },
                {
                    tag: "meta",
                    attrs: {
                        property: "og:image:width",
                        content: "1200",
                    },
                },
                {
                    tag: "meta",
                    attrs: {
                        property: "og:image:height",
                        content: "630",
                    },
                },
                {
                    tag: "meta",
                    attrs: {
                        name: "twitter:card",
                        content: "summary_large_image",
                    },
                },
                {
                    tag: "meta",
                    attrs: {
                        name: "twitter:image",
                        content: "/og-image.png",
                    },
                },
            ],
            customCss: ["./src/styles/custom.css"],
            plugins: [starlightThemeNova()],
            social: [
                {
                    icon: "github",
                    label: "GitHub",
                    href: "https://github.com/apogee-travel/beacon",
                },
                {
                    icon: "npm",
                    label: "npm",
                    href: "https://www.npmjs.com/package/@apogeelabs/beacon",
                },
            ],
            sidebar: [
                {
                    label: "Getting Started",
                    items: [
                        { slug: "guide/introduction" },
                        { slug: "guide/installation" },
                        { slug: "guide/getting-started" },
                    ],
                },
                {
                    label: "Core Concepts",
                    items: [
                        { slug: "concepts/stores" },
                        { slug: "concepts/derived-state" },
                        { slug: "concepts/actions" },
                        { slug: "concepts/middleware" },
                        { slug: "concepts/disposal" },
                    ],
                },
                {
                    label: "API Reference",
                    items: [
                        { slug: "api/create-store" },
                        { slug: "api/compose" },
                        { slug: "api/store-instance" },
                    ],
                },
                {
                    label: "Middleware",
                    items: [{ slug: "middleware/browser-storage" }, { slug: "middleware/custom" }],
                },
                {
                    label: "React Integration",
                    items: [
                        { slug: "react/use-store-state" },
                        { slug: "react/use-store-watcher" },
                        { slug: "react/recipes" },
                    ],
                },
                {
                    label: "Advanced",
                    items: [{ slug: "advanced/patterns" }, { slug: "advanced/actor-store" }],
                },
            ],
        }),
    ],
});
