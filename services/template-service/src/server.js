import { createJsonServer } from "../../shared/http.js";
import { readState } from "../../shared/store.js";

createJsonServer({
  port: 7305,
  name: "template-service",
  routes: async ({ req, url }) => {
    if (req.method === "GET" && url.pathname === "/templates") {
      const state = readState();
      return { body: { items: state.activityTemplates } };
    }

    if (req.method === "GET" && url.pathname.startsWith("/templates/")) {
      const templateId = decodeURIComponent(url.pathname.split("/")[2]);
      const state = readState();
      const item = state.activityTemplates.find((template) => template.templateId === templateId);
      if (!item) {
        return { status: 404, body: { message: "Template not found" } };
      }
      return { body: { item } };
    }

    return null;
  }
});
