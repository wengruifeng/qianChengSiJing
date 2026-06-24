# 实现记录

## 2026-05-18

### 已完成

- 初始化微信原生小程序项目配置。
- 新增云开发目录与 `bootstrap`、`api` 两个云函数骨架。
- 新增本地 mock 数据与 Storage 持久化工具，便于资料未齐时先跑通流程。
- 完成客户端页面：
  - 首页
  - 选购列表
  - 商品详情
  - 选购
  - 提交订单
  - 订单列表
  - 订单详情
  - 我的
  - 手机号登录
  - 查看价格申请
  - 收货地址
  - 协议说明
  - 消息推送设置
- 完成后台页面：
  - 后台首页
  - 商品管理
  - 商品新增/编辑
  - 订单管理
  - 客户管理
  - 客户详情
  - 审核中心
  - 数据统计
  - 首页内容
  - 店铺设置
  - 管理员
  - 导入导出
- 完成基础业务规则：
  - 游客看商品不看价格。
  - 已通过客户可看价和下单。
  - 订单提交锁定库存。
  - 后台确认订单扣减库存。
  - 取消订单释放锁定库存。
  - 商品变更生成审核记录。
  - 超级管理员审核后商品变更生效。
  - 客户查看价格申请可直接审核。
  - 订单新增独立结算状态：待结算 / 已结算。
- 完成临时素材处理：
  - 裁剪压缩 logo、首页横幅、专题横幅和 6 张商品图到 `assets/temp/`。
  - 原始整屏截图移动到项目目录外的 `D:\codex\前呈似景智链_参考截图_不参与打包`。
  - 小程序图片引用改为 `assets/temp/`。
  - `project.config.json` 排除 `references`、`docs` 和设计书文本。
- 完成权限与按钮标准修正：
  - 无看价权限时隐藏商品详情底部选购动作。
  - 结算页增加权限兜底校验。
  - 全局按钮改为 flex 居中。
  - 移除主要页面按钮的局部 `line-height` 居中写法。
  - 新增 `docs/PROJECT_STANDARDS.md`。
- 调整首页还原细节：
  - 删除首页内容区顶部额外店铺名称。
  - 首页公告改为后台首页内容的单一 `notice` 文案字段，并实现向左滚动。
  - 搜索栏扫码入口改为四角括框式 CSS 扫码图标。
  - 专题横幅按素材比例调整高度，避免“菜品上新”文字被裁切。
  - 商品列表、选购页、详情页补充长规格文案样式，支持两行规格说明展示。
  - 新增一条长规格 mock 商品用于压测列表和详情页展示效果。
  - 扩充商品 mock 数据，覆盖长短名称、长短规格、低库存、零库存、不同分类和不同标签场景。
  - 扩充客户、地址、订单和选购 mock 数据，覆盖未申请客户、多地址客户、长备注订单和默认选购明细场景。
  - 选购列表底部按钮改为“查看选购”，进入选购明细页后再提交订单。
  - 选购明细页支持加减号和数字输入修改商品数量，数量改为 0 时自动移出选购。
  - 商品列表、选购页、商品详情页补充库存状态展示，售罄商品禁止加入选购，低库存商品给出前台提示。
  - 查看选购页数量调整增加库存上限校验。
  - 优化前台订单页信息密度，增加状态标签、件数/品项摘要和备注摘要。
  - 优化后台客户与订单卡片，增加累计金额、地址数、结算标签和地址/备注摘要。
  - 优化订单详情页和客户详情页的信息层次，补充件数摘要、收货地址和最近订单。
  - 对账中心增加已选订单/已选金额统计，方便导出前核对范围。
  - 审核中心增加状态筛选、审核摘要和拒绝原因展示。
  - 商品管理增加状态筛选、分类/标签/在售状态信息和空状态。
  - 后台首页增加今日待办和更多经营概览。
  - 数据统计增加待结算金额、已结算金额和客户采购排行。
  - 导入导出页补充模板说明和导出数量预览。
  - 新增审核中心和首页内容 mock 数据，便于后台直接演示待审核、已通过、已拒绝场景。
  - 补充交付清单和后补资料清单，明确真实环境、素材、模板和协议类阻塞项。
  - 新增 `docs/DELIVERY_CHECKLIST.md` 作为持续推进清单。
