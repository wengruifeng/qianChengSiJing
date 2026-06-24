# 云存储图片上传执行方案

这份文档是给当前项目做图片上云时直接照着走的，不讲抽象原则，讲落地顺序。

## 目标

当前项目已经进入严格云联调模式，数据库和页面可以先跑起来，但图片仍然主要来自：

- `assets/temp/`

所以这一步的目标是：

1. 明确图片上传顺序
2. 明确每类图片上传到云存储的目录
3. 明确上传完成后要回写哪些数据库字段
4. 提供一个本地脚本骨架，先生成上传清单，再决定是否执行上传

## 第一批最值得先上传的图片

优先级建议如下。

### 第一批：品牌和首页

先上传这 3 类：

- `logo.jpg`
- `home-hero.jpg`
- `topic-new.jpg`

建议云存储目录：

- `branding/logo/logo.jpg`
- `home/hero/home-hero.jpg`
- `home/topic/topic-new.jpg`

上传后主要回写：

- `home_contents.logoImageFileId`
- `home_contents.heroImageFileId`
- `home_contents.topicImageFileId`

### 第二批：商品主图

当前临时图：

- `product-luchang.jpg`
- `product-squid.jpg`
- `product-gongcai.jpg`
- `product-egg.jpg`
- `product-fishbag.jpg`
- `product-dougan.jpg`

建议先统一上传到：

- `products/main/product-luchang.jpg`
- `products/main/product-squid.jpg`
- `products/main/product-gongcai.jpg`
- `products/main/product-egg.jpg`
- `products/main/product-fishbag.jpg`
- `products/main/product-dougan.jpg`

等正式商品图到位后，再改成按商品 ID 分目录：

- `products/p_001/main/xxx.jpg`
- `products/p_001/detail/xxx.jpg`

### 第三批：商品详情图

如果后面有正式详情图，再单独上传到：

- `products/detail/`

或按商品维度：

- `products/p_001/detail/`

### 第四批：分类图标

如果后续客户给了分类图标，再上传到：

- `categories/icons/`

## 当前本地临时图片与推荐云路径

| 本地文件 | 推荐云路径 |
| --- | --- |
| `assets/temp/logo.jpg` | `branding/logo/logo.jpg` |
| `assets/temp/home-hero.jpg` | `home/hero/home-hero.jpg` |
| `assets/temp/topic-new.jpg` | `home/topic/topic-new.jpg` |
| `assets/temp/product-luchang.jpg` | `products/main/product-luchang.jpg` |
| `assets/temp/product-squid.jpg` | `products/main/product-squid.jpg` |
| `assets/temp/product-gongcai.jpg` | `products/main/product-gongcai.jpg` |
| `assets/temp/product-egg.jpg` | `products/main/product-egg.jpg` |
| `assets/temp/product-fishbag.jpg` | `products/main/product-fishbag.jpg` |
| `assets/temp/product-dougan.jpg` | `products/main/product-dougan.jpg` |

## 上传后数据库怎么回写

### 首页内容 `home_contents`

建议逐步补这些字段：

- `logoImageFileId`
- `heroImageFileId`
- `topicImageFileId`

原有字段先保留兼容：

- `logoImage`
- `heroImage`
- `topicImage`

### 商品表 `products`

建议逐步补这些字段：

- `mainImageFileId`
- `detailImageFileIds`

原有字段先保留兼容：

- `mainImage`
- `detailImages`

## 当前推荐操作顺序

### 方案 A：先生成上传清单

先跑脚本生成 manifest，确认路径没问题：

```powershell
node .\scripts\upload-cloud-images.js --manifest .\docs\cloud-image-manifest.json
```

执行后会得到：

- 一份图片清单
- 每张图推荐上传到哪个云路径

### 方案 B：人工上传第一批图片

先在微信开发者工具或云开发控制台里，手工上传：

- logo
- 首页主图
- 专题图

这是最快看效果的方式。

### 方案 C：后续再接自动上传

等你决定好上传方式和云存储权限后，再在脚本里接实际上传。

## 为什么现在脚本先做 manifest

因为现在最容易出问题的不是“不会上传”，而是：

- 上传路径先乱了
- 同一张图后面换位置
- 数据库字段口径先不统一

所以先把 manifest 和目录规范定下来，后面真上传时会稳很多。

## 当前脚本能力边界

项目里会新增：

- `scripts/upload-cloud-images.js`

当前定位是：

- 扫描本地图片
- 生成推荐云路径
- 输出 manifest

它是批量上传脚本的骨架，不等于已经把所有真实上传逻辑接完。

## 什么时候开始做“真上传”

建议满足下面任一条件后开始：

1. 先把首页图片上传上去，看前端是否能正确展示
2. 客户给了正式商品图片后，再批量处理商品图
3. 需要把本地 `assets/temp/` 完全替换出项目时，再补自动回写数据库

## 当前建议

如果你现在马上要继续推进，最推荐顺序是：

1. 先生成 manifest
2. 先上传 logo / 首页主图 / 专题图
3. 再决定是否批量上传商品图
4. 上传完成后再回写 `home_contents` 和 `products`
