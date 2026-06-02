# 数据模型草案

## users

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
- `appliedAt`
- `reviewedAt`
- `reviewerName`

## products

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

## orders

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
- `items`
- `createdAt`
- `completedAt`

## audit_logs

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

## 库存规则

- 客户提交订单时增加 `lockedStock`。
- 订单取消时释放 `lockedStock`。
- 订单确认时减少 `lockedStock` 并扣减 `stock`。
- `stock - lockedStock <= warningStock` 时触发库存预警。

## 对账中心

- 订单保留独立的结算状态，不与配送状态复用。
- 对账中心支持：
  - 单客户导出
  - 全部客户导出
  - 订单号搜索定位单独一单
  - 按时间范围筛选
  - 按结算状态筛选
  - 按时间 / 按客户排序
  - 逐单标记已结算
  - 批量标记当前筛选结果为已结算
