# Public API + 车行自动上传 — 初代设计(v0 idea)

> 状态:2026-09-02 已实现 P0 + P1 的 batch / reconcile / images / 用量页(代码在 `lib/api/*`、`app/api/v1/*`、`app/[locale]/(backnav)/developers/*`,SQL 在 `supabase/api-keys.sql` 需手动执行)。未做:Feed 拉取模式、admin 全站用量、沙盒 key、webhooks。OpenAPI 源是 `lib/api/openapi.ts`(经 `/api/v1/openapi.json` 输出),没有单独的 yaml 文件。下文保留原设计。
>
> 2026-10 内容多语言 v2(`supabase/i18n-v2.sql` + `lib/i18n-pipeline`):`description` 任一语言原样存为原文(`description_original`),审核与翻译由 i18n 管线完成;`description_lang` 弃用(接受但忽略);详情新增 `description_original` / `description_lang` / `description_translated` / `features_original`;`updated_since` 与 `updated_at` 改用内容时钟;新增 409 `listing_blocked`。见 §4.1、§4.3。

## 1. 为什么做

- 现在车行车源进站只有两条路:手动在 app 发帖,或我们写爬虫适配器抓它官网(`lib/sources/*`)。爬虫每接一家要写一个 adapter,模板站一改版就断。
- 中大型车行大多有 DMS(DealerCenter / DealerSync / Frazer / vAuto 等),能导出库存 feed 或有开发能力。给他们一个官方接口,库存就能自动同步,并且"官方账号"发布,而不是系统账号转载。
- 顺带开放只读 API:社区工具、微信小程序、第三方比价站、AI agent 可以拉我们的车源,增加分发面。

**非目标(v0 不做):** 开放写社区帖子/评论、开放私信、第三方 OAuth 代用户操作、付费计量。

## 2. 角色与权限

| 角色 | 谁 | 能拿什么 key |
|---|---|---|
| 个人 | 任何登录用户(`account_type = 'private'`,或 dealer 但门店未认证) | 只读 + 写库存 key,但有**个人配额**:每天最多新上传 10 台、更改 30 次 |
| 车行 | `account_type = 'dealer'` 且名下有一个 `verification_status = 'verified'` 的 `dealer_stores` | 只读 + 写库存 key,车行配额(每天 ≤ 2000 次写,在售 ≤ 500 辆) |
| 管理员 | `role = 'admin'` | 可查看/吊销任何人的 key、看全站用量 |

规则:

- key 归属 **profile**(不是门店)。通过 key 写入的车,`seller_id` = key owner,与手动发帖同一身份,前台展示完全一致。
- 一个 profile 最多 5 个 key。`write:*` scope 人人可勾,区别只在配额档位:门店认证通过 → 车行档;认证被撤销 → 自动回落到个人档(key 不需要重建)。
- 配额按 **owner(profile)** 计,不按 key:一个人开 5 个 key 也是共享同一份每日配额。
- 个人档定义:「上传」= 新建一条 car(insert,首次 PUT 某个 external_id 或 batch 里的新条目);「更改」= 对已有 car 的 PUT / DELETE / images 上传 / reconcile 触发的每条下架。同一次 PUT 只计一种。
- 未来若一个车行有多家门店,listing 里传 `store_id` 选门店,不传则用第一家已认证门店。

## 3. API Key 设计

```
clc_live_9Xk2...(共 40 字符随机)        正式
clc_test_...                             沙盒(P2,写入 status='pending' 不上前台)
```

- 明文只在创建时展示一次;库里存 `sha256(key)` + 前 12 位 `prefix` 用于列表展示与快速定位。
- 鉴权:`Authorization: Bearer clc_live_...`。与现有 `/api/sync` 的 bearer 解析方式一致。
- Scopes(text[]):`read:cars`、`read:dealers`、`write:inventory`、`write:images`。
- 可选 IP allowlist(cidr[]),可选过期时间。
- 每个 key 记录 `last_used_at`、`request_count`,用于门户里的用量展示和清理僵尸 key。

### 3.1 表结构(草案,`supabase/api-keys.sql`)

