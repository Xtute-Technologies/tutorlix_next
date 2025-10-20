// src/index.js
import { registerApplication, start } from "single-spa";
import {
  constructApplications,
  constructRoutes,
  constructLayoutEngine,
} from "single-spa-layout";
import microfrontendLayout from "./microfrontend-layout.html";

import { initHeadManager } from "./root-head-manager";

// build routes & applications using single-spa-layout
const routes = constructRoutes(microfrontendLayout);
const applications = constructApplications({
  routes,
  loadApp({ name }) {
    // adjust this mapping to load correct bundles per app name
    if (name === "@ui-lake/productList1" || name === "@ui-lake/productList2") {
      return import(/* webpackIgnore: true */ "http://localhost:8081/ui-lake-productList.js");
    }
    // fallback or other apps — update URLs as needed
    return import(/* webpackIgnore: true */ "http://localhost:8081/ui-lake-productList.js");
  },
});

const layoutEngine = constructLayoutEngine({ routes, applications });

// register all applications returned by constructApplications
applications.forEach((app) => registerApplication(app));

// activate the layout engine (this wires up the DOM->apps behavior)
layoutEngine.activate();

// initialize head manager BEFORE start() so initial title/meta set is in place
initHeadManager();

// finally start single-spa
start();
