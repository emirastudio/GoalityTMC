"use client";

import { useState, useEffect, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { useTournament } from "@/lib/tournament-context";
import {
  Layers, Trophy, GitBranch, BarChart3,
  ChevronRight, ChevronLeft, Zap, Loader2, CheckCircle,
  Shuffle, RotateCcw, X, Users, Star, Wrench,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormatType = "groups_knockout" | "round_robin" | "groups_only" | "knockout_only";

interface WizardState {
  format: FormatType | null;
  groupCount: number;
  qualifyPerGroup: number;
  knockoutTeams: number;
  groupStageName: string;
  playoffStageName: string;
  thirdPlace: boolean;
  teamGroups: Record<string, number[]>;
}

interface Team {
  id: number;
  name: string;
  clubName?: string | null;
  clubBadgeUrl?: string | null;
}

// ─── Design constants ─────────────────────────────────────────────────────────

const ACCENT = "#2BFEBA";
const GROUP_COLORS = ["#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#a855f7"];
const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

// ─── SVG format previews ──────────────────────────────────────────────────────

function GroupsKnockoutSVG({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 150 80" className="w-full h-full">
      {[GROUP_COLORS[0], GROUP_COLORS[1]].map((gc, i) => (
        <g key={i} transform={`translate(${4 + i * 28}, 6)`}>
          <rect x={0} y={0} width={22} height={42} rx={3} fill={`${gc}12`} stroke={gc} strokeWidth={0.8} strokeOpacity={0.7} />
          <text x={11} y={10} textAnchor="middle" fontSize={6.5} fill={gc} fontWeight="bold">{GROUP_LETTERS[i]}</text>
          {[0, 1, 2].map(t => (
            <rect key={t} x={2} y={14 + t * 9} width={18} height={7} rx={2} fill={`${gc}15`} stroke={gc} strokeWidth={0.4} strokeOpacity={0.4} />
          ))}
        </g>
      ))}
      <text x={62} y={32} fontSize={14} fill={color} opacity={0.5} fontWeight="bold">→</text>
      {[0, 1].map(i => (
        <rect key={i} x={78} y={8 + i * 30} width={22} height={13} rx={3} fill={`${color}18`} stroke={color} strokeWidth={0.9} strokeOpacity={0.6} />
      ))}
      <rect x={108} y={20} width={28} height={15} rx={3} fill={`${color}28`} stroke={color} strokeWidth={1.2} />
      <text x={122} y={31} textAnchor="middle" fontSize={5} fill={color} fontWeight="bold">FINAL</text>
      {[0, 1].map(i => (
        <line key={i} x1={100} y1={14.5 + i * 30} x2={108} y2={27.5} stroke={color} strokeWidth={0.6} strokeOpacity={0.4} />
      ))}
    </svg>
  );
}

function RoundRobinSVG({ color }: { color: string }) {
  const cx = 60, cy = 40, r = 26;
  const n = 6;
  const pts = Array.from({ length: n }, (_, i) => ({
    x: cx + r * Math.cos((2 * Math.PI * i) / n - Math.PI / 2),
    y: cy + r * Math.sin((2 * Math.PI * i) / n - Math.PI / 2),
  }));
  return (
    <svg viewBox="0 0 120 80" className="w-full h-full">
      {pts.map((a, i) => pts.slice(i + 1).map((b, j) => (
        <line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={0.7} strokeOpacity={0.35} />
      )))}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={7} fill={`${color}20`} stroke={color} strokeWidth={1.2} />
      ))}
      <circle cx={cx} cy={cy} r={3} fill={color} opacity={0.5} />
    </svg>
  );
}

function GroupsSVG({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 80" className="w-full h-full">
      {["A", "B", "C", "D"].map((letter, i) => (
        <g key={letter} transform={`translate(${8 + i * 28}, 8)`}>
          <rect x={0} y={0} width={22} height={62} rx={4} fill={`${GROUP_COLORS[i]}12`} stroke={GROUP_COLORS[i]} strokeWidth={0.8} strokeOpacity={0.7} />
          <text x={11} y={11} textAnchor="middle" fontSize={7} fill={GROUP_COLORS[i]} fontWeight="bold">{letter}</text>
          {[0, 1, 2, 3].map(t => (
            <rect key={t} x={3} y={16 + t * 11} width={16} height={8} rx={2} fill={`${GROUP_COLORS[i]}18`} stroke={GROUP_COLORS[i]} strokeWidth={0.5} strokeOpacity={0.4} />
          ))}
        </g>
      ))}
    </svg>
  );
}

function BracketSVG({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 80" className="w-full h-full">
      {[0, 1, 2, 3].map(i => (
        <rect key={i} x={4} y={4 + i * 18} width={24} height={13} rx={3} fill={`${color}15`} stroke={color} strokeWidth={0.8} strokeOpacity={0.6} />
      ))}
      {[0, 1].map(i => (
        <rect key={i} x={36} y={12 + i * 36} width={24} height={13} rx={3} fill={`${color}20`} stroke={color} strokeWidth={0.9} strokeOpacity={0.7} />
      ))}
      <rect x={68} y={29} width={28} height={15} rx={3} fill={`${color}30`} stroke={color} strokeWidth={1.2} />
      <text x={82} y={40} textAnchor="middle" fontSize={5.5} fill={color} fontWeight="bold">FINAL</text>
      {[0, 1, 2, 3].map(i => (
        <line key={i} x1={28} y1={10.5 + i * 18} x2={36} y2={18.5 + Math.floor(i / 2) * 36} stroke={color} strokeWidth={0.6} strokeOpacity={0.4} />
      ))}
      {[0, 1].map(i => (
        <line key={i} x1={60} y1={18.5 + i * 36} x2={68} y2={36.5} stroke={color} strokeWidth={0.6} strokeOpacity={0.4} />
      ))}
    </svg>
  );
}

