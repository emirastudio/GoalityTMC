"use client";

/**
 * Champions League Format Wizard
 * League Phase (single table, all teams) → Playoff Round → Knockout Stage
 * Based on UEFA Champions League 2024/25+ format
 */

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { useTournament } from "@/lib/tournament-context";
import {
  ChevronLeft, ChevronRight, Zap, Loader2, CheckCircle,
  Star, Trophy, Target, ArrowRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

const ACCENT = "#3b82f6"; // Blue for Elite Format

interface CLState {
  teamCount: number;
  directSpots: number;    // top N → direct to R16
  playoffSpots: number;   // next M → Playoff Round (must be even)
  knockoutSize: number;   // directSpots + playoffSpots/2
  leagueStageName: string;
  playoffRoundName: string;
  knockoutStageName: string;
  thirdPlace: boolean;
}

// ─── SVG: League Phase diagram ────────────────────────────────────────────────

function LeaguePhaseSVG({ color }: { color: string }) {
  const cx = 75, cy = 42;
  const n = 12;
  const r = 32;
  const pts = Array.from({ length: n }, (_, i) => ({
    x: cx + r * Math.cos((2 * Math.PI * i) / n - Math.PI / 2),
    y: cy + r * Math.sin((2 * Math.PI * i) / n - Math.PI / 2),
  }));

  // Only draw some lines (not all, looks cleaner)
  const lineIndices = [[0, 3], [0, 6], [0, 9], [1, 4], [1, 7], [2, 5], [2, 8], [3, 8], [4, 9], [5, 10], [6, 11]];

  return (
    <svg viewBox="0 0 150 84" className="w-full h-full">
      {lineIndices.map(([a, b], i) => (
        <line key={i} x1={pts[a].x} y1={pts[a].y} x2={pts[b].x} y2={pts[b].y}
          stroke={color} strokeWidth={0.6} strokeOpacity={0.25} />
      ))}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i < 4 ? 6 : 4.5}
          fill={i < 4 ? `${color}30` : `${color}12`}
          stroke={color}
          strokeWidth={i < 4 ? 1.2 : 0.8}
          strokeOpacity={i < 4 ? 1 : 0.6}
        />
      ))}
      {/* Top 8 highlight */}
      {pts.slice(0, 4).map((p, i) => (
        <circle key={`top-${i}`} cx={p.x} cy={p.y} r={3}
          fill={color} opacity={0.8} />
      ))}
      {/* Center label */}
      <text x={cx} y={cy - 3} textAnchor="middle" fontSize={6} fill={color} fontWeight="bold">ELITE</text>
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={5} fill={color} opacity={0.7}>36 teams</text>
    </svg>
  );
}

// ─── Standings diagram ─────────────────────────────────────────────────────────

