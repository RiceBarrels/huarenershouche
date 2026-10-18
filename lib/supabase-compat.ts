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
 * 按列集合从新到旧依次查询:遇到缺列错误就换下一组,其他结果(成功 / 别的错误)直接返回。
 * 代码先于多份互不依赖的迁移上线时用(如 i18n-v2.sql 与 title-status.sql 各自可能没执行)。
 * run 每次都要返回新的 builder(PostgREST builder 不可复用)。
 */
export async function queryWithColumnFallback<R extends { error: unknown }>(
  run: (columns: string) => PromiseLike<R>,
  columnSets: readonly string[],
): Promise<R> {
  let res = await run(columnSets[0]);
  for (let i = 1; i < columnSets.length && res.error && isMissingColumnError(res.error); i++) {
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