// ─── League Phase SVG (for CL card) ──────────────────────────────────────────

function LeaguePhaseMiniSVG({ color }: { color: string }) {
  const cx = 60, cy = 40, r = 28;
  const n = 10;
  const pts = Array.from({ length: n }, (_, i) => ({
    x: cx + r * Math.cos((2 * Math.PI * i) / n - Math.PI / 2),
    y: cy + r * Math.sin((2 * Math.PI * i) / n - Math.PI / 2),
  }));
  return (
    <svg viewBox="0 0 120 80" className="w-full h-full">
      {[[0,3],[0,6],[1,4],[2,5],[3,7],[4,8],[5,9]].map(([a,b],i) => (
        <line key={i} x1={pts[a].x} y1={pts[a].y} x2={pts[b].x} y2={pts[b].y}
          stroke={color} strokeWidth={0.6} strokeOpacity={0.25} />
      ))}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i < 3 ? 6 : 4}
          fill={i < 3 ? `${color}30` : `${color}10`}
          stroke={color} strokeWidth={i < 3 ? 1.2 : 0.7} strokeOpacity={i < 3 ? 1 : 0.6} />
      ))}
      {pts.slice(0, 3).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} opacity={0.9} />
      ))}
      <text x={cx} y={cy-2} textAnchor="middle" fontSize={5.5} fill={color} fontWeight="bold">ЛИГА</text>
      <text x={cx} y={cy+5} textAnchor="middle" fontSize={4.5} fill={color} opacity={0.6}>топ→R16</text>
    </svg>
  );
}

function CustomPhaseSVG({ color }: { color: string }) {
  const phaseColors = ["#10b981", "#f59e0b", "#ec4899"];
  return (
    <svg viewBox="0 0 120 80" className="w-full h-full">
      {/* Phase 1: 3 groups */}
      {[0,1,2].map(i => (
        <rect key={i} x={4 + i*16} y={4} width={12} height={32} rx={3}
          fill={`${phaseColors[0]}12`} stroke={phaseColors[0]} strokeWidth={0.7} strokeOpacity={0.7} />
      ))}
      {/* Arrow */}
      <text x={58} y={22} fontSize={10} fill={color} opacity={0.4} fontWeight="bold">→</text>
      {/* Phase 2: 3 secondary groups */}
      {phaseColors.map((c, i) => (
        <rect key={i} x={66 + i*16} y={4} width={12} height={32} rx={3}
          fill={`${c}15`} stroke={c} strokeWidth={0.8} strokeOpacity={0.8} />
      ))}
      {phaseColors.map((c, i) => (
        <text key={i} x={72 + i*16} y={23} textAnchor="middle" fontSize={5} fill={c} fontWeight="bold">
          {["G","S","B"][i]}
        </text>
      ))}
      {/* Phase 3: 3 playoffs */}
      <text x={14} y={55} textAnchor="middle" fontSize={4} fill={phaseColors[0]} opacity={0.7}>↓</text>
      <text x={74} y={55} textAnchor="middle" fontSize={4} fill={phaseColors[0]} opacity={0.7}>↓</text>
      <text x={90} y={55} textAnchor="middle" fontSize={4} fill={phaseColors[1]} opacity={0.7}>↓</text>
      <text x={106} y={55} textAnchor="middle" fontSize={4} fill={phaseColors[2]} opacity={0.7}>↓</text>
      {phaseColors.map((c, i) => (
        <rect key={i} x={66 + i*16} y={60} width={12} height={14} rx={3}
          fill={`${c}12`} stroke={c} strokeWidth={0.7} strokeOpacity={0.7} />
      ))}
      <text x={24} y={70} fontSize={5} fill={color} opacity={0.4} textAnchor="middle">Phase 1</text>
      <text x={90} y={70} fontSize={5} fill={color} opacity={0.4} textAnchor="middle">→ P2 → P3</text>
    </svg>
  );
}

// ─── Format options ───────────────────────────────────────────────────────────

