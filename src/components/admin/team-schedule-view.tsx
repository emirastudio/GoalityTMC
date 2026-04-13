"use client";

import { useMemo, useState } from "react";
import { Clock, ChevronDown } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamScheduleMatch {
  id: number;
  matchNumber?: number | null;
  scheduledAt?: string | null;
  homeTeamId?: number | null;
  awayTeamId?: number | null;
  homeTeam?: { id?: number; name: string } | null;
  awayTeam?: { id?: number; name: string } | null;
  stage?: { id?: number; name: string; type?: string | null; classId?: number | null } | null;
  group?: { id: number; name: string } | null;
  round?: { id?: number; name: string; shortName?: string | null; order?: number | null } | null;
  field?: { id?: number; name: string; stadium?: { name: string } | null } | null;
  fieldId?: number | null;
  groupRound?: number | null;
  status: string;
}

interface TournamentClass {
  id: number;
  name: string;
  scheduleConfig?: { minRestBetweenTeamMatchesMinutes?: number } | null;
}

interface Team {
  id: number;
  name: string;
  classId?: number | null;
}

interface TeamScheduleViewProps {
  matches: TeamScheduleMatch[];
  classes: TournamentClass[];
  teams?: Team[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseUtcMs(iso: string): number {
  return new Date(iso).getTime();
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function fmtDate(iso: string): string {
  // iso = "YYYY-MM-DD"
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("ru", { day: "numeric", month: "short", timeZone: "UTC" });
}

function fmtDayOfWeek(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("ru", { weekday: "short", timeZone: "UTC" });
}

function fmtRestMins(mins: number): string {
  if (mins < 60) return `${mins}м`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}ч${m}м` : `${h}ч`;
}

const STAGE_COLORS = [
  "#2BFEBA", "#6366f1", "#f59e0b", "#ec4899", "#3b82f6",
  "#10b981", "#f97316", "#a855f7", "#14b8a6", "#ef4444",
];

// ─── Main component ───────────────────────────────────────────────────────────

export function TeamScheduleView({ matches, classes, teams = [] }: TeamScheduleViewProps) {
  const [selectedClassId, setSelectedClassId] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "matches" | "firstMatch">("firstMatch");

  // Stage color map
  const stageColorMap = useMemo(() => {
    const stageIds = [...new Set(matches.map(m => m.stage?.id).filter(Boolean) as number[])];
    const map = new Map<number, string>();
    stageIds.forEach((id, i) => map.set(id, STAGE_COLORS[i % STAGE_COLORS.length]));
    return map;
  }, [matches]);

  // Filter by class
  const filteredMatches = useMemo(() => {
    if (selectedClassId === "all") return matches;
    return matches.filter(m => m.stage?.classId === selectedClassId);
  }, [matches, selectedClassId]);

  // All unique days (sorted)
  const allDays = useMemo(() => {
    const days = new Set<string>();
    for (const m of filteredMatches) {
      if (m.scheduledAt) days.add(m.scheduledAt.slice(0, 10));
    }
    return [...days].sort();
  }, [filteredMatches]);

  // Min rest from config
  const minRestMins = useMemo(() => {
    const cfg = selectedClassId !== "all"
      ? classes.find(c => c.id === selectedClassId)?.scheduleConfig
      : classes[0]?.scheduleConfig;
    return cfg?.minRestBetweenTeamMatchesMinutes ?? 60;
  }, [classes, selectedClassId]);

  // Per-team match lists (all days combined, sorted by time)
  const teamMatchMap = useMemo(() => {
    const map = new Map<number, TeamScheduleMatch[]>();
    for (const m of filteredMatches) {
      if (!m.scheduledAt) continue;
      for (const tid of [m.homeTeamId, m.awayTeamId]) {
        if (!tid) continue;
        if (!map.has(tid)) map.set(tid, []);
        map.get(tid)!.push(m);
      }
    }
    for (const [, ms] of map) {
      ms.sort((a, b) => parseUtcMs(a.scheduledAt!) - parseUtcMs(b.scheduledAt!));
    }
    return map;
  }, [filteredMatches]);

  // Per-team per-day matches
  const teamDayMap = useMemo(() => {
    const map = new Map<number, Map<string, TeamScheduleMatch[]>>();
    for (const [tid, ms] of teamMatchMap) {
      const dayMap = new Map<string, TeamScheduleMatch[]>();
      for (const m of ms) {
        const day = m.scheduledAt!.slice(0, 10);
        if (!dayMap.has(day)) dayMap.set(day, []);
        dayMap.get(day)!.push(m);
      }
      map.set(tid, dayMap);
    }
    return map;
  }, [teamMatchMap]);

  // Visible teams list
  const visibleTeams = useMemo(() => {
    const teamIds = [...teamMatchMap.keys()];
    let result = teamIds.map(id => {
      let name = teams.find(t => t.id === id)?.name;
      if (!name) {
        for (const m of teamMatchMap.get(id) ?? []) {
          if (m.homeTeamId === id && m.homeTeam?.name) { name = m.homeTeam.name; break; }
          if (m.awayTeamId === id && m.awayTeam?.name) { name = m.awayTeam.name; break; }
        }
      }
      const ms = teamMatchMap.get(id) ?? [];
      const hasViolation = ms.some((m, i) => {
        if (i === 0 || !m.scheduledAt || !ms[i - 1].scheduledAt) return false;
        const rest = Math.round((parseUtcMs(m.scheduledAt) - parseUtcMs(ms[i - 1].scheduledAt!) - 45 * 60000) / 60000);
        return rest < minRestMins;
      });
      return { id, name: name ?? `Команда #${id}`, matches: ms, hasViolation };
    }).filter(t => !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (sortBy === "name") result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "matches") result.sort((a, b) => b.matches.length - a.matches.length);
    else result.sort((a, b) => {
      const fa = a.matches[0]?.scheduledAt ?? "z";
      const fb = b.matches[0]?.scheduledAt ?? "z";
      return fa.localeCompare(fb);
    });

