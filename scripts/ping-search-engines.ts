#!/usr/bin/env tsx
/**
 * Ping Google + Bing with our sitemap URL.
 *
 * Use after a significant content drop (e.g. adding 22 deep-dive
 * pages) to nudge the crawlers — fresh URLs typically land in the
 * index faster than waiting for the next organic crawl.
 *
 * Usage: pnpm tsx scripts/ping-search-engines.ts
 *
 * Note: Google deprecated their sitemap ping endpoint in 2023 — the
 * official path now is Search Console > Sitemaps > Submit. Bing still
 * accepts pings via their endpoint. We try both and report.
 */

const SITEMAP = "https://goalityfootball.com/sitemap.xml";
const ENCODED = encodeURIComponent(SITEMAP);

const endpoints: Array<{ name: string; url: string }> = [
  { name: "Bing",   url: `https://www.bing.com/ping?sitemap=${ENCODED}` },
  { name: "Google (legacy, may 404)", url: `https://www.google.com/ping?sitemap=${ENCODED}` },
];

async function ping(name: string, url: string) {
  try {
    const start = Date.now();
    const r = await fetch(url, { method: "GET" });
    const ms = Date.now() - start;
    console.log(`${r.ok ? "✓" : "✗"} ${name.padEnd(28)} ${r.status} (${ms}ms)`);
  } catch (e) {
    console.log(`✗ ${name.padEnd(28)} ERROR ${e instanceof Error ? e.message : e}`);
  }
}

async function main() {
  console.log(`Pinging search engines with sitemap: ${SITEMAP}\n`);
  for (const e of endpoints) await ping(e.name, e.url);
  console.log("\n→ Google: submit manually at https://search.google.com/search-console/sitemaps");
  console.log("→ Or trigger a fresh crawl via 'Inspect URL' on any new /about/* page.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
