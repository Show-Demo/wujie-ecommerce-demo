import { createJsonServer, readJson } from "../../shared/http.js";
import { readState, updateState } from "../../shared/store.js";

const INVENTORY_SERVICE = "http://127.0.0.1:7304";

function appendLog(state, log) {
  state.logs.unshift(log);
  state.logs = state.logs.slice(0, 40);
}

function createLogId() {
  return `log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function createOrderId(state) {
  return `SO-${24000 + state.orders.length + 1}`;
}

createJsonServer({
  port: 7302,
  name: "order-service",
  routes: async ({ req, url, body }) => {
    if (req.method === "GET" && url.pathname === "/logs") {
      const state = readState();
      return { body: { items: state.logs } };
    }

    if (req.method === "GET" && url.pathname === "/orders") {
      const state = readState();
      return { body: { items: state.orders } };
    }

    if (req.method === "POST" && url.pathname === "/orders") {
      const quantity = Number(body?.quantity ?? 1);
      if (!body?.sku || Number.isNaN(quantity) || quantity < 1) {
        return { status: 400, body: { message: "sku and quantity are required" } };
      }
      await readJson(`${INVENTORY_SERVICE}/inventory/reserve`, {
        method: "POST",
        body: JSON.stringify({
          sku: body.sku,
          quantity,
          operator: "order-service",
          sourceSystem: "order-service"
        })
      });
      const nextState = updateState((state) => {
        const product = state.products.find((item) => item.sku === body.sku);
        if (!product) {
          throw new Error(`Product not found: ${body.sku}`);
        }

        const order = {
          orderId: createOrderId(state),
          sku: product.sku,
          productName: product.name,
          quantity,
          finalAmount: product.price * quantity,
          status: "待履约",
          customer: body?.customer ?? "演示买家",
          channel: body?.channel ?? "H5商城",
          createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
          sourceSystem: body?.sourceSystem ?? "storefront",
          logisticsNo: ""
        };
        state.orders.unshift(order);
        appendLog(state, {
          id: createLogId(),
          time: order.createdAt,
          actor: order.customer,
          sourceSystem: body?.sourceSystem ?? "storefront",
          domain: "order",
          action: "创建订单",
          detail: `${order.orderId} 已创建。storefront 调 order-service；order-service 再调 inventory-service 扣减 ${order.productName} x${quantity} 库存。`
        });
        return state;
      });
      return { body: { item: nextState.orders[0] } };
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/orders/") && url.pathname.endsWith("/ship")) {
      const orderId = decodeURIComponent(url.pathname.split("/")[2]);
      const nextState = updateState((state) => {
        const order = state.orders.find((item) => item.orderId === orderId);
        if (!order) {
          throw new Error(`Order not found: ${orderId}`);
        }
        order.status = "已发货";
        order.logisticsNo = body?.logisticsNo ?? `SF${Date.now().toString().slice(-6)}`;
        appendLog(state, {
          id: createLogId(),
          time: new Date().toLocaleString("zh-CN", { hour12: false }),
          actor: body?.operator ?? "发货专员",
          sourceSystem: body?.sourceSystem ?? "admin-console",
          domain: "order",
          action: "订单发货",
          detail: `${order.orderId} 已标记发货。admin-console 直接调用 order-service 更新状态，物流单号 ${order.logisticsNo}。`
        });
        return state;
      });
      return {
        body: {
          item: nextState.orders.find((item) => item.orderId === orderId)
        }
      };
    }

    return null;
  }
});
