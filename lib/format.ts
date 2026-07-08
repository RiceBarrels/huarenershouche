export function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "刚刚";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 个月前`;
  return `${Math.floor(months / 12)} 年前`;
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
