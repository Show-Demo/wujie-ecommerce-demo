import { useEffect, useMemo, useState } from "react";

const PRODUCT_SERVICE = "http://127.0.0.1:7301";
const ORDER_SERVICE = "http://127.0.0.1:7302";
const MARKETING_SERVICE = "http://127.0.0.1:7303";
const INVENTORY_SERVICE = "http://127.0.0.1:7304";
const TEMPLATE_SERVICE = "http://127.0.0.1:7305";

const middleMenus = [
  { key: "goods", label: "商品中心" },
  { key: "inventory", label: "库存中心" },
  { key: "orders", label: "订单中心" },
  { key: "marketing", label: "营销中心" },
  { key: "template", label: "搭建中心" },
  { key: "suppliers", label: "供应商中心" },
  { key: "members", label: "会员中心" }
];

async function request(url) {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "请求失败");
  }
  return data;
}

export default function App() {
  const [snapshot, setSnapshot] = useState({
    products: [],
    activityTemplates: [],
    campaigns: [],
    orders: [],
    warningProducts: [],
    logs: [],
    metrics: { totalSales: 0, pendingOrders: 0, lowStockSkus: 0 }
  });
  const [activeMenu, setActiveMenu] = useState("goods");

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
  };

  useEffect(() => {
    fetchSnapshot();
    const timer = window.setInterval(fetchSnapshot, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const products = snapshot.products;
  const campaigns = snapshot.campaigns;
  const templates = snapshot.activityTemplates;
  const orders = snapshot.orders;
  const warningProducts = snapshot.warningProducts;

  const supplierGroups = useMemo(() => {
    return Array.from(
      products.reduce((map, item) => {
        if (!map.has(item.supplier)) {
          map.set(item.supplier, {
            name: item.supplier,
            skuCount: 0,
            lowStock: 0,
            warehouses: new Set()
          });
        }
        const supplier = map.get(item.supplier);
        supplier.skuCount += 1;
        supplier.warehouses.add(item.warehouse);
        if (item.stock < item.safetyStock) supplier.lowStock += 1;
        return map;
      }, new Map()).values()
    ).map((item) => ({
      ...item,
      warehouses: Array.from(item.warehouses).join(" / ")
    }));
  }, [products]);

  return (
    <div className="middle-page">
      <header className="middle-topbar">
        <div className="topbar-left">
          <h1>淘风电商中台</h1>
          <p>这里不是直接卖货，而是沉淀商品、库存、订单、营销、模板这些共享能力，并把能力提供给前台和后台。</p>
        </div>
        <div className="topbar-right">
          <div className="top-stat">
            <span>共享 SKU</span>
            <strong>{products.length}</strong>
          </div>
          <div className="top-stat">
            <span>共享订单</span>
            <strong>{orders.length}</strong>
          </div>
          <div className="top-stat">
            <span>待履约</span>
            <strong>{snapshot.metrics.pendingOrders}</strong>
          </div>
        </div>
      </header>

      <div className="middle-nav">
        {middleMenus.map((menu) => (
          <button
            key={menu.key}
            className={menu.key === activeMenu ? "middle-tab active" : "middle-tab"}
            onClick={() => setActiveMenu(menu.key)}
          >
            {menu.label}
          </button>
        ))}
      </div>

      <main className="middle-main">
        <section className="module-card">
          <div className="module-head">
            <h3>后端复用链路</h3>
            <span>这块才是“中台复用”本体</span>
          </div>
          <div className="campaign-stack">
            <div className="campaign-block">
              <strong>前台下单</strong>
              <span>前台直接调用 order-service，order-service 再调用 inventory-service 扣库存。</span>
              <small>{"storefront -> order-service -> inventory-service"}</small>
            </div>
            <div className="campaign-block">
              <strong>后台补货</strong>
              <span>后台直接调用 inventory-service，改完库存后，前台和中台都读到同一份库存结果。</span>
              <small>{"admin-console -> inventory-service"}</small>
            </div>
            <div className="campaign-block">
              <strong>后台投放模板活动</strong>
              <span>后台直接调用 marketing-service，marketing-service 再调用 template-service 取模板，生成活动实例。</span>
              <small>{"admin-console -> marketing-service -> template-service"}</small>
            </div>
          </div>
        </section>

        {activeMenu === "goods" && (
          <>
            <section className="kanban">
              <div className="kanban-card"><span>商品总量</span><strong>{products.length}</strong><small>前后台共用同一套商品主数据</small></div>
              <div className="kanban-card"><span>在售类目</span><strong>{new Set(products.map((item) => item.category)).size}</strong><small>多个渠道复用</small></div>
              <div className="kanban-card"><span>共享 GMV</span><strong>¥{snapshot.metrics.totalSales}</strong><small>由统一订单域累计</small></div>
              <div className="kanban-card"><span>低库存 SKU</span><strong>{snapshot.metrics.lowStockSkus}</strong><small>前台下单和后台补货都会影响这里</small></div>
            </section>
            <section className="module-card">
              <div className="module-head">
                <h3>商品中心</h3>
                <span>商品主数据</span>
              </div>
              <table className="grid-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>商品名称</th>
                    <th>类目</th>
                    <th>供应商</th>
                    <th>仓库</th>
                    <th>售价</th>
                    <th>月销</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((item) => (
                    <tr key={item.sku}>
                      <td>{item.sku}</td>
                      <td>{item.name}</td>
                      <td>{item.category}</td>
                      <td>{item.supplier}</td>
                      <td>{item.warehouse}</td>
                      <td>¥{item.price}</td>
                      <td>{item.monthlySales}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}

        {activeMenu === "inventory" && (
          <div className="middle-grid">
            <section className="module-card wide">
              <div className="module-head">
                <h3>库存中心</h3>
                <span>安全库存和预警</span>
              </div>
              <table className="grid-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>商品</th>
                    <th>当前库存</th>
                    <th>安全库存</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((item) => (
                    <tr key={item.sku}>
                      <td>{item.sku}</td>
                      <td>{item.name}</td>
                      <td>{item.stock}</td>
                      <td>{item.safetyStock}</td>
                      <td>{item.stock < item.safetyStock ? "预警" : "正常"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="module-card">
              <div className="module-head">
                <h3>低库存商品</h3>
                <span>风险列表</span>
              </div>
              <div className="warning-list">
                {warningProducts.map((item) => (
                  <div className="warning-row" key={item.sku}>
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.sku}</small>
                    </div>
                    <div className="warning-pill">库存 {item.stock}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeMenu === "orders" && (
          <section className="module-card">
            <div className="module-head">
              <h3>订单中心</h3>
              <span>统一订单域</span>
            </div>
            <table className="grid-table">
              <thead>
                <tr>
                  <th>订单号</th>
                  <th>商品</th>
                  <th>买家</th>
                  <th>来源系统</th>
                  <th>状态</th>
                  <th>金额</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((item) => (
                  <tr key={item.orderId}>
                    <td>{item.orderId}</td>
                    <td>{item.productName}</td>
                    <td>{item.customer}</td>
                    <td>{item.sourceSystem}</td>
                    <td>{item.status}</td>
                    <td>¥{item.finalAmount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {activeMenu === "marketing" && (
          <div className="middle-grid">
            <section className="module-card wide">
              <div className="module-head">
                <h3>营销中心</h3>
                <span>共享营销规则与活动实例</span>
              </div>
              <table className="grid-table">
                <thead>
                  <tr>
                    <th>活动名称</th>
                    <th>模板</th>
                    <th>活动渠道</th>
                    <th>优惠形式</th>
                    <th>开始时间</th>
                    <th>结束时间</th>
                    <th>来源系统</th>
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
                      <td>{item.endTime}</td>
                      <td>{item.sourceSystem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="module-card">
              <div className="module-head">
                <h3>活动摘要</h3>
                <span>规则复用</span>
              </div>
              <div className="campaign-stack">
                {campaigns.map((item) => (
                  <div className="campaign-block" key={item.id}>
                    <strong>{item.name}</strong>
                    <span>{item.discountLabel}</span>
                    <small>{item.channel}</small>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeMenu === "template" && (
          <div className="middle-grid">
            <section className="module-card wide">
              <div className="module-head">
                <h3>活动模板中心</h3>
                <span>模板能力归中台沉淀</span>
              </div>
              <div className="template-library middle-template-library">
                {templates.map((template) => (
                  <div className="template-card middle-template-card" key={template.templateId} style={{ background: template.surface }}>
                    <span>{template.name}</span>
                    <strong>{template.headline}</strong>
                    <small>{template.subheadline}</small>
                    <div className="template-meta">
                      <b>{template.discountLabel}</b>
                      <span>{template.channel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="module-card">
              <div className="module-head">
                <h3>模板说明</h3>
                <span>中台负责沉淀能力</span>
              </div>
              <div className="campaign-stack">
                <div className="campaign-block">
                  <strong>中台负责什么</strong>
                  <span>模板结构、主题皮肤、组件能力、默认文案槽位</span>
                  <small>这是“模板能力中心”</small>
                </div>
                <div className="campaign-block">
                  <strong>后台负责什么</strong>
                  <span>选择模板、投放活动、改时间、改优惠、选商品</span>
                  <small>这是“运营动作”</small>
                </div>
                <div className="campaign-block">
                  <strong>前台负责什么</strong>
                  <span>消费最终活动结果，展示给用户</span>
                  <small>这是“流量承接”</small>
                </div>
                <div className="campaign-block">
                  <strong>服务到底谁调谁</strong>
                  <span>后台并不会自己拼模板，它发起投放后，marketing-service 会去调用 template-service 取模板，再生成活动实例。</span>
                  <small>这就是“服务 A 调服务 B”的复用</small>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeMenu === "suppliers" && (
          <section className="module-card">
            <div className="module-head">
              <h3>供应商中心</h3>
              <span>供应链资源沉淀</span>
            </div>
            <table className="grid-table">
              <thead>
                <tr>
                  <th>供应商</th>
                  <th>SKU 数</th>
                  <th>低库存商品</th>
                  <th>主要仓配</th>
                  <th>合作状态</th>
                </tr>
              </thead>
              <tbody>
                {supplierGroups.map((item) => (
                  <tr key={item.name}>
                    <td>{item.name}</td>
                    <td>{item.skuCount}</td>
                    <td>{item.lowStock}</td>
                    <td>{item.warehouses}</td>
                    <td>合作中</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {activeMenu === "members" && (
          <section className="kanban">
            <div className="kanban-card"><span>活跃会员</span><strong>42,860</strong><small>会员域可被前台和后台共同消费</small></div>
            <div className="kanban-card"><span>88VIP</span><strong>7,420</strong><small>权益标签统一归口</small></div>
            <div className="kanban-card"><span>复购率</span><strong>37%</strong><small>统一订单口径</small></div>
            <div className="kanban-card"><span>积分池</span><strong>980 万</strong><small>营销与会员联动</small></div>
          </section>
        )}

        <section className="module-card">
          <div className="module-head">
            <h3>联动日志</h3>
            <span>这块最能说明“复用”发生在哪里</span>
          </div>
          <div className="trace-list">
            {snapshot.logs.slice(0, 8).map((log) => (
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
      </main>
    </div>
  );
}
