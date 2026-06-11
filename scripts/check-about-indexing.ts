#!/usr/bin/env tsx
/**
 * Health-check every /about URL across all 4 locales:
 *   • HTTP 200 (no 404, no 308 chain to nowhere)
 *   • Has <title> + meta description
 *   • Has canonical link
 *   • Has FAQPage + BreadcrumbList JSON-LD
 *   • Has og:image meta tag
 *
 * Run before announcing the launch and after major content updates
 * to catch broken pages, mismatched canonicals, missing OG cards.
 *
 * Usage:
 *   pnpm seo:check                       # checks prod
 *   pnpm seo:check http://localhost:7171 # checks local dev
 *
 * Exit code: 0 if every URL passes, 1 if any fails.
 */

import { ABOUT_PUBLISHED_SLUGS } from "../src/lib/about/content";

const BASE = process.argv[2] ?? "https://goalityfootball.com";
const LOCALES = ["en", "ru", "et", "es"] as const;

type Check = { name: string; pass: boolean; detail?: string };

async function checkPage(url: string, isHub: boolean): Promise<Check[]> {
  const checks: Check[] = [];
  let html: string;
  try {
    const r = await fetch(url, { redirect: "follow" });
    checks.push({
      name: "status 200",
      pass: r.status === 200,
      detail: `HTTP ${r.status}`,
    });
    if (r.status !== 200) return checks;
    html = await r.text();
  } catch (e) {
    checks.push({
      name: "fetch",
      pass: false,
      detail: e instanceof Error ? e.message : String(e),
    });
    return checks;
  }

  const has = (re: RegExp) => re.test(html);
  checks.push({ name: "<title>",          pass: has(/<title>[^<]{8,}<\/title>/) });
  checks.push({ name: "meta description", pass: has(/<meta\s+name="description"\s+content="[^"]{30,}"/i) });
  checks.push({ name: "canonical",        pass: has(/<link\s+rel="canonical"\s+href="[^"]+"/i) });
  checks.push({ name: "og:image",         pass: has(/<meta\s+property="og:image"\s+content="[^"]+"/i) });
  checks.push({ name: "hreflang alts",    pass: (html.match(/<link\s+rel="alternate"\s+hrefLang/gi) || []).length >= 4 });
  // FAQ + Breadcrumb JSON-LD only live on deep-dive pages; hub doesn't carry them.
  if (!isHub) {
    checks.push({ name: "FAQPage JSON-LD",  pass: has(/"@type"\s*:\s*"FAQPage"/) });
    checks.push({ name: "BreadcrumbList JSON-LD", pass: has(/"@type"\s*:\s*"BreadcrumbList"/) });
  }

  return checks;
}

async function main() {
  console.log(`Checking ${BASE}/[locale]/about + 22 slugs × 4 locales\n`);
  const urls: string[] = [];
  for (const l of LOCALES) {
    urls.push(`${BASE}/${l}/about`);
    for (const s of ABOUT_PUBLISHED_SLUGS) urls.push(`${BASE}/${l}/about/${s}`);
  }

  let allOk = true;
  let totalChecks = 0, passedChecks = 0;

  for (const url of urls) {
    const isHub = /\/about\/?$/.test(url.replace(/\?.*$/, ""));
    const checks = await checkPage(url, isHub);
    const failed = checks.filter((c) => !c.pass);
    totalChecks += checks.length;
    passedChecks += checks.length - failed.length;
    if (failed.length === 0) {
      process.stdout.write(`✓ ${url}\n`);
    } else {
      allOk = false;
      process.stdout.write(`✗ ${url}\n`);
      for (const f of failed) {
        process.stdout.write(`   └ ${f.name}${f.detail ? ` — ${f.detail}` : ""}\n`);
      }
    }
  }

  console.log(`\n${passedChecks}/${totalChecks} checks passed across ${urls.length} URLs`);
  if (!allOk) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