```sql
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,                       -- 用户起的备注名,如 "DealerCenter 同步"
  prefix text not null,                     -- 'clc_live_9Xk2' 展示用
  key_hash text not null unique,            -- sha256
  scopes text[] not null default '{read:cars,read:dealers}',
  ip_allowlist cidr[],
  rate_limit_per_min int not null default 60,
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  request_count bigint not null default 0,
  created_at timestamptz not null default now()
);
-- RLS:owner 可读自己的(不含 key_hash)、可 insert/update(name/revoked_at);admin 全部。
-- 校验走 service role,前端永远拿不到 key_hash。

-- 请求日志:按天聚合即可,不存每条(Vercel 日志已有明细)。
create table public.api_usage_daily (
  api_key_id uuid references public.api_keys(id) on delete cascade,
  day date not null,
  requests int not null default 0,
  errors int not null default 0,
  inserts int not null default 0,          -- 新建车辆数(个人档 10/天 依据)
  updates int not null default 0,          -- 更改次数(个人档 30/天 依据)
  primary key (api_key_id, day)
);
-- 配额判定按 owner 汇总:sum(inserts)/sum(updates) where api_key_id in (owner 的 key) and day = today。
-- 写路径用一条 upsert 原子累加并在 CHECK 前先读,超限返回 quota_exceeded,不写库。
```

### 3.2 cars 表增量

```sql
-- 车行自己的库存编号(stock #),同一卖家内唯一,upsert 依据
alter table public.cars add column if not exists external_id text;
alter table public.cars add column if not exists api_key_id uuid references public.api_keys(id);
create unique index if not exists cars_seller_external_uniq
  on public.cars (seller_id, external_id) where external_id is not null;
```

与现有 `source_id / source_listing_id`(爬虫转载)并列,不复用:转载是系统账号 + 可被认领,API 上传是车行本人账号。前台"系统检索"标识只看 `source_id`,API 上传的车不显示该标识。

## 4. 端点(全部挂 `/api/v1/*`)

### 4.1 只读(公共)

无 key 也能访问但限流更严(按 IP,20/min);带 `read:*` key 放宽到 key 的 `rate_limit_per_min`。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/cars` | 列表。query:`make, model, year_min, year_max, price_min, price_max, mileage_max, fuel_type, transmission, location, seller_id, updated_since, sort, limit(≤100), cursor` |
| GET | `/api/v1/cars/{id}` | 详情。含 `profiles` 摘要(账号类型、语言、门店) |
| GET | `/api/v1/dealers` | 已认证门店列表(lat/lng/phone/wechat) |
| GET | `/api/v1/dealers/{id}` | 门店 + 在售车 |
| GET | `/api/v1/meta/makes` | 品牌/车型/数量聚合(和 browse 筛选同源) |

响应字段用英文 key,枚举值 **返回英文 slug**(`fuel_type: "gasoline"`),另给 `*_label` 按 `?lang=zh|en|ko…` 翻译好的展示文案。内部中文枚举值不外露。

只返回 `status = 'active'` 且未 `owner_hidden` 的车;`phone` 等联系方式对无 key 的请求脱敏。

多语言(i18n v2):

- 详情的 `description` 按 `lang` 给译文(该语言 `i18n_bundle` 为 ok 时),否则给原文,**不拿原文冒充译文**;`description_translated` 标明是否为译文,`description_original` 是卖家原文(逐字),`description_lang` 是原文语言(ISO 639-1 两字母代码;检测完成前为 null,检测结果为 `und`(判断不出,如只有车型和数字)或 `other`(不认识的语言)时也为 null)。
- `features` 是按 `lang` 的配置标签(同一配置的多语言写法合并为一个,未识别的标签原样),`features_original` 是卖家原样提交的标签;`carfax_summary` 按 `lang` 显示。
- `updated_since` 比较内容时钟 `content_updated_at`,只有可见内容变化才前进:描述、配置标签、年份 / 品牌 / 车型 / 配置、价格与原价(`original_price`)、里程、图片、状态与车主隐藏、颜色、燃料 / 变速箱 / 驱动、位置与坐标、Carfax 链接与摘要、VIN、源站链接(`source_url`)、卖家电话(即 `i18n.cars_before` 内容时钟比较的列,`lib/api/openapi.ts` `CONTENT_CLOCK_FIELDS` 同一份清单);浏览数 / 收藏 / 翻译 / 卖家资料变化都不算。响应里的 `updated_at` 也是这个时钟。SQL 未执行时退回旧的 `updated_at`。

### 4.2 库存写入(需 `write:inventory`;个人与车行同一套端点,只差配额)

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/me` | 当前 key 信息、owner、门店、scopes、限额 |
| GET | `/api/v1/inventory` | 自己名下所有车(含 pending/sold),按 external_id 查;按内容最后变化倒序 |
| PUT | `/api/v1/inventory/{external_id}` | **幂等 upsert**。核心端点 |
| POST | `/api/v1/inventory/batch` | 一次 ≤100 条 upsert,返回逐条结果 |
| DELETE | `/api/v1/inventory/{external_id}` | 标记 `sold`(默认)或 `removed`(`?reason=removed`) |
| POST | `/api/v1/inventory/reconcile` | 全量对账:body 传当前在售 external_id 列表,不在列表里的自动下架。DMS 只会"吐当前库存"的场景专用 |
| POST | `/api/v1/inventory/{external_id}/images` | 传图片 URL 列表(优先)或 multipart;走 `mirrorCarImages` 压缩转存 |

