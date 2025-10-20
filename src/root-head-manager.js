// src/root-head-manager.js
import microfrontendLayout from "./microfrontend-layout.html";

/**
 * Upsert meta tag by name or property
 */
function upsertMeta({ name, property, content }) {
    let selector;
    if (name) selector = `meta[name="${name}"]`;
    else if (property) selector = `meta[property="${property}"]`;
    else return;

    let el = document.head.querySelector(selector);
    if (!el) {
        el = document.createElement("meta");
        if (name) el.setAttribute("name", name);
        if (property) el.setAttribute("property", property);
        document.head.appendChild(el);
    }
    el.setAttribute("content", content || "");
}

/**
 * Set document title and common meta tags based on a meta object
 */
export function setHead(meta = {}) {
    if (meta.title) document.title = meta.title;

    if (meta.description) upsertMeta({ name: "description", content: meta.description });
    if (meta["og:title"]) upsertMeta({ property: "og:title", content: meta["og:title"] });
    if (meta["og:description"]) upsertMeta({ property: "og:description", content: meta["og:description"] });
    if (meta["twitter:title"]) upsertMeta({ name: "twitter:title", content: meta["twitter:title"] });
    if (meta["robots"]) upsertMeta({ name: "robots", content: meta["robots"] });

    // Add any other meta keys you expect as data-* attributes
}

/**
 * Parse <route> elements from the layout HTML and extract data-* attributes as meta.
 * Returns array of { path, isDefault, meta }
 */
function parseLayoutForRouteMeta(layoutHtmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(layoutHtmlString, "text/html");
    const routeEls = Array.from(doc.querySelectorAll("route"));

    return routeEls.map((r) => {
        const path = r.getAttribute("path") || null;
        const isDefault = r.hasAttribute("default");
        const meta = {};
        Array.from(r.attributes).forEach((attr) => {
            if (attr.name.startsWith("data-")) {
                const key = attr.name.slice(5); // remove "data-"
                meta[key] = attr.value;
            }
        });
        return { path, isDefault, meta };
    });
}

/**
 * Simple route matcher:
 * - normalizes route path and current pathname
 * - matches exact or startsWith (so /products matches /products/123)
 * - falls back to default route if no match
 *
 * For more advanced matching (params/wildcards) use `path-to-regexp`.
 */
function findMetaForPath(routeMetaList, pathname) {
    // Normalize pathname (remove trailing slashes except root)
    let normalized = pathname.replace(/\/+$/, "");
    if (normalized === "") normalized = "/";

    // try exact/startsWith matches first
    for (const r of routeMetaList) {
        if (!r.path && r.isDefault) continue;
        const routePathRaw = r.path || "";
        const routePath = routePathRaw ? (routePathRaw.startsWith("/") ? routePathRaw : `/${routePathRaw}`) : null;
        if (routePath) {
            if (normalized === routePath || normalized.startsWith(routePath + "/")) {
                return r.meta;
            }
        }
    }

    // fallback to default route meta
    const defaultRoute = routeMetaList.find((r) => r.isDefault);
    return defaultRoute ? defaultRoute.meta : {};
}

/**
 * Initialize head manager: parse layout, set initial head, and listen for routing changes.
 */
export function initHeadManager() {
    try {
        const routeMetaList = parseLayoutForRouteMeta(microfrontendLayout);

        // set head initially
        const initialMeta = findMetaForPath(routeMetaList, window.location.pathname);
        setHead(initialMeta);

        // listen to single-spa routing events
        window.addEventListener("single-spa:routing-event", () => {
            const meta = findMetaForPath(routeMetaList, window.location.pathname);
            setHead(meta);
        });

        // listen to browser navigation just in case (back/forward)
        window.addEventListener("popstate", () => {
            const meta = findMetaForPath(routeMetaList, window.location.pathname);
            setHead(meta);
        });

        // optional: hashchange if you use hashes
        window.addEventListener("hashchange", () => {
            const meta = findMetaForPath(routeMetaList, window.location.pathname);
            setHead(meta);
        });

        // expose routeMetaList for debugging if needed
        // window.__ROUTE_META_LIST__ = routeMetaList;
    } catch (err) {
        // swallow errors but log for debugging
        // (DOMParser may throw in some edge cases)
        // eslint-disable-next-line no-console
        console.error("initHeadManager error:", err);
    }
}