const FORMAT_OPTIONS: {
  type: FormatType;
  color: string;
  gradientFrom: string;
  SVG: React.FC<{ color: string }>;
  title: string;
  desc: string;
  tags: string[];
}[] = [
  {
    type: "groups_knockout",
    color: ACCENT,
    gradientFrom: "rgba(43,254,186,0.15)",
    SVG: GroupsKnockoutSVG,
    title: "Группы + Плей-офф",
    desc: "Групповой этап → лучшие выходят в плей-офф",
    tags: ["Популярный", "Гибкий"],
  },
  {
    type: "round_robin",
    color: "#8b5cf6",
    gradientFrom: "rgba(139,92,246,0.15)",
    SVG: RoundRobinSVG,
    title: "Круговой турнир",
    desc: "Каждый играет с каждым. Победитель по очкам",
    tags: ["Честный", "Без вылетов"],
  },
  {
    type: "groups_only",
    color: "#f59e0b",
    gradientFrom: "rgba(245,158,11,0.15)",
    SVG: GroupsSVG,
    title: "Только группы",
    desc: "Несколько групп, победитель по таблице",
    tags: ["Компактный"],
  },
  {
    type: "knockout_only",
    color: "#ec4899",
    gradientFrom: "rgba(236,72,153,0.15)",
    SVG: BracketSVG,
    title: "Только плей-офф",
    desc: "Прямое выбывание с первого матча",
    tags: ["Быстрый", "Интенсивный"],
  },
];

// ─── Step progress dots ───────────────────────────────────────────────────────