### 4.3 Listing 请求体(草案)

```jsonc
{
  "external_id": "STK12345",           // 必填
  "vin": "1HGCV1F3XLA012345",          // 必填(P0 起就要求,做去重与解码)
  "year": 2020, "make": "Honda", "model": "Accord", "trim": "Sport",
  "price": 18900,                      // 必填,整数美元;0 = 电议
  "original_price": 19900,
  "mileage": 41200,                    // 必填,英里
  "fuel_type": "gasoline",             // gasoline|hybrid|phev|electric|diesel
  "transmission": "automatic",         // automatic|manual|cvt
  "drivetrain": "fwd",                 // fwd|rwd|awd|4wd
  "exterior_color": "white", "interior_color": "black",
  "description": "...",                // 任一语言,原样存为原文;其他语言由 i18n 管线翻译
  "description_lang": "en",            // 已弃用:可传但忽略(原文语言自动检测)
  "features": ["Apple CarPlay", "Sunroof"],
  "images": ["https://cdn.dealer.com/1.jpg", "..."],   // 最多 30 张
  "carfax_url": "https://...",
  "store_id": "e0000000-…",            // 多门店时选;省略 = 第一家已认证门店
  "location": null                     // 车行省略 = 跟随门店地址;个人必填(城市或 zip)
}
```

服务端处理链(复用现有能力,不另造):

1. 校验 schema(zod)、VIN 格式(`isValidVinFormat`),同 seller 内 VIN 重复 → 409。
2. 英文枚举 → DB 中文值映射(`gasoline → 汽油`),新建 `lib/api/enums.ts` 做双向表。
3. `title`/`title_zh` 由 year/make/model/trim 确定性生成(`lib/i18n/car-title.ts` `buildCarTitles`,与 SQL `i18n.car_title` 一致,不经 AI)。
4. location/lat/lng:车行取门店地址(`dealer_stores`);个人没有门店,必须在请求体传 `location`(或 zip),服务端用 `lib/geocode.ts` 解析坐标。`location_zh` 用 sync 引擎里的 `CITY_ZH` 表。
5. `seller_name`/`phone` 取 profile。
6. 同步写库返回 200(`status = 'active'`;车源永久有效,`expires_at` 恒为 null)。描述 / 标签原样写原文列 `description_original` / `features_original`;`description` / `description_zh` / `features` 是 i18n 管线维护的兼容投影,API 从不写。重复 PUT 时描述与标签集合(顺序无关、大小写敏感)都没变就不写原文列 —— 原文哈希不变,不会重新翻译;再加上年份 / 品牌 / 车型 / 配置也都没变就不重新审核(`listingTextChanges`;结论按送审文本的哈希缓存,年份不在送审文本里,只改年份时直接复用原结论)。被审核或管理员下架(`removal_reason` = `moderation` / `admin`)的车再 PUT 返回 409 `listing_blocked`。
7. **异步**(Next.js `after()`,截止请求开始 + 55 s):`decodeVin` 校验车型一致 → `mirrorCarImages` 转存图片 → i18n 管线 `moderateEntity` 审核(shadow 模式只记录;enforce 模式违规由管线下架并记 `ai_moderation`)→ `drainEntity` 翻译。batch 整批只排一个 `after()`:逐车 VIN / 转存(有界并发)→ 有界审核 → 一次 `drain({ entity: 'car', entityIds })`。单车链与 batch 一样,剩余不足 15 s 时不再开始审核。审核因与内容无关的原因没做成(未配置、审核预算用完、限流、上游故障、时间不够)时不记失败次数,这辆车这次也不翻译(翻译前要先审,接着翻只会撞上同一个失败);batch 里碰到这种失败后,其余还没送审的车也不再送审、不进这次 drain。被拦下的车同样不翻译。没做完的由 `/api/i18n/drain` cron(每 2 分钟)接着做。`I18N_DRAIN_DISABLED=1`(与 cron、`/api/sync`、`/api/moderate` 共用的紧急开关)时跳过翻译,译文留在队列,审核照常。每一步失败只记日志,不影响已写入的记录。
8. 响应里给 `id`、`url`(`/zh/car/{id}`)、`processing: ["vin","moderation","translation","images"]` 中仍在后台跑的步骤(更新时:VIN 没变就没有 vin;描述、标签、年份 / 品牌 / 车型 / 配置都没变就没有 moderation;描述没变或没有描述就没有 translation)。`GET /inventory` 的 `processing_state`:`images_pending` = 还有外链图未转存;`translation_pending` = 描述的中文或英文译文还没生成(按当页 zh / en 的 `i18n_bundle` 判定,只对在售车)。

