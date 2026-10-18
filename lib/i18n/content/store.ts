// 内容翻译 bundle 的客户端缓存(模块单例,网页端与原生端共用)。
//
// 一条记录 = rpc i18n_bundle 对某个 (entity, id, locale) 返回的一行(状态 s、译文 f、可用语言 al、
// 话题/配置标签 x …),外加请求状态。
// - SSR 页面经 ContentI18nProvider 把服务端取到的行静默"播种"进来(seedEntries),水合后直接复用;
// - 其余由 useLocalized / useLocalizedPrefetch 在挂载后按需请求:25 ms 内的请求按 (entity, locale)
//   合批,每次 RPC ≤ 100 个 id,同一条在排队 / 在途时不重复请求,10 s 超时;
// - s = pending 的行在 4/8/16/32/64 s 后重查(仍在显示它的组件每次续约),之后停止,页面显示原文;
// - 缓存有有效期:组件重新挂载(或列表换了一批 id)时,pending 行取到已超过 60 s、其余行(含查无此行)
//   超过 10 min 的立即重查(重查期间照旧显示旧行),结果回来后重查次数归零 —— 译文晚到的下次打开就能看到;
// - 原文校验:行的 h 就是服务端对原文算的哈希(i18n.hash_payload(i18n.payload_of(…))),客户端对页面上
//   的原文按同一口径算一遍(sourceHash)。对不上(原文在本会话里被车主 / 同步 / API 改过或清空、缓存的是
//   旧版本的行,或页面是路由缓存恢复的旧版本)→ 页面按没有行显示原文;行已取到一阵子的立即重查一次;
// - 出错 5 s 后重试一次,仍失败记为 error(原文兜底);RPC 不存在(SQL 未上线)时本会话不再请求;
// - 什么都不落盘(不碰 sessionStorage / localStorage):失败与过期状态一律以服务端为准(B29)。
// 服务端渲染时每个导出都是空操作 —— 模块级状态不能跨请求共享,SSR 只用 Provider 的种子。

import { supabase } from "@/lib/supabase";
import { LOCALES, type Locale } from "@/lib/i18n";
import { isMissingFunctionError } from "@/lib/supabase-compat";
import { ENTITY_FIELDS, type BundleMap, type BundleRow, type ContentEntity } from "@/lib/i18n/content/types";

export interface Entry {
  row: BundleRow | null;
  status: "idle" | "loading" | "ready" | "error";
  /** 已完成的 pending 重查次数 */
  polls: number;
}

/** 没有记录时 getEntry 返回的共享空记录(引用恒定,useSyncExternalStore 靠引用判断有无变化) */
export const IDLE_ENTRY: Entry = Object.freeze<Entry>({ row: null, status: "idle", polls: 0 });

/** pending 行的重查间隔:共 5 次,用完即停 */
const POLL_DELAYS_MS = [4_000, 8_000, 16_000, 32_000, 64_000] as const;
export const MAX_POLLS = POLL_DELAYS_MS.length;

/** 缓存有效期(从取到这一行算起):过期的在下次请求(组件重新挂载 / 列表变化)时立即重查 */
const PENDING_TTL_MS = 60_000;
const READY_TTL_MS = 10 * 60_000;
/**
 * 原文对不上时,行取到不足这么久就不重查:刚从服务端取到的行就是最新版本,对不上说明页面上的原文
 * 不是当前版本(路由缓存恢复的旧页面、浮层首帧的列表精简行),重查也一样
 */
const MISMATCH_REFETCH_AFTER_MS = 5_000;

const BATCH_WINDOW_MS = 25;
const MAX_IDS_PER_CALL = 100;
const REQUEST_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 5_000;
/** 重试后仍失败的记录,至少隔这么久才接受新的请求(组件重新挂载时),离线时不反复打 RPC */
const ERROR_COOLDOWN_MS = 30_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 每条记录最多一项在办的工作:排队等合批 / 请求在途 / 定时(pending 重查或出错重试)。
// poll = 这次请求是 pending 重查(成功后 polls + 1)。结果回来时按对象引用核对,
// 期间被 invalidate / 重新播种替换掉的旧请求结果直接丢弃。
type Work =
  | { kind: "queued"; poll: boolean }
  | { kind: "inflight"; poll: boolean }
  | { kind: "timer"; poll: boolean; handle: ReturnType<typeof setTimeout> };

type FetchResult = { kind: "ok"; rows: Map<string, BundleRow> } | { kind: "missing" } | { kind: "error" };

