import { db } from "@/db";
import {
  tournamentFollowers,
  tournamentNews,
  tournamentNewsReads,
  tournaments,
  organizations,
} from "@/db/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { Star, MapPin, Calendar, Newspaper } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClubSubscriptionsPage() {
  const session = await getSession();
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "clubDashboard.subscriptionsPage" });

  if (!session || session.role !== "club" || !session.clubId) {
    redirect(`/${locale}/login`);
  }
  const clubId = session.clubId;

  // List of followed tournaments with metadata in one query.
  const rows = await db
    .select({
      followId: tournamentFollowers.id,
      followedAt: tournamentFollowers.createdAt,
      tournamentId: tournaments.id,
      tournamentName: tournaments.name,
      tournamentSlug: tournaments.slug,
      tournamentYear: tournaments.year,
      tournamentLogoUrl: tournaments.logoUrl,
      tournamentCardImageUrl: tournaments.cardImageUrl,
      tournamentCoverUrl: tournaments.coverUrl,
      tournamentStartDate: tournaments.startDate,
      tournamentEndDate: tournaments.endDate,
      tournamentCity: tournaments.city,
      tournamentCountry: tournaments.country,
      orgSlug: organizations.slug,
      orgName: organizations.name,
    })
    .from(tournamentFollowers)
    .innerJoin(tournaments, eq(tournamentFollowers.tournamentId, tournaments.id))
    .innerJoin(organizations, eq(tournaments.organizationId, organizations.id))
    .where(eq(tournamentFollowers.clubId, clubId))
    .orderBy(desc(tournamentFollowers.createdAt));

  // Per-tournament unread count. For V1 (each club follows ~tens of
  // tournaments at most), per-row subqueries are fine.
  const enriched = await Promise.all(
    rows.map(async (r) => {
      const [{ unread }] = await db
        .select({
          unread: sql<number>`
            COUNT(*)::int FILTER (
              WHERE NOT EXISTS (
                SELECT 1 FROM ${tournamentNewsReads}
                WHERE ${tournamentNewsReads.newsId} = ${tournamentNews.id}
                  AND ${tournamentNewsReads.clubId} = ${clubId}
              )
            )
          `,
        })
        .from(tournamentNews)
        .where(
          and(
            eq(tournamentNews.tournamentId, r.tournamentId),
            eq(tournamentNews.status, "published"),
          ),
        );
      const [{ total }] = await db
        .select({ total: count() })
        .from(tournamentNews)
        .where(
          and(
            eq(tournamentNews.tournamentId, r.tournamentId),
            eq(tournamentNews.status, "published"),
          ),
        );
      return { ...r, unreadCount: Number(unread ?? 0), publishedCount: Number(total ?? 0) };
    }),
  );

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <header className="mb-6 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "var(--cat-tag-bg)" }}
        >
          <Star className="w-5 h-5" style={{ color: "var(--cat-accent)" }} />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-black" style={{ color: "var(--cat-text)" }}>
            {t("pageTitle")}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            {enriched.length} {enriched.length === 1 ? t("countSingular") : t("countPlural")}
          </p>
        </div>
      </header>

      {enriched.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
        >
          <Star className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--cat-text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--cat-text-secondary)" }}>{t("empty")}</p>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}
          >
            {t("emptyCta")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {enriched.map((f) => {
            const card = f.tournamentCardImageUrl ?? f.tournamentCoverUrl;
            const dateLabel =
              f.tournamentStartDate
                ? new Date(f.tournamentStartDate).toLocaleDateString(locale, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : null;
            return (
              <Link
                key={f.followId}
                href={`/t/${f.orgSlug}/${f.tournamentSlug}/news`}
                className="flex items-center gap-4 rounded-2xl border p-3 md:p-4 transition-all hover:scale-[1.005]"
                style={{
                  background: "var(--cat-card-bg)",
                  borderColor: f.unreadCount > 0 ? "rgba(43,254,186,0.35)" : "var(--cat-card-border)",
                }}
              >
                {card ? (
                  <img
                    src={card}
                    alt={f.tournamentName}
                    className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-16 h-16 md:w-20 md:h-20 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "var(--cat-tag-bg)" }}
                  >
                    {f.tournamentLogoUrl ? (
                      <img src={f.tournamentLogoUrl} alt="" className="w-10 h-10 object-contain" />
                    ) : (
                      <Star className="w-6 h-6" style={{ color: "var(--cat-text-muted)" }} />
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>
                    {f.orgName}
                  </p>
                  <p className="text-base font-bold truncate" style={{ color: "var(--cat-text)" }}>
                    {f.tournamentName}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                    {dateLabel && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {dateLabel}
                      </span>
                    )}
                    {f.tournamentCity && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {f.tournamentCity}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {f.unreadCount > 0 ? (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                      style={{
                        background: "rgba(43,254,186,0.15)",
                        color: "var(--cat-accent)",
                        border: "1px solid rgba(43,254,186,0.4)",
                      }}
                    >
                      <Newspaper className="w-3 h-3" /> {f.unreadCount} {t("unreadShort")}
                    </span>
                  ) : (
                    <span className="text-[11px]" style={{ color: "var(--cat-text-faint)" }}>
                      {f.publishedCount > 0 ? t("noUnread") : t("noNews")}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
