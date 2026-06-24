# 云存储图片规范

这份文档用于约束当前项目在**微信云存储**中的图片目录、数据库字段口径，以及 `seedDemo` 与图片上传的边界。

## 先说结论

### 1. `seedDemo` 默认不会上传任何图片到云存储，也不会把本地图片路径写进数据库

执行：

```json
{
  "seedDemo": true
}
```

只会做两件事：

- 初始化云数据库集合
- 向数据库写入演示数据

它**不会**：

- 把 `assets/temp/` 里的图片上传到云存储
- 自动创建云存储目录
- 自动替换数据库里的图片路径为 `fileID`
- 默认不会把 `/assets/temp/...` 这类项目内图片路径写入数据库

所以图片要单独处理。

如果确实要生成“带项目临时图路径”的演示数据，需要显式传入：

```json
{
  "seedDemo": true,
  "seedDemoWithBundledImages": true
}
```

### 2. 当前项目中的本地图片只是临时预览素材

当前本地临时素材位于：

- `assets/temp/`

这些素材用于：

- 开发阶段预览
- 页面结构和尺寸验证

不建议作为正式上线图片来源长期保留。

## 推荐的云存储目录结构

建议按业务模块分目录，不要所有图片都堆在根目录。

### 品牌与首页

- `branding/logo/`
- `home/hero/`
- `home/topic/`
- `home/banner/`

用途：

- logo
- 首页主横幅
- 专题横幅
- 轮播图

### 分类图标

- `categories/icons/`

用途：

- 一级分类图标

### 商品图片

建议分主图和详情图：

- `products/main/`
- `products/detail/`

如果后面商品图多，建议进一步按商品 ID 分层：

- `products/p_001/main/`
- `products/p_001/detail/`

这样后续替换图片、排查问题都更容易。

### 协议与其他静态资源

- `agreements/`
- `misc/`

### 临时测试图

- `temp/`

说明：

- 只用于临时验证
- 不建议长期和正式素材混放

## 数据库字段口径建议

当前数据库里很多图片字段还是本地路径字段，例如：

- `mainImage`
- `detailImages`
- `heroImage`
- `topicImage`
- `logoImage`

正式上云后，建议逐步调整为 **fileID 优先**。

## 商品表 `products`

建议保留或演进为：

- `mainImageFileId`
- `mainImage`
- `detailImageFileIds`
- `detailImages`

建议口径：

- `mainImageFileId`：正式云存储 `fileID`
- `mainImage`：可作为兼容字段，允许存本地路径或云地址
- `detailImageFileIds`：详情图 `fileID` 数组
- `detailImages`：兼容字段，允许存本地路径或云地址数组

### 推荐策略

第一阶段：

- 先保持前端还能读 `mainImage` / `detailImages`
- 同时开始补 `mainImageFileId` / `detailImageFileIds`

第二阶段：

- 前端统一优先读 `fileID`
- 再逐步去掉对本地路径的依赖

## 首页内容表 `home_contents`

建议增加或演进为：

- `logoImageFileId`
- `heroImageFileId`
- `topicImageFileId`
- `logoImage`
- `heroImage`
- `topicImage`

说明：

- `fileID` 作为正式云存储字段
- 原字段保留一段过渡期，便于兼容本地素材

## 分类表 `categories`

建议增加：

- `iconFileId`
- `icon`

## 为什么建议 `fileID` 优先

因为在微信云开发里，`fileID` 是最稳定的资源标识。

好处：

- 不用自己拼 URL
- 权限和环境更统一
- 迁移环境时更容易管理

## 推荐的图片接入顺序

不要一口气全传，建议按影响面逐步替换：

### 第一批

- logo
- 首页主横幅
- 专题横幅

### 第二批

- 商品主图

### 第三批

- 商品详情图

### 第四批

- 分类图标

## 当前最推荐的实施方式

### 方案 A：先手工上传少量正式素材

适合：

- 先把首页跑顺
- 正式商品图还没齐

先上传：

- logo
- 首页主图
- 专题图

### 方案 B：写批量上传脚本

适合：

- 已经有成批商品图
- 想把 `assets/temp/` 或正式素材批量传到云存储

脚本职责通常包括：

- 遍历本地目录
- 按目录规则上传到云存储
- 返回 `fileID`
- 回写数据库或导出映射表

## 当前阶段建议

当前最建议先做：

1. 明确目录规范
2. 明确数据库字段口径
3. 先上传首页和品牌图片
4. 再决定是否写商品图批量上传脚本

## 当前后台已支持的上传入口

为了避免每次都去云控制台手工上传，当前后台已经接入了“不同入口上传到不同云目录”的能力。

### 首页内容页

页面：

- `pages/admin/home-content`

当前支持上传：

- Logo -> `branding/logo/`
- 首页主图 -> `home/hero/`
- 专题横幅 -> `home/topic/`

上传成功后，会把对应 `fileID` 写回表单字段：

- `logoImage`
- `heroImage`
- `topicImage`

并同步补充：

- `logoImageFileId`
- `heroImageFileId`
- `topicImageFileId`

### 商品编辑页

页面：

- `pages/admin/product-edit`

当前支持上传：

- 商品主图 -> `products/main/`
- 商品详情图 -> `products/detail/`

上传成功后，会把对应 `fileID` 写回：

- `mainImage`
- `mainImageFileId`
- `detailImages`
- `detailImageFileIds`

### 说明

当前是“上传到云存储 + 将 fileID 写入表单”，真正写进数据库仍然走原有审核流程：

- 首页内容修改 -> 提交审核
- 商品新增/修改 -> 提交审核

## 与当前联调的关系

当前项目已经切到**严格云联调模式**，所以：

- 没执行 `seedDemo` 时，页面不应再靠本地 mock 假装有云数据
- 就算执行了 `seedDemo`，图片也不会自动进云存储

这意味着：

- 数据表可以先跑起来
- 图片仍需要单独上传和替换

这是正常现象。
