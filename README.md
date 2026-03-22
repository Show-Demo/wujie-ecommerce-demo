# Wujie Ecommerce Demo

一个用 Wujie 做系统壳的电商仿真 demo，专门演示前台、中台、后台三套系统如何共用同一组后端能力。

## 这版重点

- 去掉了网关，避免把复用关系藏起来
- 前台、中台、后台都是真实页面，不是概念卡片
- 后端复用关系是明确的服务调用，不是“共用一个万能接口”

## 系统拆分

前端：

- `apps/host`
  系统壳，右上角切换前台 / 中台 / 后台
- `apps/storefront`
  前台商城，负责浏览、活动承接、下单
- `apps/middle-console`
  中台管理端，负责商品中心、库存中心、订单中心、营销中心、搭建中心
- `apps/admin-console`
  商家后台，负责补货、发货、活动投放、客服售后

后端：

- `services/product-service`
  商品主数据服务
- `services/inventory-service`
  库存服务
- `services/order-service`
  订单服务
- `services/marketing-service`
  营销活动服务
- `services/template-service`
  活动模板服务
- `services/shared`
  共享假数据和本地文件存储

## 后端复用关系

这套 demo 想说明的不是“前端有三个页面”，而是“多个系统共用同一组后端能力”。

核心调用链：

- 前台下单：`storefront -> order-service -> inventory-service`
- 后台补货：`admin-console -> inventory-service`
- 后台发货：`admin-console -> order-service`
- 后台投放模板活动：`admin-console -> marketing-service -> template-service`
- 中台读取能力中心：
  - 商品中心读 `product-service`
  - 库存中心读 `inventory-service`
  - 订单中心读 `order-service`
  - 营销中心读 `marketing-service`
  - 搭建中心读 `template-service`

最关键的两个复用点：

- `inventory-service`
  同时被 `order-service` 和 `admin-console` 复用
- `template-service`
  同时被 `marketing-service` 和 `middle-console` 复用

这才是“服务 A 调服务 B，服务 C 也调服务 B”的复用。

## 模板换皮怎么体现

模板能力在中台，不在后台。

- 中台有“搭建中心 / 活动模板中心”
- 后台只有“活动投放”
- 后台发模板活动时，不是自己拼页面，而是调用 `marketing-service`
- `marketing-service` 再调用 `template-service` 取模板
- 前台消费最终生成的活动实例，立即换主题色、标题和卖点文案

也就是：

- 中台管模板能力
- 后台用模板能力
- 前台消费模板结果

## 启动

```bash
pnpm install
pnpm dev
```

默认端口：

- `host`: `http://localhost:7100`
- `middle-console`: `http://localhost:7101`
- `admin-console`: `http://localhost:7102`
- `storefront`: `http://localhost:7103`
- `product-service`: `http://localhost:7301`
- `order-service`: `http://localhost:7302`
- `marketing-service`: `http://localhost:7303`
- `inventory-service`: `http://localhost:7304`
- `template-service`: `http://localhost:7305`

## 推荐演示路径

1. 打开 `http://localhost:7100`
2. 在前台点击“立即下单”
3. 切到中台，看“后端复用链路”和联动日志
4. 切到后台，做补货、发货、投放模板活动
5. 再回前台，看库存和活动主题变化

## 文档

详细说明见：

- [ARCHITECTURE_GUIDE.md](./ARCHITECTURE_GUIDE.md)
