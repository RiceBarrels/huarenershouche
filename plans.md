# Plans & Ideas

## 已完成：cars.com 功能对齐（2026-07-08）

- **量化价格评级** — `lib/price-insight.ts` 重写：同品牌同车型（±2年）对比、里程修正（封顶±25%）、返回 great/good/fair/high 四级 + "低于市场价 $X" 量化差额。卡片、browse 筛选、详情页共用。
- **市场价位条** — `components/market-position.tsx`，详情页 cars.com 式 低-均-高 价位条 + 当前车价 marker。
- **车身类型** — `lib/body-style.ts` 车型名分类器（DbCar 无 body_style 列，客户端推断）；browse 筛选 + 首页"按车身类型找车"板块。
- **月供购车** — `lib/format.ts` 统一口径（0 首付/6.5% APR/60 期）；browse 月供预算筛选 + 首页月供板块 + 卡片月供估算。
- **保存搜索 + 新车提醒** — `lib/saved-searches.ts`；browse 保存按钮、收藏页"保存的搜索"tab、打开 app 时检查新上架并通知。
- **上架天数/热门角标** — 卡片"今日新上/新上架/热门"badge + "X天前上架"。
- **第二批筛选** — 车型（make→model 级联带数量）、变速箱、车辆配置标签（AND）、无事故/一手车主/有Carfax/带视频/排除电议、只看好价、只看降价、上架时间;首页 hero 加价格区间 select。
- **车主口碑** — `components/model-reviews.tsx`,详情页聚合社区同车型 review 帖。
- **相似车升级** — 同车型 → 同品牌按价差 → 价格区间三级策略。
- **对比页可分享** — ?ids= URL 持久化。
- **顺手修的 bug** — 发帖视频没写库、drivetrain 没写库、新消息订阅用了不存在的 receiver_id 列、降价快照被静默消费、价格降价板块 filter-after-limit、账号页下拉刷新失效/登录闪烁、贷款计算器默认 APR 15%→7.9%。

## 短期 (1-2 weeks)

### 1. 智能推荐 Feed ✅
首页不再只是最新车源，根据用户浏览历史、收藏偏好、预算区间做个性化推荐排序。数据都在 localStorage 里已经有了（recently-viewed, favorites, search-history），直接用来做 client-side 的权重排序。

- `lib/recommendations.ts` — 推荐引擎（偏好提取 + 评分 + 排序）
- 首页新增"为你推荐"板块（有浏览历史时展示）

### 2. Push 通知系统 ✅
- 降价提醒（price-watch 已有基础，缺推送通道）
- 新消息通知
- 收藏车辆状态变更（已售、下架）
- Web Notifications API + Supabase Realtime

- `lib/notifications.ts` — 通知发送工具
- `lib/use-realtime-notifications.ts` — 实时消息监听
- `components/notification-settings.tsx` — 通知偏好设置面板
- `components/realtime-notifications.tsx` — 全局通知初始化组件
- 集成到 settings 页面和 root layout

### 3. 卖家数据面板 ✅
给卖家一个简单的 dashboard：浏览量趋势、收藏数、询盘转化率。数据已有（increment_views RPC），加个按天聚合就行。

- `app/(backnav)/account/dashboard/page.tsx` — 数据面板页面
- 总览卡片（浏览/收藏/询盘/在售）+ 转化漏斗 + 逐车数据
- 账号页新增入口

### 4. 图片优化 & 视频支持 ✅
- 发帖支持短视频（≤30秒，≤50MB）
- 图片自动压缩 + WebP 转换（>200KB 自动压缩）
- 拖拽上传支持视频文件

- `lib/image-compress.ts` — 客户端图片压缩 + 视频验证
- post 页面已集成压缩和视频上传

## 中期 (1-2 months)

### 4.5 Public API + 车行自动上传(idea 阶段,2026-09-02)
开发者 API key(所有用户可开读写;个人档每天限新传 10 台、更改 30 次,已认证车行不限档)+ 库存写接口(`PUT /api/v1/inventory/{external_id}` 幂等 upsert),复用 sync 引擎的翻译/图片转存/AI 审核链;P1 加 DMS feed 拉取模式给没开发能力的车行。完整设计见 `docs/public-api-v0.md`。

### 5. AI 一键生成车辆描述
卖家上传照片 + 填基本信息后，AI 自动生成中英双语描述。降低发帖门槛，提高listing质量。可以用 Claude API 实现。

### 6. 类似「懂车帝」的估价报告
输入车型年份里程，输出市场价位分析：同城同款价格区间、折旧曲线、保值率排名。数据来源可以从平台内历史成交 + 外部数据对比。

### 7. 验车服务预约
对接当地华人验车技师网络。买家看中车后一键预约 PPI（Pre-Purchase Inspection），平台抽佣。需要：技师入驻系统、时间槽管理、订单流程。

### 8. 微信生态打通
- 微信小程序版本（或 H5 分享页）
- 分享到朋友圈自动生成海报卡片
- 微信登录（除了现有 Supabase Auth）
- QR share 已有基础，扩展为小程序码

### 9. 担保交易 / Escrow
平台托管模式：买家付款到平台 → 验车通过 → 放款给卖家。解决华人社区信任问题。可以先用 Stripe Connect 做 MVP。

## 长期 (3-6 months)

### 10. 拍卖模式
低价起拍、限时竞价。适合车商清库存和特殊车型。需要实时出价（Supabase Realtime 已可支持）、保证金系统、自动延时。

### 11. 多城市 & 跨境
- 城市站点（温哥华、多伦多、洛杉矶、纽约等华人聚集城市）
- 跨境购车信息（加拿大/美国互相买车的流程、关税计算器）
- 每个城市独立的社区和车源

### 12. 车商 SaaS 工具
- 批量上传管理
- CRM（客户跟进、自动回复）
- 数据分析（哪个渠道来的询盘多）
- 月费模式变现

### 13. 保险 & 贷款聚合
- 对接多家华人保险经纪
- 贷款预审批（loan-calculator 已有，下一步是真实对接）
- 用户填一次信息，多家报价比较

### 14. 社区内容 UGC 增长
- 「提车作业」— 买家分享购车经历
- 用车攻略积分系统
- 每月最佳帖子奖励
- 华人车友会活动日历

### 15. Native App 上架
Capacitor 已集成，打包上架 App Store / Google Play。需要：
- 生物识别登录
- 离线缓存收藏列表
- 相机直接拍照发帖
- 深度链接（从分享链接直接跳 app）
