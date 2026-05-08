import { MetadataRoute } from "next";
import { db } from "@/db";
import { organizations, tournaments } from "@/db/schema";
import { eq } from "drizzle-orm";

const BASE = "https://goalityfootball.com";
const LOCALES = ["en", "ru", "et", "es"] as const;

function url(path: string, priority: number, changeFreq: MetadataRoute.Sitemap[number]["changeFrequency"]): MetadataRoute.Sitemap[number][] {
  return LOCALES.map(locale => ({
    url: `${BASE}/${locale}${path}`,
    lastModified: new Date(),
    changeFrequency: changeFreq,
    priority,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    ...url("", 1.0, "weekly"),
    ...url("/draw", 0.9, "weekly"),
    ...url("/pricing", 0.8, "monthly"),
    ...url("/catalog", 0.8, "daily"),
    ...url("/blog", 0.7, "weekly"),
    ...url("/features", 0.7, "monthly"),
    ...url("/features/schedule-planner", 0.6, "monthly"),
    ...url("/login", 0.4, "monthly"),
  ];

  // All public tournaments
  try {
    const rows = await db
      .select({
        slug: tournaments.slug,
        orgSlug: organizations.slug,
        updatedAt: tournaments.updatedAt,
      })
      .from(tournaments)
      .innerJoin(organizations, eq(tournaments.organizationId, organizations.id))
      ;

    for (const t of rows) {
      const base = `/t/${t.orgSlug}/${t.slug}`;
      const lastMod = t.updatedAt ?? new Date();
      for (const locale of LOCALES) {
        entries.push({ url: `${BASE}/${locale}${base}`, lastModified: lastMod, changeFrequency: "daily", priority: 0.9 });
        entries.push({ url: `${BASE}/${locale}${base}/schedule`, lastModified: lastMod, changeFrequency: "daily", priority: 0.7 });
        entries.push({ url: `${BASE}/${locale}${base}/standings`, lastModified: lastMod, changeFrequency: "daily", priority: 0.7 });
        entries.push({ url: `${BASE}/${locale}${base}/teams`, lastModified: lastMod, changeFrequency: "weekly", priority: 0.6 });
      }
    }
  } catch {}

  return entries;
}
