#!/usr/bin/env node

/**
 * Sync logo from Downloads to all project locations
 * Usage: node scripts/sync-logo.mjs
 */

import { copyFileSync, writeFileSync, readFileSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";

const root = resolve(import.meta.dirname, "..");
const src = resolve(import.meta.dirname, "../../Downloads/clc-logo.png");

const targets = [
  resolve(root, "public/logo.png"),
  resolve(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"),
];

for (const dest of targets) {
  copyFileSync(src, dest);
  console.log(`✓ ${dest.replace(root + "/", "")}`);
}

// Generate favicon.ico (32x32 PNG renamed — browsers accept PNG as .ico)
const favicon = resolve(root, "app/favicon.ico");
const tmp = resolve(root, ".favicon-tmp.png");
execSync(`sips -z 32 32 "${src}" --out "${tmp}" 2>/dev/null`);
copyFileSync(tmp, favicon);
execSync(`rm "${tmp}"`);
console.log(`✓ app/favicon.ico`);

console.log("\nDone.");
