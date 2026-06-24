# 云数据库安全规则说明

这份文档用于指导当前项目在微信云开发中配置**数据库访问权限**与**云函数职责边界**。

## 核心原则

当前项目已经把主要业务链都收敛到了云函数：

- 登录与角色识别
- 商品与首页读取
- 客户申请与地址
- 购物车
- 订单与库存
- 审核中心
- 对账中心

因此，**推荐策略非常明确**：

> **前端不直接访问云数据库集合，所有集合默认禁止客户端读写；所有业务访问统一走云函数。**

这样做的好处是：

1. 权限边界清晰
2. 不容易被前端绕过
3. 审核、库存、结算这类敏感逻辑不会暴露在客户端

## 推荐的数据库权限策略

对于以下集合，建议统一配置为：

- 仅云函数可读写
- 客户端不可直接读
- 客户端不可直接写

集合列表：

- `users`
- `admins`
- `products`
- `categories`
- `orders`
- `order_items`
- `carts`
- `addresses`
- `audit_logs`
- `home_contents`
- `message_settings`
- `operation_logs`

## 建议的第一版规则口径

如果你在微信云开发控制台中配置数据库权限，建议采用**全拒绝直连**思路。

可执行口径：

- 所有集合：`read = false`
- 所有集合：`write = false`

前提：

- 所有业务操作都通过 `cloudfunctions/api`
- 初始化通过 `cloudfunctions/bootstrap`

## 为什么不建议前端直连

### 1. `products`

表面上商品是公开浏览数据，但当前商品是否可展示、价格是否可见、库存是否可下单，都已经跟业务状态相关。

如果前端直连：

- 容易绕过价格展示逻辑
- 容易读到本不该开放的字段

### 2. `orders` / `order_items`

这是最不能放开的部分。

如果前端可直连：

- 用户可能读到别人的订单
- 用户可能伪造状态变更
- 对账和结算会失真

### 3. `audit_logs`

审核日志里包含：

- 修改前数据
- 修改后数据
- 审核状态
- 拒绝原因

这类数据必须完全走后台云函数权限判断。

### 4. `carts`

购物车虽然敏感度低于订单，但如果直连：

- 可以伪造别人的购物车内容
- 可以绕过库存校验

当前也建议统一走云函数。

## 云函数里的权限职责

因为数据库权限建议默认收死，所以云函数要承担权限判断。

## 当前应由云函数负责校验的关键权限

### 登录与身份

- 根据 `openid` 找当前用户
- 根据手机号匹配 `admins`
- 同步 `users.role`

### 客户权限

- 只能提交自己的看价申请
- 只能读取自己的地址
- 只能读取自己的订单
- 只能操作自己的购物车

### 管理后台

- 后台客户审核需要管理员/超级管理员身份
- 审核通过/拒绝需要超级管理员身份
- 商品和首页内容审核写入需要管理员身份
- 对账中心和订单后台操作需要管理员身份

### 库存与订单

- 创建订单时校验库存
- 后台确认订单时扣减库存
- 后台取消订单时释放锁定库存
- 对账中心更新结算状态时需要管理员权限

## 当前代码里已补上的关键权限点

当前代码已经在云函数中补上了第一批最敏感的权限校验：

- 管理端接口角色校验：
  - `listAdminProducts`
  - `listAdmins`
  - `addAdmin`
  - `listCustomers`
  - `reviewCustomer`
  - `getCustomerDetail`
  - `listAdminOrders`
  - `updateOrderStatus`
  - `createAudit`
  - `listAudits`
  - `updateSettlementStatus`

### 管理员手机号规则

- 管理员手机号必须写入云端 `admins` 集合，不能只写本地缓存。
- 添加管理员后，如果该手机号已存在于 `users` 集合，会同步更新 `users.role`。
- 如果该手机号用户尚未登录，后续首次手机号授权登录时会根据 `admins` 自动同步角色。
- 超级管理员专属审核：
  - `reviewAudit`
- 用户数据归属校验：
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

这些接口现在不再只依赖前端入口控制，而是会在云函数内根据 `openid`、`role` 和数据归属做判断。

## 当前代码里还建议继续补的权限点

虽然现在第一批敏感逻辑已经搬到云函数并加了校验，但从“上线安全”角度看，仍建议继续补这些点：

### 1. 管理端接口角色校验加强

建议在以下云函数动作中，显式校验调用人是否为管理员：

- `listCustomers`
- `reviewCustomer`
- `getCustomerDetail`
- `listAdminProducts`
- `listAdminOrders`
- `updateOrderStatus`
- `listAudits`
- `reviewAudit`
- `updateSettlementStatus`

当前有些页面通过前端入口做了控制，但**最终应该以云函数内校验为准**。

### 2. 订单读取范围校验

建议在以下接口里补充“只能看自己的订单”校验：

- `listUserOrders`
- `getOrderDetail`
- `confirmReceive`

不要只相信前端传来的 `userId` 或 `orderId`。

正确做法：

- 取当前 `openid`
- 找到当前用户
- 再确认该订单 `userId` 是否属于当前用户

### 3. 地址读取与修改范围校验

建议在以下接口里补强：

- `listAddresses`
- 后续地址编辑 / 删除 / 默认地址切换接口

规则：

- 只允许访问当前用户自己的地址

### 4. 对账中心后台身份校验

建议对这些接口加管理员身份判断：

- `listAdminOrders`
- `updateSettlementStatus`

否则理论上普通用户如果能绕过前端，也可能调用到这些能力。

## 推荐的上线前安全收口顺序

### 第一层：先把数据库规则收死

目标：

- 所有集合客户端不可直接读写

### 第二层：补云函数角色校验

目标：

- 客户只能操作自己的数据
- 管理员才能进后台能力
- 超级管理员才能审核通过/拒绝

### 第三层：补操作审计

目标：

- 关键后台动作都有记录
- 状态变更可追溯

## 当前最建议马上补的接口校验

如果只看第一批最值得补的四项，当前已经优先完成了：

1. `listAdminOrders`
2. `updateOrderStatus`
3. `listAudits`
4. `updateSettlementStatus`

因为这四项最接近后台敏感操作。

## 最终建议

当前项目不建议走“前端直接访问数据库 + 数据库规则做复杂条件判断”的路。

更稳的做法就是：

1. **数据库规则默认收紧**
2. **所有业务统一走云函数**
3. **所有敏感权限在云函数中做角色和归属校验**

这也是现在这套代码结构最匹配、最不容易出错的方案。
