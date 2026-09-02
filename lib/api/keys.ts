// Public API key 生成 / 哈希。明文格式 clc_live_<base62>,总长 40;
// 库里只存 sha256 hex + 前 12 位 prefix,明文只在创建响应里出现一次。

import { createHash, randomBytes } from "crypto";
import { API_KEY_DISPLAY_PREFIX_LEN, API_KEY_PREFIX_LIVE } from "./types";

const API_KEY_TOTAL_LEN = 40;
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** 无偏 base62 随机串(拒绝采样,避免取模偏差) */
function randomBase62(len: number): string {
  let out = "";
  while (out.length < len) {
    const bytes = randomBytes(len * 2);
    for (let i = 0; i < bytes.length && out.length < len; i++) {
      const b = bytes[i];
      // 248 = 62 * 4,超出的丢弃保证均匀
      if (b < 248) out += BASE62[b % 62];
    }
  }
  return out;
}

export function hashApiKey(plain: string): string {
  return createHash("sha256").update(plain, "utf8").digest("hex");
}

export function generateApiKey(): { plain: string; prefix: string; hash: string } {
  const plain = API_KEY_PREFIX_LIVE + randomBase62(API_KEY_TOTAL_LEN - API_KEY_PREFIX_LIVE.length);
  return {
    plain,
    prefix: plain.slice(0, API_KEY_DISPLAY_PREFIX_LEN),
    hash: hashApiKey(plain),
  };
}

/** 是否形如我们签发的 key(live 或未来的 test 沙盒) */
export function looksLikeApiKey(token: string): boolean {
  return token.startsWith("clc_live_") || token.startsWith("clc_test_");
}