错误格式统一:

```json
{ "error": { "code": "validation_failed", "message": "...", "details": [{ "field": "price", "issue": "required" }] } }
```

409 有两种:`conflict`(同 VIN / external_id 冲突,附 `existing_id`)与 `listing_blocked`(审核或管理员下架的车不能经 API 重新上架,不要重试)。

## 5. 限流与防滥用

- 简单版:Supabase 表 `api_rate_buckets(key_id, minute, count)` + upsert 计数,单次查询判定,够 v0 用;流量上来再换 Upstash Redis。
- 写配额按 owner 分档(管理员可对单个 profile 覆盖):

  | 档位 | 判定 | 新上传 / 天 | 更改 / 天 | 在售上限 |
  |---|---|---|---|---|
  | 个人 | 默认 | 10 | 30 | 与手动发帖同一上限 |
  | 车行 | 有已认证门店 | 2000 次写(不分类型) | | 500 |

  超限返回 429 `quota_exceeded`,body 带 `quota: { tier, inserts_used, inserts_limit, updates_used, updates_limit, resets_at }`;每次写响应也在 header 里回 `X-Quota-Inserts-Remaining` / `X-Quota-Updates-Remaining`,方便脚本自己节流。天按 UTC 切,`resets_at` 明示。
- 个人档的意义:让有一两台车的人也能用脚本/第三方工具挂牌,但把"个人账号批量倒车源"的路堵死;真要走量必须走门店认证。批量端点(`batch` / `reconcile`)个人档也开放,但逐条扣配额,超出部分返回逐条 `quota_exceeded`,前面已成功的不回滚。
- 图片:URL 必须 https,单张 ≤ 10MB,域名黑名单;转存复用 `lib/sources/images.ts` 的 sharp 压缩。
- key 泄露处理:门户一键吊销 + 重新生成;admin 端也能吊销。
- 写入的车照样走 AI 审核和举报流程(`ugc-moderation`),不因是 API 就跳过:送审文本是品牌 / 车型 / 配置 + 描述 + 配置标签(没有描述的车也审),其中任一变化都重新审核,结论按送审文本的哈希缓存。只有系统转载(sync 写入、带 `source_id`、且卖家就是该源站的系统账号)的车源文本被视为可信、跳过审核,API 上传不算;同步也只更新 / 下架源站系统账号名下的车,车位被别的账号占着的源站车源跳过并在同步结果里记错。

## 6. 开发者门户

路径 `app/[locale]/(backnav)/developers/*`,web only(Capacitor 静态导出里隐藏入口):

- `/developers` — 概览 + 文档(中/英两种,其他语言回退英文)。文档来源是 `public/openapi.yaml`(OpenAPI 3.1),页面用 Scalar 或自写渲染;同时 `GET /api/v1/openapi.json` 直接给机器读。
- `/developers/keys` — 创建 / 命名 / 选 scopes / 吊销;创建后一次性展示明文,复制按钮。页面顶部显示当前档位与今日配额余量;个人档旁边放"认证门店解锁车行配额"的引导链接。
- `/developers/usage` — 近 30 天请求/错误/写入柱状图(读 `api_usage_daily`)。
- `/developers/inventory` — 通过 API 上传的车列表、最近一次同步时间、后台处理失败的条目(图片拉不下来 / 翻译失败 / AI 拦截)。
- 账号页(`account`)加"开发者 / API"入口,所有登录用户可见。