- 完成对账中心第一版：
  - 后台首页增加对账中心入口。
  - 支持客户、时间范围、结算状态、排序方式筛选。
  - 支持订单号搜索定位某一单。
  - 支持订单预览、汇总统计。
  - 支持逐单和批量标记已结算。
  - 支持勾选当前筛选结果中的订单后统一导出。
  - 支持单客户全部订单、全部客户订单、某客户单独一单的导出。
  - 导出标题固定为“前呈似景智链配送中心”。
  - 单客户导出右下角展示客户门店、地址、电话。
  - 表格底部增加合计数量、合计金额和大写总额。
  - 支持生成 Excel 兼容文件和 CSV 文件。

### 验证

- `node --check` 已检查全部 JavaScript 文件。
- 已检查 `app.json`、`project.config.json`、`sitemap.json` JSON 格式。
- 已检查 `app.json` 中声明页面均存在 `.js/.json/.wxml/.wxss` 文件。
- 已确认代码不再引用根目录整屏截图。

### 待补

- 正式 AppID 与云环境 ID。
- 正式图片素材和旧数据。
- 订阅消息模板 ID。
- CSV/Excel 真正解析和文件生成。
- 云数据库安全规则。

## 2026-06-02

### 已完成

- 初始化 Git 仓库并提交当前样机基线快照，提交信息：`chore: snapshot current mini program prototype`。
- 新增 [CLOUD_INTEGRATION_PLAN.md](CLOUD_INTEGRATION_PLAN.md)，明确云环境接入、集合初始化、登录权限、商品首页、客户订单、审核对账的分阶段执行顺序。
- 已确认并记录正式环境信息：
  - `AppID`: `wx3079736104fac8e3`
  - 云开发环境 ID：`a01-d4ggnjhhqfabf9ba2`
- 新增 `utils/config.js`，集中管理小程序名称、`AppID`、云环境 ID、运行模式。
- 新增 `utils/cloud.js`，封装云初始化与统一云函数调用入口，为后续页面逐步切云做准备。
- 更新 `app.js`：
  - 使用正式云环境进行 `wx.cloud.init`
  - 将运行模式、云环境 ID、云初始化状态写入 `globalData`
  - 保留本地 mock 兜底能力
- 更新 `README.md`、`docs/DEVELOPMENT.md`、`docs/DELIVERY_CHECKLIST.md`，同步当前已进入“云环境已就绪、业务分批切云”的阶段。

### 当前阶段

- 已完成：Git 基线、正式环境参数落地、云初始化底座、统一云调用入口
- 下一步：登录/角色/权限真实化

### 阶段 2 补充

- 扩展 `cloudfunctions/bootstrap`，新增：
  - `order_items` 集合初始化
  - demo 种子数据能力
  - 空集合判定后写入基础演示数据
- 新增 `cloudfunctions/bootstrap/seed.js`，内置最小可演示的管理员、客户、分类、商品、首页内容、地址、订单、订单商品、审核和操作记录数据。
- 重写 `docs/DATA_MODEL.md`，补齐：
  - `admins`
  - `categories`
  - `addresses`
  - `orders`
  - `order_items`
  - `home_contents`
  - `message_settings`
  - `operation_logs`

### 阶段 3 进展

- 扩展 `cloudfunctions/api`：
  - 新增 `authLoginByPhone`
  - 新增 `authGetCurrentUser`
  - 登录时支持根据 `admins` 自动识别管理员角色
- 重写 `utils/auth.js`：
  - 当前用户缓存从“仅本地 store 查找”升级为“云端优先 + 本地缓存兜底”
  - 登录成功后会同步缓存当前用户 `id`、`phone` 和用户对象
  - 云端失败时，如开启兜底则自动回落到本地 mock 登录
- 更新 `pages/login/login.js` 为异步登录流程
- 更新 `pages/me/me.js`，进入页面时自动刷新当前用户资料
- 更新 `app.js`，小程序启动时自动尝试刷新当前用户缓存

### 阶段 4 进展

