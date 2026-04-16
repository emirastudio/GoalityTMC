"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Trophy, Loader2, CalendarDays, ChevronRight, Users } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────

interface TeamInfo {
  teamId: number;
  teamName: string | null;
  displayName: string | null;
  classId: number | null;
  className: string | null;
  regNumber: number;
  regStatus: string;
}

interface TournamentEntry {
  tournament: {
    id: number;
    name: string;
    slug: string;
    startDate: string | null;
    endDate: string | null;
  };
  org: { id: number; slug: string; name: string };
  teams: TeamInfo[];
}

interface ApiResponse {
  tournaments: TournamentEntry[];
}

// ─── Helpers ────────────────────────────────────────────────

function fmtDateRange(start: string | null, end: string | null, locale: string): string {
  if (!start) return "";
  const s = new Date(start);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  if (!end || start === end) {
    return s.toLocaleDateString(locale, opts);
  }
  const e = new Date(end);
  const sameYear = s.getFullYear() === e.getFullYear();
  const startOpts: Intl.DateTimeFormatOptions = sameYear
    ? { day: "numeric", month: "short" }
    : opts;
  return `${s.toLocaleDateString(locale, startOpts)} — ${e.toLocaleDateString(locale, opts)}`;
}

function getTournamentStatus(
  startDate: string | null,
  endDate: string | null
): "upcoming" | "active" | "finished" {
  if (!startDate) return "upcoming";
  const now = Date.now();
  const start = new Date(startDate).getTime();
  const end = endDate ? new Date(endDate).getTime() : start;
  if (now < start) return "upcoming";
  if (now > end + 24 * 60 * 60 * 1000) return "finished";
  return "active";
}

const STATUS_STYLES = {
  upcoming: { bg: "rgba(59,130,246,0.12)", color: "#3B82F6", label: "Upcoming" },
  active:   { bg: "rgba(16,185,129,0.12)", color: "#10B981", label: "Active" },
  finished: { bg: "rgba(100,116,139,0.12)", color: "#64748B", label: "Finished" },
};

// ─── Main client component ───────────────────────────────────

interface Props {
  clubId: number;
}

export function ClubTournamentsClient({ clubId }: Props) {
  const t = useTranslations("clubDashboard");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [data, setData] = useState<TournamentEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/clubs/${clubId}/tournaments`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: ApiResponse) => setData(d.tournaments))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [clubId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2" style={{ color: "var(--cat-text-muted)" }}>
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">{tCommon("loading")}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-2xl border p-12 text-center"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>Failed to load tournaments.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "var(--cat-badge-open-bg)" }}
        >
          <Trophy className="w-5 h-5" style={{ color: "var(--cat-accent)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--cat-text)" }}>
            {t("tournamentsPageTitle")}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            {t("tournamentsPageDesc")}
          </p>
        </div>
      </div>

      {/* Empty state */}
      {data && data.length === 0 && (
        <div
          className="rounded-2xl border-2 border-dashed p-12 text-center"
          style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--cat-tag-bg)" }}
          >
            <Trophy className="w-8 h-8" style={{ color: "var(--cat-accent)", opacity: 0.4 }} />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--cat-text)" }}>
            {t("noTournamentsTitle")}
          </h2>
          <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--cat-text-muted)" }}>
            {t("noTournamentsDesc")}
          </p>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{ background: "var(--cat-accent)", color: "#000", boxShadow: "0 2px 12px var(--cat-accent-glow)" }}
          >
            {t("findTournament")}
          </Link>
        </div>
      )}

      {/* Tournament cards grid */}
      {data && data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((entry) => {
            const status = getTournamentStatus(entry.tournament.startDate, entry.tournament.endDate);
            const statusStyle = STATUS_STYLES[status];
            const dateRange = fmtDateRange(entry.tournament.startDate, entry.tournament.endDate, locale);
            const teamNames = entry.teams
              .map((t) => t.displayName ?? t.teamName ?? `Team ${t.teamId}`)
              .join(", ");

            return (
              <Link
                key={entry.tournament.id}
                href={`/club/tournaments/${entry.tournament.id}`}
                className="rounded-2xl border p-5 flex flex-col gap-3 transition-all hover:opacity-90"
                style={{
                  background: "var(--cat-card-bg)",
                  borderColor: "var(--cat-card-border)",
                  textDecoration: "none",
                }}
              >
                {/* Header row: name + status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold truncate" style={{ color: "var(--cat-text)" }}>
                      {entry.tournament.name}
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                      {entry.org.name}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full"
                    style={{ background: statusStyle.bg, color: statusStyle.color }}
                  >
                    {statusStyle.label}
                  </span>
                </div>

                {/* Date */}
                {dateRange && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--cat-text-muted)" }}>
                    <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                    {dateRange}
                  </div>
                )}

                {/* Teams */}
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--cat-text-muted)" }}>
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{teamNames}</span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-2 border-t" style={{ borderColor: "var(--cat-card-border)" }}>
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }}
                  >
                    {t("teamsCount", { count: entry.teams.length })}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "var(--cat-accent)" }}>
                    {t("viewTournament")}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
