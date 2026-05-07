"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTournament } from "@/lib/tournament-context";
import {
  Trophy, RefreshCw, ChevronDown, ChevronRight,
  Loader2, Medal, Users, Check, X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StandingRow {
  id: number;
  position: number;
  teamId: number;
  team?: { id: number; name: string; club?: { name?: string; badgeUrl?: string | null } | null };
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

interface Group {
  id: number;
  name: string;
  order: number;
  standings?: StandingRow[];
}

interface Stage {
  id: number;
  name: string;
  nameRu?: string | null;
  type: "group" | "knockout";
  status: string;
  classId?: number | null;
  groups?: Group[];
}

interface Match {
  id: number;
  matchNumber?: number | null;
  homeScore?: number | null;
  awayScore?: number | null;
  status: string;
  homeTeam?: { id: number; name: string } | null;
  awayTeam?: { id: number; name: string } | null;
  round?: { id: number; name: string; shortName?: string | null } | null;
  group?: { id: number; name: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function medalColor(pos: number) {
  if (pos === 1) return "#f59e0b";
  if (pos === 2) return "#94a3b8";
  if (pos === 3) return "#b45309";
  return "var(--cat-text-muted)";
}

// ─── Group Table ──────────────────────────────────────────────────────────────

function GroupTable({ group, stageName }: { group: Group; stageName: string }) {
  const t = useTranslations("admin");
  const rows = group.standings ?? [];

  const statHeaders = [
    t("results.colPlayed"),
    t("results.colWon"),
    t("results.colDrawn"),
    t("results.colLost"),
    t("results.colGoals"),
    t("results.colGD"),
    t("results.colPoints"),
  ];

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      <div className="px-4 py-3 border-b flex items-center gap-2"
        style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}>
        <Users className="w-3.5 h-3.5" style={{ color: "var(--cat-text-muted)" }} />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--cat-text-secondary)" }}>
          {stageName} · {t("results.groupLabel", { name: group.name })}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="py-8 text-center text-sm" style={{ color: "var(--cat-text-muted)" }}>
          {t("results.emptyTable")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--cat-card-border)" }}>
                <th className="text-left px-4 py-2 text-[11px] font-bold uppercase tracking-wider w-8"
                  style={{ color: "var(--cat-text-muted)" }}>#</th>
                <th className="text-left px-2 py-2 text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--cat-text-muted)" }}>{t("results.colTeam")}</th>
                {statHeaders.map(h => (
                  <th key={h} className="text-center px-2 py-2 text-[11px] font-bold uppercase tracking-wider w-8"
                    style={{ color: "var(--cat-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: i < rows.length - 1 ? "1px solid var(--cat-card-border)" : "none",
                    background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.02)",
                  }}
                >
                  <td className="px-4 py-2.5 text-center">
                    {row.position <= 3 ? (
                      <Medal className="w-3.5 h-3.5 mx-auto" style={{ color: medalColor(row.position) }} />
                    ) : (
                      <span className="text-xs font-semibold" style={{ color: "var(--cat-text-muted)" }}>
                        {row.position}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      {/* Club logo or letter avatar */}
                      {row.team?.club?.badgeUrl ? (
                        <img src={row.team.club.badgeUrl} alt=""
                          style={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0, borderRadius: 5 }} />
                      ) : (
                        <div style={{
                          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                          background: "var(--cat-tag-bg)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 800, color: "var(--cat-text-muted)",
                        }}>
                          {(row.team?.name || row.team?.club?.name || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-sm" style={{ color: "var(--cat-text)" }}>
                          {row.team?.name || row.team?.club?.name || "—"}
                        </div>
                        {row.team?.club?.name && row.team.name && row.team.club.name !== row.team.name && (
                          <div className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                            {row.team.club.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-center text-xs" style={{ color: "var(--cat-text-secondary)" }}>{row.played}</td>
                  <td className="px-2 py-2.5 text-center text-xs font-semibold" style={{ color: "#10b981" }}>{row.won}</td>
                  <td className="px-2 py-2.5 text-center text-xs" style={{ color: "var(--cat-text-secondary)" }}>{row.drawn}</td>
                  <td className="px-2 py-2.5 text-center text-xs" style={{ color: "#ef4444" }}>{row.lost}</td>
                  <td className="px-2 py-2.5 text-center text-xs" style={{ color: "var(--cat-text-secondary)" }}>
                    {row.goalsFor}:{row.goalsAgainst}
                  </td>
                  <td className="px-2 py-2.5 text-center text-xs font-semibold"
                    style={{ color: row.goalDiff > 0 ? "#10b981" : row.goalDiff < 0 ? "#ef4444" : "var(--cat-text-muted)" }}>
                    {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <span className="text-sm font-black" style={{ color: "var(--cat-text)" }}>{row.points}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Inline score editor ──────────────────────────────────────────────────────

interface InlineScoreEditorProps {
  matchId: number;
  homeScore: number;
  awayScore: number;
  base: string;
  onSaved: () => void;
  onCancel: () => void;
}

function InlineScoreEditor({ matchId, homeScore, awayScore, base, onSaved, onCancel }: InlineScoreEditorProps) {
  const t = useTranslations("admin");
  const [home, setHome] = useState(String(homeScore));
  const [away, setAway] = useState(String(awayScore));
  const [saving, setSaving] = useState(false);
  const homeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    homeRef.current?.select();
  }, []);

  async function handleSave() {
    const h = parseInt(home, 10);
    const a = parseInt(away, 10);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;
    setSaving(true);
    try {
      await fetch(`${base}/matches/${matchId}/result`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeScore: h, awayScore: a }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onCancel();
  }

  return (
    <div className="flex items-center gap-1 shrink-0" onKeyDown={handleKeyDown}>
      <input
        ref={homeRef}
        type="number"
        min={0}
        value={home}
        onChange={e => setHome(e.target.value)}
        className="w-10 text-center text-sm font-black tabular-nums rounded border px-1 py-0.5 outline-none"
        style={{
          background: "var(--cat-card-bg)",
          borderColor: "var(--cat-accent)",
          color: "var(--cat-text)",
        }}
        aria-label={t("results.editScore")}
      />
      <span className="text-xs font-bold" style={{ color: "var(--cat-text-muted)" }}>:</span>
      <input
        type="number"
        min={0}
        value={away}
        onChange={e => setAway(e.target.value)}
        className="w-10 text-center text-sm font-black tabular-nums rounded border px-1 py-0.5 outline-none"
        style={{
          background: "var(--cat-card-bg)",
          borderColor: "var(--cat-accent)",
          color: "var(--cat-text)",
        }}
        aria-label={t("results.editScore")}
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="p-1 rounded hover:opacity-80 transition-opacity"
        style={{ color: "#10b981" }}
        title={t("results.saveScore")}
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
      </button>
      <button
        onClick={onCancel}
        disabled={saving}
        className="p-1 rounded hover:opacity-80 transition-opacity"
        style={{ color: "var(--cat-text-muted)" }}
        title={t("results.cancelEdit")}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Knockout matches ─────────────────────────────────────────────────────────

interface KnockoutMatchesProps {
  matches: Match[];
  stageName: string;
  base: string;
  onRefresh: () => void;
}

function KnockoutMatches({ matches, stageName, base, onRefresh }: KnockoutMatchesProps) {
  const t = useTranslations("admin");
  const [editingId, setEditingId] = useState<number | null>(null);

  const byRound = matches.reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.round?.name ?? t("results.matchesFallback");
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {Object.entries(byRound).map(([round, rMatches]) => (
        <div key={round} className="rounded-xl border overflow-hidden"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <div className="px-4 py-2.5 border-b flex items-center gap-2"
            style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}>
            <Trophy className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--cat-text-secondary)" }}>
              {stageName} · {round}
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--cat-card-border)" }}>
            {rMatches.map(m => {
              const isFinished = m.status === "finished";
              const homeWon = isFinished && (m.homeScore ?? 0) > (m.awayScore ?? 0);
              const awayWon = isFinished && (m.awayScore ?? 0) > (m.homeScore ?? 0);
              const isEditing = editingId === m.id;

              return (
                <div key={m.id} className="flex items-center px-4 py-3 gap-3">
                  <span className="flex-1 text-sm font-semibold text-right truncate"
                    style={{ color: homeWon ? "var(--cat-text)" : "var(--cat-text-secondary)", fontWeight: homeWon ? 700 : 400 }}>
                    {m.homeTeam?.name ?? "TBD"}
                  </span>
                  {isEditing ? (
                    <InlineScoreEditor
                      matchId={m.id}
                      homeScore={m.homeScore ?? 0}
                      awayScore={m.awayScore ?? 0}
                      base={base}
                      onSaved={() => { setEditingId(null); onRefresh(); }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setEditingId(m.id)}
                      className="flex items-center gap-1.5 shrink-0 px-3 py-1 rounded-lg min-w-[64px] justify-center transition-opacity hover:opacity-70"
                      style={{
                        background: isFinished ? "var(--cat-tag-bg)" : "transparent",
                        border: isFinished ? "1px solid var(--cat-card-border)" : "1px solid var(--cat-card-border)",
                      }}
                      title={t("results.editScore")}
                    >
                      {isFinished ? (
                        <span className="text-base font-black tabular-nums" style={{ color: "var(--cat-text)" }}>
                          {m.homeScore ?? 0} : {m.awayScore ?? 0}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>vs</span>
                      )}
                    </button>
                  )}
                  <span className="flex-1 text-sm truncate"
                    style={{ color: awayWon ? "var(--cat-text)" : "var(--cat-text-secondary)", fontWeight: awayWon ? 700 : 400 }}>
                    {m.awayTeam?.name ?? "TBD"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Stage Section ────────────────────────────────────────────────────────────

function StageSection({ stage, base, onRefresh }: { stage: Stage; base: string; onRefresh: () => void }) {
  const t = useTranslations("admin");
  const [open, setOpen] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const stageName = stage.nameRu || stage.name;

  const loadMatches = useCallback(() => {
    if (stage.type === "knockout") {
      fetch(`${base}/matches?stageId=${stage.id}&status=finished`)
        .then(r => r.ok ? r.json() : [])
        .then(setMatches)
        .catch(() => []);
    }
  }, [base, stage.id, stage.type]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full mb-3 group"
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: stage.type === "group" ? "rgba(59,130,246,0.15)" : "rgba(245,158,11,0.15)" }}>
          {stage.type === "group"
            ? <Users className="w-3.5 h-3.5" style={{ color: "#3b82f6" }} />
            : <Trophy className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} />}
        </div>
        <span className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>{stageName}</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase"
          style={{
            background: stage.type === "group" ? "rgba(59,130,246,0.1)" : "rgba(245,158,11,0.1)",
            color: stage.type === "group" ? "#3b82f6" : "#f59e0b",
          }}>
          {stage.type === "group" ? t("results.stageTypeGroup") : t("results.stageTypeKnockout")}
        </span>
        {open
          ? <ChevronDown className="w-4 h-4 ml-auto" style={{ color: "var(--cat-text-muted)" }} />
          : <ChevronRight className="w-4 h-4 ml-auto" style={{ color: "var(--cat-text-muted)" }} />}
      </button>

      {open && (
        <div className="space-y-3 ml-2 pl-5 border-l"
          style={{ borderColor: "var(--cat-card-border)" }}>
          {stage.type === "group" && (stage.groups ?? []).map(g => (
            <GroupTable key={g.id} group={g} stageName={stageName} />
          ))}
          {stage.type === "knockout" && (
            <KnockoutMatches
              matches={matches}
              stageName={stageName}
              base={base}
              onRefresh={() => { loadMatches(); onRefresh(); }}
            />
          )}
          {stage.type === "group" && (stage.groups ?? []).length === 0 && (
            <div className="text-sm py-4 text-center" style={{ color: "var(--cat-text-muted)" }}>
              {t("results.noGroups")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ResultsPage() {
  const t = useTranslations("admin");
  const ctx = useTournament();
  const orgSlug = ctx?.orgSlug ?? "";
  const tournamentId = ctx?.tournamentId ?? 0;
  const base = `/api/org/${orgSlug}/tournament/${tournamentId}`;

  const searchParams = useSearchParams();
  const classId = searchParams ? Number(searchParams.get("classId")) || null : null;
  const className = searchParams ? searchParams.get("className") || null : null;

  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = classId ? `${base}/stages?classId=${classId}` : `${base}/stages`;
      const r = await fetch(url);
      if (!r.ok) return;
      const data: Stage[] = await r.json();

      // Load standings for group stages
      const enriched = await Promise.all(data.map(async stage => {
        if (stage.type !== "group") return stage;
        const sr = await fetch(`${base}/standings?stageId=${stage.id}`);
        if (!sr.ok) return stage;
        const groupsWithStandings = await sr.json();
        return { ...stage, groups: groupsWithStandings };
      }));

      setStages(enriched);
    } finally {
      setLoading(false);
    }
  }, [base, classId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--cat-text)" }}>
            {className ? t("results.title", { className }) : t("results.titleDefault")}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            {t("results.subtitle")}
          </p>
        </div>
        <button onClick={load}
          className="p-2 rounded-lg hover:opacity-70 transition-opacity"
          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-12 justify-center" style={{ color: "var(--cat-text-muted)" }}>
          <Loader2 className="w-5 h-5 animate-spin" /> {t("results.loading")}
        </div>
      ) : stages.length === 0 ? (
        <div className="rounded-2xl border py-16 flex flex-col items-center gap-3"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <Trophy className="w-12 h-12 opacity-20" style={{ color: "var(--cat-text)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--cat-text-muted)" }}>{t("results.noStages")}</p>
          <p className="text-xs opacity-60" style={{ color: "var(--cat-text-muted)" }}>
            {t("results.noStagesHint")}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {stages.map(stage => (
            <StageSection key={stage.id} stage={stage} base={base} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
  );
}
