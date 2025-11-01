// src/index.js
import { registerApplication, start } from "single-spa";
import {
  constructApplications,
  constructRoutes,
  constructLayoutEngine,
} from "single-spa-layout";
import microfrontendLayout from "./microfrontend-layout.html";

import { initHeadManager } from "./root-head-manager.js";

// import props from JSON (webpack will bundle it)
import propsData from "./props.json";

/**
 * Helper: parse the layout HTML and map <application name="..."> -> props attribute value(s)
 * Returns Map<appName, Array<propsValue>>
 */
function buildAppPropsMap(layoutHtmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(layoutHtmlString, "text/html");
  const appEls = Array.from(doc.querySelectorAll("application"));
  const map = new Map();

  appEls.forEach((el) => {
    const name = el.getAttribute("name");
    const propsAttr = el.getAttribute("props"); // can be "navigation", "nav,other", or inline JSON

    if (!name || !propsAttr) return;

    // accumulate multiple occurrences of same app name (if any)
    if (!map.has(name)) map.set(name, []);
    map.get(name).push(propsAttr);
  });

  return map;
}

/**
 * Resolve a single propsAttr string into an object to pass as customProps
 * - If propsAttr is JSON string (starts with '{' or '[') -> parse JSON
 * - else treat as comma-separated keys, and pick those keys from propsData
 */
function resolvePropsAttr(propsAttr, propsData) {
  const trimmed = propsAttr.trim();

  // try inline JSON
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      console.warn("Failed to parse inline JSON props:", propsAttr, e);
      return {};
    }
  }

  // treat as comma separated keys
  const keys = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  const resolved = {};

  keys.forEach((k) => {
    if (k in propsData) {
      // if propsData[k] is object/array, copy it whole
      const val = propsData[k];
      if (typeof val === "object" && val !== null) {
        // deep-ish copy to avoid accidental mutation
        resolved[k] = Array.isArray(val) ? [...val] : { ...val };
      } else {
        resolved[k] = val;
      }
    } else {
      // key not found in propsData — set undefined or ignore
      resolved[k] = undefined;
    }
  });

  return resolved;
}

/**
 * Build final customProps for an app:
 * - Base: global propsData (so all apps get global keys unless you don't want that)
 * - Then per-app props resolved from props attribute (these override global keys)
 * - Then existing app.customProps (coming from constructApplications/layout) override if present
 *
 * Change merge order if you want different precedence.
 */
function mergeCustomPropsForApp(app, appPropsMap, propsData) {
  // start with a shallow copy of global props
  const base = { ...(propsData || {}) };

  // resolve per-app props attributes if present
  const attrList = appPropsMap.get(app.name) || [];
  const resolvedObjs = attrList.map((attr) => resolvePropsAttr(attr, propsData));

  // merge all resolvedObjs into one (later ones override)
  const perApp = Object.assign({}, ...resolvedObjs);

  // existing customProps on app should win (put last) — change order if you want root to win.
  const finalCustom = {
    ...base,
    ...perApp,
    ...(app.customProps || {}),
  };

  return finalCustom;
}

/* ---------- main bootstrap ---------- */

// prepare data object to pass to constructRoutes if you want access inside layout templates
const data = { props: propsData };

// build routes & applications using single-spa-layout
const routes = constructRoutes(microfrontendLayout, data);
const applications = constructApplications({
  routes,
  loadApp({ name }) {
    // adjust this mapping to load correct bundles per app name
    if (name === "@ui-lake/productList1" || name === "@ui-lake/productList2") {
      return import(/* webpackIgnore: true */ "https://uilake.xtute.com/ui-lake/ui-lake-productList.module.10006d1339df12c97075.js");
    }
    // fallback or other apps — update URLs as needed
    return import(/* webpackIgnore: true */ "https://uilake.xtute.com/ui-lake/ui-lake-productList.module.10006d1339df12c97075.js");
  },
});

// parse layout HTML once and build app -> propsAttr map
const appPropsMap = buildAppPropsMap(microfrontendLayout);

// now merge/attach customProps to each application config
const applicationsWithProps = applications.map((app) => {
  const mergedCustomProps = mergeCustomPropsForApp(app, appPropsMap, propsData);
  return {
    ...app,
    customProps: mergedCustomProps,
  };
});

// construct layout engine with updated applications
const layoutEngine = constructLayoutEngine({ routes, applications: applicationsWithProps });

// register applications with single-spa
applicationsWithProps.forEach((app) => registerApplication(app));

// activate the layout engine (this wires up the DOM->apps behavior)
layoutEngine.activate();

// initialize head manager BEFORE start() so initial title/meta set is in place
initHeadManager();

// finally start single-spa
start();