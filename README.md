# 前呈似景供应链微信小程序

前呈似景供应链微信小程序用于火锅串串食材客户订货与商家后台管理，一期采用微信原生小程序 + 微信云开发。

## 当前范围

- 客户端：浏览商品、申请查看价格、选购、提交订单、订单管理、地址管理。
- 后台端：商品、订单、客户、审核、统计、首页内容、店铺设置、管理员、导入导出入口。
- 支付：一期不接微信支付，只预留订单支付字段。

## 运行方式

用微信开发者工具打开本目录即可。当前以本地 mock 数据为主，同时已拿到正式云环境配置，后续将按计划分批切换真实云数据。

已确认环境：

- `AppID`: `wx3079736104fac8e3`
- 云开发环境 ID：`a01-d4ggnjhhqfabf9ba2`

详见：

- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- [docs/CLOUD_INTEGRATION_PLAN.md](docs/CLOUD_INTEGRATION_PLAN.md)
- [docs/CLOUD_SETUP_GUIDE.md](docs/CLOUD_SETUP_GUIDE.md)
- [docs/BLOCKERS_AND_NEXT_STEPS.md](docs/BLOCKERS_AND_NEXT_STEPS.md)

## 图片说明

当前预览使用 `assets/temp/` 中的裁剪压缩临时素材；原始参考截图已移到项目目录外的 `D:\codex\前呈似景供应链_参考截图_不参与打包`，避免影响手机预览。

## 仍需后补

- 正式商品/首页素材
- 旧商品与客户真实数据
- 订阅消息模板 ID
- 用户协议、隐私协议正文
- Excel/CSV 真实模板
