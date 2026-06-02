# 数据模型草案

## 设计说明

- 当前项目仍保留本地 mock 数据作为兜底与演示数据源。
- 云数据库接入时，以本文件作为集合和字段的主参考。
- 第一版遵循“订单主表 + 订单商品明细表”的结构，不把订单商品仅仅内嵌在 `orders` 中。

## 集合总览

- `users`
- `admins`
- `products`
- `categories`
- `orders`
- `order_items`
- `addresses`
- `audit_logs`
- `home_contents`
- `message_settings`
- `operation_logs`

## users

用户主档，包含客户、管理员、超级管理员的通用身份信息。

- `id`
- `openid`
- `phone`
- `nickName`
- `avatar`
- `role`: `customer | admin | super_admin`
- `customerStatus`: `not_applied | pending | approved | rejected`
- `company`
- `region`
- `addressDetail`
- `remark`
- `createdAt`
- `appliedAt`
- `reviewedAt`
- `reviewerId`
- `reviewerName`

## admins

管理员手机号与后台权限来源表。

- `id`
- `phone`
- `role`: `admin | super_admin`
- `status`: `enabled | disabled`
- `createdAt`
- `createdBy`

说明：

- 登录时优先根据手机号匹配 `admins`
- 命中后，同步到 `users.role`

## categories

一级分类表。

- `id`
- `name`
- `icon`
- `sort`
- `status`: `enabled | disabled`

## products

商品主表。

- `id`
- `name`
- `barcode`
- `code`
- `simple`
- `categoryId`
- `mainImage`
- `detailImages`
- `spec`
- `unit`
- `price`
- `stock`
- `lockedStock`
- `warningStock`
- `tags`: `新品 | 推荐 | 热销`
- `sort`
- `saleStatus`: `on | off`
- `deleteStatus`: `normal | deleted`
- `description`
- `createdAt`
- `updatedAt`

## addresses

客户收货地址表。

- `id`
- `userId`
- `contactName`
- `phone`
- `region`
- `detail`
- `isDefault`
- `createdAt`
- `updatedAt`

## orders

订单主表，负责状态、金额、客户信息、地址快照、结算状态等。

- `id`
- `orderNo`
- `userId`
- `customerName`
- `customerPhone`
- `addressSnapshot`
- `status`: `pending | confirmed | delivering | completed | cancelled`
- `settlementStatus`: `pending | settled`
- `amount`
- `remark`
- `paymentMethod`: first version uses `offline`
- `paymentStatus`: reserved, first version uses `unpaid`
- `paymentAmount`
- `paymentTime`
- `paymentNo`
- `createdAt`
- `completedAt`
- `confirmedAt`
- `cancelledAt`

说明：

- 订单商品明细从 `order_items` 读取
- `orders` 只保留订单级信息和地址快照

## order_items

订单商品明细表，保存商品快照。

- `id`
- `orderId`
- `orderNo`
- `productId`
- `productName`
- `spec`
- `unit`
- `mainImage`
- `price`
- `quantity`
- `subtotal`

说明：

- 这里保存的是下单时商品快照，避免商品后续改名、改价、删除后影响历史订单

## audit_logs

审核记录表。

- `id`
- `type`
- `targetCollection`
- `targetId`
- `submitterId`
- `submitterName`
- `submittedAt`
- `status`: `pending | approved | rejected`
- `reviewerId`
- `reviewerName`
- `reviewedAt`
- `beforeData`
- `afterData`
- `summary`
- `rejectReason`

## home_contents

首页内容配置表。

- `id`
- `bannerTitle`
- `notice`
- `servicePhone`
- `heroImage`
- `topicImage`
- `logoImage`
- `recommendedProductIds`
- `newProductIds`
- `updatedAt`
- `updatedBy`

## message_settings

消息推送设置表。

- `id`
- `userId`
- `bindWechat`
- `orderNoticeEnabled`
- `deliveryNoticeEnabled`
- `auditNoticeEnabled`
- `receiptNoticeEnabled`
- `updatedAt`

## operation_logs

操作记录表。

- `id`
- `operatorId`
- `operatorName`
- `type`
- `target`
- `summary`
- `createdAt`

## 推荐索引

第一版建议优先配置以下查询索引：

- `users.phone`
- `users.customerStatus`
- `admins.phone`
- `products.categoryId + saleStatus + deleteStatus`
- `products.code`
- `products.barcode`
- `orders.userId + createdAt`
- `orders.orderNo`
- `orders.status + settlementStatus + createdAt`
- `order_items.orderId`
- `addresses.userId + isDefault`
- `audit_logs.status + submittedAt`

## 库存规则

- 客户提交订单时增加 `lockedStock`
- 订单取消时释放 `lockedStock`
- 订单确认时减少 `lockedStock` 并扣减 `stock`
- `stock - lockedStock <= warningStock` 时触发库存预警

## 对账中心

- 订单保留独立的结算状态，不与配送状态复用
- 对账中心支持：
  - 单客户导出
  - 全部客户导出
  - 订单号搜索定位单独一单
  - 按时间范围筛选
  - 按结算状态筛选
  - 按时间 / 按客户排序
  - 逐单标记已结算
  - 批量标记当前筛选结果为已结算
