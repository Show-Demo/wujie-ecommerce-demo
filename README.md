# wujie-ecommerce-demo

一个基于 Wujie 的电商系统演示项目，用来展示前台、中台、后台三套系统如何围绕同一组后端能力协作。

项目重点不在于页面壳本身，而在于两件事：

- 三套系统使用不同视角消费同一份商品、库存、订单、活动数据
- 后端能力存在明确的复用关系，而不是所有请求都收口到一个网关

## 项目结构

### 前端应用

- `apps/host`
  系统壳，负责切换前台、中台、后台
- `apps/storefront`
  前台商城，负责商品浏览、活动承接、下单
- `apps/middle-console`
  中台控制台，负责商品中心、库存中心、订单中心、营销中心、搭建中心
- `apps/admin-console`
  商家后台，负责补货、发货、活动投放、售后处理

### 后端服务

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
  本地假数据和共享存储

## 关键调用关系

- 前台下单：`storefront -> order-service -> inventory-service`
- 后台补货：`admin-console -> inventory-service`
- 后台发货：`admin-console -> order-service`
- 后台投放模板活动：`admin-console -> marketing-service -> template-service`
- 中台直接读取各个能力中心的数据：
  - 商品中心读取 `product-service`
  - 库存中心读取 `inventory-service`
  - 订单中心读取 `order-service`
  - 营销中心读取 `marketing-service`
  - 搭建中心读取 `template-service`

## 模板能力的归属

模板能力放在中台，而不是后台。

- 中台维护模板库和模板结构
- 后台选择模板并投放活动
- 前台消费投放后的活动结果

对应关系如下：

- 中台管模板能力
- 后台用模板能力
- 前台展示模板结果

## 启动方式

```bash
pnpm install
pnpm dev
```

## 默认端口

- `host`: `http://localhost:7100`
- `middle-console`: `http://localhost:7101`
- `admin-console`: `http://localhost:7102`
- `storefront`: `http://localhost:7103`
- `product-service`: `http://localhost:7301`
- `order-service`: `http://localhost:7302`
- `marketing-service`: `http://localhost:7303`
- `inventory-service`: `http://localhost:7304`
- `template-service`: `http://localhost:7305`

## 演示建议

1. 打开 `http://localhost:7100`
2. 在前台创建订单
3. 切到中台查看订单中心、库存中心和联动日志
4. 切到后台执行补货、发货、投放模板活动
5. 回到前台查看库存和活动主题变化

## 说明文档

- [ARCHITECTURE_GUIDE.md](./ARCHITECTURE_GUIDE.md)
