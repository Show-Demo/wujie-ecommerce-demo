import { createJsonServer } from "../../shared/http.js";
import { readState, updateState } from "../../shared/store.js";

function createLogId() {
  return `log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function appendLog(state, log) {
  state.logs.unshift(log);
  state.logs = state.logs.slice(0, 40);
}

createJsonServer({
  port: 7304,
  name: "inventory-service",
  routes: async ({ req, url, body }) => {
    if (req.method === "GET" && url.pathname === "/inventory/warnings") {
      const state = readState();
      return {
        body: {
          items: state.products.filter((item) => item.stock < item.safetyStock)
        }
      };
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/inventory/") && url.pathname.endsWith("/restock")) {
      const sku = decodeURIComponent(url.pathname.split("/")[2]);
      const delta = Number(body?.delta ?? 0);
      if (!sku || Number.isNaN(delta) || delta === 0) {
        return { status: 400, body: { message: "sku and delta are required" } };
      }
      const nextState = updateState((state) => {
        const product = state.products.find((item) => item.sku === sku);
        if (!product) {
          throw new Error(`Product not found: ${sku}`);
        }
        product.stock += delta;
        product.status = product.stock < product.safetyStock ? "低库存" : "在售";
        appendLog(state, {
          id: createLogId(),
          time: new Date().toLocaleString("zh-CN", { hour12: false }),
          actor: body?.operator ?? "运营同学",
          sourceSystem: body?.sourceSystem ?? "admin-console",
          domain: "inventory",
          action: delta > 0 ? "补货入库" : "人工扣减库存",
          detail: `${product.name}(${sku}) 库存变更 ${delta > 0 ? "+" : ""}${delta}，当前库存 ${product.stock}。这是 admin-console 直接调用 inventory-service。`
        });
        return state;
      });
      return {
        body: {
          item: nextState.products.find((item) => item.sku === sku)
        }
      };
    }

    if (req.method === "POST" && url.pathname === "/inventory/reserve") {
      const sku = body?.sku;
      const quantity = Number(body?.quantity ?? 1);
      if (!sku || Number.isNaN(quantity) || quantity < 1) {
        return { status: 400, body: { message: "sku and quantity are required" } };
      }
      const nextState = updateState((state) => {
        const product = state.products.find((item) => item.sku === sku);
        if (!product) {
          throw new Error(`Product not found: ${sku}`);
        }
        if (product.stock < quantity) {
          throw new Error(`库存不足，当前仅剩 ${product.stock}`);
        }
        product.stock -= quantity;
        product.monthlySales += quantity;
        product.status = product.stock < product.safetyStock ? "低库存" : "在售";
        appendLog(state, {
          id: createLogId(),
          time: new Date().toLocaleString("zh-CN", { hour12: false }),
          actor: body?.operator ?? "order-service",
          sourceSystem: body?.sourceSystem ?? "order-service",
          domain: "inventory",
          action: "订单扣减库存",
          detail: `${product.name}(${sku}) 被订单占用 ${quantity} 件，当前库存 ${product.stock}。这是 order-service 调 inventory-service 的结果。`
        });
        return state;
      });
      return {
        body: {
          item: nextState.products.find((item) => item.sku === sku)
        }
      };
    }

    return null;
  }
});
