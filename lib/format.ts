import { interpolate } from "@/lib/i18n";

// 相对时间。传入 useI18n() 的 t 才会翻译;不传时按中文原文输出(兼容旧调用)
type TranslateFn = (text: string, vars?: Record<string, string | number>) => string;

export function timeAgo(date: string, t: TranslateFn = interpolate): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return t("刚刚");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("{n} 分钟前", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("{n} 小时前", { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t("{n} 天前", { n: days });
  const months = Math.floor(days / 30);
  if (months < 12) return t("{n} 个月前", { n: months });
  return t("{n} 年前", { n: Math.floor(months / 12) });
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatMileage(miles: number): string {
  return new Intl.NumberFormat("en-US").format(miles) + " mi";
}

// 全站统一的月供估算口径：0 首付 / 6.5% APR / 60 期
export const LOAN_ASSUMPTION = { downRatio: 0, apr: 0.065, months: 60 };

export function estimateMonthlyPayment(
  price: number,
  opts: { downRatio?: number; apr?: number; months?: number } = {}
): number {
  const { downRatio = LOAN_ASSUMPTION.downRatio, apr = LOAN_ASSUMPTION.apr, months = LOAN_ASSUMPTION.months } = opts;
  const principal = price * (1 - downRatio);
  if (principal <= 0) return 0;
  const r = apr / 12;
  if (r === 0) return Math.round(principal / months);
  return Math.round(
    (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
  );
}

/** estimateMonthlyPayment 的反函数：月供预算 → 可承受车价上限 */
export function paymentToPrice(
  monthly: number,
  opts: { downRatio?: number; apr?: number; months?: number } = {}
): number {
  const { downRatio = LOAN_ASSUMPTION.downRatio, apr = LOAN_ASSUMPTION.apr, months = LOAN_ASSUMPTION.months } = opts;
  const r = apr / 12;
  const principal =
    r === 0
      ? monthly * months
      : (monthly * (Math.pow(1 + r, months) - 1)) / (r * Math.pow(1 + r, months));
  return Math.round(principal / (1 - downRatio || 1));
}
