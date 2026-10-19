#!/usr/bin/env bun
/**
 * scam-signals-selftest — 私信交易风险信号(lib/scam-signals.ts detectScamSignal)回归用例。纯函数,不连库。
 *
 * Usage:
 *   bun scripts/scam-signals-selftest.ts
 *   全部通过退出码 0,否则 1。
 *
 * 允许少量误报(提示是中性的),但日常寒暄 / 问车况绝不能触发;词边界要挡住 wireless 之类。
 */

import { detectScamSignal, scamNoticeDismissKey, type ScamSignal } from "@/lib/scam-signals";

let failed = 0;
function check(text: string, expected: ScamSignal | null) {
  const got = detectScamSignal(text);
  if (got !== expected) {
    failed++;
    console.error(`FAIL ${JSON.stringify(text)} → ${got}, expected ${expected}`);
  }
}

// ---------- 命中:关键词 ----------
const POSITIVE: string[] = [
  // en
  "send deposit via Zelle to hold it",
  "Please wire the money first",
  "I can accept a cashier's check",
  "cashiers check only",
  "Buy a $500 gift card and send me the code",
  "Western Union is fine",
  "Pay through CashApp",
  "e-transfer the holding fee",
  "Interac works",
  "we need a down payment",
  "DEPOSIT required",
  // zh
  "先付定金我给你留着",
  "交个订金吧",
  "你先转账,我再发车",
  "车很抢手,你今天转账给我就帮你留着",
  "微信转账就行",
  "先打款再看车",
  "直接转帐给我",
  "需要保证金 500",
  "押金可退",
  "可以用本票吗",
  // ja
  "手付金をお願いします",
  "先に振込してください",
  "ギフトカードで支払えますか",
  // ko
  "계약금 먼저 보내주세요",
  "보증금 입금 부탁드려요",
  "상품권으로 결제 가능해요",
  // es
  "Envíe un depósito para apartarlo",
  "deposito por Zelle",
  "Haga una transferencia primero",
  "acepto tarjeta de regalo",
  "necesito un anticipo",
  // fr
  "Envoyez un acompte pour le réserver",
  "un dépôt de 500 $",
  "faites un virement bancaire",
  "payez avec une carte-cadeau",
  "chèque de banque accepté",
];
for (const s of POSITIVE) check(s, "keyword");

// ---------- 命中:外部链接 ----------
const LINKS: string[] = [
  "see https://example.com/pay",
  "go to www.carfax-check.net",
  "details at mycar-escrow.com/order/123",
  "訪問 http://bit.ly/abc",
  "pay here: secure-payments.xyz",
];
for (const s of LINKS) check(s, "link");

// ---------- 不命中 ----------
const NEGATIVE: string[] = [
  "",
  "Hi, is the car still available?",
  "Does it have wireless CarPlay?",
  "What's the mileage? Any accidents?",
  "Can I see it this Saturday?",
  "The title is clean and the VIN matches",
  "我周六下午可以来看车吗",
  "这车还在吗?有没有事故?",
  "토요일에 차 보러 가도 될까요?",
  "週末に見に行ってもいいですか",
  "¿Sigue disponible el coche?",
  "Est-ce que la voiture est toujours disponible ?",
  "The price is $12,500, negotiable",
  "email me at bob@gmail.com", // 邮箱不算外部链接
  "version 2.0 works",
  "redeposited", // 词边界:不是单独的 deposit
];
for (const s of NEGATIVE) check(s, null);

// 关键词优先于链接
check("deposit at https://example.com", "keyword");
// null / undefined
if (detectScamSignal(null) !== null || detectScamSignal(undefined) !== null) {
  failed++;
  console.error("FAIL null/undefined");
}
if (scamNoticeDismissKey("abc") !== "scam-notice-dismissed:abc") {
  failed++;
  console.error("FAIL dismiss key");
}

const total = POSITIVE.length + LINKS.length + NEGATIVE.length + 4;
if (failed) {
  console.error(`\n${failed} / ${total} failed`);
  process.exit(1);
}
console.log(`scam-signals-selftest: all ${total} passed`);
