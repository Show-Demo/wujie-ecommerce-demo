import { useEffect, useState } from "react";

const PRODUCT_SERVICE = "http://127.0.0.1:7301";
const ORDER_SERVICE = "http://127.0.0.1:7302";
const MARKETING_SERVICE = "http://127.0.0.1:7303";
const INVENTORY_SERVICE = "http://127.0.0.1:7304";
const TEMPLATE_SERVICE = "http://127.0.0.1:7305";

const adminMenus = [
  { key: "dashboard", label: "工作台" },
  { key: "goods", label: "商品管理" },
  { key: "trades", label: "交易管理" },
  { key: "marketing", label: "店铺运营" },
  { key: "service", label: "客服售后" },
  { key: "analytics", label: "数据参谋" }
];

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "请求失败");
  }
  return data;
}

export default function App() {
  const [snapshot, setSnapshot] = useState({
    products: [],
    campaigns: [],
    activityTemplates: [],
    orders: [],
    logs: [],
    metrics: { totalSales: 0, pendingOrders: 0, lowStockSkus: 0 }
  });
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [selectedSku, setSelectedSku] = useState("");
  const [delta, setDelta] = useState(20);
  const [campaignName, setCampaignName] = useState("周末会员专场");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [message, setMessage] = useState("");

  const fetchSnapshot = async () => {
    const [productsRes, warningsRes, campaignsRes, templatesRes, ordersRes, logsRes] = await Promise.all([
      request(`${PRODUCT_SERVICE}/products`),
      request(`${INVENTORY_SERVICE}/inventory/warnings`),
      request(`${MARKETING_SERVICE}/campaigns`),
      request(`${TEMPLATE_SERVICE}/templates`),
      request(`${ORDER_SERVICE}/orders`),
      request(`${ORDER_SERVICE}/logs`)
    ]);
    const data = {
      products: productsRes.items,
      warningProducts: warningsRes.items,
      campaigns: campaignsRes.items,
      activityTemplates: templatesRes.items,
      orders: ordersRes.items,
      logs: logsRes.items,
      metrics: {
        totalSales: ordersRes.items.reduce((sum, item) => sum + item.finalAmount, 0),
        pendingOrders: ordersRes.items.filter((item) => item.status === "待履约").length,
        lowStockSkus: warningsRes.items.length
      }
    };
    setSnapshot(data);
    setSelectedSku((current) => current || data.products[0]?.sku || "");
    setSelectedTemplateId((current) => current || data.activityTemplates[0]?.templateId || "");
    setSelectedOrderId((current) => current || data.orders[0]?.orderId || "");
  };

  useEffect(() => {
    fetchSnapshot();
    const timer = window.setInterval(fetchSnapshot, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const products = snapshot.products;
  const campaigns = snapshot.campaigns;
  const orders = snapshot.orders;
  const templates = snapshot.activityTemplates;

  const executeAction = async (runner, successMessage) => {
    setMessage("");
    try {
      await runner();
      await fetchSnapshot();
      setMessage(successMessage);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const restock = () =>
    executeAction(
      () =>
        request(`${INVENTORY_SERVICE}/inventory/${encodeURIComponent(selectedSku)}/restock`, {
          method: "PATCH",
          body: JSON.stringify({
            delta: Number(delta),
            operator: "补货专员",
            sourceSystem: "admin-console"
          })
        }),
      "补货成功。后台直接调用 inventory-service；前台和中台都在复用同一份库存结果。"
    );

  const publishCampaign = () =>
    executeAction(
      () =>
        request(`${MARKETING_SERVICE}/campaigns`, {
          method: "POST",
          body: JSON.stringify({
            name: campaignName,
            channel: "店铺首页",
            discountLabel: "店铺券满299减50",
            operator: "运营同学",
            sourceSystem: "admin-console"
          })
        }),
      "活动已发布。后台直接调用 marketing-service；前台首页和中台营销中心都在消费同一条活动数据。"
    );

  const publishFromTemplate = (template) =>
    executeAction(
      () =>
        request(`${MARKETING_SERVICE}/campaigns/from-template`, {
          method: "POST",
          body: JSON.stringify({
            templateId: template.templateId,
            name: template.name.replace("模板", "活动"),
            operator: "运营同学",
            sourceSystem: "admin-console"
          })
        }),
      `${template.name} 已换皮上线。这里是 admin-console -> marketing-service -> template-service。`
    );

  const deployTemplate = () => {
    const template = templates.find((item) => item.templateId === selectedTemplateId);
    if (!template) return;
    return publishFromTemplate(template);
  };

  const fulfillOrder = () =>
    executeAction(
      () =>
        request(`${ORDER_SERVICE}/orders/${encodeURIComponent(selectedOrderId)}/ship`, {
          method: "PATCH",
          body: JSON.stringify({
            logisticsNo: `SF${Date.now().toString().slice(-6)}`,
            operator: "发货专员",
            sourceSystem: "admin-console"
          })
        }),
      "订单已发货。后台直接调用 order-service，中台订单中心和前台订单页共用同一条订单状态。"
    );

  return (
    <div className="merchant-page">
      <aside className="merchant-sidebar">
        <div className="merchant-logo">
          <div className="logo-badge">商家</div>
          <div>
            <strong>淘风旗舰店</strong>
            <span>商家工作台</span>
          </div>
        </div>

        <nav className="merchant-nav">
          {adminMenus.map((menu) => (
            <button
              key={menu.key}
              className={menu.key === activeMenu ? "nav-btn active" : "nav-btn"}
              onClick={() => setActiveMenu(menu.key)}
            >
              {menu.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="merchant-main">
        <header className="merchant-header">
          <div>
            <h1>{adminMenus.find((item) => item.key === activeMenu)?.label}</h1>
            <p>后台是给运营、客服、发货、商家同学用的操作台，不直接对消费者开放。</p>
          </div>
          <div className="header-cards">
            <div><span>待发货</span><strong>{snapshot.metrics.pendingOrders}</strong></div>
            <div><span>活动中</span><strong>{campaigns.length}</strong></div>
            <div><span>低库存</span><strong>{snapshot.metrics.lowStockSkus}</strong></div>
          </div>
        </header>

        <div className="module-tabs">
          {adminMenus.map((menu) => (
            <button
              key={menu.key}
              className={menu.key === activeMenu ? "module-btn active" : "module-btn"}
              onClick={() => setActiveMenu(menu.key)}
            >
              {menu.label}
            </button>
          ))}
        </div>

        {message ? <div className="page-banner">{message}</div> : null}

        <section className="table-card">
          <div className="biz-head"><h3>后端调用链</h3><span>后台不是自己处理业务，而是在调用中台能力</span></div>
          <div className="trace-list">
            <div className="trace-row">
              <div>
                <strong>补货动作</strong>
                <small>后台直接调用 inventory-service，库存中心是共享能力，不是后台自带模块。</small>
              </div>
              <div className="trace-side">
                <span>{"admin-console -> inventory-service"}</span>
              </div>
            </div>
            <div className="trace-row">
              <div>
                <strong>发货动作</strong>
                <small>后台直接调用 order-service 更新订单状态，前台订单页和中台订单中心都读这一条订单。</small>
              </div>
              <div className="trace-side">
                <span>{"admin-console -> order-service"}</span>
              </div>
            </div>
            <div className="trace-row">
              <div>
                <strong>模板活动投放</strong>
                <small>后台发起投放，但真正取模板、生成活动实例的是 marketing-service 调 template-service。</small>
              </div>
              <div className="trace-side">
                <span>{"admin-console -> marketing-service -> template-service"}</span>
              </div>
            </div>
          </div>
        </section>

        {activeMenu === "dashboard" && (
          <>
            <section className="merchant-grid">
              <div className="biz-card">
                <div className="biz-head"><h3>商品管理</h3><span>库存处理</span></div>
                <label className="field">
                  <span>商品 SKU</span>
                  <select value={selectedSku} onChange={(event) => setSelectedSku(event.target.value)}>
                    {products.map((item) => (
                      <option key={item.sku} value={item.sku}>{item.name} ({item.sku})</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>调整库存</span>
                  <input type="number" value={delta} onChange={(event) => setDelta(Number(event.target.value))} />
                </label>
                <button className="action-btn orange" onClick={restock}>提交补货</button>
              </div>

              <div className="biz-card">
                <div className="biz-head"><h3>店铺运营</h3><span>活动配置</span></div>
                <label className="field">
                  <span>活动名称</span>
                  <input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} />
                </label>
                <button className="action-btn dark" onClick={publishCampaign}>发布店铺活动</button>
              </div>

              <div className="biz-card">
                <div className="biz-head"><h3>交易管理</h3><span>发货处理</span></div>
                <label className="field">
                  <span>选择订单</span>
                  <select value={selectedOrderId} onChange={(event) => setSelectedOrderId(event.target.value)}>
                    {orders.map((item) => (
                      <option key={item.orderId} value={item.orderId}>{item.orderId} - {item.productName}</option>
                    ))}
                  </select>
                </label>
                <button className="action-btn gray" onClick={fulfillOrder}>标记已发货</button>
              </div>
            </section>

            <section className="table-card">
              <div className="biz-head"><h3>操作日志</h3><span>后台动作最终都落到中台后端能力</span></div>
              <div className="trace-list">
                {snapshot.logs.slice(0, 6).map((log) => (
                  <div className="trace-row" key={log.id}>
                    <div>
                      <strong>{log.domain} / {log.action}</strong>
                      <small>{log.detail}</small>
                    </div>
                    <div className="trace-side">
                      <span>{log.sourceSystem}</span>
                      <small>{log.time}</small>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {activeMenu === "goods" && (
          <section className="table-card">
            <div className="biz-head"><h3>出售中的宝贝</h3><span>商品管理页</span></div>
            <table className="order-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>商品名称</th>
                  <th>类目</th>
                  <th>库存</th>
                  <th>状态</th>
                  <th>售价</th>
                </tr>
              </thead>
              <tbody>
                {products.map((item) => (
                  <tr key={item.sku}>
                    <td>{item.sku}</td>
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td>{item.stock}</td>
                    <td>{item.status}</td>
                    <td>¥{item.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {activeMenu === "trades" && (
          <section className="table-card">
            <div className="biz-head"><h3>交易订单列表</h3><span>交易管理页</span></div>
            <table className="order-table">
              <thead>
                <tr>
                  <th>订单号</th>
                  <th>商品</th>
                  <th>买家</th>
                  <th>状态</th>
                  <th>创建时间</th>
                  <th>物流单号</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((item) => (
                  <tr key={item.orderId}>
                    <td>{item.orderId}</td>
                    <td>{item.productName}</td>
                    <td>{item.customer}</td>
                    <td>{item.status}</td>
                    <td>{item.createdAt}</td>
                    <td>{item.logisticsNo || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {activeMenu === "marketing" && (
          <div className="marketing-layout">
            <section className="table-card">
              <div className="biz-head"><h3>活动投放</h3><span>后台只负责使用模板能力</span></div>
              <label className="field">
                <span>选择模板</span>
                <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                  {templates.map((template) => (
                    <option key={template.templateId} value={template.templateId}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>活动名称</span>
                <input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} />
              </label>
              <button className="action-btn dark" onClick={deployTemplate}>投放模板活动</button>
              <div className="deploy-hint">
                模板库本身在中台维护，这里只是选择模板并投放到店铺渠道。
              </div>
            </section>

            <section className="table-card">
              <div className="biz-head"><h3>店铺活动列表</h3><span>运营页</span></div>
              <table className="order-table">
                <thead>
                  <tr>
                    <th>活动名称</th>
                    <th>模板</th>
                    <th>渠道</th>
                    <th>优惠形式</th>
                    <th>开始时间</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.templateId}</td>
                      <td>{item.channel}</td>
                      <td>{item.discountLabel}</td>
                      <td>{item.startTime}</td>
                      <td>{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        )}

        {activeMenu === "service" && (
          <section className="table-card">
            <div className="biz-head"><h3>客服售后</h3><span>人工处理视角</span></div>
            <table className="order-table">
              <thead>
                <tr>
                  <th>订单号</th>
                  <th>商品</th>
                  <th>买家</th>
                  <th>售后状态</th>
                  <th>来源</th>
                </tr>
              </thead>
              <tbody>
                {orders.filter((item) => ["退款中", "待履约"].includes(item.status)).map((item) => (
                  <tr key={item.orderId}>
                    <td>{item.orderId}</td>
                    <td>{item.productName}</td>
                    <td>{item.customer}</td>
                    <td>{item.status}</td>
                    <td>{item.sourceSystem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {activeMenu === "analytics" && (
          <section className="merchant-grid">
            <div className="biz-card">
              <div className="biz-head"><h3>支付转化率</h3><span>实时指标</span></div>
              <div className="metric">6.8%</div>
            </div>
            <div className="biz-card">
              <div className="biz-head"><h3>客单价</h3><span>实时指标</span></div>
              <div className="metric">¥{Math.round(snapshot.metrics.totalSales / Math.max(orders.length, 1))}</div>
            </div>
            <div className="biz-card">
              <div className="biz-head"><h3>退款率</h3><span>实时指标</span></div>
              <div className="metric">
                {Math.round((orders.filter((item) => item.status === "退款中").length / Math.max(orders.length, 1)) * 100)}%
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
