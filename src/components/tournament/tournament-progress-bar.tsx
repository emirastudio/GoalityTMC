"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, PlayCircle, Clock3 } from "lucide-react";
import { pickLocaleText } from "@/lib/i18n-text";

type Stage = {
  id: number;
  name: string;
  nameRu?: string | null;
  nameEt?: string | null;
  nameEs?: string | null;
  order: number;
  type: string;
  status: string;
  classId?: number | null;
  total: number;
  finished: number;
  pct: number;
};

type Group = {
  classId: number | null;
  className: string | null;
  stages: Stage[];
};

type Props = {
  orgSlug: string;
  tournamentSlug: string;
  locale?: string;
  initialGroups?: Group[];
};

function stageName(s: Stage, locale?: string) {
  return pickLocaleText(s as unknown as Record<string, unknown>, locale ?? "en", "name") || s.name;
}

const STATUS_COLORS = {
  finished: { ring: "rgba(16,185,129,0.6)", bg: "rgba(16,185,129,0.13)", text: "#10B981", fill: "#10B981" },
  active:   { ring: "rgba(59,130,246,0.6)", bg: "rgba(59,130,246,0.13)", text: "#60A5FA", fill: "#3B82F6" },
  pending:  { ring: "rgba(148,163,184,0.25)", bg: "rgba(148,163,184,0.06)", text: "#64748B", fill: "rgba(148,163,184,0.2)" },
  draft:    { ring: "rgba(148,163,184,0.25)", bg: "rgba(148,163,184,0.06)", text: "#64748B", fill: "rgba(148,163,184,0.2)" },
} as const;

function getC(status: string) {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.pending;
}

function StageNode({ stage, locale, isLast }: { stage: Stage; locale?: string; isLast: boolean }) {
  const c = getC(stage.status);
  const isDone   = stage.status === "finished";
  const isActive = stage.status === "active";
  const label    = stageName(stage, locale);

  return (
    <div className="flex items-center flex-1 min-w-0">
      <div className="flex flex-col items-center gap-1.5 shrink-0" style={{ minWidth: 68 }}>
        {/* Circle */}
        <div
          className="relative w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: c.bg, boxShadow: `0 0 0 2px ${c.ring}`, color: c.text }}
        >
          {isActive && (
            <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: c.text }} />
          )}
          {/* SVG progress arc */}
          {isActive && stage.total > 0 && (
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="20" fill="none" stroke={c.text} strokeWidth="2"
                strokeDasharray={`${2 * Math.PI * 20 * stage.pct / 100} ${2 * Math.PI * 20}`}
                strokeLinecap="round" opacity="0.55" />
            </svg>
          )}
          {isDone
            ? <CheckCircle2 className="w-5 h-5" />
            : isActive
              ? <PlayCircle className="w-5 h-5" />
              : <Clock3 className="w-4.5 h-4.5 w-[18px] h-[18px]" />
          }
        </div>

        {/* Match count */}
        {stage.total > 0
          ? <span className="text-[11px] font-bold tabular-nums" style={{ color: isDone ? "#10B981" : isActive ? "#60A5FA" : "#475569" }}>
              {stage.finished}/{stage.total}
            </span>
          : <span className="text-[11px]" style={{ color: "#334155" }}>—</span>
        }

        {/* Label */}
        <span className="text-[10px] font-semibold text-center leading-tight max-w-[72px] truncate" style={{ color: c.text }} title={label}>
          {label}
        </span>
      </div>

      {/* Connector */}
      {!isLast && (
        <div className="flex-1 h-[2px] mx-1 relative overflow-hidden rounded-full min-w-[12px]"
          style={{ background: "rgba(148,163,184,0.15)" }}>
          {isDone && <div className="absolute inset-0 rounded-full" style={{ background: "#10B981", opacity: 0.65 }} />}
          {isActive && stage.total > 0 && (
            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
              style={{ width: `${stage.pct}%`, background: "#3B82F6", opacity: 0.65 }} />
          )}
        </div>
      )}
    </div>
  );
}

