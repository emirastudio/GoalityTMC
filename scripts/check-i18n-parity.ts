#!/usr/bin/env tsx
/**
 * i18n parity checker.
 *
 * Compares src/messages/{en,ru,et,es}.json — flattens nested keys to dot
 * paths and reports any locale that's missing keys present in any other.
 *
 * Exit code:
 *   0 — all locales have the same key set
 *   1 — at least one locale is missing keys
 *
 * Usage: pnpm i18n:check
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LOCALES = ["en", "ru", "et", "es"] as const;
const MESSAGES_DIR = join(process.cwd(), "src/messages");

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function flattenKeys(obj: Json, prefix = ""): Set<string> {
  const out = new Set<string>();
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    if (prefix) out.add(prefix);
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const child of flattenKeys(v as Json, path)) out.add(child);
    } else {
      out.add(path);
    }
  }
  return out;
}

function load(locale: string): Set<string> | null {
  const path = join(MESSAGES_DIR, `${locale}.json`);
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf8");
  return flattenKeys(JSON.parse(raw) as Json);
}

const sets = new Map<string, Set<string>>();
const missingFiles: string[] = [];
for (const l of LOCALES) {
  const s = load(l);
  if (s) sets.set(l, s);
  else missingFiles.push(l);
}
if (missingFiles.length > 0) {
  console.log(`⚠ Skipping locales without message file: ${missingFiles.join(", ")}`);
}

const allKeys = new Set<string>();
for (const s of sets.values()) for (const k of s) allKeys.add(k);

let hasMissing = false;
const totalKeys = allKeys.size;

console.log(`i18n parity check across ${sets.size} locales (${totalKeys} unique keys total)`);
console.log("─".repeat(60));

for (const l of sets.keys()) {
  const s = sets.get(l)!;
  const missing = [...allKeys].filter(k => !s.has(k));
  const extra = [...s].filter(k => {
    for (const [other, otherSet] of sets) {
      if (other === l) continue;
      if (!otherSet.has(k)) return false; // not "extra" — just not unique to this one
    }
    return true;
  });
  const status = missing.length === 0 ? "✓" : "✗";
  console.log(`${status} ${l}: ${s.size} keys (missing ${missing.length})`);
  if (missing.length > 0) {
    hasMissing = true;
    const preview = missing.slice(0, 20);
    for (const k of preview) console.log(`     - ${k}`);
    if (missing.length > preview.length) {
      console.log(`     ... and ${missing.length - preview.length} more`);
    }
  }
  void extra;
}

console.log("─".repeat(60));
if (hasMissing) {
  console.log("✗ FAIL — some locales are missing keys");
  process.exit(1);
}
console.log("✓ PASS — all locales at parity");
process.exit(0);