- 扩展 `cloudfunctions/api`：
  - 新增 `listCategories`
  - 新增 `listProducts`
  - 新增 `listAdminProducts`
  - 新增 `getProduct`
  - 新增 `getHomeContent`
- 新增 `utils/catalog-service.js`：
  - 统一封装商品与首页内容的 cloud-first 读取
  - 当时保留云失败按配置回退本地 mock，后续已切换为严格云联调
- 新增 `utils/content.js`：
  - 抽离商品 enrich 和首页推荐/新品筛选逻辑
- 切换为 cloud-first 的页面：
  - `pages/index/index.js`
  - `pages/catalog/catalog.js`
  - `pages/product/product.js`
  - `pages/admin/products/products.js`
  - `pages/admin/home-content/home-content.js`

### 阶段 5 进展

- 扩展 `cloudfunctions/api`：
  - 新增 `submitApply`
  - 新增 `saveAddress`
  - 新增 `listAddresses`
  - 新增 `listCustomers`
  - 新增 `reviewCustomer`
  - 新增 `getCustomerDetail`
- 新增 `utils/customer-service.js`：
  - 统一封装客户申请、地址、客户列表、客户详情、客户审核的 cloud-first 访问
  - 当时保留云失败按配置回退本地 mock，后续已切换为严格云联调
- 切换为 cloud-first 的页面：
  - `pages/apply/apply.js`
  - `pages/address/address.js`
  - `pages/admin/customers/customers.js`
  - `pages/admin/customer-detail/customer-detail.js`

### 阶段 6 进展

- 扩展 `cloudfunctions/api`：
  - 新增 `createOrder`
  - 新增 `listUserOrders`
  - 新增 `getOrderDetail`
  - 新增 `confirmReceive`
  - 新增 `listAdminOrders`
  - 新增 `updateOrderStatus`
- 新增 `utils/order-service.js`：
  - 统一封装订单提交、订单查询、后台订单状态变更、库存锁定/释放/扣减的 cloud-first 访问
  - 当时保留云失败按配置回退本地 mock，后续已切换为严格云联调
- 切换为 cloud-first 的页面：
  - `pages/checkout/checkout.js`
  - `pages/orders/orders.js`
  - `pages/order-detail/order-detail.js`
  - `pages/admin/orders/orders.js`

### 阶段 7 进展

- 扩展 `cloudfunctions/api`：
  - 新增 `listAudits`
  - 新增 `reviewAudit`
  - 新增 `updateSettlementStatus`
- 新增 `utils/audit-service.js`：
  - 统一封装审核记录读取、审核通过、审核拒绝的 cloud-first 访问
  - 当时保留云失败按配置回退本地 mock，后续已切换为严格云联调
- 增强 `utils/order-service.js`：
  - 增加结算状态批量更新能力
- 切换为 cloud-first 的页面：
  - `pages/admin/audits/audits.js`
  - `pages/admin/product-edit/product-edit.js`
  - `pages/admin/products/products.js`
  - `pages/admin/home-content/home-content.js`
  - `pages/admin/reconcile/reconcile.js`

### 购物车链路补充

- 扩展 `cloudfunctions/api`：
  - 新增 `listCartItems`
  - 新增 `addToCart`
  - 新增 `updateCartQuantity`
- 扩展 `cloudfunctions/bootstrap` 与 `seed.js`：
  - 新增 `carts` 集合与演示种子数据
- 新增 `utils/cart-service.js`：
  - 统一封装加购、查看选购、数量修改的 cloud-first 访问
  - 当时保留云失败按配置回退本地 mock，后续已切换为严格云联调
- 切换为 cloud-first 的页面：
  - `pages/catalog/catalog.js`
  - `pages/product/product.js`
  - `pages/cart/cart.js`
  - `pages/checkout/checkout.js`
- 修正 `utils/order-service.js`：
  - 提交订单时从云购物车读取当前勾选项
  - 提交成功后同步清理云购物车和本地兜底购物车

### 收口文档补充

- 新增 [CLOUD_SETUP_GUIDE.md](D:/codex/中货通小程序需求/docs/CLOUD_SETUP_GUIDE.md)
  - 说明云函数上传
  - 说明 `bootstrap` 初始化集合与 demo 数据
  - 说明建议联调顺序