function ClassRow({ group, locale }: { group: Group; locale?: string }) {
  const total    = group.stages.reduce((a, s) => a + s.total, 0);
  const finished = group.stages.reduce((a, s) => a + s.finished, 0);
  const pct      = total > 0 ? Math.round((finished / total) * 100) : 0;
  const allDone  = group.stages.length > 0 && group.stages.every(s => s.status === "finished");
  const hasActive = group.stages.some(s => s.status === "active");

  return (
    <div className="space-y-2">
      {/* Class header */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          {group.className && (
            <span className="text-[11px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{
                background: allDone ? "rgba(16,185,129,0.12)" : hasActive ? "rgba(59,130,246,0.12)" : "rgba(148,163,184,0.1)",
                color: allDone ? "#10B981" : hasActive ? "#60A5FA" : "#64748B",
              }}>
              {group.className}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <span className="text-[11px] font-semibold tabular-nums" style={{ color: "var(--cat-text-muted)" }}>
              {finished}/{total}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: "var(--cat-tag-bg)" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: allDone ? "#10B981" : "linear-gradient(90deg, #3B82F6, #6366F1)",
                }} />
            </div>
            <span className="text-[11px] font-bold tabular-nums w-7 text-right"
              style={{ color: allDone ? "#10B981" : "#60A5FA" }}>
              {pct}%
            </span>
          </div>
        </div>
      </div>

      {/* Stages pipeline */}
      <div className="flex items-center overflow-x-auto pb-1">
        <div className="flex items-center min-w-max w-full px-1">
          {group.stages.map((stage, i) => (
            <StageNode key={stage.id} stage={stage} locale={locale} isLast={i === group.stages.length - 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TournamentProgressBar({ orgSlug, tournamentSlug, locale, initialGroups }: Props) {
  const [groups, setGroups] = useState<Group[]>(initialGroups ?? []);
  const [loading, setLoading] = useState(!initialGroups);

  useEffect(() => {
    if (initialGroups) return;
    fetch(`/api/public/t/${orgSlug}/${tournamentSlug}/progress`)
      .then(r => r.json())
      .then(d => { setGroups(d.groups ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [orgSlug, tournamentSlug, initialGroups]);

  if (loading) return <div className="h-28 rounded-2xl animate-pulse" style={{ background: "var(--cat-tag-bg)" }} />;
  if (groups.length === 0) return null;

  const allStages     = groups.flatMap(g => g.stages);
  const totalMatches  = allStages.reduce((a, s) => a + s.total, 0);
  const finishedMatches = allStages.reduce((a, s) => a + s.finished, 0);
  const totalPct      = totalMatches > 0 ? Math.round((finishedMatches / totalMatches) * 100) : 0;
  const allDone       = totalMatches > 0 && finishedMatches === totalMatches;
  const hasActive     = allStages.some(s => s.status === "active");

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between gap-4"
        style={{ borderBottom: "1px solid var(--cat-divider)" }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full shrink-0"
            style={{
              background: allDone ? "#10B981" : hasActive ? "#3B82F6" : "#94A3B8",
              boxShadow: hasActive && !allDone ? "0 0 6px #3B82F6" : undefined,
            }} />
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--cat-text-secondary)" }}>
            Tournament Progress
          </span>
        </div>
        <div className="flex items-center gap-3">
          {totalMatches > 0 && (
            <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--cat-text-muted)" }}>
              {finishedMatches}/{totalMatches}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--cat-tag-bg)" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${totalPct}%`,
                  background: allDone ? "#10B981" : "linear-gradient(90deg, #3B82F6, #6366F1)",
                }} />
            </div>
            <span className="text-xs font-bold tabular-nums w-8 text-right"
              style={{ color: allDone ? "#10B981" : "#60A5FA" }}>
              {totalPct}%
            </span>
          </div>
        </div>
      </div>

      {/* Groups */}
      <div className={`px-5 py-4 ${groups.length > 1 ? "space-y-5" : ""}`}>
        {groups.map((g, i) => (
          <div key={g.classId ?? i}>
            {groups.length > 1 && i > 0 && (
              <div className="mb-5" style={{ borderTop: "1px solid var(--cat-divider)" }} />
            )}
            <ClassRow group={g} locale={locale} />
          </div>
        ))}
      </div>
    </div>
  );
}