function StandingsDiagram({ directSpots, playoffSpots, totalTeams, color }: {
  directSpots: number;
  playoffSpots: number;
  totalTeams: number;
  color: string;
}) {
  const eliminated = totalTeams - directSpots - playoffSpots;
  const rows = [
    { label: `Топ ${directSpots}`, range: `1–${directSpots}`, outcome: "Прямо в 1/8", outcomeColor: "#10b981", width: (directSpots / totalTeams) * 100 },
    { label: `${playoffSpots} команд`, range: `${directSpots + 1}–${directSpots + playoffSpots}`, outcome: "Плей-офф раунд", outcomeColor: color, width: (playoffSpots / totalTeams) * 100 },
    { label: `${eliminated} команд`, range: `${directSpots + playoffSpots + 1}–${totalTeams}`, outcome: "Выбывают", outcomeColor: "#dc2626", width: (eliminated / totalTeams) * 100 },
  ];

  return (
    <div className="space-y-2">
      {rows.map(row => (
        <div key={row.outcome} className="flex items-center gap-3">
          <div className="w-28 shrink-0">
            <p className="text-xs font-semibold" style={{ color: "var(--cat-text)" }}>{row.range}</p>
            <p className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>{row.label}</p>
          </div>
          <div className="flex-1 h-8 rounded-xl overflow-hidden" style={{ background: "var(--cat-tag-bg)" }}>
            <div className="h-full rounded-xl flex items-center px-3 transition-all duration-500"
              style={{ width: `${row.width}%`, background: `${row.outcomeColor}20`, border: `1px solid ${row.outcomeColor}35` }}>
            </div>
          </div>
          <div className="w-36 shrink-0">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${row.outcomeColor}15`, color: row.outcomeColor }}>
              {row.outcome}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function NumberStepper({ value, onChange, min, max, step: step_ = 1 }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={() => onChange(Math.max(min, value - step_))}
        className="w-9 h-9 rounded-xl border flex items-center justify-center text-base font-bold transition-all hover:opacity-70"
        style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}>
        −
      </button>
      <span className="w-10 text-center text-xl font-black" style={{ color: ACCENT }}>{value}</span>
      <button onClick={() => onChange(Math.min(max, value + step_))}
        className="w-9 h-9 rounded-xl border flex items-center justify-center text-base font-bold transition-all hover:opacity-70"
        style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}>
        +
      </button>
    </div>
  );
}

// ─── Config Step ──────────────────────────────────────────────────────────────

function CLConfigStep({ state, setState, teamCount }: {
  state: CLState;
  setState: (s: CLState) => void;
  teamCount: number;
}) {
  const eliminated = state.teamCount - state.directSpots - state.playoffSpots;
  const knockoutSize = state.directSpots + Math.ceil(state.playoffSpots / 2);

  function update(updates: Partial<CLState>) {
    setState({ ...state, ...updates });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black mb-2" style={{ color: "var(--cat-text)" }}>Настройка формата</h2>
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
          По образцу Лиги чемпионов UEFA 2024/25 · {teamCount} команд зарегистрировано
        </p>
      </div>

      {/* League Phase diagram + info */}
      <div className="rounded-2xl border p-5 flex gap-5"
        style={{ background: "var(--cat-card-bg)", borderColor: `${ACCENT}30`, boxShadow: `0 0 20px ${ACCENT}10` }}>
        <div className="w-32 h-20 shrink-0">
          <LeaguePhaseSVG color={ACCENT} />
        </div>
        <div>
          <p className="text-sm font-bold mb-1" style={{ color: "var(--cat-text)" }}>Элит-фаза</p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--cat-text-muted)" }}>
            Все команды в единой таблице. Каждая команда играет против 8 разных соперников (по 2 из каждой корзины).
            Победители не вылетают — определяется место в общей таблице.
          </p>
          <div className="flex gap-2 mt-2">
            {["Один круг", "Единая таблица", "8 матчей"].map(tag => (
              <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase"
                style={{ background: `${ACCENT}15`, color: ACCENT }}>{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Team count */}
      <div className="rounded-2xl border p-5" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="font-bold" style={{ color: "var(--cat-text)" }}>Команд в элите</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>Стандарт Лиги чемпионов — 36</p>
          </div>
          <NumberStepper value={state.teamCount} onChange={v => update({ teamCount: v })} min={12} max={64} step={4} />
        </div>
        {/* Preset buttons */}
        <div className="flex gap-2">
          {[24, 32, 36].map(n => (
            <button key={n} onClick={() => update({ teamCount: n })}
              className="px-4 py-1.5 rounded-xl text-xs font-bold border-2 transition-all"
              style={{
                borderColor: state.teamCount === n ? ACCENT : "var(--cat-card-border)",
                background: state.teamCount === n ? `${ACCENT}15` : "var(--cat-tag-bg)",
                color: state.teamCount === n ? ACCENT : "var(--cat-text-secondary)",
              }}>
              {n} {n === 36 && "★"}
            </button>
          ))}
        </div>
      </div>

      {/* Direct spots */}
      <div className="rounded-2xl border p-5" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="font-bold flex items-center gap-2" style={{ color: "var(--cat-text)" }}>
              <span className="text-lg">🥇</span> Прямо в 1/8 финала
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
              Команды, занявшие топ-N мест, выходят напрямую
            </p>
          </div>
          <NumberStepper value={state.directSpots}
            onChange={v => update({ directSpots: v })}
            min={4} max={Math.floor(state.teamCount / 2)} />
        </div>
      </div>

      {/* Playoff spots */}
      <div className="rounded-2xl border p-5" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="font-bold flex items-center gap-2" style={{ color: "var(--cat-text)" }}>
              <span className="text-lg">⚔️</span> В Плей-офф раунд
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
              Следующие M команд — двухматчевая серия, победители выходят в 1/8
            </p>
          </div>
          <NumberStepper value={state.playoffSpots}
            onChange={v => update({ playoffSpots: v % 2 === 0 ? v : v + 1 })}
            min={4} max={state.teamCount - state.directSpots - 4}
            step={2} />
        </div>
        <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
          Обязательно чётное число (двухматчевые пары). {Math.floor(state.playoffSpots / 2)} пар → {Math.floor(state.playoffSpots / 2)} победителей.
        </p>
      </div>

      {/* Visual standings diagram */}
      <div className="rounded-2xl border p-5" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <p className="font-bold mb-4" style={{ color: "var(--cat-text)" }}>Итоговая таблица → результат</p>
        <StandingsDiagram
          directSpots={state.directSpots}
          playoffSpots={state.playoffSpots}
          totalTeams={state.teamCount}
          color={ACCENT}
        />
        {eliminated < 0 && (
          <p className="text-xs mt-3 text-red-400">⚠ Прямые места + плей-офф места превышают количество команд!</p>
        )}
      </div>

      {/* Stage names */}
      <div className="rounded-2xl border p-5" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <p className="font-bold mb-4" style={{ color: "var(--cat-text)" }}>Названия этапов</p>
        <div className="space-y-3">
          {([
            { label: "Элит-фаза", key: "leagueStageName" as const },
            { label: "Плей-офф раунд", key: "playoffRoundName" as const },
            { label: "Стадия нокаута (1/8+)", key: "knockoutStageName" as const },
          ] as { label: string; key: keyof CLState }[]).map(({ label, key }) => (
            <div key={key as string}>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--cat-text-muted)" }}>{label}</label>
              <input value={state[key] as string}
                onChange={e => update({ [key]: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Generate step ────────────────────────────────────────────────────────────

function CLGenerateStep({ state, teams, generating }: { state: CLState; teams: { id: number }[]; generating: boolean }) {
  const eliminated = state.teamCount - state.directSpots - state.playoffSpots;
  const knockoutSize = state.directSpots + Math.floor(state.playoffSpots / 2);

  const summaryItems = [
    { label: "Команд в элите", value: state.teamCount, color: ACCENT },
    { label: "Прямо в 1/8", value: state.directSpots, color: "#10b981" },
    { label: "Плей-офф раунд", value: `${state.playoffSpots} команд`, color: "#8b5cf6" },
    { label: "Выбывают", value: eliminated > 0 ? eliminated : "—", color: "#dc2626" },
  ];

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: `${ACCENT}18`, boxShadow: `0 0 32px ${ACCENT}30` }}>
          <Star className="w-8 h-8" style={{ color: ACCENT }} />
        </div>
        <h2 className="text-2xl font-black mb-2" style={{ color: "var(--cat-text)" }}>Элитный формат готова</h2>
        <p className="text-sm max-w-xs mx-auto" style={{ color: "var(--cat-text-muted)" }}>
          Будут созданы Элит-фаза, Плей-офф раунд и основная сетка нокаута
        </p>
      </div>

      {/* Stage flow */}
      <div className="flex items-center gap-2 justify-center mb-6">
        {[
          { name: state.leagueStageName, color: ACCENT, icon: "🏟" },
          { name: state.playoffRoundName, color: "#8b5cf6", icon: "⚔️" },
          { name: state.knockoutStageName, color: "#ec4899", icon: "🏆" },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="rounded-xl px-3 py-2 text-center"
              style={{ background: `${s.color}12`, border: `1px solid ${s.color}35` }}>
              <p className="text-base">{s.icon}</p>
              <p className="text-[10px] font-bold mt-0.5" style={{ color: s.color }}>{s.name}</p>
            </div>
            {i < 2 && <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-text-muted)" }} />}
          </div>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {summaryItems.map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border p-4 text-center"
            style={{ background: "var(--cat-card-bg)", borderColor: `${color}25` }}>
            <p className="text-2xl font-black" style={{ color }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      {generating && (
        <div className="rounded-2xl border p-6 text-center"
          style={{ background: `${ACCENT}05`, borderColor: `${ACCENT}30` }}>
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: ACCENT }} />
          <p className="text-sm font-semibold" style={{ color: ACCENT }}>Создаём Лигу чемпионов...</p>
        </div>
      )}
    </div>
  );
}

// ─── Done Screen ──────────────────────────────────────────────────────────────

function DoneScreen({ orgSlug, tournamentId }: { orgSlug: string; tournamentId: number }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8"
        style={{ background: `${ACCENT}15`, boxShadow: `0 0 50px ${ACCENT}35` }}>
        <CheckCircle className="w-12 h-12" style={{ color: ACCENT }} />
      </div>
      <h2 className="text-3xl font-black mb-3" style={{ color: "var(--cat-text)" }}>Формат создан!</h2>
      <p className="text-sm mb-8 max-w-sm" style={{ color: "var(--cat-text-muted)" }}>
        Элит-фаза, Плей-офф раунд и Стадия нокаута созданы. Теперь назначьте команды и сгенерируйте матчи.
      </p>
      <div className="flex gap-3">
        <Link href={`/org/${orgSlug}/admin/tournament/${tournamentId}/schedule`}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
          style={{ background: ACCENT, color: "#000", boxShadow: `0 0 24px ${ACCENT}45` }}>
          К расписанию <ChevronRight className="w-4 h-4" />
        </Link>
        <Link href={`/org/${orgSlug}/admin/tournament/${tournamentId}`}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border"
          style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)", background: "var(--cat-card-bg)" }}>
          Обзор
        </Link>
      </div>
    </div>
  );
}

// ─── Round defs ───────────────────────────────────────────────────────────────

function getRoundDefs(totalTeams: number, thirdPlace: boolean) {
  const rounds: { name: string; nameRu: string; shortName: string; matchCount: number; isTwoLegged: boolean; hasThirdPlace: boolean }[] = [];
  const nameMap: Record<number, { name: string; nameRu: string; short: string }> = {
    2:  { name: "Final",         nameRu: "Финал",         short: "F" },
    4:  { name: "Semi-Final",    nameRu: "Полуфинал",     short: "SF" },
    8:  { name: "Quarter-Final", nameRu: "Четвертьфинал", short: "QF" },
    16: { name: "Round of 16",   nameRu: "1/8 финала",    short: "R16" },
    32: { name: "Round of 32",   nameRu: "1/16 финала",   short: "R32" },
  };
  let n = totalTeams;
  while (n >= 2) {
    const info = nameMap[n] ?? { name: `Round of ${n}`, nameRu: `1/${n / 2} финала`, short: `R${n}` };
    rounds.push({ name: info.name, nameRu: info.nameRu, shortName: info.short, matchCount: n / 2, isTwoLegged: false, hasThirdPlace: n === 2 && thirdPlace });
    if (n === 2 && thirdPlace) {
      rounds.push({ name: "3rd Place", nameRu: "За 3-е место", shortName: "3P", matchCount: 1, isTwoLegged: false, hasThirdPlace: false });
    }
    n = n / 2;
  }
  return rounds;
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

const STEPS = ["config", "generate"] as const;
type Step = typeof STEPS[number];

export function CLFormatWizard() {
  const ctx = useTournament();
  const tournamentId = ctx?.tournamentId ?? 0;
  const orgSlug = ctx?.orgSlug ?? "";

  const [step, setStep] = useState<Step>("config");
  const [state, setState] = useState<CLState>({
    teamCount: 36,
    directSpots: 8,
    playoffSpots: 16,
    knockoutSize: 16,
    leagueStageName: "Elite Phase",
    playoffRoundName: "Playoff Round",
    knockoutStageName: "Knockouts",
    thirdPlace: false,
  });
  const [teams, setTeams] = useState<{ id: number }[]>([]);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!orgSlug || !tournamentId) return;
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/teams`)
      .then(r => r.json())
      .then(d => setTeams(Array.isArray(d) ? d : (d.teams ?? [])));
  }, [orgSlug, tournamentId]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      // 1. Create League Phase (type: league)
      const leagueRes = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: state.leagueStageName, nameRu: "Элит-фаза", type: "league", order: 1 }),
      });
      const leagueStage = await leagueRes.json();

      // Create single group with all teams
      const groupRes = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/stages/${leagueStage.id}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Elite Table", nameEn: "Elite Table", order: 1 }),
      });
      const leagueGroup = await groupRes.json();

      // Assign all registered teams
      if (teams.length > 0) {
        await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/groups/${leagueGroup.id}/teams`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamIds: teams.map(t => t.id) }),
        });
      }

      // 2. Create Knockout stage (with Playoff Round embedded)
      const koRes = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: state.knockoutStageName, nameRu: "Нокаут-стадия", type: "knockout", order: 2 }),
      });
      const koStage = await koRes.json();

      // Add Playoff Round as first rounds
      const playoffPairs = Math.floor(state.playoffSpots / 2);
      await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/stages/${koStage.id}/rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.playoffRoundName, nameRu: "Плей-офф раунд", shortName: "PO",
          matchCount: playoffPairs, isTwoLegged: true, hasThirdPlace: false, order: 1,
        }),
      });

      // Add main knockout rounds: R16, QF, SF, Final
      const knockoutSize = state.directSpots + playoffPairs;
      const roundDefs = getRoundDefs(knockoutSize, state.thirdPlace);
      for (let i = 0; i < roundDefs.length; i++) {
        await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/stages/${koStage.id}/rounds`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...roundDefs[i], order: i + 2 }),
        });
      }

      // 3. Create qualification rules: League → Knockout
      // Top directSpots → direct to R16 slot
      await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/qualification-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromStageId: leagueStage.id,
          targetStageId: koStage.id,
          fromRank: 1, toRank: state.directSpots,
          targetSlot: "direct_knockout",
          condition: { type: "cl_direct", description: `Top ${state.directSpots} → Direct to Round of 16` },
        }),
      });

      // Next playoffSpots → Playoff Round
      await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/qualification-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromStageId: leagueStage.id,
          targetStageId: koStage.id,
          fromRank: state.directSpots + 1, toRank: state.directSpots + state.playoffSpots,
          targetSlot: "playoff_round",
          condition: { type: "cl_playoff", description: `Ranks ${state.directSpots + 1}-${state.directSpots + state.playoffSpots} → Playoff Round` },
        }),
      });

      setDone(true);
    } catch (e) {
      console.error("CL format generation error:", e);
    } finally {
      setGenerating(false);
    }
  }

  if (done) return <DoneScreen orgSlug={orgSlug} tournamentId={tournamentId} />;

  return (
    <div className="min-h-[70vh] flex flex-col">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link href={`/org/${orgSlug}/admin/tournament/${tournamentId}/format`}
          className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all hover:opacity-70"
          style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>
          <ChevronLeft className="w-4 h-4" style={{ color: "var(--cat-text-secondary)" }} />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">⭐</span>
            <h1 className="text-xl font-black" style={{ color: "var(--cat-text)" }}>Элитный формат</h1>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            Elite Phase + Playoff Round + Knockout — премиум формат для топ-турниров
          </p>
        </div>
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-0 mb-10">
        {STEPS.map((s, i) => {
          const labels: Record<Step, string> = { config: "Настройка", generate: "Запуск" };
          const idx = STEPS.indexOf(step);
          return (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className="rounded-full flex items-center justify-center transition-all duration-500"
                  style={{
                    width: s === step ? 36 : 28, height: s === step ? 36 : 28,
                    background: i < idx ? ACCENT : s === step ? ACCENT : "var(--cat-tag-bg)",
                    border: `2px solid ${i <= idx ? ACCENT : "var(--cat-card-border)"}`,
                    boxShadow: s === step ? `0 0 18px ${ACCENT}60` : "none",
                    opacity: i > idx ? 0.4 : 1,
                  }}>
                  {i < idx ? <CheckCircle className="w-3.5 h-3.5" style={{ color: "#000" }} />
                    : <span className="text-xs font-black" style={{ color: s === step ? "#000" : "var(--cat-text-muted)" }}>{i + 1}</span>}
                </div>
                <span className="text-[9px] font-semibold uppercase tracking-wide"
                  style={{ color: s === step ? ACCENT : "var(--cat-text-muted)", opacity: i > idx ? 0.4 : 1 }}>
                  {labels[s]}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-20 h-px mx-1 mb-5"
                  style={{ background: i < idx ? ACCENT : "var(--cat-card-border)", opacity: i < idx ? 0.7 : 0.3 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1">
        {step === "config" && <CLConfigStep state={state} setState={setState} teamCount={teams.length} />}
        {step === "generate" && <CLGenerateStep state={state} teams={teams} generating={generating} />}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t" style={{ borderColor: "var(--cat-card-border)" }}>
        <button onClick={() => setStep("config")} disabled={step === "config"}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80 disabled:opacity-30"
          style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)", background: "var(--cat-card-bg)" }}>
          <ChevronLeft className="w-4 h-4" /> Назад
        </button>

        {step === "config" ? (
          <button onClick={() => setStep("generate")}
            className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{ background: ACCENT, color: "#000", boxShadow: `0 0 18px ${ACCENT}40` }}>
            Далее <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-black transition-all disabled:opacity-60"
            style={{
              background: generating ? "var(--cat-card-border)" : ACCENT,
              color: generating ? "var(--cat-text-muted)" : "#000",
              boxShadow: generating ? "none" : `0 0 28px ${ACCENT}50`,
            }}>
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Создаётся...</> : <><Zap className="w-4 h-4" /> Создать формат</>}
          </button>
        )}
      </div>
    </div>
  );
}
