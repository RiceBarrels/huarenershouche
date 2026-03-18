/**
 * Generate Apple client_secret JWT for Supabase Apple Sign In
 *
 * Usage: node scripts/generate-apple-secret.mjs
 *
 * Fill in TEAM_ID and CLIENT_ID below, then run.
 * The JWT is valid for 6 months (Apple maximum).
 */

import { createPrivateKey } from "crypto";
import { readFileSync } from "fs";
import { SignJWT } from "jose";

// === FILL THESE IN ===
const TEAM_ID = "8493QSQR98";
const CLIENT_ID = "GLW377AYWC";
const KEY_ID = "GLW377AYWC";
const KEY_PATH = "/Users/muhengfan/Downloads/Apple Auth Key GLW377AYWC.p8";
// =====================

const privateKey = createPrivateKey(readFileSync(KEY_PATH, "utf8"));

const now = Math.floor(Date.now() / 1000);
const exp = now + 86400 * 180; // 6 months

const jwt = await new SignJWT({})
  .setProtectedHeader({ alg: "ES256", kid: KEY_ID })
  .setIssuer(TEAM_ID)
  .setIssuedAt(now)
  .setExpirationTime(exp)
  .setAudience("https://appleid.apple.com")
  .setSubject(CLIENT_ID)
  .sign(privateKey);

console.log("\n=== Apple Client Secret (JWT) ===\n");
console.log(jwt);
console.log("\n=== 有效期至:", new Date(exp * 1000).toISOString(), "===\n");
console.log("把上面的 JWT 粘贴到 Supabase Dashboard → Authentication → Providers → Apple → Secret");