const entries = new Map<string, Entry>();
const work = new Map<string, Work>();
/** 已用掉唯一一次出错重试的记录 */
const retried = new Set<string>();
const failedAt = new Map<string, number>();
/** 当前行是什么时候取到的(请求成功或播种),判断缓存是否过期 */
const fetchedAt = new Map<string, number>();
const queues = new Map<string, { entity: ContentEntity; locale: Locale; ids: Set<string> }>();
const listeners = new Set<() => void>();
let rpcMissing = false;

const onServer = () => typeof window === "undefined";
const keyOf = (entity: ContentEntity, locale: Locale, id: string) => `${entity}|${locale}|${id}`;

function notify() {
  for (const listener of [...listeners]) listener();
}

function cancelTimer(key: string) {
  const w = work.get(key);
  if (w?.kind !== "timer") return;
  clearTimeout(w.handle);
  work.delete(key);
}

export function getEntry(entity: ContentEntity, id: string, locale: Locale): Entry {
  if (onServer()) return IDLE_ENTRY;
  return entries.get(keyOf(entity, locale, id)) ?? IDLE_ENTRY;
}

/** SSR 种子写入(静默,不通知订阅者:在 Provider 的渲染期间调用) */
export function seedEntries(entity: ContentEntity, locale: Locale, rows: BundleMap): void {
  if (onServer()) return;
  const now = Date.now();
  for (const [id, row] of Object.entries(rows)) {
    if (!row) continue;
    const key = keyOf(entity, locale, id);
    const prev = entries.get(key);
    if (prev?.row === row) continue;
    // 同一源版本在客户端已推进到终态(pending → ok / source / unavailable)时,不让较旧的种子拉回 pending
    if (prev?.row && prev.row.h === row.h && prev.row.s !== "pending" && row.s === "pending") continue;
    cancelTimer(key);
    retried.delete(key);
    failedAt.delete(key);
    // 种子与页面里的原文同出一次服务端渲染,按刚取到计
    fetchedAt.set(key, now);
    entries.set(key, { row, status: "ready", polls: 0 });
  }
}

/**
 * 请求这些 id 在 locale 下的 bundle 行(挂载后调用)。没有记录 → 合批请求;已有行但过了有效期
 * (pending 60 s、其余 10 min)→ 立即重查;pending 且还有重查次数 → 按间隔排一次重查;出错的冷却后重查;
 * 未过期的终态行、在排队 / 在途 / 已排期的直接跳过,所以可以随便重复调用。
 */
export function requestEntries(entity: ContentEntity, ids: readonly string[], locale: Locale): void {
  if (onServer() || rpcMissing) return;
  const now = Date.now();
  for (const id of ids) {
    // 非 uuid(如静态导出 ?id= 里的脏值)会让整批 RPC 失败:不请求,保持无记录(显示原文)
    if (!UUID_RE.test(id)) continue;
    const key = keyOf(entity, locale, id);
    if (work.has(key)) continue;
    const entry = entries.get(key) ?? IDLE_ENTRY;
    if (entry.status === "idle") {
      enqueue(entity, locale, id, false);
    } else if (entry.status === "error") {
      if (now - (failedAt.get(key) ?? 0) >= ERROR_COOLDOWN_MS) enqueue(entity, locale, id, false);
    } else if (entry.status === "ready") {
      const pending = entry.row?.s === "pending";
      if (now - (fetchedAt.get(key) ?? 0) >= (pending ? PENDING_TTL_MS : READY_TTL_MS)) {
        enqueue(entity, locale, id, false);
      } else if (pending && entry.polls < MAX_POLLS) {
        schedule(entity, locale, id, true, POLL_DELAYS_MS[entry.polls]);
      }
    }
  }
}

/** 作者编辑后调用:丢掉这些 id 在所有语言下的记录(在途请求的结果作废),订阅组件随即重新请求 */
export function invalidateEntries(entity: ContentEntity, ids: readonly string[]): void {
  if (onServer()) return;
  let changed = false;
  for (const id of ids) {
    for (const locale of LOCALES) {
      const key = keyOf(entity, locale, id);
      cancelTimer(key);
      work.delete(key);
      retried.delete(key);
      failedAt.delete(key);
      fetchedAt.delete(key);
      if (entries.delete(key)) changed = true;
    }
  }
  if (changed) notify();
}

/** 与 SQL i18n.norm_text 同口径:CRLF → LF、NFC、去掉换行前的空格 / 制表符、去掉首尾空格 */
function normText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .normalize("NFC")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/^ +| +$/g, "");
}

