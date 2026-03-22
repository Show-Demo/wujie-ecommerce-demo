import { useEffect, useMemo, useState } from "react";

const PRODUCT_SERVICE = "http://127.0.0.1:7301";
const INVENTORY_SERVICE = "http://127.0.0.1:7304";
const ORDER_SERVICE = "http://127.0.0.1:7302";
const MARKETING_SERVICE = "http://127.0.0.1:7303";
const TEMPLATE_SERVICE = "http://127.0.0.1:7305";

const storefrontMenus = [
  { key: "home", label: "首页" },
  { key: "category", label: "分类" },
  { key: "live", label: "直播" },
  { key: "orders", label: "订单" },
  { key: "cart", label: "购物车" }
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
  const [activeMenu, setActiveMenu] = useState("home");
  const [selectedSku, setSelectedSku] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
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
  };

  useEffect(() => {
    fetchSnapshot();
    const timer = window.setInterval(fetchSnapshot, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const products = snapshot.products;
  const campaigns = snapshot.campaigns;
  const orders = snapshot.orders;
  const logs = snapshot.logs;
  const activeCampaign = campaigns[0];

  const selectedProduct = products.find((item) => item.sku === selectedSku) ?? products[0];

  const groupedProducts = useMemo(() => {
    return products.reduce((acc, item) => {
      acc[item.category] = acc[item.category] || [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [products]);

  const placeOrder = async () => {
    if (!selectedProduct) return;
    setSubmitting(true);
    setMessage("");
    try {
      await request(`${ORDER_SERVICE}/orders`, {
        method: "POST",
        body: JSON.stringify({
          sku: selectedProduct.sku,
          quantity,
          customer: "演示买家",
          channel: "淘风商城",
          sourceSystem: "storefront"
        })
      });
      await fetchSnapshot();
      setActiveMenu("orders");
      setMessage(`已创建订单，${selectedProduct.name} x${quantity}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mall-page">
      <header className="mall-header">
        <div className="mall-brand">淘风商城</div>
        <div className="mall-search">
          <input value={selectedProduct?.name ?? ""} readOnly />
          <button>搜同款</button>
        </div>
        <div className="mall-user">
          {storefrontMenus.map((menu) => (
            <button
              key={menu.key}
              className={menu.key === activeMenu ? "top-link active" : "top-link"}
              onClick={() => setActiveMenu(menu.key)}
            >
              {menu.label}
            </button>
          ))}
        </div>
      </header>

      <div className="mall-nav">
        {storefrontMenus.map((menu) => (
          <button
            key={menu.key}
            className={menu.key === activeMenu ? "channel active" : "channel"}
            onClick={() => setActiveMenu(menu.key)}
          >
            {menu.label}
          </button>
        ))}
      </div>

      {message ? <div className="page-banner">{message}</div> : null}

      {activeMenu === "home" && (
        <>
          <section className="mall-hero">
            <div className="hero-main" style={{ background: activeCampaign?.surface }}>
              <p className="hero-tag" style={{ color: activeCampaign?.accent }}>{activeCampaign?.badge ?? "官方活动"}</p>
              <h1>{activeCampaign?.headline ?? activeCampaign?.name ?? "春季大促"}</h1>
              <p>{activeCampaign?.subheadline ?? "前台直接面向消费者，但商品、库存、订单、活动都来自同一套中台服务。"}</p>
              <div className="hero-actions">
                <button
                  className="primary"
                  style={{ background: activeCampaign?.buttonColor }}
                  onClick={() => setActiveMenu("category")}
                >
                  进入会场
                </button>
                <button className="ghost" onClick={() => setActiveMenu("live")}>去直播间</button>
              </div>
            </div>

            <div className="hero-side">
              <div className="stat-card">
                <span>共享订单</span>
                <strong>{orders.length}</strong>
              </div>
              <div className="stat-card">
                <span>在线活动</span>
                <strong>{campaigns.length}</strong>
              </div>
            </div>
          </section>

          <main className="mall-main">
            <section className="goods-panel">
              <div className="panel-head">
                <h3>猜你喜欢</h3>
                <button className="link-btn" onClick={() => setActiveMenu("category")}>查看全部</button>
              </div>
              <div className="goods-grid">
                {products.slice(0, 6).map((product) => (
                  <button
                    key={product.sku}
                    className={product.sku === selectedSku ? "goods-card active" : "goods-card"}
                    onClick={() => setSelectedSku(product.sku)}
                  >
                    <div className="goods-cover" />
                    <div className="goods-info">
                      <span className="goods-badge">{product.tag}</span>
                      <strong>{product.name}</strong>
                      <small>{product.category}</small>
                      <div className="goods-meta">
                        <b>¥{product.price}</b>
                        <span>月销 {product.monthlySales}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <aside className="detail-panel">
              <div className="detail-card">
                <div className="detail-cover" />
                <div className="detail-info">
                  <h3>{selectedProduct?.name}</h3>
                  <p>{selectedProduct?.category} · 好评 {selectedProduct?.rating}</p>
                  <div className="price-box">
                    <span>到手价</span>
                    <strong>¥{selectedProduct?.price}</strong>
                  </div>
                  <label className="field">
                    <span>购买数量</span>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={quantity}
                      onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                    />
                  </label>
                  <div className="detail-hint">
                    可售库存 {selectedProduct?.stock ?? 0}，这个库存与中台库存中心、商家后台共用。
                  </div>
                  <div className="action-group">
                    <button className="ghost" onClick={() => setActiveMenu("cart")}>加入购物车</button>
                    <button className="primary" onClick={placeOrder} disabled={submitting}>
                      {submitting ? "下单中..." : "立即下单"}
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          </main>
        </>
      )}

      {activeMenu === "category" && (
        <section className="panel-page">
          <div className="panel-page-head">
            <h2>商品分类</h2>
            <p>这是前台商品展示，但商品主数据本身由中台商品中心维护。</p>
          </div>
          <div className="category-layout">
            {Object.entries(groupedProducts).map(([category, items]) => (
              <section className="category-block" key={category}>
                <h3>{category}</h3>
                <div className="category-items">
                  {items.map((product) => (
                    <button
                      key={product.sku}
                      className="category-item"
                      onClick={() => {
                        setSelectedSku(product.sku);
                        setActiveMenu("home");
                      }}
                    >
                      <strong>{product.name}</strong>
                      <span>¥{product.price}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      )}

      {activeMenu === "live" && (
        <section className="panel-page">
          <div className="panel-page-head">
            <h2>直播频道</h2>
            <p>直播只是前台流量入口，真正的活动规则和库存判断仍走中台能力。</p>
          </div>
          <div className="live-layout">
            <div className="live-stage">
              <div className="live-screen">直播间预览</div>
              <div className="live-detail">
                <h3>今晚 8 点咖啡生活专场</h3>
                <p>主播正在讲解爆款礼盒、挂耳组合和联名杯。</p>
              </div>
            </div>
            <div className="live-products">
              {products.slice(0, 5).map((product) => (
                <div className="live-product" key={product.sku}>
                  <strong>{product.name}</strong>
                  <span>¥{product.price}</span>
                  <button onClick={() => { setSelectedSku(product.sku); setActiveMenu("home"); }}>去下单</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeMenu === "orders" && (
        <section className="panel-page">
          <div className="panel-page-head">
            <h2>我的订单</h2>
            <p>买家只看到自己的购买结果；同一批订单会同时出现在中台订单中心和商家后台。</p>
          </div>
          <table className="page-table">
            <thead>
              <tr>
                <th>订单号</th>
                <th>商品</th>
                <th>数量</th>
                <th>金额</th>
                <th>状态</th>
                <th>下单时间</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderId}>
                  <td>{order.orderId}</td>
                  <td>{order.productName}</td>
                  <td>{order.quantity}</td>
                  <td>¥{order.finalAmount}</td>
                  <td>{order.status}</td>
                  <td>{order.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {activeMenu === "cart" && (
        <section className="panel-page">
          <div className="panel-page-head">
            <h2>购物车</h2>
            <p>这里故意保持轻量，重点是把购物车里的商品引导到真实下单接口。</p>
          </div>
          <div className="cart-list">
            {products.slice(0, 3).map((item) => (
              <div className="cart-row" key={item.sku}>
                <div>
                  <strong>{item.name}</strong>
                  <small>库存 {item.stock} · {item.channel}</small>
                </div>
                <div className="cart-actions">
                  <span>¥{item.price}</span>
                  <button onClick={() => { setSelectedSku(item.sku); setActiveMenu("home"); }}>去购买</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel-page compact">
        <div className="panel-page-head">
          <h2>模板化活动页</h2>
          <p>当前会场主题来自活动模板。后台用 38/61/中秋模板一键换皮后，这里会立即换主题色、标题和卖点文案。</p>
        </div>
        <div className="template-preview-list">
          {snapshot.activityTemplates.map((template) => (
            <div className="template-preview" key={template.templateId} style={{ background: template.surface }}>
              <span>{template.name}</span>
              <strong>{template.headline}</strong>
              <small>{template.discountLabel}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="panel-page compact">
        <div className="panel-page-head">
          <h2>最近联动日志</h2>
          <p>这里能直接看到前台动作如何进入中台共享能力。</p>
        </div>
        <div className="log-list">
          {logs.slice(0, 4).map((log) => (
            <div className="log-row" key={log.id}>
              <div>
                <strong>{log.action}</strong>
                <small>{log.detail}</small>
              </div>
              <span>{log.time}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
