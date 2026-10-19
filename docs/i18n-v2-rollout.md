# 内容翻译 v2 上线清单(i18n v2 rollout)

代码里提到的「spec 10.1 R0–R12」指的就是这份清单(原设计文档没有放进仓库)。
现状(2026-10-18):i18n v2 代码已上线生产(62ad3f1),之后的 batch 1(26474cc)、batch 2(4a2d4fe)也已上线;
**下面所有 SQL 都还没在生产库执行**。代码按设计在 SQL 执行前降级运行:页面显示原文,翻译 / AI 审核不工作,
`/api/i18n/drain` 每 2 分钟空跑一次(RPC 不存在 → not_configured,不调模型)。

执行方式:Supabase SQL Editor 整个文件粘贴执行(文件自带 `begin; … commit;`,失败整体回滚,可以重复执行)。
高峰期以外执行;如果担心锁等待,可以在文件开头加 `set lock_timeout = '5s';`。

## R0 执行前的只读检查

1. 已被其他账号占住的转载车位(F001:旧库里车主可以把自己的车伪装成某个转载来源的车位)。在 SQL Editor 执行:

   ```sql
   select c.id, c.seller_id, s.key
     from public.cars c join public.listing_sources s on s.id = c.source_id
    where c.seller_id <> s.system_account_id;
   ```

   应当没有结果;有结果就先人工核对这些车,确认是冒用再处理(改回或下架)。
2. `bun scripts/i18n-db-test.ts` 和 `bun scripts/i18n-selftest.ts` 都是 ALL PASS(纯本地)。

> 原计划的 R2(执行 SQL 前先去掉 Vercel 的 `OPENROUTER_API_KEY`)**不再需要**:那一步是防止旧代码在新 SQL 下
> 把机器译文当原文写进库,现在线上已经是新代码。

## R3 执行 i18n v2 SQL(按顺序)

1. `supabase/i18n-v2.sql` —— 私有 schema `i18n`、触发器、RPC、`ai_moderation` 表。执行后是「观察模式」
   (`enforce = false`)+「影子审核」(`moderation_enforce = false`),旧数据不动。
2. `supabase/i18n-v2-data.sql` —— 数据迁移(原文快照、旧译文暂存、回复前缀拆分、全表 sweep)。
3. `supabase/browse-cars.sql` —— `/browse` 服务端分页 RPC 新版(含产权状态、币种换算、贷款筛选;会顺带
   `add column if not exists` 几个新列,和下面 batch 1/2 的 SQL 谁先谁后都行)。
4. `supabase/i18n-v2-verify.sql` —— 每一行的门槛都要满足(注释里写着 `must be ...`)。

执行完的影响:线上 cron 立刻开始工作,新发布 / 编辑的内容会被检测语言、翻译、影子审核(不隐藏任何内容)。

## R4 回填(本机执行,需要 `.env.local` 里的 SERVICE_ROLE_KEY + OPENROUTER_API_KEY)

```bash
bun scripts/i18n-backfill.ts --seed            # 标题映射 + 品牌 / 车型 / 词典话题种子
bun scripts/i18n-backfill.ts --terms           # 解析话题 / 配置标签
bun scripts/i18n-backfill.ts --detect          # 原文语言检测
bun scripts/i18n-backfill.ts --import-legacy --dry-run   # 只统计,人工过目
bun scripts/i18n-backfill.ts --import-legacy   # 只导入可信转载车源的旧译文(帖子 / 评论 / 用户车不导入)
```

然后在 SQL Editor:`select public.i18n_admin_set('daily_call_cap', '40000'::jsonb);`(临时调高每日调用上限),再:

```bash
bun scripts/i18n-backfill.ts --drain --locales zh,en --concurrency 8   # 直到 zh / en 的 pending 为 0
```

全部可以随时 Ctrl-C 中断、重跑(状态都在库里)。`--stats` 随时看进度。

## R6 打开 enforce(R4 完成后尽快)

```sql
select public.i18n_admin_set('enforce', 'true'::jsonb);   -- 会重算所有车的标题 / 配置 / 描述投影
```

然后重跑 `supabase/i18n-v2-verify.sql`,门槛全部满足。enforce 之后:`other_i18n` 冻结,`description` /
`description_zh` / `features` 由管线按原文投影,车主只能改原文。

## R7 跑完其余语种

```bash
bun scripts/i18n-backfill.ts --drain --concurrency 8   # 直到 --stats 里 pending = 0、refresh = 0(parked 不算)
bun scripts/i18n-backfill.ts --terms
```

`select public.i18n_admin_set('daily_call_cap', '20000'::jsonb);` 恢复默认上限。

## R8 核验 + 搜索引擎

```bash
bun scripts/i18n-verify.ts db
bun scripts/i18n-verify.ts http --base https://www.clcauto.com
```

在 Google Search Console 重新提交 `/sitemap.xml`。

## R9 影子审核复盘(≥ 7 天)→ 打开 AI 审核

后台「AI 审核」tab 看 `shadow` 状态的记录(含 `translation` 类):误判多不多。确认后:

```sql
select public.i18n_admin_set('moderation_enforce', 'true'::jsonb);
```

打开后违规内容会被自动下架 / 隐藏(作者和管理员仍可见),误判可在后台恢复。

## R10–R12

- R10:原生 App 发版(`bun run build:static` → `cap sync` → 商店)。
- R11:R6 和 R10 都满 14 天后执行 `supabase/i18n-v2-cleanup.sql`(校验 NOT VALID 的长度约束等)。
- R12:旧版本 App 占比 < 2 % 后再删兼容层、删 `other_i18n` 列(执行前先确认没有函数还在读它,
  见 cleanup 文件注释)。

## 回滚

- 快速:Vercel instant rollback + `select public.i18n_admin_set('enforce', 'false'::jsonb);`(回到观察模式,数据不丢)。
  如果 R9 已经打开过 `moderation_enforce`,先按 `supabase/i18n-v2-rollback.sql` 文件头的说明暂存新类型的待审记录。
- 紧急(触发器异常):执行 `supabase/i18n-v2-rollback.sql`(摘掉触发器和 cron,保留数据);恢复 = 重跑
  `supabase/i18n-v2.sql`,再按 rollback 文件头的说明做一次全量 sweep / 链接行重同步。

## 其他待执行的 SQL(和 i18n v2 相互独立,执行前功能自动隐藏)

| 文件 | 内容 | 依赖 / 备注 |
|---|---|---|
| `supabase/remove-listing-expiry.sql` | 可选清理:清空 `expires_at` 残值、去掉默认值 | 无时限。生产库没有 `expire-old-listings` 定时任务(2026-10 已核对 `cron.job`),代码也不按 `expires_at` 筛选,不会有车被下架 |
| `supabase/title-status.sql` | 产权状态列 | — |
| `supabase/contact-apps.sql` | 卖家多渠道联系方式(独立表 + RPC) | 依赖 `claim-accounts.sql` 的 `can_act_as` |
| `supabase/message-translations.sql` | 聊天翻译缓存 + 限额 | — |
| `supabase/click-events.sql` | 通用点击统计(联系 / 贷款标签 / 筛选) | 依赖 `is_admin` |
| `supabase/car-currency.sql` | 币种 + 里程单位 | — |
| `supabase/dealer-financing.sql` | 车行贷款标签 | — |
| `supabase/car-condition.sql` | 结构化车况 | — |
| `supabase/analytics.sql` | 只需重新执行 `analytics_car_info` / `analytics_breakdown_impl` 两个函数 | 可选 |