// SHA-256(FIPS 180-4)同步实现:sourceHash 在渲染期间调用,crypto.subtle 只有异步接口,且非安全上下文里没有
const SHA256_K = Uint32Array.of(
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
);

const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

/** UTF-8 字节的 SHA-256,小写 hex(同 SQL encode(sha256(convert_to(t, 'UTF8')), 'hex')) */
function sha256Hex(text: string): string {
  const bytes = new TextEncoder().encode(text);
  // 补位:0x80 + 0 + 64 位大端比特长度,凑满 64 字节的整数倍
  const size = Math.ceil((bytes.length + 9) / 64) * 64;
  const block = new Uint8Array(size);
  block.set(bytes);
  block[bytes.length] = 0x80;
  const view = new DataView(block.buffer);
  view.setUint32(size - 8, Math.floor(bytes.length / 0x20000000));
  view.setUint32(size - 4, (bytes.length * 8) >>> 0);
  const state = Uint32Array.of(0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19);
  const w = new Uint32Array(64);
  for (let offset = 0; offset < size; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = w[i - 16] + s0 + w[i - 7] + s1;
    }
    let [a, b, c, d, e, f, g, h] = state;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + SHA256_K[i] + w[i]) | 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    state[0] += a;
    state[1] += b;
    state[2] += c;
    state[3] += d;
    state[4] += e;
    state[5] += f;
    state[6] += g;
    state[7] += h;
  }
  return Array.from(state, (x) => x.toString(16).padStart(8, "0")).join("");
}

/**
 * 页面上这份原文对应的 i18n_bundle h:与 SQL i18n.hash_payload(i18n.payload_of(entity, id)) 同口径 ——
 * 各字段 norm_text 后去掉空字段组成 jsonb,取其文本形式(键按长度再按字节排序,`{"k": "v", …}`,字符串
 * 转义同 JSON.stringify)的 SHA-256 前 32 位 hex。需要该实体的全部原文字段(ENTITY_FIELDS):调用方没拿到
 * 某个字段(undefined:只显示标题的卡片)时无法校验,返回 null;null / 空串 = 原文就是空的(已清空)。
 * 服务端不做原文校验,返回 null。
 */
export function sourceHash(
  entity: ContentEntity,
  original: Readonly<Record<string, string | null | undefined>>,
): string | null {
  if (onServer()) return null;
  const fields = [...ENTITY_FIELDS[entity]].sort((x, y) => x.length - y.length || (x < y ? -1 : x > y ? 1 : 0));
  const pairs: string[] = [];
  for (const field of fields) {
    const value = original[field];
    if (value === undefined) return null;
    const text = value === null ? "" : normText(value);
    if (text) pairs.push(`${JSON.stringify(field)}: ${JSON.stringify(text)}`);
  }
  return sha256Hex(`{${pairs.join(", ")}}`).slice(0, 32);
}

/**
 * 渲染期间调用(纯函数):这个行是不是另一份原文的 —— 行的 h 与页面原文的 sourceHash 对不上。true 时调用方
 * 按没有行显示原文:ok 行的译文、pending 的「翻译中」、source / unavailable 的结论都属于别的版本。
 * hash 为 null(无法校验 / 服务端)不拦。
 */
export function isSuperseded(row: BundleRow | null | undefined, hash: string | null): boolean {
  return !!row && hash !== null && row.h !== hash;
}

/**
 * 挂载后(effect 里)调用:store 里的缓存行与页面原文对不上(isSuperseded)时立即重查一次,不看有效期。
 * 行取到不足 MISMATCH_REFETCH_AFTER_MS 的不重查(见常量说明);在排队 / 在途 / 已排期的请求会带回新结果,
 * 不重复入队。重查到的行仍对不上就一直显示原文,直到下次挂载时它已不新鲜、或过了有效期再查。
 */
export function checkOriginal(
  entity: ContentEntity,
  id: string,
  locale: Locale,
  row: BundleRow | null | undefined,
  hash: string | null,
): void {
  if (onServer() || rpcMissing || !isSuperseded(row, hash) || !UUID_RE.test(id)) return;
  const key = keyOf(entity, locale, id);
  // 组件手里的行可能是 Provider 的种子(水合),只核对 store 当前的行
  if (entries.get(key)?.row !== row || work.has(key)) return;
  if (Date.now() - (fetchedAt.get(key) ?? 0) < MISMATCH_REFETCH_AFTER_MS) return;
  enqueue(entity, locale, id, false);
}