- 新增 [BLOCKERS_AND_NEXT_STEPS.md](D:/codex/中货通小程序需求/docs/BLOCKERS_AND_NEXT_STEPS.md)
  - 汇总当前阻塞项
  - 给出下一步推进建议
- 新增 [CLOUD_SECURITY_RULES.md](D:/codex/中货通小程序需求/docs/CLOUD_SECURITY_RULES.md)
  - 明确推荐的数据库“默认全拒绝直连”策略
  - 明确云函数角色与归属校验边界
- 更新 `README.md` 与 `DELIVERY_CHECKLIST.md`
  - 将项目阶段从“接云中”推进到“已可联调，进入收口阶段”

### 云函数权限收口

- 收紧 `cloudfunctions/api/index.js` 的敏感接口权限：
  - 新增基于 `openid` 的当前用户识别助手
  - 新增管理员 / 超级管理员权限助手
  - 新增统一权限错误映射
- 已在云函数内补上角色校验的接口：
  - `listAdminProducts`
  - `listCustomers`
  - `reviewCustomer`
  - `getCustomerDetail`
  - `listAdminOrders`
  - `updateOrderStatus`
  - `createAudit`
  - `listAudits`
  - `updateSettlementStatus`
- 已在云函数内补上归属校验的接口：
  - `listCartItems`
  - `addToCart`
  - `updateCartQuantity`
  - `submitApply`
  - `saveAddress`
  - `listAddresses`
  - `createOrder`
  - `listUserOrders`
  - `getOrderDetail`
  - `confirmReceive`
- `reviewAudit` 统一改为超级管理员助手校验。
- 后台改订单状态时，操作记录现在会写入真实操作者 ID 和昵称，而不是固定“后台”。
- 在 [CLOUD_SETUP_GUIDE.md](D:/codex/中货通小程序需求/docs/CLOUD_SETUP_GUIDE.md) 中新增 `seedDemo` 后联调打钩清单，便于初始化完成后逐页验收首页、选购、订单、后台和权限链路。
- 在 [DELIVERY_CHECKLIST.md](D:/codex/中货通小程序需求/docs/DELIVERY_CHECKLIST.md) 中补充“第五阶段联调打钩项”，把部署云函数、执行 `seedDemo` 和关键页面验收入口纳入总清单。

### 严格云联调模式

- 关闭 `utils/config.js` 中的本地 mock 兜底开关：
  - `fallbackToMock: false`
  - `localMockEnabled: false`
- 调整 `utils/store.js`：
  - 联调时不再把 `data/mock.js` 灌入本地 Storage
  - 已有本地演示数据会被重置为空 store，避免干扰云端判断
- 调整 `utils/auth.js`：
  - 严格云联调模式下不再把云端登录用户同步回本地 mock store
- 修正之前仍直读本地 `store` 的关键页面：
  - `pages/cart/cart.js`
  - `pages/admin/dashboard/dashboard.js`
  - `pages/admin/stats/stats.js`
  - `pages/admin/import-export/import-export.js`
- 修正管理页中仍引用本地商品/首页内容快照的逻辑：
  - `pages/admin/home-content/home-content.js`
  - `pages/admin/product-edit/product-edit.js`
  - `pages/admin/products/products.js`

### 云存储图片规范

- 新增 [CLOUD_STORAGE_GUIDE.md](D:/codex/中货通小程序需求/docs/CLOUD_STORAGE_GUIDE.md)
  - 说明 `seedDemo` 只初始化数据库，不上传图片到云存储
  - 约束品牌图、首页图、分类图标、商品主图、详情图的推荐目录结构
  - 补充 `products`、`home_contents`、`categories` 的图片字段口径建议
- 更新 `README.md`、`BLOCKERS_AND_NEXT_STEPS.md`、`DATA_MODEL.md`
  - 同步说明图片需要独立上传到云存储
  - 同步收口数据模型中的图片字段建议

### 图片上传执行方案与脚本骨架

- 新增 [CLOUD_IMAGE_UPLOAD_PLAN.md](D:/codex/中货通小程序需求/docs/CLOUD_IMAGE_UPLOAD_PLAN.md)
  - 明确当前临时图片的推荐云路径
  - 明确首页图、商品主图、详情图、分类图标的上传顺序
  - 明确上传后需要回写的数据库字段