文档要写清的示例:curl 一条 PUT、Node 脚本全量 reconcile、DealerCenter CSV 导出字段 → 我们字段的对照表。

## 7. 没有开发能力的车行:Feed 拉取模式(P1)

现实是多数小车行不会调 API,但 DMS 都能导出 feed(CSV / JSON / XML URL,通常带 token)。

- 车行在门户填 feed URL + 格式 + 字段映射(给几个 DMS 预设:DealerCenter、DealerSync、Frazer、通用 CSV)。
- 存 `inventory_feeds(owner_id, url, format, mapping jsonb, schedule, last_run…)`。
- 复用现有 sync 引擎:写一个 `feed` adapter,`listAll` 拉 feed 解析成 refs,`fetchDetail` 直接从已解析行组装 `ParsedListing`。区别是 seller 是车行本人而非系统账号,upsert 依据是 `external_id`。
- 每日 cron 跟现有 `/api/sync` 同一趟跑,或门户"立即同步"按钮。

这条路的收益可能比 REST 写接口更大,但依赖前面的表结构和处理链,所以放 P1。

## 8. 分期

**P0(先跑通)**
- `api_keys` / `api_usage_daily` 表 + RLS + cars 两列
- `lib/api/auth.ts`:解析 bearer → 查 hash → scope/IP/过期检查 → 限流 → 返回 owner 上下文
- `GET /api/v1/cars`、`/cars/{id}`、`/me`
- `PUT /inventory/{external_id}`、`DELETE`、`GET /inventory`,含异步处理链
- `/developers` 文档页 + `/developers/keys`
- `public/openapi.yaml` 初版

**P1**
- `batch`、`reconcile`、`images` 端点
- Feed 拉取模式 + 门户配置页
- 用量页;admin 后台看全站 key 与用量
- 门店认证撤销 → 配额自动回落个人档

**P2**
- 沙盒 `clc_test_` key
- Webhooks:车行订阅 `lead.created`(买家发起私信 / 留电话)、`listing.removed`(AI 拦截或举报下架)推到车行 CRM
- 官方 SDK(TypeScript 一个包即可)+ 在文档页内嵌 "试一试" 面板
- 多门店 `store_id` 支持、按门店维度的库存统计

## 9. 待定问题

1. **只读 API 是否完全公开?** 不带 key 也能读会被同行整站扒走。倾向:无 key 只给列表基础字段 + 每 IP 20/min,详情、联系方式、图片原图要 key。
2. **API 上传的车与手动发帖的车冲突怎么办?** 同 seller 同 VIN 已有手动帖 → 返回 409 并附现有 `id`,让车行选择"接管"(PUT `?adopt=true` 把 external_id 写到那条上)。
3. **过期策略。** 已取消 30 天自动过期(2026-10),所有车源永久保存,直到卖家下架/标记已售、API `DELETE`/`reconcile`,或转载源站下架。车行 feed 停了车也不会自动下架,需要对账清理。
4. **限流存储**用 Postgres 够不够?按当前规模够。若接入 10+ 车行且都用 reconcile 全量推,再评估。
5. **文档语言**:六语言全上成本高,先中英。
6. **计费**:暂不做;`api_usage_daily` 先把数据留着。

## 10. 涉及的现有代码

- `app/api/sync/route.ts` — bearer 解析、admin 校验写法可直接借用
- `lib/sources/types.ts` `ParsedListing` — listing 归一化形状,API schema 以此为底
- `lib/sources/sync.ts` — 门店地址定位、`CITY_ZH`、图片转存节奏
- `lib/sources/images.ts` — `mirrorCarImages` / `deleteMirroredImages`
- `lib/i18n-pipeline`(`moderateEntity` / `drainEntity` / `drain`,审核与翻译)、`lib/i18n/car-title.ts` `buildCarTitles`、`lib/i18n/content/server.ts` `getBundle(s)`(详情译文、`translation_pending`)、`lib/vin.ts`
- `lib/types.ts` — 新增 `DbApiKey`、`DbApiUsageDaily`,`DbCar` 加 `external_id` / `api_key_id`
- `supabase/listing-sources.sql` — SQL 文件风格(幂等、手动执行)照此写 `api-keys.sql`
