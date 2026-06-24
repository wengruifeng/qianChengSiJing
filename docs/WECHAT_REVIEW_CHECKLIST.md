# 微信官方审核前 Checklist

## 使用方式

- 这份清单用于项目从“可联调”推进到“可提交微信官方审核”。
- 建议按顺序打钩，先收代码和联调，再补素材和审核资料。
- 状态说明：
  - `[done]` 已完成
  - `[doing]` 正在推进
  - `[todo]` 尚未开始
  - `[blocked]` 受外部资料限制

## 一、代码与主链路

- [doing] 前台主链路回归：
  - 登录
  - 申请查看价格
  - 商品浏览
  - 查看选购
  - 提交订单
  - 订单列表 / 订单详情
- [doing] 后台主链路回归：
  - 商品管理
  - 客户管理
  - 订单管理
  - 审核中心
  - 对账中心
  - 店铺设置
- [todo] 清理所有“点了没反应”的假入口和空白页
- [todo] 再跑一轮角色权限验证：
  - 普通客户
  - 管理员
  - 超级管理员
- [doing] 登录方式需从“手填手机号”升级为“微信手机号授权登录”
  - 正式设计文档已完成，见 [WECHAT_PHONE_AUTH_DESIGN.md](D:/codex/中货通小程序需求/docs/WECHAT_PHONE_AUTH_DESIGN.md)
  - 登录页与鉴权工具已开始改造
  - 提审前仍需关闭手填手机号入口并完成真机回归
- [doing] 登录取消 / 返回规范回归：
  - 价格查看申请：未登录时直接进入登录页，取消后回首页
  - 订单页：取消登录后回首页，不反复拉起登录
  - 地址页：取消登录后回首页，不反复拉起登录
  - 商品加购 / 选购加购：取消登录后停留在可浏览页面，不反复拉起登录

## 二、云环境与安全

- [done] `AppID` 已接入：`wx3079736104fac8e3`
- [done] 云开发环境已接入：`a01-d4ggnjhhqfabf9ba2`
- [doing] 重新上传并部署 `cloudfunctions/api`
- [doing] 重新上传并部署 `cloudfunctions/bootstrap`
- [todo] 按 [CLOUD_SECURITY_RULES.md](D:/codex/中货通小程序需求/docs/CLOUD_SECURITY_RULES.md) 收死数据库权限规则
- [todo] 确认敏感业务统一走云函数，不允许前端直连数据库写入

## 三、图片与视觉素材

- [done] 后台已支持按不同入口上传图片到云存储
- [doing] 首页图、Logo、专题横幅正式上传云存储
- [doing] 商品主图、商品详情图正式上传云存储
- [blocked] 分类图标正式素材
- [blocked] 品牌视觉正式素材
- [todo] 清理演示图 / 临时图对正式审核版本的干扰

## 四、真实业务数据

- [doing] 真实首页配置补齐
- [blocked] 真实商品数据导入
- [blocked] 真实客户数据导入
- [todo] 检查审核通过后的商品、首页内容、对账数据是否和真实业务一致
- [doing] 按 [CLOUD_NAME_SYNC_CHECKLIST.md](D:/codex/中货通小程序需求/docs/CLOUD_NAME_SYNC_CHECKLIST.md) 同步云端旧名称数据

## 五、审核资料与合规

- [done] 用户协议正文已补到小程序页面
- [done] 隐私协议正文已补到小程序页面
- [done] 隐私指引配置口径已整理，见 [WECHAT_PRIVACY_GUIDE.md](D:/codex/中货通小程序需求/docs/WECHAT_PRIVACY_GUIDE.md)
- [done] 小程序审核说明口径已整理，见 [WECHAT_REVIEW_NOTES.md](D:/codex/中货通小程序需求/docs/WECHAT_REVIEW_NOTES.md)
- [doing] 微信后台隐私指引配置与实际采集字段一致：
  - 手机号
  - 收货地址
  - 订单信息
- [doing] 小程序简介 / 服务类目 / 审核说明与实际业务一致
- [doing] 去掉不适合提交审核版本的演示提示文案

## 六、消息与通知

- [blocked] 订阅消息模板 ID：
  - 新订单提醒
  - 客户申请提醒
  - 订单状态提醒
  - 待审核变更提醒
- [todo] 决定审核版本是否先关闭消息能力，避免半成品暴露

## 七、审核员测试准备

- [todo] 准备审核测试路径说明
- [todo] 准备审核测试手机号 / 账号角色说明
- [todo] 准备“如何查看价格 / 如何进入后台 / 如何看到订单”的简短审核说明

## 八、提交前最后检查

- [todo] 首页、选购页、订单页、我的页无空白异常
- [todo] 后台主要页面无明显报错 toast
- [todo] 审核中心和对账中心至少能跑通一条真实链路
- [todo] 所有图片都来自云存储或正式可访问地址
- [todo] 确认没有残留本地演示路径 `/assets/temp/` 作为正式业务图片来源
- [todo] 真机检查一次 iPhone / Android 基本显示

## 当前最关键阻塞项

- [blocked] 正式商品 / 首页 / 分类素材
- [done] 正式协议正文
- [blocked] 订阅消息模板 ID
- [blocked] 真实商品与客户数据