- 新增 `scripts/upload-cloud-images.js`
  - 扫描 `assets/temp/`
  - 生成本地图片到推荐云路径的 manifest
  - 默认输出到 `docs/cloud-image-manifest.json`
- 后台接入按入口上传到对应云存储目录的能力：
  - `pages/admin/home-content` 支持上传 Logo、首页主图、专题横幅
  - `pages/admin/product-edit` 支持上传商品主图、商品详情图
  - 上传后会将 `fileID` 回写到表单字段，再继续走审核提交流程

### 2026-06-05 补充

- 完成 [WECHAT_PHONE_AUTH_DESIGN.md](D:/codex/中货通小程序需求/docs/WECHAT_PHONE_AUTH_DESIGN.md) 正式设计文档：
  - 明确当前“手填手机号登录”的安全风险
  - 明确“微信手机号授权登录 + OPENID 绑定 + 管理员手机号映射”的目标方案
  - 明确前端、云函数、数据模型、迁移策略、测试方案和上线收口要求
- 开始落地微信手机号授权登录第一批改造：
  - `utils/config.js` 增加 `wechatPhoneAuthEnabled` 与 `devPhoneLoginEnabled`
  - `pages/login` 切为“微信手机号一键登录”为主路径，手填手机号入口仅开发开关可见
  - `utils/auth.js` 新增 `loginByWxPhoneCode`
  - `cloudfunctions/api/index.js` 新增 `authLoginByWxPhone`
  - `authLoginByPhone` 收口为开发联调用途，并记录 `phoneAuthSource`
- 更新 [WECHAT_REVIEW_CHECKLIST.md](D:/codex/中货通小程序需求/docs/WECHAT_REVIEW_CHECKLIST.md)：
  - 将登录改造从阻塞项推进为进行中
  - 明确提审前需关闭手填手机号入口并完成真机回归
- 更新 [BLOCKERS_AND_NEXT_STEPS.md](D:/codex/中货通小程序需求/docs/BLOCKERS_AND_NEXT_STEPS.md)：
  - 将登录安全改造文档纳入正式阻塞项口径

### 2026-06-09 补充

- 扩展后台账号与分类管理：
  - 管理员和超级管理员默认可查看价格，不需要客户看价申请。
  - 后台账号管理拆为“管理员管理”和“超级管理员管理”两个入口。
  - 只有 `admins.protected === true` 的特殊超级管理员可进入账号管理。
  - 账号支持新增、编辑手机号/姓名/备注、软删除；删除后同步 `users.role = customer`。
  - 特殊超级管理员不能删除，当前登录账号不能删除自己。
  - 新增“分类管理”后台入口，普通管理员和超级管理员均可提交分类新增/编辑/删除审核。
  - 分类只维护名称和排序；删除为软删除，且分类下有商品时禁止删除。
  - 商品编辑页分类字段改为弹框选择分类名称，支持搜索，并在本机记忆上次选择分类。
- 全项目排查早期本地逻辑残留：
  - 新增统一 `utils/cloud.js` 的 `cloudFirst()` 严格云端调用助手。
  - 商品、购物车、订单、客户、审核服务层统一改用该助手。
  - 修正旧 `cloudFirst()` 在云不可用时即使关闭 `fallbackToMock` 仍会执行本地 fallback 的问题。
  - 申请页“保存默认地址”从本地 `updateStore` 改为云端 `saveAddress`。
  - 登录缓存读取在严格云模式下不再从本地 mock store 找用户。
  - `utils/business.js` 不再被当前页面/服务层依赖，避免误接早期本地购物车/审核逻辑。
- 修正管理员手机号设置不生效的问题：
  - 后台管理员页面从本地 mock 写入改为云端 `admins` 集合写入
  - 新增 `utils/admin-service.js`
  - 云函数新增 `listAdmins` 与 `addAdmin`
  - 添加管理员时，如果目标手机号已存在于 `users`，会同步更新 `users.role`
  - 未登录过的目标手机号会在后续手机号授权登录时按 `admins` 自动同步角色

