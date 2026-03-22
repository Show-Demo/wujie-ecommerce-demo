import { createJsonServer, readJson } from "../../shared/http.js";
import { readState, updateState } from "../../shared/store.js";

const TEMPLATE_SERVICE = "http://127.0.0.1:7305";

function appendLog(state, log) {
  state.logs.unshift(log);
  state.logs = state.logs.slice(0, 40);
}

function createLogId() {
  return `log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

createJsonServer({
  port: 7303,
  name: "marketing-service",
  routes: async ({ req, url, body }) => {
    if (req.method === "GET" && url.pathname === "/templates") {
      const state = readState();
      return { body: { items: state.activityTemplates } };
    }

    if (req.method === "GET" && url.pathname === "/campaigns") {
      const state = readState();
      return { body: { items: state.campaigns } };
    }

    if (req.method === "POST" && url.pathname === "/campaigns/from-template") {
      if (!body?.templateId) {
        return { status: 400, body: { message: "templateId is required" } };
      }
      const templateResponse = await readJson(
        `${TEMPLATE_SERVICE}/templates/${encodeURIComponent(body.templateId)}`
      );
      const nextState = updateState((state) => {
        const template = templateResponse.item;
        const campaign = {
          id: `camp-${Date.now()}`,
          name: body.name || template.name.replace("模板", "活动"),
          status: body.status ?? "进行中",
          channel: body.channel ?? template.channel,
          startTime: body.startTime ?? "2026-03-22 18:00",
          endTime: body.endTime ?? "2026-03-29 23:59",
          discountLabel: body.discountLabel ?? template.discountLabel,
          sourceSystem: body?.sourceSystem ?? "admin-console",
          templateId: template.templateId,
          badge: body.badge ?? template.badge,
          headline: body.headline ?? template.headline,
          subheadline: body.subheadline ?? template.subheadline,
          accent: template.accent,
          buttonColor: template.buttonColor,
          surface: template.surface
        };
        state.campaigns.unshift(campaign);
        appendLog(state, {
          id: createLogId(),
          time: new Date().toLocaleString("zh-CN", { hour12: false }),
          actor: body?.operator ?? "运营同学",
          sourceSystem: body?.sourceSystem ?? "admin-console",
          domain: "marketing",
          action: "模板换皮上线",
          detail: `${template.name} 已复用为 ${campaign.name}。admin-console 调 marketing-service；marketing-service 再调 template-service 取模板后生成活动实例。`
        });
        return state;
      });
      return { body: { item: nextState.campaigns[0] } };
    }

    if (req.method === "POST" && url.pathname === "/campaigns") {
      if (!body?.name) {
        return { status: 400, body: { message: "campaign name is required" } };
      }
      const nextState = updateState((state) => {
        const campaign = {
          id: `camp-${Date.now()}`,
          name: body.name,
          status: body.status ?? "进行中",
          channel: body.channel ?? "店铺首页",
          startTime: body.startTime ?? "2026-03-22 18:00",
          endTime: body.endTime ?? "2026-03-29 23:59",
          discountLabel: body.discountLabel ?? "满299减50",
          sourceSystem: body?.sourceSystem ?? "admin-console",
          templateId: body?.templateId ?? "custom",
          badge: body?.badge ?? "店铺活动",
          headline: body?.headline ?? body.name,
          subheadline: body?.subheadline ?? "活动已发布，可被前台会场直接消费。",
          accent: body?.accent ?? "#ff6a00",
          buttonColor: body?.buttonColor ?? "#111827",
          surface: body?.surface ?? "linear-gradient(135deg, #ff9d5c 0%, #ff6a00 100%)"
        };
        state.campaigns.unshift(campaign);
        appendLog(state, {
          id: createLogId(),
          time: new Date().toLocaleString("zh-CN", { hour12: false }),
          actor: body?.operator ?? "运营同学",
          sourceSystem: body?.sourceSystem ?? "admin-console",
          domain: "marketing",
          action: "发布活动",
          detail: `${campaign.name} 已发布到 ${campaign.channel}。admin-console 直接调用 marketing-service，前台和中台复用同一条活动数据。`
        });
        return state;
      });
      return { body: { item: nextState.campaigns[0] } };
    }

    return null;
  }
});
