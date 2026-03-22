import { useState } from "react";
const views = [
  {
    key: "storefront",
    name: "storefront",
    label: "前台",
    title: "淘风商城前台",
    subtitle: "商城首页、活动会场、加购与下单"
  },
  {
    key: "middle-console",
    name: "middle-console",
    label: "中台",
    title: "淘风电商中台",
    subtitle: "商品、库存、订单、营销等共享能力中心"
  },
  {
    key: "admin-console",
    name: "admin-console",
    label: "后台",
    title: "淘风商家后台",
    subtitle: "商品管理、交易管理、店铺运营、客服售后"
  }
];

export default function App() {
  const [activeView, setActiveView] = useState("storefront");

  const activeMeta = views.find((item) => item.key === activeView) ?? views[0];
  const activeUrl =
    activeView === "storefront"
      ? "http://localhost:7103"
      : activeView === "middle-console"
        ? "http://localhost:7101"
        : "http://localhost:7102";

  return (
    <div className="host-shell">
      <header className="host-header">
        <div className="brand-block">
          <div className="brand-mark">TAOFENG</div>
          <div>
            <h1>{activeMeta.title}</h1>
            <p>{activeMeta.subtitle}</p>
          </div>
        </div>

        <div className="header-actions">
          <div className="system-switcher">
            {views.map((view) => (
              <button
                key={view.key}
                className={view.key === activeView ? "switch-btn active" : "switch-btn"}
                onClick={() => setActiveView(view.key)}
              >
                {view.label}
              </button>
            ))}
          </div>

          <div className="operator">
            <span className="avatar">D</span>
            <span>demo-admin</span>
          </div>
        </div>
      </header>

      <main className="host-main">
        <iframe
          key={activeView}
          className="system-frame"
          src={activeUrl}
          title={activeMeta.title}
        />
      </main>
    </div>
  );
}
