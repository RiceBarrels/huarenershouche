// 一站一适配器的独立建站车行(A 组)。各站解析逻辑见对应文件。
// 未接入:wahlonggroup.com(华龙汽车城)—— 库存停更于 ~2017(188 条中 182 条已售,
// 剩余 6 辆「未售」为 2015-16 款旧挂牌),HTTPS 证书过期,视为废弃站点。
import type { SourceAdapter } from "./types";
import { createNysrAutoAdapter } from "./nysrauto";
import { createHautodealAdapter } from "./hautodeal";
import { createFengAutoAdapter } from "./fengauto";

export const SITES: SourceAdapter[] = [
  // 纽约SR车行 —— 官网 iframe 嵌 DealerCenter 托管站,admin-ajax JSON 直连(无 Cloudflare)
  createNysrAutoAdapter(),
  // 华诚车行(罗斯米德)—— 美店邦建站,列表 HTML + 详情 JSON-LD;有 429 WAF,已节流
  createHautodealAdapter(),
  // 亚洲车行(芝加哥)—— GoDaddy 建站,首页菜单 + 品牌分页规格 + gpub 图库脚本。
  // GoDaddy 对密集请求回 429 并会临时封 IP(已 1s 间隔 + 退避重试);每轮 ~31 次请求,勿频繁手动重跑
  createFengAutoAdapter(),
];