export function subscribe(listener: () => void): () => void {
  if (onServer()) return () => {};
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function enqueue(entity: ContentEntity, locale: Locale, id: string, poll: boolean) {
  work.set(keyOf(entity, locale, id), { kind: "queued", poll });
  const qkey = `${entity}|${locale}`;
  let queue = queues.get(qkey);
  if (!queue) {
    queue = { entity, locale, ids: new Set() };
    queues.set(qkey, queue);
    setTimeout(() => flush(qkey), BATCH_WINDOW_MS);
  }
  queue.ids.add(id);
}

/** 定时后入队:pending 重查(poll)或出错重试(沿用原请求的 poll 标记) */
function schedule(entity: ContentEntity, locale: Locale, id: string, poll: boolean, delay: number) {
  const key = keyOf(entity, locale, id);
  const item: Work = {
    kind: "timer",
    poll,
    handle: setTimeout(() => {
      if (work.get(key) !== item) return;
      work.delete(key);
      enqueue(entity, locale, id, poll);
    }, delay),
  };
  work.set(key, item);
}

function flush(qkey: string) {
  const queue = queues.get(qkey);
  queues.delete(qkey);
  if (!queue) return;
  const { entity, locale } = queue;
  const ids: string[] = [];
  const items: Work[] = [];
  let changed = false;
  for (const id of queue.ids) {
    const key = keyOf(entity, locale, id);
    const queued = work.get(key);
    // 排队期间被 invalidate 清掉的不再请求(重新请求时会再次入队)
    if (queued?.kind !== "queued") continue;
    const prev = entries.get(key) ?? IDLE_ENTRY;
    changed = true;
    if (rpcMissing) {
      work.delete(key);
      entries.set(key, { row: prev.row, status: "error", polls: prev.polls });
      continue;
    }
    const item: Work = { kind: "inflight", poll: queued.poll };
    work.set(key, item);
    entries.set(key, { row: prev.row, status: "loading", polls: prev.polls });
    ids.push(id);
    items.push(item);
  }
  if (changed) notify();
  for (let i = 0; i < ids.length; i += MAX_IDS_PER_CALL) {
    const chunk = ids.slice(i, i + MAX_IDS_PER_CALL);
    const chunkItems = items.slice(i, i + MAX_IDS_PER_CALL);
    void fetchRows(entity, locale, chunk).then((result) => settle(entity, locale, chunk, chunkItems, result));
  }
}

async function fetchRows(entity: ContentEntity, locale: Locale, ids: string[]): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const { data, error } = await supabase
      .rpc("i18n_bundle", { p_entity: entity, p_ids: ids, p_locale: locale })
      .abortSignal(controller.signal);
    if (error) return isMissingFunctionError(error) ? { kind: "missing" } : { kind: "error" };
    const rows = new Map<string, BundleRow>();
    for (const row of (data ?? []) as BundleRow[]) {
      if (typeof row?.id === "string") rows.set(row.id.toLowerCase(), row);
    }
    return { kind: "ok", rows };
  } catch {
    return { kind: "error" };
  } finally {
    clearTimeout(timer);
  }
}

function settle(entity: ContentEntity, locale: Locale, ids: string[], items: Work[], result: FetchResult) {
  if (result.kind === "missing") rpcMissing = true;
  const now = Date.now();
  let changed = false;
  ids.forEach((id, i) => {
    const key = keyOf(entity, locale, id);
    const item = items[i];
    if (work.get(key) !== item) return;
    const prev = entries.get(key) ?? IDLE_ENTRY;
    if (result.kind === "ok") {
      // 公开实体都有 i18n.sources 行;没返回 = 非公开 / 未知 id,记为没有行(显示原文,过了有效期才再查)
      work.delete(key);
      retried.delete(key);
      failedAt.delete(key);
      fetchedAt.set(key, now);
      const row = result.rows.get(id.toLowerCase()) ?? null;
      // pending 重查累加次数;其余请求(首次、过期重查、冷却后重查、原文对不上)之后从头再查一轮
      entries.set(key, { row, status: "ready", polls: item.poll ? prev.polls + 1 : 0 });
      changed = true;
    } else if (result.kind === "error" && !retried.has(key)) {
      // 唯一一次重试:记录保持 loading,5 s 后重新入队
      retried.add(key);
      schedule(entity, locale, id, item.poll, RETRY_DELAY_MS);
    } else {
      work.delete(key);
      retried.delete(key);
      failedAt.set(key, now);
      entries.set(key, { row: prev.row, status: "error", polls: prev.polls });
      changed = true;
    }
  });
  if (changed) notify();
}
