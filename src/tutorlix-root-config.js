import { registerApplication, start } from "single-spa";
import {
  constructApplications,
  constructRoutes,
  constructLayoutEngine,
} from "single-spa-layout";
import microfrontendLayout from "./microfrontend-layout.html";

const routes = constructRoutes(microfrontendLayout);
const applications = constructApplications({
  routes,
  loadApp({ name }) {
    if (name === "@ui-lake/productList1" || name === "@ui-lake/productList2") {
      return import(/* webpackIgnore: true */ "http://localhost:8081/ui-lake-productList.js");
    }
    return import(/* webpackIgnore: true */ "http://localhost:8081/ui-lake-productList.js");
  },
});
const layoutEngine = constructLayoutEngine({ routes, applications });

applications.forEach(registerApplication);
layoutEngine.activate();
start();
