// Supabase / PostgREST 错误分类 + LIKE 转义(纯函数,server / client / Bun 通用)。
//
// 代码可能先于 SQL 迁移(supabase/i18n-v2.sql 等)上线,读写遇到「列 / 关联 / 函数不存在」时
// 降级到旧查询,而不是整页报错。用法:先用新列集合查询;isMissingColumnError → 用旧列集合重试一次
// (多组列集合见 queryWithColumnFallback)。

/** 从任意错误值(PostgrestError、Error、普通对象)里取 code / message */
function errorParts(err: unknown): { code: string; message: string } {
  if (!err || typeof err !== "object") return { code: "", message: "" };
  const { code, message } = err as { code?: unknown; message?: unknown };
  return {
    code: typeof code === "string" ? code : "",
    message: typeof message === "string" ? message : "",
  };
}

/**
 * 缺列:42703 undefined_column(select / 过滤用到不存在的列)、PGRST204(写入载荷里的列不在 schema cache)、
 * PGRST200(join 依赖的外键列还没建,如 profiles!reply_to_user_id)
 */
export function isMissingColumnError(err: unknown): boolean {
  const { code, message } = errorParts(err);
  return (
    code === "42703" ||
    code === "PGRST204" ||
    code === "PGRST200" ||
    /column .* does not exist/i.test(message)
  );
}

/**
 * 缺的正是 column 这一列:42703「column cars.title_status does not exist」/
 * PGRST204「Could not find the 'title_status' column of 'cars' in the schema cache」都带列名。
 * 用于只去掉某一列重试(其他列仍按新列集合写),而不是整体退回旧列集合。
 */
export function isMissingColumnNamed(err: unknown, column: string): boolean {
  return isMissingColumnError(err) && new RegExp(`\\b${column}\\b`).test(errorParts(err).message);
}

/**
 * 缺列错误里的列名:42703「column cars.currency does not exist」/「column "currency" does not exist」、
 * PGRST204「Could not find the 'currency' column of 'cars' in the schema cache」。认不出来返回 null。
 */
export function missingColumnName(err: unknown): string | null {
  if (!isMissingColumnError(err)) return null;
  const { message } = errorParts(err);
  const m =
    /column\s+"?(?:[\w]+\.)?"?([\w]+)"?\s+does not exist/i.exec(message) ||
    /could not find the '([\w]+)' column/i.exec(message);
  return m ? m[1] : null;
}

/**
 * 违反名为 constraint 的 CHECK(23514「violates check constraint "cars_title_status_check"」)。
 * 用于库里还是旧版约束(新枚举值所在的 SQL 没重跑)时去掉该字段重试,而不是整次写入失败。
 */
export function isCheckViolationNamed(err: unknown, constraint: string): boolean {
  const { code, message } = errorParts(err);
  return code === "23514" && message.includes(constraint);
}

/** "a, b, c" 列集合 → 列名集合 */
function columnSetNames(columns: string): Set<string> {
  return new Set(columns.split(",").map((c) => c.trim()).filter(Boolean));
}

/**
 * 按列集合从新到旧依次查询:遇到缺列错误就换下一组,其他结果(成功 / 别的错误)直接返回。
 * 代码先于多份互不依赖的迁移上线时用(如 i18n-v2.sql、title-status.sql、car-currency.sql 各自可能没执行)。
 * 错误里认得出缺的列名时,直接跳到第一组不含「已知缺失的全部列」的集合(多份迁移的组合不必逐组试);
 * 认不出列名(如 join 的列)就按顺序试下一组。
 * run 每次都要返回新的 builder(PostgREST builder 不可复用)。
 */
export async function queryWithColumnFallback<R extends { error: unknown }>(
  run: (columns: string) => PromiseLike<R>,
  columnSets: readonly string[],
): Promise<R> {
  let res = await run(columnSets[0]);
  const missing = new Set<string>();
  let i = 0;
  while (res.error && isMissingColumnError(res.error)) {
    const name = missingColumnName(res.error);
    if (name && columnSetNames(columnSets[i]).has(name)) missing.add(name);
    let next = i + 1;
    while (
      next < columnSets.length &&
      missing.size > 0 &&
      [...columnSetNames(columnSets[next])].some((c) => missing.has(c))
    ) {
      next++;
    }
    if (next >= columnSets.length) break;
    i = next;
    res = await run(columnSets[i]);
  }
  return res;
}

/** 缺函数:PGRST202(rpc 不在 schema cache)、42883 undefined_function */
export function isMissingFunctionError(err: unknown): boolean {
  const { code } = errorParts(err);
  return code === "PGRST202" || code === "42883";
}

/** LIKE / ILIKE 模式里的用户输入:转义 \ % _(Postgres 默认转义符为反斜杠) */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}