function StepDots({ steps, current }: { steps: string[]; current: number }) {
  const labels: Record<string, string> = {
    format: "Формат",
    structure: "Структура",
    draw: "Жеребьёвка",
    generate: "Запуск",
  };
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((key, i) => (
        <div key={key} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="transition-all duration-500 rounded-full flex items-center justify-center"
              style={{
                width: i === current ? 36 : 28,
                height: i === current ? 36 : 28,
                background: i < current ? ACCENT : i === current ? ACCENT : "var(--cat-tag-bg)",
                border: `2px solid ${i <= current ? ACCENT : "var(--cat-card-border)"}`,
                boxShadow: i === current ? `0 0 18px rgba(43,254,186,0.6)` : "none",
                opacity: i > current ? 0.4 : 1,
              }}
            >
              {i < current
                ? <CheckCircle className="w-3.5 h-3.5" style={{ color: "#000" }} />
                : <span className="text-xs font-black" style={{ color: i === current ? "#000" : "var(--cat-text-muted)" }}>{i + 1}</span>
              }
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-wide transition-all"
              style={{ color: i === current ? ACCENT : "var(--cat-text-muted)", opacity: i > current ? 0.4 : 1 }}>
              {labels[key]}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-16 h-px mx-1 mb-5 transition-all duration-500"
              style={{ background: i < current ? ACCENT : "var(--cat-card-border)", opacity: i < current ? 0.7 : 0.3 }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Special format cards (navigate to sub-pages) ────────────────────────────

const SPECIAL_FORMATS: {
  href: string;
  color: string;
  gradientFrom: string;
  SVG: React.FC<{ color: string }>;
  badge: string;
  title: string;
  desc: string;
  tags: string[];
}[] = [
  {
    href: "champions-league",
    color: "#3b82f6",
    gradientFrom: "rgba(59,130,246,0.15)",
    SVG: LeaguePhaseMiniSVG,
    badge: "⭐ Elite",
    title: "Элитный формат",
    desc: "Elite Phase → Playoff Round → 1/8 финала. Для топ-турниров с большим числом команд",
    tags: ["Swiss", "36 команд", "8 матчей"],
  },
  {
    href: "custom",
    color: "#84cc16",
    gradientFrom: "rgba(132,204,22,0.15)",
    SVG: CustomPhaseSVG,
    badge: "✦ Новое",
    title: "Мой формат",
    desc: "Свои фазы, свои правила переходов. Gold/Silver/Bronze и любые другие схемы",
    tags: ["Гибкий", "Multi-Phase", "Кастом"],
  },
];

// ─── Step 1: Format selector ──────────────────────────────────────────────────

function FormatStep({ state, onSelect, basePath }: { state: WizardState; onSelect: (f: FormatType) => void; basePath: string }) {
  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black mb-2" style={{ color: "var(--cat-text)" }}>Выберите формат турнира</h2>
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
          Определяет структуру — этапы, матчи и порядок выбывания
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto">
        {FORMAT_OPTIONS.map(({ type, color, gradientFrom, SVG, title, desc, tags }) => {
          const isSelected = state.format === type;
          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="relative text-left rounded-2xl border-2 p-5 overflow-hidden transition-all duration-300 group"
              style={{
                background: "var(--cat-card-bg)",
                borderColor: isSelected ? color : "var(--cat-card-border)",
                boxShadow: isSelected ? `0 0 28px ${color}40, inset 0 0 60px ${color}06` : "0 1px 3px rgba(0,0,0,0.04)",
                transform: isSelected ? "scale(1.015)" : "scale(1)",
              }}
            >
              {/* Gradient bg on hover/selected */}
              <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                  background: `radial-gradient(ellipse at 50% 0%, ${gradientFrom}, transparent 70%)`,
                  opacity: isSelected ? 1 : 0,
                }}
              />
              <style jsx>{`
                button:hover > div:first-child { opacity: 0.6 !important; }
              `}</style>

              {/* SVG preview */}
              <div className="relative h-[88px] mb-4">{<SVG color={color} />}</div>

              {/* Tags */}
              <div className="relative flex gap-1.5 mb-3 flex-wrap">
                {tags.map(tag => (
                  <span key={tag} className="text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide"
                    style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
                    {tag}
                  </span>
                ))}
              </div>

              {/* Title + desc */}
              <p className="relative text-base font-black mb-1 transition-colors duration-200"
                style={{ color: isSelected ? color : "var(--cat-text)" }}>
                {title}
              </p>
              <p className="relative text-xs leading-relaxed" style={{ color: "var(--cat-text-muted)" }}>{desc}</p>

              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: color, boxShadow: `0 0 10px ${color}60` }}>
                  <CheckCircle className="w-4 h-4" style={{ color: "#000" }} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6 max-w-3xl mx-auto">
        <div className="flex-1 h-px" style={{ background: "var(--cat-card-border)" }} />
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--cat-text-muted)" }}>
          Продвинутые форматы
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--cat-card-border)" }} />
      </div>

      {/* Special format cards (navigate to sub-pages) */}
      <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto">
        {SPECIAL_FORMATS.map(({ href, color, gradientFrom, SVG, badge, title, desc, tags }) => (
          <Link key={href} href={`${basePath}/${href}`}
            className="relative text-left rounded-2xl border-2 p-5 overflow-hidden transition-all duration-300 group block"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            {/* Hover gradient */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: `radial-gradient(ellipse at 50% 0%, ${gradientFrom}, transparent 70%)` }} />
            {/* Badge */}
            <div className="absolute top-4 right-4">
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full"
                style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                {badge}
              </span>
            </div>
            {/* SVG preview */}
            <div className="relative h-[88px] mb-4"><SVG color={color} /></div>
            {/* Tags */}
            <div className="relative flex gap-1.5 mb-3 flex-wrap">
              {tags.map(tag => (
                <span key={tag} className="text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide"
                  style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
                  {tag}
                </span>
              ))}
            </div>
            {/* Title + desc */}
            <p className="relative text-base font-black mb-1 group-hover:text-current transition-colors"
              style={{ color: "var(--cat-text)" }}>
              {title}
            </p>
            <p className="relative text-xs leading-relaxed" style={{ color: "var(--cat-text-muted)" }}>{desc}</p>
            {/* Arrow */}
            <div className="relative flex items-center gap-1 mt-3 text-xs font-semibold"
              style={{ color }}>
              Открыть <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Step 2: Structure config ─────────────────────────────────────────────────

function CountStepper({ value, onChange, min, max }: { value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-9 h-9 rounded-xl border flex items-center justify-center text-base font-bold transition-all hover:opacity-70"
        style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}>
        −
      </button>
      <span className="w-12 text-center text-xl font-black" style={{ color: ACCENT }}>{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-9 h-9 rounded-xl border flex items-center justify-center text-base font-bold transition-all hover:opacity-70"
        style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}>
        +
      </button>
    </div>
  );
}

function StructureStep({ state, setState, teamCount }: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  teamCount: number;
}) {
  const hasGroups = state.format === "groups_knockout" || state.format === "groups_only";
  const hasKnockout = state.format === "groups_knockout" || state.format === "knockout_only";
  const isRoundRobin = state.format === "round_robin";

  const teamsPerGroup = state.groupCount > 0 ? Math.ceil(teamCount / state.groupCount) : 0;
  const qualifyingTeams = state.groupCount * state.qualifyPerGroup;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black mb-2" style={{ color: "var(--cat-text)" }}>Настройте структуру</h2>
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
          {teamCount} команд зарегистрировано
        </p>
      </div>

      {isRoundRobin && (
        <div className="rounded-2xl border p-5 text-center"
          style={{ background: "rgba(139,92,246,0.06)", borderColor: "rgba(139,92,246,0.3)" }}>
          <BarChart3 className="w-8 h-8 mx-auto mb-3" style={{ color: "#8b5cf6" }} />
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--cat-text)" }}>Одна группа — все против всех</p>
          <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
            {teamCount} команд → {(teamCount * (teamCount - 1)) / 2} матчей
          </p>
        </div>
      )}

      {hasGroups && (
        <div className="rounded-2xl border p-5" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="font-bold" style={{ color: "var(--cat-text)" }}>Количество групп</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                По ~{teamsPerGroup} команд в группе
              </p>
            </div>
            <CountStepper value={state.groupCount} onChange={v => setState(s => ({ ...s, groupCount: v }))} min={2} max={8} />
          </div>
          {/* Group color chips */}
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: state.groupCount }, (_, i) => (
              <span key={i} className="text-xs px-3 py-1 rounded-full font-bold"
                style={{ background: `${GROUP_COLORS[i]}15`, color: GROUP_COLORS[i], border: `1px solid ${GROUP_COLORS[i]}35` }}>
                Группа {GROUP_LETTERS[i]}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasGroups && hasKnockout && (
        <div className="rounded-2xl border p-5" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-bold" style={{ color: "var(--cat-text)" }}>Проходят в плей-офф</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                Лучших команд с каждой группы → {qualifyingTeams} команд итого
              </p>
            </div>
            <CountStepper value={state.qualifyPerGroup} onChange={v => setState(s => ({ ...s, qualifyPerGroup: v }))} min={1} max={4} />
          </div>
        </div>
      )}

      {hasKnockout && (
        <div className="rounded-2xl border p-5" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <p className="font-bold mb-4" style={{ color: "var(--cat-text)" }}>Размер плей-офф сетки</p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[4, 8, 16, 32].map(n => (
              <button key={n} onClick={() => setState(s => ({ ...s, knockoutTeams: n }))}
                className="py-3 rounded-xl text-sm font-black border-2 transition-all"
                style={{
                  borderColor: state.knockoutTeams === n ? ACCENT : "var(--cat-card-border)",
                  background: state.knockoutTeams === n ? "rgba(43,254,186,0.1)" : "var(--cat-tag-bg)",
                  color: state.knockoutTeams === n ? ACCENT : "var(--cat-text-secondary)",
                  boxShadow: state.knockoutTeams === n ? `0 0 14px rgba(43,254,186,0.3)` : "none",
                }}>
                {n}
                <span className="block text-[9px] mt-0.5 font-medium opacity-70">команд</span>
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer text-sm select-none"
            style={{ color: "var(--cat-text-secondary)" }}>
            <input type="checkbox" checked={state.thirdPlace}
              onChange={e => setState(s => ({ ...s, thirdPlace: e.target.checked }))}
              className="w-4 h-4 rounded" style={{ accentColor: ACCENT }} />
            Матч за 3-е место
          </label>
        </div>
      )}

      {/* Stage names */}
      <div className="rounded-2xl border p-5" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <p className="font-bold mb-4" style={{ color: "var(--cat-text)" }}>Названия этапов</p>
        <div className="space-y-3">
          {(hasGroups || isRoundRobin) && (
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--cat-text-muted)" }}>
                {isRoundRobin ? "Название этапа" : "Групповой этап"}
              </label>
              <input value={state.groupStageName}
                onChange={e => setState(s => ({ ...s, groupStageName: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }} />
            </div>
          )}
          {hasKnockout && (
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--cat-text-muted)" }}>Плей-офф</label>
              <input value={state.playoffStageName}
                onChange={e => setState(s => ({ ...s, playoffStageName: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Team draw ────────────────────────────────────────────────────────

function DrawStep({ state, setState, teams }: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  teams: Team[];
}) {
  const groups = Array.from({ length: state.groupCount }, (_, i) => GROUP_LETTERS[i]);
  const assignedIds = new Set(Object.values(state.teamGroups).flat());
  const unassigned = teams.filter(t => !assignedIds.has(t.id));

  function assignTeam(teamId: number, groupLetter: string) {
    setState(s => {
      const newGroups = { ...s.teamGroups };
      for (const key of Object.keys(newGroups)) {
        newGroups[key] = newGroups[key].filter(id => id !== teamId);
      }
      newGroups[groupLetter] = [...(newGroups[groupLetter] ?? []), teamId];
      return { ...s, teamGroups: newGroups };
    });
  }

  function removeTeam(teamId: number) {
    setState(s => {
      const newGroups = { ...s.teamGroups };
      for (const key of Object.keys(newGroups)) {
        newGroups[key] = newGroups[key].filter(id => id !== teamId);
      }
      return { ...s, teamGroups: newGroups };
    });
  }

  function autoDistribute() {
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    const newGroups: Record<string, number[]> = {};
    for (const g of groups) newGroups[g] = [];
    shuffled.forEach((t, i) => {
      newGroups[groups[i % groups.length]].push(t.id);
    });
    setState(s => ({ ...s, teamGroups: newGroups }));
  }

  function clearAll() {
    setState(s => ({ ...s, teamGroups: {} }));
  }

  function getTeam(id: number) {
    return teams.find(t => t.id === id);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>Распределение команд</h2>
          <p className="text-sm mt-1" style={{ color: "var(--cat-text-muted)" }}>
            {unassigned.length > 0 ? `${unassigned.length} из ${teams.length} не распределено` : `Все ${teams.length} команд распределены ✓`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all hover:opacity-80"
            style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)", background: "var(--cat-tag-bg)" }}>
            <RotateCcw className="w-3.5 h-3.5" /> Очистить
          </button>
          <button onClick={autoDistribute}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: ACCENT, color: "#000", boxShadow: `0 0 16px rgba(43,254,186,0.4)` }}>
            <Shuffle className="w-3.5 h-3.5" /> Авто-жеребьёвка
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Unassigned pool */}
        <div className="w-48 shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide mb-2"
            style={{ color: "var(--cat-text-muted)" }}>
            <Users className="w-3.5 h-3.5" /> Пул ({unassigned.length})
          </div>
          <div className="rounded-2xl border p-2 space-y-1.5"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", minHeight: "320px" }}>
            {unassigned.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle className="w-8 h-8 mb-2" style={{ color: ACCENT }} />
                <p className="text-xs font-semibold" style={{ color: ACCENT }}>Все распределены</p>
              </div>
            ) : (
              unassigned.map(team => (
                <div key={team.id}
                  className="rounded-xl border p-2"
                  style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}>
                  <p className="text-xs font-semibold truncate mb-1.5" style={{ color: "var(--cat-text)" }}>
                    {team.name}
                  </p>
                  {/* Quick assign */}
                  <div className="flex gap-1 flex-wrap">
                    {groups.map((g, gi) => (
                      <button key={g} onClick={() => assignTeam(team.id, g)}
                        className="w-6 h-6 rounded-md text-[9px] font-black transition-all hover:opacity-80"
                        style={{ background: `${GROUP_COLORS[gi]}20`, color: GROUP_COLORS[gi], border: `1px solid ${GROUP_COLORS[gi]}35` }}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Group columns */}
        <div className="flex-1 grid gap-3"
          style={{ gridTemplateColumns: `repeat(${Math.min(state.groupCount, 4)}, 1fr)` }}>
          {groups.map((letter, gi) => {
            const gc = GROUP_COLORS[gi];
            const groupTeamIds = state.teamGroups[letter] ?? [];
            const groupTeams = groupTeamIds.map(id => getTeam(id)).filter(Boolean) as Team[];
            return (
              <div key={letter} className="rounded-2xl border-2 overflow-hidden"
                style={{ borderColor: `${gc}45`, background: `${gc}05` }}>
                {/* Group header */}
                <div className="px-3 py-2.5 flex items-center justify-between border-b"
                  style={{ borderColor: `${gc}25`, background: `${gc}12` }}>
                  <span className="text-sm font-black" style={{ color: gc }}>Группа {letter}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${gc}20`, color: gc }}>
                    {groupTeams.length}
                  </span>
                </div>
                {/* Teams */}
                <div className="p-2 space-y-1.5 min-h-[240px]">
                  {groupTeams.map(team => (
                    <div key={team.id} className="flex items-center gap-2 px-2.5 py-2 rounded-xl border"
                      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                      <div className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center text-[8px] font-black"
                        style={{ background: `${gc}20`, color: gc }}>
                        {team.name.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium flex-1 truncate" style={{ color: "var(--cat-text)" }}>
                        {team.name}
                      </span>
                      <button onClick={() => removeTeam(team.id)}
                        className="w-4 h-4 rounded flex items-center justify-center opacity-30 hover:opacity-90 transition-opacity">
                        <X className="w-3 h-3" style={{ color: "var(--cat-text-muted)" }} />
                      </button>
                    </div>
                  ))}
                  {groupTeams.length === 0 && (
                    <div className="flex items-center justify-center py-8 rounded-xl border-2 border-dashed"
                      style={{ borderColor: `${gc}25` }}>
                      <span className="text-xs" style={{ color: gc, opacity: 0.5 }}>+ Добавить команды</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {/* Overflow groups (if > 4) rendered below */}
          {state.groupCount > 4 && (
            <div className="col-span-full grid gap-3"
              style={{ gridTemplateColumns: `repeat(${Math.min(state.groupCount - 4, 4)}, 1fr)` }}>
              {groups.slice(4).map((letter, gi) => {
                const gc = GROUP_COLORS[4 + gi];
                const groupTeamIds = state.teamGroups[letter] ?? [];
                const groupTeams = groupTeamIds.map(id => getTeam(id)).filter(Boolean) as Team[];
                return (
                  <div key={letter} className="rounded-2xl border-2 overflow-hidden"
                    style={{ borderColor: `${gc}45`, background: `${gc}05` }}>
                    <div className="px-3 py-2.5 flex items-center justify-between border-b"
                      style={{ borderColor: `${gc}25`, background: `${gc}12` }}>
                      <span className="text-sm font-black" style={{ color: gc }}>Группа {letter}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${gc}20`, color: gc }}>
                        {groupTeams.length}
                      </span>
                    </div>
                    <div className="p-2 space-y-1.5 min-h-[120px]">
                      {groupTeams.map(team => (
                        <div key={team.id} className="flex items-center gap-2 px-2.5 py-2 rounded-xl border"
                          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                          <span className="text-xs font-medium flex-1 truncate" style={{ color: "var(--cat-text)" }}>{team.name}</span>
                          <button onClick={() => removeTeam(team.id)} className="opacity-30 hover:opacity-90 transition-opacity">
                            <X className="w-3 h-3" style={{ color: "var(--cat-text-muted)" }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Generate & confirm ───────────────────────────────────────────────

function GenerateStep({ state, teams, generating }: {
  state: WizardState;
  teams: Team[];
  generating: boolean;
}) {
  const formatOption = FORMAT_OPTIONS.find(f => f.type === state.format);
  const hasGroups = state.format === "groups_knockout" || state.format === "groups_only";
  const hasKnockout = state.format === "groups_knockout" || state.format === "knockout_only";
  const isRR = state.format === "round_robin";

  const groupMatchCount = hasGroups
    ? (() => {
        const tpg = Math.ceil(teams.length / state.groupCount);
        return state.groupCount * ((tpg * (tpg - 1)) / 2);
      })()
    : isRR
    ? (teams.length * (teams.length - 1)) / 2
    : 0;
  const koMatchCount = hasKnockout ? state.knockoutTeams - 1 + (state.thirdPlace ? 1 : 0) : 0;
  const totalMatches = groupMatchCount + koMatchCount;

  const summaryItems = [
    hasGroups && { label: "Групп", value: state.groupCount, color: GROUP_COLORS[0] },
    { label: "Команд", value: teams.length, color: ACCENT },
    hasKnockout && { label: "Плей-офф", value: `${state.knockoutTeams} команд`, color: "#ec4899" },
    { label: "≈ Матчей", value: totalMatches, color: "#f59e0b" },
  ].filter(Boolean) as { label: string; value: string | number; color: string }[];

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{
            background: `${formatOption?.color ?? ACCENT}18`,
            boxShadow: `0 0 32px ${formatOption?.color ?? ACCENT}30`,
          }}>
          <Zap className="w-8 h-8" style={{ color: formatOption?.color ?? ACCENT }} />
        </div>
        <h2 className="text-2xl font-black mb-2" style={{ color: "var(--cat-text)" }}>Готово к запуску</h2>
        <p className="text-sm max-w-xs mx-auto" style={{ color: "var(--cat-text-muted)" }}>
          Система создаст этапы, группы и матчи. Затем вы сможете задать даты и поля.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {summaryItems.map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border p-4 text-center"
            style={{ background: "var(--cat-card-bg)", borderColor: `${color}25`, boxShadow: `0 0 12px ${color}10` }}>
            <p className="text-2xl font-black" style={{ color }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Format badge */}
      <div className="rounded-2xl border p-4 mb-5 flex items-center gap-3"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${formatOption?.color}18` }}>
          <Trophy className="w-5 h-5" style={{ color: formatOption?.color }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>{formatOption?.title}</p>
          <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{formatOption?.desc}</p>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase"
          style={{ background: `${formatOption?.color}15`, color: formatOption?.color }}>
          Выбран
        </span>
      </div>

      {generating && (
        <div className="rounded-2xl border p-6 text-center"
          style={{ background: "rgba(43,254,186,0.04)", borderColor: `${ACCENT}30` }}>
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: ACCENT }} />
          <p className="text-sm font-semibold" style={{ color: ACCENT }}>Создаём структуру турнира...</p>
          <p className="text-xs mt-1" style={{ color: "var(--cat-text-muted)" }}>Это займёт несколько секунд</p>
        </div>
      )}
    </div>
  );
}

// ─── Done screen ──────────────────────────────────────────────────────────────

function DoneScreen({ orgSlug, tournamentId }: { orgSlug: string; tournamentId: number }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center"
          style={{ background: "rgba(43,254,186,0.12)", boxShadow: "0 0 50px rgba(43,254,186,0.35)" }}>
          <CheckCircle className="w-12 h-12" style={{ color: ACCENT }} />
        </div>
        {/* Glow rings */}
        <div className="absolute inset-0 rounded-3xl animate-ping opacity-10"
          style={{ background: ACCENT }} />
      </div>
      <h2 className="text-3xl font-black mb-3" style={{ color: "var(--cat-text)" }}>Формат создан!</h2>
      <p className="text-sm mb-8 max-w-sm" style={{ color: "var(--cat-text-muted)" }}>
        Этапы, группы и матчи успешно сгенерированы. Теперь можно задать даты и управлять расписанием.
      </p>
      <div className="flex gap-3">
        <Link
          href={`/org/${orgSlug}/admin/tournament/${tournamentId}/schedule`}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
          style={{ background: ACCENT, color: "#000", boxShadow: `0 0 24px rgba(43,254,186,0.45)` }}>
          Перейти к расписанию <ChevronRight className="w-4 h-4" />
        </Link>
        <Link
          href={`/org/${orgSlug}/admin/tournament/${tournamentId}`}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border"
          style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)", background: "var(--cat-card-bg)" }}>
          Обзор турнира
        </Link>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRoundDefs(totalTeams: number, thirdPlace: boolean) {
  const rounds: { name: string; nameRu: string; shortName: string; matchCount: number; isTwoLegged: boolean; hasThirdPlace: boolean }[] = [];
  const nameMap: Record<number, { name: string; nameRu: string; short: string }> = {
    2:  { name: "Final",        nameRu: "Финал",          short: "F" },
    4:  { name: "Semi-Final",   nameRu: "Полуфинал",      short: "SF" },
    8:  { name: "Quarter-Final",nameRu: "Четвертьфинал",  short: "QF" },
    16: { name: "Round of 16",  nameRu: "1/8 финала",     short: "R16" },
    32: { name: "Round of 32",  nameRu: "1/16 финала",    short: "R32" },
  };

  let n = totalTeams;
  while (n >= 2) {
    const info = nameMap[n] ?? { name: `Round of ${n}`, nameRu: `1/${n / 2} финала`, short: `R${n}` };
    rounds.push({
      name: info.name,
      nameRu: info.nameRu,
      shortName: info.short,
      matchCount: n / 2,
      isTwoLegged: false,
      hasThirdPlace: n === 2 && thirdPlace,
    });
    if (n === 2 && thirdPlace) {
      rounds.push({
        name: "3rd Place",
        nameRu: "Матч за 3-е место",
        shortName: "3P",
        matchCount: 1,
        isTwoLegged: false,
        hasThirdPlace: false,
      });
    }
    n = n / 2;
  }
  return rounds;
}

// ─── Main wizard component ────────────────────────────────────────────────────

export function FormatBuilderPage() {
  const ctx = useTournament();
  const tournamentId = ctx?.tournamentId ?? 0;
  const orgSlug = ctx?.orgSlug ?? "";

  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>({
    format: null,
    groupCount: 4,
    qualifyPerGroup: 2,
    knockoutTeams: 8,
    groupStageName: "Group Stage",
    playoffStageName: "Playoffs",
    thirdPlace: true,
    teamGroups: {},
  });
  const [teams, setTeams] = useState<Team[]>([]);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!orgSlug || !tournamentId) return;
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/teams`)
      .then(r => r.json())
      .then(d => setTeams(Array.isArray(d) ? d : (d.teams ?? [])));
  }, [orgSlug, tournamentId]);

  const steps: string[] = useMemo(() => {
    if (state.format === "groups_knockout" || state.format === "groups_only") {
      return ["format", "structure", "draw", "generate"];
    }
    return ["format", "structure", "generate"];
  }, [state.format]);

  const currentStepKey = steps[step] ?? "format";

  function goNext() {
    if (step < steps.length - 1) setStep(s => s + 1);
  }

  function goBack() {
    if (step > 0) setStep(s => s - 1);
  }

  function handleFormatSelect(f: FormatType) {
    setState(s => ({ ...s, format: f }));
    setStep(1); // Auto-advance
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const hasGroups = state.format === "groups_knockout" || state.format === "groups_only" || state.format === "round_robin";
      const hasKnockout = state.format === "groups_knockout" || state.format === "knockout_only";

      if (hasGroups) {
        const stageRes = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/stages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: state.groupStageName, nameRu: "Групповой этап", type: "group", order: 1 }),
        });
        const stage = await stageRes.json();

        if (state.format === "round_robin") {
          const groupRes = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/stages/${stage.id}/groups`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Main Group", nameEn: "Main Group", order: 1 }),
          });
          const group = await groupRes.json();
          await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/groups/${group.id}/teams`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teamIds: teams.map(t => t.id) }),
          });
          await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/matches/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stageId: stage.id, groupId: group.id }),
          });
        } else {
          for (let i = 0; i < state.groupCount; i++) {
            const letter = GROUP_LETTERS[i];
            const groupRes = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/stages/${stage.id}/groups`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: `Group ${letter}`, nameEn: `Group ${letter}`, order: i + 1 }),
            });
            const group = await groupRes.json();
            const teamIds = state.teamGroups[letter] ?? [];
            if (teamIds.length > 0) {
              await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/groups/${group.id}/teams`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teamIds }),
              });
            }
            if (teamIds.length >= 2) {
              await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/matches/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stageId: stage.id, groupId: group.id }),
              });
            }
          }
        }
      }

      if (hasKnockout) {
        const koRes = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/stages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: state.playoffStageName, nameRu: "Плей-офф", type: "knockout", order: 2 }),
        });
        const koStage = await koRes.json();
        const roundDefs = getRoundDefs(state.knockoutTeams, state.thirdPlace);
        for (let i = 0; i < roundDefs.length; i++) {
          await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/stages/${koStage.id}/rounds`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...roundDefs[i], order: i + 1 }),
          });
        }
      }

      setDone(true);
    } catch (e) {
      console.error("Format generation error:", e);
    } finally {
      setGenerating(false);
    }
  }

  if (done) {
    return <DoneScreen orgSlug={orgSlug} tournamentId={tournamentId} />;
  }

  return (
    <div className="min-h-[70vh] flex flex-col">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(43,254,186,0.12)", boxShadow: "0 0 18px rgba(43,254,186,0.25)" }}>
            <Layers className="w-5 h-5" style={{ color: ACCENT }} />
          </div>
          <h1 className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>Конструктор формата</h1>
        </div>
        <p className="text-sm ml-12" style={{ color: "var(--cat-text-muted)" }}>
          Настройте этапы, распределите команды и сгенерируйте расписание
        </p>
      </div>

      {/* Step progress */}
      <StepDots steps={steps} current={step} />

      {/* Step content */}
      <div className="flex-1">
        {currentStepKey === "format" && (
          <FormatStep state={state} onSelect={handleFormatSelect}
            basePath={`/org/${orgSlug}/admin/tournament/${tournamentId}/format`} />
        )}
        {currentStepKey === "structure" && (
          <StructureStep state={state} setState={setState} teamCount={teams.length} />
        )}
        {currentStepKey === "draw" && (
          <DrawStep state={state} setState={setState} teams={teams} />
        )}
        {currentStepKey === "generate" && (
          <GenerateStep state={state} teams={teams} generating={generating} />
        )}
      </div>

      {/* Navigation footer */}
      {currentStepKey !== "format" && (
        <div className="flex items-center justify-between mt-10 pt-6 border-t"
          style={{ borderColor: "var(--cat-card-border)" }}>
          <button onClick={goBack}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
            style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)", background: "var(--cat-card-bg)" }}>
            <ChevronLeft className="w-4 h-4" /> Назад
          </button>

          {currentStepKey !== "generate" ? (
            <button onClick={goNext}
              className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{ background: ACCENT, color: "#000", boxShadow: `0 0 18px rgba(43,254,186,0.4)` }}>
              Далее <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleGenerate} disabled={generating}
              className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-black transition-all disabled:opacity-60"
              style={{
                background: generating ? "var(--cat-card-border)" : ACCENT,
                color: generating ? "var(--cat-text-muted)" : "#000",
                boxShadow: generating ? "none" : `0 0 28px rgba(43,254,186,0.5)`,
              }}>
              {generating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Генерируется...</>
                : <><Zap className="w-4 h-4" /> Создать формат</>
              }
            </button>
          )}
        </div>
      )}
    </div>
  );
}