    return result;
  }, [teamMatchMap, teams, searchQuery, sortBy, minRestMins]);

  const scheduledCount = filteredMatches.filter(m => m.scheduledAt).length;

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>

      {/* ── Header ── */}
      <div className="px-4 py-3 border-b flex items-center gap-3 flex-wrap"
        style={{ borderColor: "var(--cat-card-border)" }}>
        <span className="font-bold text-base" style={{ color: "var(--cat-text)" }}>
          📋 Расписание по командам
        </span>
        <span className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
          {visibleTeams.length} команд · {scheduledCount} матчей · {allDays.length} дн.
        </span>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {classes.length > 1 && (
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value === "all" ? "all" : +e.target.value)}
                className="rounded-lg px-3 py-1.5 text-sm outline-none appearance-none pr-8"
                style={{
                  background: "var(--cat-input-bg, var(--cat-tag-bg))",
                  border: "1px solid var(--cat-card-border)",
                  color: "var(--cat-text)",
                }}
              >
                <option value="all">Все дивизионы</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-2 w-4 h-4 pointer-events-none"
                style={{ color: "var(--cat-text-muted)" }} />
            </div>
          )}

          <input
            type="text"
            placeholder="Поиск команды..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-sm outline-none"
            style={{
              background: "var(--cat-input-bg, var(--cat-tag-bg))",
              border: "1px solid var(--cat-card-border)",
              color: "var(--cat-text)",
              width: 180,
            }}
          />

          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--cat-card-border)" }}>
            {([["name", "А-Я"], ["matches", "Матчи"], ["firstMatch", "По времени"]] as const).map(([v, label]) => (
              <button key={v} onClick={() => setSortBy(v)}
                className="px-3 py-1.5 text-sm transition-all"
                style={{
                  background: sortBy === v ? "rgba(43,254,186,0.15)" : "var(--cat-tag-bg)",
                  color: sortBy === v ? "#2BFEBA" : "var(--cat-text-muted)",
                  fontWeight: sortBy === v ? 700 : 400,
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="px-4 py-2 flex items-center gap-4 flex-wrap border-b"
        style={{ borderColor: "var(--cat-card-border)", background: "rgba(0,0,0,0.1)" }}>
        <span className="text-xs flex items-center gap-1" style={{ color: "var(--cat-text-muted)" }}>
          <Clock className="w-3 h-3" /> Отдых:
        </span>
        {[
          ["#ef4444", `<${minRestMins}м (нарушение)`],
          ["#f59e0b", "<120м (спорно)"],
          ["#2BFEBA", "≥120м (норм)"],
        ].map(([color, label]) => (
          <span key={label} className="flex items-center gap-1 text-xs" style={{ fontSize: 12 }}>
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: color }} />
            <span style={{ color: "var(--cat-text-secondary)" }}>{label}</span>
          </span>
        ))}
      </div>

      {/* ── Grid ── */}
      <div className="overflow-x-auto">
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 600 }}>
          {/* Day header row */}
          <thead>
            <tr>
              {/* Team name column */}
              <th
                style={{
                  width: 190,
                  minWidth: 190,
                  padding: "8px 12px",
                  textAlign: "left",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--cat-text-muted)",
                  background: "rgba(0,0,0,0.15)",
                  borderBottom: "1px solid var(--cat-card-border)",
                  borderRight: "1px solid var(--cat-card-border)",
                  position: "sticky",
                  left: 0,
                  zIndex: 2,
                }}
              >
                Команда
              </th>
              {allDays.map(day => (
                <th key={day}
                  style={{
                    padding: "6px 10px",
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: 600,
                    background: "rgba(0,0,0,0.15)",
                    borderBottom: "1px solid var(--cat-card-border)",
                    borderRight: "1px solid var(--cat-card-border)",
                    minWidth: 130,
                    whiteSpace: "nowrap",
                  }}
                >
                  <div style={{ color: "var(--cat-text)", fontWeight: 700, fontSize: 13 }}>{fmtDate(day)}</div>
                  <div style={{ color: "var(--cat-text-muted)", fontWeight: 400, fontSize: 11 }}>{fmtDayOfWeek(day)}</div>
                </th>
              ))}
              {/* Total */}
              <th style={{
                padding: "6px 10px",
                textAlign: "center",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--cat-text-muted)",
                background: "rgba(0,0,0,0.15)",
                borderBottom: "1px solid var(--cat-card-border)",
                minWidth: 60,
                whiteSpace: "nowrap",
              }}>
                Итого
              </th>
            </tr>
          </thead>

          <tbody>
            {visibleTeams.length === 0 && (
              <tr>
                <td colSpan={allDays.length + 2}
                  style={{ textAlign: "center", padding: "32px", color: "var(--cat-text-muted)", fontSize: 14 }}>
                  Нет запланированных матчей
                </td>
              </tr>
            )}
            {visibleTeams.map(({ id, name, matches: teamMatches, hasViolation }, rowIdx) => {
              const dayMap = teamDayMap.get(id);
              const isEven = rowIdx % 2 === 0;
              const rowBg = isEven ? "rgba(255,255,255,0.02)" : "transparent";

              return (
                <tr key={id}>
                  {/* Team name cell */}
                  <td style={{
                    padding: "8px 12px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: hasViolation ? "#f59e0b" : "var(--cat-text)",
                    background: isEven ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.12)",
                    borderBottom: "1px solid var(--cat-card-border)",
                    borderRight: "1px solid var(--cat-card-border)",
                    whiteSpace: "nowrap",
                    position: "sticky",
                    left: 0,
                    zIndex: 1,
                  }}>
                    {hasViolation && <span className="mr-1">⚠</span>}
                    {name}
                  </td>

                  {/* Day cells */}
                  {allDays.map(day => {
                    const dayMatches = dayMap?.get(day) ?? [];
                    return (
                      <td key={day} style={{
                        padding: "6px 8px",
                        verticalAlign: "top",
                        borderBottom: "1px solid var(--cat-card-border)",
                        borderRight: "1px solid var(--cat-card-border)",
                        background: dayMatches.length > 0 ? rowBg : "transparent",
                        minWidth: 130,
                      }}>
                        {dayMatches.length === 0 ? (
                          <span style={{ color: "rgba(255,255,255,0.08)", fontSize: 16, display: "block", textAlign: "center", paddingTop: 4 }}>—</span>
                        ) : (
                          <DayCell
                            teamId={id}
                            matches={dayMatches}
                            allTeamMatches={teamMatches}
                            minRestMins={minRestMins}
                            stageColorMap={stageColorMap}
                          />
                        )}
                      </td>
                    );
                  })}

                  {/* Total */}
                  <td style={{
                    padding: "6px 10px",
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--cat-text-muted)",
                    borderBottom: "1px solid var(--cat-card-border)",
                    background: rowBg,
                    whiteSpace: "nowrap",
                  }}>
                    {teamMatches.length}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── DayCell: matches for one team on one day ─────────────────────────────────

function DayCell({
  teamId, matches, allTeamMatches, minRestMins, stageColorMap,
}: {
  teamId: number;
  matches: TeamScheduleMatch[];
  allTeamMatches: TeamScheduleMatch[];
  minRestMins: number;
  stageColorMap: Map<number, string>;
}) {
  return (
    <div className="flex flex-col gap-1">
      {matches.map((m, idx) => {
        const color = stageColorMap.get(m.stage?.id ?? 0) ?? "#2BFEBA";
        const isPlayoff = !m.group && !!m.round;
        const label = m.matchNumber ? `#${m.matchNumber}` : `#${m.id}`;
        const timeLabel = m.scheduledAt ? fmtTime(m.scheduledAt) : "?";
        const opponent = m.homeTeamId === teamId ? m.awayTeam : m.homeTeam;
        const isHome = m.homeTeamId === teamId;
        const stageLabel = m.group?.name ?? m.round?.shortName ?? m.round?.name ?? "";

        // Rest gap before this match (from previous in full team schedule)
        let restEl: React.ReactNode = null;
        const globalIdx = allTeamMatches.findIndex(x => x.id === m.id);
        if (globalIdx > 0 && allTeamMatches[globalIdx - 1].scheduledAt && m.scheduledAt) {
          const prev = allTeamMatches[globalIdx - 1];
          const restMins = Math.round((parseUtcMs(m.scheduledAt) - parseUtcMs(prev.scheduledAt!) - 45 * 60000) / 60000);
          const restColor = restMins < minRestMins ? "#ef4444" : restMins < 120 ? "#f59e0b" : "#2BFEBA";
          const prevDay = prev.scheduledAt!.slice(0, 10);
          const curDay = m.scheduledAt.slice(0, 10);
          const crossDay = prevDay !== curDay;

          restEl = (
            <div className="flex items-center gap-1 px-1" style={{ marginBottom: 2 }}>
              <div style={{ width: 2, height: 10, background: restColor, borderRadius: 1 }} />
              <span style={{ fontSize: 10, color: restColor, fontWeight: 600 }}>
                {crossDay ? `+${fmtRestMins(restMins)} ↵` : fmtRestMins(restMins)}
              </span>
            </div>
          );
        }

        return (
          <div key={m.id}>
            {restEl}
            <div
              style={{
                borderLeft: `3px solid ${color}`,
                background: `${color}12`,
                borderRadius: "0 6px 6px 0",
                padding: "4px 7px",
                fontSize: 12,
              }}
              title={`${label} · ${stageLabel} · ${m.field?.name ?? ""}`}
            >
              {/* Time + match number */}
              <div className="flex items-center gap-1.5" style={{ marginBottom: 1 }}>
                <span style={{ color, fontWeight: 700, fontSize: 11 }}>{timeLabel}</span>
                <span style={{ color: "var(--cat-text-muted)", fontSize: 10 }}>{label}</span>
                {isPlayoff && <span style={{ color, fontSize: 9 }}>★</span>}
                {stageLabel && (
                  <span style={{
                    fontSize: 9, fontWeight: 600, background: `${color}20`, color,
                    borderRadius: 3, padding: "0 3px", marginLeft: "auto",
                  }}>
                    {stageLabel}
                  </span>
                )}
              </div>
              {/* Opponent */}
              <div style={{ fontSize: 11, color: "var(--cat-text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 }}>
                {isHome ? "🏠" : "✈"} {opponent?.name ?? "TBD"}
              </div>
              {/* Field */}
              {m.field?.name && (
                <div style={{ fontSize: 10, color: "var(--cat-text-muted)", marginTop: 1 }}>
                  {m.field.name}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
