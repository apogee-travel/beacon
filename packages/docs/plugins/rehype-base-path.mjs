/**
 * Rehype plugin that prefixes internal absolute links with the Astro base path.
 * Starlight handles sidebar/pagination links, but inline markdown links
 * (e.g. [text](/guide/foo/)) don't get the base automatically.
 */
export function rehypeBasePath({ base }) {
    const prefix = base?.replace(/\/+$/, "") || "";
    if (!prefix) return () => {};

    function walk(node) {
        if (
            node.type === "element" &&
            node.tagName === "a" &&
            typeof node.properties?.href === "string"
        ) {
            const href = node.properties.href;
            if (href.startsWith("/") && !href.startsWith(prefix + "/") && !href.startsWith("//")) {
                node.properties.href = prefix + href;
            }
        }
        if (node.children) {
            for (const child of node.children) {
                walk(child);
            }
        }
    }

    return tree => walk(tree);
}
