"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTournament } from "@/lib/tournament-context";
import {
  Layers, Trophy, GitBranch, BarChart3,
  ChevronRight, ChevronLeft, Zap, Loader2, CheckCircle,
  Users, Info, Target, ArrowRight,
  Trash2, LayoutGrid,
  ChevronDown, Edit2, Save, X,
} from "lucide-react";
import { useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormatType = "groups_knockout" | "round_robin" | "groups_only" | "knockout_only";

interface WizardState {
  format: FormatType | null;
  expectedTeams: number;
  groupCount: number;
  qualifyPerGroup: number;
  knockoutTeams: number;
  groupStageName: string;
  playoffStageName: string;
  thirdPlace: boolean;
  bBracket: boolean;  // B-playoff / consolation bracket for non-qualifiers
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
      <text x={cx} y={cy-2} textAnchor="middle" fontSize={5.5} fill={color} fontWeight="bold">LIGA</text>
      <text x={cx} y={cy+5} textAnchor="middle" fontSize={4.5} fill={color} opacity={0.6}>top→R16</text>
    </svg>
  );
}

function CustomPhaseSVG({ color }: { color: string }) {
  const t = useTranslations("formatBuilder");
  const phaseColors = ["#10b981", "#f59e0b", "#ec4899"];
  return (
    <svg viewBox="0 0 120 80" className="w-full h-full">
      {[0,1,2].map(i => (
        <rect key={i} x={4 + i*16} y={4} width={12} height={32} rx={3}
          fill={`${phaseColors[0]}12`} stroke={phaseColors[0]} strokeWidth={0.7} strokeOpacity={0.7} />
      ))}
      <text x={58} y={22} fontSize={10} fill={color} opacity={0.4} fontWeight="bold">→</text>
      {phaseColors.map((c, i) => (
        <rect key={i} x={66 + i*16} y={4} width={12} height={32} rx={3}
          fill={`${c}15`} stroke={c} strokeWidth={0.8} strokeOpacity={0.8} />
      ))}
      {phaseColors.map((c, i) => (
        <text key={i} x={72 + i*16} y={23} textAnchor="middle" fontSize={5} fill={c} fontWeight="bold">
          {["G","S","B"][i]}
        </text>
      ))}
      <text x={14} y={55} textAnchor="middle" fontSize={4} fill={phaseColors[0]} opacity={0.7}>↓</text>
      <text x={74} y={55} textAnchor="middle" fontSize={4} fill={phaseColors[0]} opacity={0.7}>↓</text>
      <text x={90} y={55} textAnchor="middle" fontSize={4} fill={phaseColors[1]} opacity={0.7}>↓</text>
      <text x={106} y={55} textAnchor="middle" fontSize={4} fill={phaseColors[2]} opacity={0.7}>↓</text>
      {phaseColors.map((c, i) => (
        <rect key={i} x={66 + i*16} y={60} width={12} height={14} rx={3}
          fill={`${c}12`} stroke={c} strokeWidth={0.7} strokeOpacity={0.7} />
      ))}
      <text x={24} y={70} fontSize={5} fill={color} opacity={0.4} textAnchor="middle">{t("phase1")}</text>
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
  titleKey: string;
  descKey: string;
  tagKeys: string[];
}[] = [
  {
    type: "groups_knockout",
    color: ACCENT,
    gradientFrom: "rgba(43,254,186,0.15)",
    SVG: GroupsKnockoutSVG,
    titleKey: "fmtGroupsKnockoutTitle",
    descKey: "fmtGroupsKnockoutDesc",
    tagKeys: ["tagPopular", "tagFlexible"],
  },
  {
    type: "round_robin",
    color: "#8b5cf6",
    gradientFrom: "rgba(139,92,246,0.15)",
    SVG: RoundRobinSVG,
    titleKey: "fmtRoundRobinTitle",
    descKey: "fmtRoundRobinDesc",
    tagKeys: ["tagFair", "tagNoElimination"],
  },
  {
    type: "groups_only",
    color: "#f59e0b",
    gradientFrom: "rgba(245,158,11,0.15)",
    SVG: GroupsSVG,
    titleKey: "fmtGroupsOnlyTitle",
    descKey: "fmtGroupsOnlyDesc",
    tagKeys: ["tagCompact"],
  },
  {
    type: "knockout_only",
    color: "#ec4899",
    gradientFrom: "rgba(236,72,153,0.15)",
    SVG: BracketSVG,
    titleKey: "fmtKnockoutOnlyTitle",
    descKey: "fmtKnockoutOnlyDesc",
    tagKeys: ["tagFast", "tagIntense"],
  },
];

const SPECIAL_FORMATS: {
  href: string;
  color: string;
  gradientFrom: string;
  SVG: React.FC<{ color: string }>;
  badgeKey: string;
  titleKey: string;
  descKey: string;
  tagKeys: string[];
}[] = [
  {
    href: "champions-league",
    color: "#3b82f6",
    gradientFrom: "rgba(59,130,246,0.15)",
    SVG: LeaguePhaseMiniSVG,
    badgeKey: "specialEliteBadge",
    titleKey: "specialEliteTitle",
    descKey: "specialEliteDesc",
    tagKeys: ["tagSwiss", "tag36teams", "tag8matches"],
  },
  {
    href: "custom",
    color: "#84cc16",
    gradientFrom: "rgba(132,204,22,0.15)",
    SVG: CustomPhaseSVG,
    badgeKey: "specialCustomBadge",
    titleKey: "specialCustomTitle",
    descKey: "specialCustomDesc",
    tagKeys: ["tagFlexible", "tagMultiPhase", "tagCustom"],
  },
];

// ─── Step progress dots ───────────────────────────────────────────────────────

const STEPS_LIST = ["format", "structure", "slots", "generate"] as const;

function StepDots({ current }: { current: number }) {
  const t = useTranslations("formatBuilder");
  const labels: Record<string, string> = {
    format: t("stepFormat"),
    structure: t("stepStructure"),
    slots: t("stepSlots"),
    generate: t("stepGenerate"),
  };
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS_LIST.map((key, i) => (
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
          {i < STEPS_LIST.length - 1 && (
            <div className="w-14 h-px mx-1 mb-5 transition-all duration-500"
              style={{ background: i < current ? ACCENT : "var(--cat-card-border)", opacity: i < current ? 0.7 : 0.3 }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Format selector ──────────────────────────────────────────────────

function FormatStep({
  state,
  onSelect,
  basePath,
  hasEliteFormats,
  effectivePlan,
  billingUrl,
}: {
  state: WizardState;
  onSelect: (f: FormatType) => void;
  basePath: string;
  hasEliteFormats: boolean | null;
  effectivePlan: string;
  billingUrl?: string;
}) {
  const t = useTranslations("formatBuilder");
  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black mb-2" style={{ color: "var(--cat-text)" }}>{t("selectFormatTitle")}</h2>
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t("selectFormatSubtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto">
        {FORMAT_OPTIONS.map(({ type, color, gradientFrom, SVG, titleKey, descKey, tagKeys }) => {
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
              <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                  background: `radial-gradient(ellipse at 50% 0%, ${gradientFrom}, transparent 70%)`,
                  opacity: isSelected ? 1 : 0,
                }}
              />
              <style jsx>{`button:hover > div:first-child { opacity: 0.6 !important; }`}</style>

              <div className="relative h-[88px] mb-4"><SVG color={color} /></div>

              <div className="relative flex gap-1.5 mb-3 flex-wrap">
                {tagKeys.map(key => (
                  <span key={key} className="text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide"
                    style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
                    {t(key as "tagPopular")}
                  </span>
                ))}
              </div>

              <p className="relative text-base font-black mb-1 transition-colors duration-200"
                style={{ color: isSelected ? color : "var(--cat-text)" }}>
                {t(titleKey as "fmtGroupsKnockoutTitle")}
              </p>
              <p className="relative text-xs leading-relaxed" style={{ color: "var(--cat-text-muted)" }}>
                {t(descKey as "fmtGroupsKnockoutDesc")}
              </p>

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

      <div className="flex items-center gap-4 my-6 max-w-3xl mx-auto">
        <div className="flex-1 h-px" style={{ background: "var(--cat-card-border)" }} />
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--cat-text-muted)" }}>
          {t("advancedFormats")}
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--cat-card-border)" }} />
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto">
        {SPECIAL_FORMATS.map(({ href, color, gradientFrom, SVG, badgeKey, titleKey, descKey, tagKeys }) => {
          const isLocked = hasEliteFormats === false;
          if (isLocked) {
            return (
              <div key={href}
                className="relative text-left rounded-2xl border-2 p-5 overflow-hidden opacity-80 cursor-not-allowed select-none"
                style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl"
                  style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                    style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}>
                    <span className="text-white text-xl">🔒</span>
                  </div>
                  <p className="text-white font-black text-sm mb-1">{t("lockedNeedProElite")}</p>
                  <p className="text-white/70 text-xs text-center px-4">
                    {t("lockedYourPlan")} <strong className="text-white">{effectivePlan.charAt(0).toUpperCase() + effectivePlan.slice(1)}</strong>. {t("lockedEliteDesc")}
                  </p>
                  {billingUrl && (
                    <a href={billingUrl} onClick={e => e.stopPropagation()}
                      className="mt-3 px-4 py-1.5 rounded-xl text-xs font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}>
                      {t("upgradePlan")} →
                    </a>
                  )}
                </div>
                <div className="absolute top-4 right-4">
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full"
                    style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                    {t(badgeKey as "specialEliteBadge")}
                  </span>
                </div>
                <div className="relative h-[88px] mb-4"><SVG color={color} /></div>
                <div className="relative flex gap-1.5 mb-3 flex-wrap">
                  {tagKeys.map(key => (
                    <span key={key} className="text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide"
                      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
                      {t(key as "tagSwiss")}
                    </span>
                  ))}
                </div>
                <p className="relative text-base font-black mb-1" style={{ color: "var(--cat-text)" }}>{t(titleKey as "specialEliteTitle")}</p>
                <p className="relative text-xs leading-relaxed" style={{ color: "var(--cat-text-muted)" }}>{t(descKey as "specialEliteDesc")}</p>
              </div>
            );
          }
          return (
            <Link key={href} href={`${basePath}/${href}`}
              className="relative text-left rounded-2xl border-2 p-5 overflow-hidden transition-all duration-300 group block"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `radial-gradient(ellipse at 50% 0%, ${gradientFrom}, transparent 70%)` }} />
              <div className="absolute top-4 right-4">
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full"
                  style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                  {t(badgeKey as "specialEliteBadge")}
                </span>
              </div>
              <div className="relative h-[88px] mb-4"><SVG color={color} /></div>
              <div className="relative flex gap-1.5 mb-3 flex-wrap">
                {tagKeys.map(key => (
                  <span key={key} className="text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide"
                    style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
                    {t(key as "tagSwiss")}
                  </span>
                ))}
              </div>
              <p className="relative text-base font-black mb-1 group-hover:text-current transition-colors"
                style={{ color: "var(--cat-text)" }}>
                {t(titleKey as "specialEliteTitle")}
              </p>
              <p className="relative text-xs leading-relaxed" style={{ color: "var(--cat-text-muted)" }}>{t(descKey as "specialEliteDesc")}</p>
              <div className="relative flex items-center gap-1 mt-3 text-xs font-semibold" style={{ color }}>
                {t("open")} <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── CountStepper ─────────────────────────────────────────────────────────────

function CountStepper({
  value,
  onChange,
  min,
  max,
  accent,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  accent?: string;
}) {
  const c = accent ?? ACCENT;
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-9 h-9 rounded-xl border flex items-center justify-center text-base font-bold transition-all hover:opacity-70"
        style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}>
        −
      </button>
      <span className="w-12 text-center text-xl font-black" style={{ color: c }}>{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-9 h-9 rounded-xl border flex items-center justify-center text-base font-bold transition-all hover:opacity-70"
        style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}>
        +
      </button>
    </div>
  );
}

// ─── Step 2: Structure config ─────────────────────────────────────────────────

function StructureStep({
  state,
  setState,
  registeredCount,
  planIncludedTeams,
  extraTeamPriceCents,
  onTeamsChange,
  billingUrl,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  registeredCount: number;
  planIncludedTeams?: number;   // billing threshold (e.g. 16 free included)
  extraTeamPriceCents?: number; // price per extra team (e.g. 200 = €2)
  onTeamsChange?: (teams: number) => void; // auto-save to DB
  billingUrl?: string;
}) {
  const t = useTranslations("formatBuilder");
  const hasGroups = state.format === "groups_knockout" || state.format === "groups_only";
  const hasKnockout = state.format === "groups_knockout" || state.format === "knockout_only";
  const isRoundRobin = state.format === "round_robin";

  const teamsPerGroup = state.groupCount > 0 ? Math.ceil(state.expectedTeams / state.groupCount) : 0;
  const qualifyingTeams = state.groupCount * state.qualifyPerGroup;
  // Slider max: allow any reasonable amount — no hard plan cap on teams
  const effectiveMax = 256;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black mb-2" style={{ color: "var(--cat-text)" }}>{t("structureTitle")}</h2>
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t("structureSubtitle")}</p>
      </div>

      {/* Expected team count */}
      <div className="rounded-2xl border p-5" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4" style={{ color: ACCENT }} />
              <p className="font-bold" style={{ color: "var(--cat-text)" }}>{t("expectedTeams")}</p>
            </div>
            <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("expectedTeamsHint")}</p>
            {registeredCount > 0 && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                style={{ background: `rgba(43,254,186,0.08)`, color: ACCENT }}>
                <CheckCircle className="w-3 h-3" />
                {t("teamsRegistered", { count: registeredCount })}
              </div>
            )}
          </div>
          <CountStepper
            value={state.expectedTeams}
            onChange={v => {
              const clamped = Math.min(Math.max(v, 2), effectiveMax);
              // Auto-suggest group count: aim for 4-5 teams per group
              const suggestedGroups = Math.max(2, Math.ceil(clamped / 5));
              setState(s => ({
                ...s,
                expectedTeams: clamped,
                // Update groupCount only if it was auto-set (not manually adjusted away from suggestion)
                groupCount: s.groupCount === Math.max(2, Math.ceil(s.expectedTeams / 5))
                  ? suggestedGroups
                  : s.groupCount,
              }));
              onTeamsChange?.(clamped);
            }}
            min={2}
            max={effectiveMax}
          />
        </div>
        {/* Billing info: show included threshold + extra pricing */}
        {planIncludedTeams !== undefined && planIncludedTeams < 9999 && (
          (() => {
            const extraTeams = Math.max(0, state.expectedTeams - planIncludedTeams);
            const extraCost  = extraTeams * (extraTeamPriceCents ?? 0);
            return (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                  style={{ background: "rgba(43,254,186,0.06)", border: "1px dashed rgba(43,254,186,0.25)", color: "var(--cat-text-muted)" }}>
                  <span>📦</span>
                  <span>
                    <strong style={{ color: ACCENT }}>{planIncludedTeams}</strong> {t("teamsUnit")} {t("includedFree")}
                    {extraTeamPriceCents ? (
                      <> · <strong style={{ color: ACCENT }}>+€{(extraTeamPriceCents / 100).toFixed(0)}</strong> {t("perExtraTeam")}</>
                    ) : null}
                  </span>
                </div>
                {extraTeams > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                    style={{ background: "rgba(245,158,11,0.08)", border: "1px dashed rgba(245,158,11,0.35)", color: "#f59e0b" }}>
                    <span>⚡</span>
                    <span className="flex-1">
                      {extraTeams} {t("extraTeamsLabel")}
                    </span>
                    {extraCost > 0 && (
                      <span>€{(extraCost / 100).toFixed(0)} {t("atRegistrationClose")}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>

      {/* Round robin info */}
      {isRoundRobin && (() => {
        const rrMatches = (state.expectedTeams * (state.expectedTeams - 1)) / 2;
        const tooMany = state.expectedTeams > 10;
        return (
          <div className="rounded-2xl border p-5"
            style={{ background: tooMany ? "rgba(245,158,11,0.06)" : "rgba(139,92,246,0.06)", borderColor: tooMany ? "rgba(245,158,11,0.35)" : "rgba(139,92,246,0.3)" }}>
            <div className="flex items-start gap-3">
              <BarChart3 className="w-6 h-6 shrink-0 mt-0.5" style={{ color: tooMany ? "#f59e0b" : "#8b5cf6" }} />
              <div className="flex-1">
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--cat-text)" }}>{t("rrOneGroupAllPlay")}</p>
                <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
                  {t("rrMatchCount", { teams: state.expectedTeams, matches: rrMatches })}
                </p>
                {tooMany && (
                  <p className="text-xs mt-2 font-semibold" style={{ color: "#f59e0b" }}>
                    ⚠️ {t("rrTooManyTeamsWarning")}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Group count */}
      {hasGroups && (
        <div className="rounded-2xl border p-5" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="font-bold" style={{ color: "var(--cat-text)" }}>{t("groupCount")}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                {t("teamsPerGroup", { count: teamsPerGroup })}
              </p>
            </div>
            <CountStepper
              value={state.groupCount}
              onChange={v => setState(s => ({ ...s, groupCount: v }))}
              min={2}
              max={8}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: state.groupCount }, (_, i) => (
              <span key={i} className="text-xs px-3 py-1 rounded-full font-bold"
                style={{ background: `${GROUP_COLORS[i]}15`, color: GROUP_COLORS[i], border: `1px solid ${GROUP_COLORS[i]}35` }}>
                {t("groupLabel")} {GROUP_LETTERS[i]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Advance to knockout — when groups exist */}
      {hasGroups && hasKnockout && (
        <div className="rounded-2xl border p-5 space-y-4" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          {/* Stepper: how many per group advance */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-bold" style={{ color: "var(--cat-text)" }}>{t("advanceToKnockout")}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                {t("advancePerGroupHint")}
              </p>
            </div>
            <CountStepper
              value={state.qualifyPerGroup}
              onChange={v => setState(s => ({ ...s, qualifyPerGroup: v }))}
              min={1}
              max={Math.floor(state.expectedTeams / state.groupCount)}
            />
          </div>

          {/* A-Bracket summary */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm"
            style={{ background: `${ACCENT}10`, border: `1px solid ${ACCENT}30` }}>
            <span className="text-lg">🏆</span>
            <div className="flex-1">
              <span style={{ color: "var(--cat-text)" }}>
                <strong style={{ color: ACCENT }}>{t("topN", { n: state.qualifyPerGroup })}</strong>{" "}
                {t("fromEachGroup")} × {state.groupCount} {t("groupsUnit")} →{" "}
                <strong style={{ color: ACCENT }}>{qualifyingTeams}</strong>{" "}
                {t("teamsUnit")} {t("inAPlayoff")}
              </span>
            </div>
          </div>

          {/* B-bracket toggle */}
          {state.expectedTeams - qualifyingTeams >= 4 && (
            <label className="flex items-start gap-3 cursor-pointer select-none p-3 rounded-xl transition-all"
              style={{
                background: state.bBracket ? "rgba(139,92,246,0.08)" : "var(--cat-tag-bg)",
                border: `1px solid ${state.bBracket ? "rgba(139,92,246,0.35)" : "var(--cat-card-border)"}`,
              }}>
              <input type="checkbox" checked={state.bBracket}
                onChange={e => setState(s => ({ ...s, bBracket: e.target.checked }))}
                className="w-4 h-4 mt-0.5 rounded shrink-0" style={{ accentColor: "#8b5cf6" }} />
              <div>
                <p className="text-sm font-bold" style={{ color: state.bBracket ? "#8b5cf6" : "var(--cat-text)" }}>
                  {t("bBracketLabel")}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                  {t("bBracketDesc", { count: state.expectedTeams - qualifyingTeams })}
                </p>
              </div>
            </label>
          )}

          {/* 3rd place match */}
          <label className="flex items-center gap-2.5 cursor-pointer text-sm select-none"
            style={{ color: "var(--cat-text-secondary)" }}>
            <input type="checkbox" checked={state.thirdPlace}
              onChange={e => setState(s => ({ ...s, thirdPlace: e.target.checked }))}
              className="w-4 h-4 rounded" style={{ accentColor: ACCENT }} />
            {t("thirdPlaceMatch")} (A-{t("playoffLabel")})
          </label>
        </div>
      )}

      {/* Knockout bracket size — only for knockout_only (no groups) */}
      {!hasGroups && hasKnockout && (
        <div className="rounded-2xl border p-5" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <p className="font-bold mb-4" style={{ color: "var(--cat-text)" }}>{t("knockoutSize")}</p>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {[4, 8, 12, 16, 32].map(n => {
              const isSelected = state.knockoutTeams === n;
              return (
                <button key={n}
                  onClick={() => setState(s => ({ ...s, knockoutTeams: n }))}
                  className="py-3 rounded-xl text-sm font-black border-2 transition-all"
                  style={{
                    borderColor: isSelected ? ACCENT : "var(--cat-card-border)",
                    background: isSelected ? "rgba(43,254,186,0.1)" : "var(--cat-tag-bg)",
                    color: isSelected ? ACCENT : "var(--cat-text-secondary)",
                    boxShadow: isSelected ? `0 0 14px rgba(43,254,186,0.3)` : "none",
                    cursor: "pointer",
                  }}>
                  {n}
                  <span className="block text-[9px] mt-0.5 font-medium opacity-70">
                    {t("teamsUnit")}
                  </span>
                </button>
              );
            })}
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer text-sm select-none"
            style={{ color: "var(--cat-text-secondary)" }}>
            <input type="checkbox" checked={state.thirdPlace}
              onChange={e => setState(s => ({ ...s, thirdPlace: e.target.checked }))}
              className="w-4 h-4 rounded" style={{ accentColor: ACCENT }} />
            {t("thirdPlaceMatch")}
          </label>
        </div>
      )}

      {/* Stage names */}
      <div className="rounded-2xl border p-5" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <p className="font-bold mb-4" style={{ color: "var(--cat-text)" }}>{t("stageNames")}</p>
        <div className="space-y-3">
          {(hasGroups || isRoundRobin) && (
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--cat-text-muted)" }}>
                {isRoundRobin ? t("stageNameLabel") : t("groupStageName")}
              </label>
              <input value={state.groupStageName}
                onChange={e => setState(s => ({ ...s, groupStageName: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }} />
            </div>
          )}
          {hasKnockout && (
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--cat-text-muted)" }}>
                {t("playoffStageName")}
              </label>
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

// ─── Step 3: Slot structure preview (NEW — replaces Draw) ─────────────────────

function SlotPreviewStep({ state }: { state: WizardState }) {
  const t = useTranslations("formatBuilder");
  const hasGroups = state.format === "groups_knockout" || state.format === "groups_only";
  const hasKnockout = state.format === "groups_knockout" || state.format === "knockout_only";
  const isRR = state.format === "round_robin";
  const isKO = state.format === "knockout_only";

  // Uneven distribution: first `groupRemainder` groups get basePerGroup+1 teams, rest get basePerGroup
  const basePerGroup = hasGroups && state.groupCount > 0
    ? Math.floor(state.expectedTeams / state.groupCount)
    : 0;
  const groupRemainder = hasGroups && state.groupCount > 0
    ? state.expectedTeams % state.groupCount
    : 0;
  function teamsInGroup(gi: number): number {
    if (!hasGroups || basePerGroup === 0) return 0;
    return gi < groupRemainder ? basePerGroup + 1 : basePerGroup;
  }
  function matchesInGroup(gi: number): number {
    const t = teamsInGroup(gi);
    return t > 1 ? (t * (t - 1)) / 2 : 0;
  }
  const groupMatchTotal = hasGroups
    ? Array.from({ length: state.groupCount }, (_, i) => matchesInGroup(i)).reduce((a, b) => a + b, 0)
    : 0;
  const rrMatchTotal = isRR ? (state.expectedTeams * (state.expectedTeams - 1)) / 2 : 0;
  // A-playoff: compute bracket size from qualifyPerGroup × groupCount (same as handleGenerate)
  const qualifyTotal = hasGroups ? state.qualifyPerGroup * state.groupCount : 0;
  const aKoTeams = hasGroups && qualifyTotal > 0
    ? Math.pow(2, Math.ceil(Math.log2(Math.max(2, qualifyTotal))))
    : state.knockoutTeams;
  // Real match counts use teams-1 formula (not bracket slots)
  const aRealTeams = hasGroups && qualifyTotal > 0 ? qualifyTotal : (isKO ? state.knockoutTeams : 0);
  const aKoMatchTotal = (hasKnockout || isKO) && aRealTeams > 1
    ? aRealTeams - 1 + (state.thirdPlace ? 1 : 0)
    : 0;
  // B-bracket: non-qualifying teams get their own consolation bracket
  const bTeams = hasGroups && state.bBracket ? state.expectedTeams - qualifyTotal : 0;
  const bKoTeams = bTeams >= 4 ? Math.pow(2, Math.ceil(Math.log2(Math.max(2, bTeams)))) : 0;
  const bKoMatchTotal = bTeams >= 2 ? bTeams - 1 : 0;
  const total = groupMatchTotal + rrMatchTotal + aKoMatchTotal + bKoMatchTotal;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black mb-2" style={{ color: "var(--cat-text)" }}>{t("slotsTitle")}</h2>
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t("slotsSubtitle")}</p>
      </div>

      {/* Slot concept info banner */}
      <div className="rounded-2xl border p-4 mb-6 flex items-start gap-3"
        style={{ background: "rgba(43,254,186,0.05)", borderColor: "rgba(43,254,186,0.2)" }}>
        <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: ACCENT }} />
        <div>
          <p className="text-xs font-bold mb-1" style={{ color: ACCENT }}>{t("slotConceptTitle")}</p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--cat-text-muted)" }}>{t("slotsInfoDesc")}</p>
        </div>
      </div>

      {/* Group slot grid */}
      {hasGroups && basePerGroup > 0 && (
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--cat-text-muted)" }}>
            {t("groupSlotsPreview")}
          </p>
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${Math.min(state.groupCount, 4)}, 1fr)` }}
          >
            {Array.from({ length: Math.min(state.groupCount, 4) }, (_, gi) => {
              const gc = GROUP_COLORS[gi];
              const letter = GROUP_LETTERS[gi];
              const tpg = teamsInGroup(gi);
              const mpg = matchesInGroup(gi);
              return (
                <div key={letter} className="rounded-2xl border-2 overflow-hidden"
                  style={{ borderColor: `${gc}40`, background: `${gc}05` }}>
                  {/* Group header */}
                  <div className="px-3 py-2 flex items-center justify-between border-b"
                    style={{ background: `${gc}12`, borderColor: `${gc}25` }}>
                    <span className="text-xs font-black" style={{ color: gc }}>
                      {t("groupLabel")} {letter}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${gc}20`, color: gc }}>
                      {tpg} {t("slotsUnit")}
                    </span>
                  </div>
                  {/* Slot rows */}
                  <div className="p-2 space-y-1.5">
                    {Array.from({ length: tpg }, (_, si) => (
                      <div key={si}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-xl border"
                        style={{ background: "var(--cat-card-bg)", borderColor: `${gc}20` }}>
                        <div
                          className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center text-[9px] font-black"
                          style={{ background: `${gc}20`, color: gc }}>
                          {si + 1}
                        </div>
                        <span className="text-xs italic" style={{ color: "var(--cat-text-muted)" }}>TBD</span>
                      </div>
                    ))}
                    {/* Match count */}
                    <div className="pt-2 border-t text-center"
                      style={{ borderColor: `${gc}20` }}>
                      <span className="text-[11px] font-bold" style={{ color: gc }}>
                        {mpg} {t("matchesUnit")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Overflow groups indicator */}
          {state.groupCount > 4 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {Array.from({ length: state.groupCount - 4 }, (_, i) => {
                const gi = i + 4;
                const gc = GROUP_COLORS[gi];
                const letter = GROUP_LETTERS[gi];
                const tpg = teamsInGroup(gi);
                const mpg = matchesInGroup(gi);
                return (
                  <div key={letter} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border"
                    style={{ background: `${gc}08`, borderColor: `${gc}30` }}>
                    <span className="text-xs font-black" style={{ color: gc }}>{t("groupLabel")} {letter}</span>
                    <span className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                      {tpg} {t("slotsUnit")} · {mpg} {t("matchesUnit")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Round robin visual */}
      {isRR && (
        <div className="rounded-2xl border p-5 mb-5"
          style={{ background: "rgba(139,92,246,0.06)", borderColor: "rgba(139,92,246,0.3)" }}>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 shrink-0">
              <RoundRobinSVG color="#8b5cf6" />
            </div>
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: "var(--cat-text)" }}>
                {state.expectedTeams} {t("teamSlotsLabel")}
              </p>
              <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
                {t("rrMatchCount", { teams: state.expectedTeams, matches: rrMatchTotal })}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {Array.from({ length: Math.min(state.expectedTeams, 8) }, (_, i) => (
                  <div key={i} className="px-2 py-0.5 rounded-md text-[10px] italic font-medium border"
                    style={{ background: "rgba(139,92,246,0.1)", borderColor: "rgba(139,92,246,0.25)", color: "#8b5cf6" }}>
                    {i + 1}. TBD
                  </div>
                ))}
                {state.expectedTeams > 8 && (
                  <div className="px-2 py-0.5 rounded-md text-[10px] font-medium border"
                    style={{ background: "rgba(139,92,246,0.1)", borderColor: "rgba(139,92,246,0.25)", color: "#8b5cf6" }}>
                    +{state.expectedTeams - 8} {t("slotsUnit")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* A-Playoff bracket */}
      {(hasKnockout || isKO) && (
        <div className="rounded-2xl border p-5 mb-5"
          style={{ background: "rgba(236,72,153,0.05)", borderColor: "rgba(236,72,153,0.25)" }}>
          <div className="flex items-center gap-3 mb-3">
            <GitBranch className="w-4 h-4" style={{ color: "#ec4899" }} />
            <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
              {t("knockoutSlots")} — {aKoTeams} {t("teamsUnit")}
            </p>
          </div>
          <div className="h-20">
            <BracketSVG color="#ec4899" />
          </div>
          <p className="text-xs mt-2 text-center" style={{ color: "var(--cat-text-muted)" }}>
            {aKoMatchTotal} {t("knockoutMatchSlots")}
            {state.thirdPlace && ` · +1 ${t("thirdPlaceMatch")}`}
          </p>
          {hasKnockout && qualifyTotal > 0 && (
            <div className="mt-3 flex items-center gap-2 justify-center text-xs"
              style={{ color: "var(--cat-text-muted)" }}>
              <span className="px-2 py-1 rounded-lg" style={{ background: "rgba(236,72,153,0.1)", color: "#ec4899" }}>
                {t("advanceDesc", { total: qualifyTotal })}
              </span>
              <ArrowRight className="w-3 h-3" style={{ color: "#ec4899" }} />
              <span className="px-2 py-1 rounded-lg" style={{ background: "rgba(236,72,153,0.1)", color: "#ec4899" }}>
                {t("knockoutSlots")}
              </span>
            </div>
          )}
        </div>
      )}

      {/* B-bracket (consolation) */}
      {state.bBracket && bKoTeams > 0 && (
        <div className="rounded-2xl border p-5 mb-5"
          style={{ background: "rgba(139,92,246,0.05)", borderColor: "rgba(139,92,246,0.25)" }}>
          <div className="flex items-center gap-3 mb-3">
            <GitBranch className="w-4 h-4" style={{ color: "#8b5cf6" }} />
            <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
              {t("bBracketLabel")} — {bKoTeams} {t("teamsUnit")}
            </p>
          </div>
          <div className="h-20">
            <BracketSVG color="#8b5cf6" />
          </div>
          <p className="text-xs mt-2 text-center" style={{ color: "var(--cat-text-muted)" }}>
            {bKoMatchTotal} {t("knockoutMatchSlots")}
          </p>
          <div className="mt-3 flex items-center gap-2 justify-center text-xs"
            style={{ color: "var(--cat-text-muted)" }}>
            <span className="px-2 py-1 rounded-lg" style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>
              {t("bBracketDesc", { count: bTeams })}
            </span>
            <ArrowRight className="w-3 h-3" style={{ color: "#8b5cf6" }} />
            <span className="px-2 py-1 rounded-lg" style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>
              {t("bBracketLabel")}
            </span>
          </div>
        </div>
      )}

      {/* Total summary card */}
      <div className="rounded-2xl border p-4 flex items-center justify-between"
        style={{ background: "var(--cat-card-bg)", borderColor: `rgba(43,254,186,0.3)`, boxShadow: `0 0 20px rgba(43,254,186,0.08)` }}>
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5" style={{ color: ACCENT }} />
          <span className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>{t("totalMatchSlots")}</span>
        </div>
        <div className="flex items-center gap-3">
          {hasGroups && (
            <span className="text-xs px-2.5 py-1 rounded-lg font-semibold"
              style={{ background: "rgba(16,185,129,0.1)", color: GROUP_COLORS[0] }}>
              {groupMatchTotal} {t("groupLabel").toLowerCase()}
            </span>
          )}
          {(hasKnockout || isKO) && (
            <span className="text-xs px-2.5 py-1 rounded-lg font-semibold"
              style={{ background: "rgba(236,72,153,0.1)", color: "#ec4899" }}>
              {aKoMatchTotal} {t("overviewAkoBadge")}
            </span>
          )}
          {bKoMatchTotal > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-lg font-semibold"
              style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>
              {bKoMatchTotal} {t("overviewBkoBadge")}
            </span>
          )}
          <span className="text-2xl font-black" style={{ color: ACCENT }}>{total}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Generate & confirm ───────────────────────────────────────────────

function GenerateStep({ state, generating }: {
  state: WizardState;
  generating: boolean;
}) {
  const t = useTranslations("formatBuilder");
  const formatOption = FORMAT_OPTIONS.find(f => f.type === state.format);
  const hasGroups = state.format === "groups_knockout" || state.format === "groups_only";
  const hasKnockout = state.format === "groups_knockout" || state.format === "knockout_only";
  const isRR = state.format === "round_robin";
  const isKO = state.format === "knockout_only";

  // Uneven distribution for real group match counts
  const genBasePerGroup = hasGroups && state.groupCount > 0
    ? Math.floor(state.expectedTeams / state.groupCount) : 0;
  const genRemainder = hasGroups && state.groupCount > 0
    ? state.expectedTeams % state.groupCount : 0;
  const groupMatchTotal = hasGroups
    ? Array.from({ length: state.groupCount }, (_, gi) => {
        const t2 = gi < genRemainder ? genBasePerGroup + 1 : genBasePerGroup;
        return t2 > 1 ? (t2 * (t2 - 1)) / 2 : 0;
      }).reduce((a, b) => a + b, 0)
    : 0;
  const rrMatchTotal = isRR ? (state.expectedTeams * (state.expectedTeams - 1)) / 2 : 0;
  // Real KO matches: qualify-1 for groups+KO, knockoutTeams-1 for KO-only
  const qualifyGen = hasGroups ? state.qualifyPerGroup * state.groupCount : 0;
  const koRealTeams = hasGroups && qualifyGen > 0 ? qualifyGen : state.knockoutTeams;
  const koMatchTotal = hasKnockout && koRealTeams > 1
    ? koRealTeams - 1 + (state.thirdPlace ? 1 : 0) : 0;
  const koOnlyTotal = isKO && state.knockoutTeams > 1
    ? state.knockoutTeams - 1 + (state.thirdPlace ? 1 : 0) : 0;
  const bGenTeams = hasGroups && state.bBracket && qualifyGen > 0
    ? state.expectedTeams - qualifyGen : 0;
  const bGenMatchTotal = bGenTeams > 1 ? bGenTeams - 1 : 0;
  const totalMatches = groupMatchTotal + rrMatchTotal + koMatchTotal + koOnlyTotal + bGenMatchTotal;

  const willCreate = [
    hasGroups && { icon: "🏟️", label: t("summaryGroups"), value: state.groupCount, color: GROUP_COLORS[0] },
    (hasGroups || isRR) && { icon: "📋", label: t("summaryStage"), value: state.groupStageName, color: ACCENT },
    hasKnockout && { icon: "🏆", label: t("summaryStage"), value: state.playoffStageName, color: "#ec4899" },
    isKO && { icon: "🏆", label: t("summaryStage"), value: state.playoffStageName, color: "#ec4899" },
    { icon: "⚽", label: t("summaryMatches"), value: totalMatches, color: "#f59e0b" },
  ].filter(Boolean) as { icon: string; label: string; value: string | number; color: string }[];

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
        <h2 className="text-2xl font-black mb-2" style={{ color: "var(--cat-text)" }}>{t("readyToLaunch")}</h2>
        <p className="text-sm max-w-xs mx-auto" style={{ color: "var(--cat-text-muted)" }}>
          {t("readyToLaunchDesc")}
        </p>
      </div>

      {/* What will be created */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {willCreate.map(({ icon, label, value, color }, idx) => (
          <div key={idx} className="rounded-2xl border p-4 text-center"
            style={{ background: "var(--cat-card-bg)", borderColor: `${color}25`, boxShadow: `0 0 12px ${color}10` }}>
            <p className="text-xl mb-0.5">{icon}</p>
            <p className="text-lg font-black" style={{ color }}>{value}</p>
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
          <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
            {formatOption ? t(formatOption.titleKey as "fmtGroupsKnockoutTitle") : ""}
          </p>
          <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
            {formatOption ? t(formatOption.descKey as "fmtGroupsKnockoutDesc") : ""}
          </p>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase"
          style={{ background: `${formatOption?.color}15`, color: formatOption?.color }}>
          {t("selected")}
        </span>
      </div>

      {/* Slot concept note */}
      <div className="rounded-2xl border p-4 mb-5 flex items-start gap-3"
        style={{ background: "rgba(43,254,186,0.04)", borderColor: "rgba(43,254,186,0.2)" }}>
        <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: ACCENT }} />
        <p className="text-xs leading-relaxed" style={{ color: "var(--cat-text-muted)" }}>
          {t("generateSlotNote")}
        </p>
      </div>

      {generating && (
        <div className="rounded-2xl border p-6 text-center"
          style={{ background: "rgba(43,254,186,0.04)", borderColor: `${ACCENT}30` }}>
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: ACCENT }} />
          <p className="text-sm font-semibold" style={{ color: ACCENT }}>{t("generatingStructure")}</p>
          <p className="text-xs mt-1" style={{ color: "var(--cat-text-muted)" }}>{t("generatingWait")}</p>
        </div>
      )}
    </div>
  );
}

// ─── Done screen ──────────────────────────────────────────────────────────────

function DoneScreen({ orgSlug, tournamentId, fromSetup, classId, className }: {
  orgSlug: string;
  tournamentId: number;
  fromSetup: boolean;
  classId: number | null;
  className: string;
}) {
  const t = useTranslations("formatBuilder");
  const setupUrl = `/org/${orgSlug}/admin/tournament/${tournamentId}/setup?tab=format`;
  const scheduleHref = classId
    ? `/org/${orgSlug}/admin/tournament/${tournamentId}/schedule?classId=${classId}&className=${encodeURIComponent(className)}`
    : `/org/${orgSlug}/admin/tournament/${tournamentId}/schedule`;
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center"
          style={{ background: "rgba(43,254,186,0.12)", boxShadow: "0 0 50px rgba(43,254,186,0.35)" }}>
          <CheckCircle className="w-12 h-12" style={{ color: ACCENT }} />
        </div>
        <div className="absolute inset-0 rounded-3xl animate-ping opacity-10"
          style={{ background: ACCENT }} />
      </div>
      <h2 className="text-3xl font-black mb-3" style={{ color: "var(--cat-text)" }}>{t("doneTitle")}</h2>
      <p className="text-sm mb-3 max-w-sm" style={{ color: "var(--cat-text-muted)" }}>
        {t("doneDesc")}
      </p>

      {/* Если пришли из Setup-визарда — Next steps показываем в контексте wizard */}
      {fromSetup ? (
        <div className="rounded-2xl border p-4 mb-8 max-w-sm w-full text-left"
          style={{ background: "rgba(43,254,186,0.05)", borderColor: "rgba(43,254,186,0.2)" }}>
          <p className="text-xs font-bold mb-2" style={{ color: ACCENT }}>✓ {t("doneTitle")}</p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--cat-text-muted)" }}>
            {t("doneDesc")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 mb-8 text-left max-w-sm">
          {[
            { icon: "1️⃣", text: t("doneStep1") },
            { icon: "2️⃣", text: t("doneStep2") },
            { icon: "3️⃣", text: t("doneStep3") },
          ].map(({ icon, text }) => (
            <div key={icon} className="flex items-start gap-2 px-4 py-2.5 rounded-xl w-full"
              style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
              <span className="text-sm mt-0.5">{icon}</span>
              <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{text}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 flex-wrap justify-center">
        {/* Если из wizard — главная кнопка возвращает в wizard */}
        {fromSetup ? (
          <Link
            href={setupUrl}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
            style={{ background: ACCENT, color: "#000", boxShadow: `0 0 24px rgba(43,254,186,0.45)` }}>
            <ChevronLeft className="w-4 h-4" /> {t("backToSetup")}
          </Link>
        ) : (
          <Link
            href={scheduleHref}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
            style={{ background: ACCENT, color: "#000", boxShadow: `0 0 24px rgba(43,254,186,0.45)` }}>
            {t("goToSchedule")} <ChevronRight className="w-4 h-4" />
          </Link>
        )}
        <Link
          href={fromSetup ? setupUrl : `/org/${orgSlug}/admin/tournament/${tournamentId}`}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border"
          style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)", background: "var(--cat-card-bg)" }}>
          {fromSetup ? t("continueSetup") : t("tournamentOverview")}
        </Link>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// UEFA/FIFA seeding approach: top teams skip round 1, only `byes` matches played in first round
function getRoundDefs(realTeams: number, thirdPlace: boolean) {
  const rounds: { name: string; nameRu: string; shortName: string; matchCount: number; isTwoLegged: boolean; hasThirdPlace: boolean }[] = [];
  const nameMap: Record<number, { name: string; nameRu: string; short: string }> = {
    2:  { name: "Final",         nameRu: "Финал",          short: "F" },
    4:  { name: "Semi-Final",    nameRu: "Полуфинал",      short: "SF" },
    8:  { name: "Quarter-Final", nameRu: "Четвертьфинал",  short: "QF" },
    16: { name: "Round of 16",   nameRu: "1/8 финала",     short: "R16" },
    32: { name: "Round of 32",   nameRu: "1/16 финала",    short: "R32" },
    64: { name: "Round of 64",   nameRu: "1/32 финала",    short: "R64" },
  };

  const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(2, realTeams))));
  const byes = bracketSize - realTeams;

  function addFinalRounds(startN: number) {
    let n = startN;
    while (n >= 2) {
      const info = nameMap[n] ?? { name: `Round of ${n}`, nameRu: `1/${n / 2} финала`, short: `R${n}` };
      rounds.push({ name: info.name, nameRu: info.nameRu, shortName: info.short, matchCount: n / 2, isTwoLegged: false, hasThirdPlace: n === 2 && thirdPlace });
      if (n === 2 && thirdPlace) {
        rounds.push({ name: "3rd Place", nameRu: "Матч за 3-е место", shortName: "3P", matchCount: 1, isTwoLegged: false, hasThirdPlace: false });
      }
      n = n / 2;
    }
  }

  if (byes > 0) {
    // Seeded: first round only has `byes` matches (non-seeded teams play each other)
    // Seeded teams skip directly to next round
    const firstInfo = nameMap[bracketSize] ?? { name: `Round of ${bracketSize}`, nameRu: `1/${bracketSize / 2} финала`, short: `R${bracketSize}` };
    rounds.push({ name: firstInfo.name, nameRu: firstInfo.nameRu, shortName: firstInfo.short, matchCount: byes, isTwoLegged: false, hasThirdPlace: false });
    addFinalRounds(bracketSize / 2);
  } else {
    // Perfect bracket: all teams play round 1
    addFinalRounds(bracketSize);
  }

  return rounds;
}

// ─── Format summary (read-only, shown after format is created) ────────────────

interface ExistingStage {
  id: number;
  name: string;
  type: string;
  status?: string;
  order?: number;
  classId: number | null;
  groups: { id: number; name: string }[];
  rounds: { id: number; name: string; shortName?: string; matchCount?: number; hasThirdPlace?: boolean }[];
}

function FormatSummaryView({
  stages,
  onChangeFormat,
  changing,
  maxTeams,
}: {
  stages: ExistingStage[];
  onChangeFormat: () => void;
  changing: boolean;
  maxTeams?: number;
}) {
  const t = useTranslations("formatBuilder");
  const ctx = useTournament();
  const orgSlug    = ctx?.orgSlug ?? "";
  const tournamentId = ctx?.tournamentId ?? 0;

  // Inline group name editing
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingName,    setEditingName]    = useState("");
  const [savingGroupId,  setSavingGroupId]  = useState<number | null>(null);
  // Local overrides for group names after save
  const [nameOverrides, setNameOverrides]   = useState<Record<number, string>>({});

  async function saveGroupName(stageId: number, groupId: number) {
    const name = editingName.trim();
    if (!name) { setEditingGroupId(null); return; }
    setSavingGroupId(groupId);
    try {
      const r = await fetch(
        `/api/org/${orgSlug}/tournament/${tournamentId}/stages/${stageId}/groups/${groupId}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }
      );
      if (r.ok) setNameOverrides(prev => ({ ...prev, [groupId]: name }));
    } finally {
      setSavingGroupId(null);
      setEditingGroupId(null);
    }
  }

  // Detect format type from stages
  const groupStage  = stages.find(s => s.type === "group" || s.type === "groups");
  const koStages    = stages.filter(s => s.type === "knockout" || s.type === "playoff");
  const aKoStage    = koStages.find(s => !s.name.includes("B-") && !s.name.includes("Б-")) ?? koStages[0];
  const bKoStage    = koStages.find(s => s.name.includes("B-") || s.name.includes("Б-") || s.name.includes("B-Playoffs"));

  let detectedFormat: FormatType = "groups_knockout";
  if (groupStage && !aKoStage)       detectedFormat = groupStage.groups.length <= 1 ? "round_robin" : "groups_only";
  else if (!groupStage && aKoStage)  detectedFormat = "knockout_only";
  else if (groupStage && aKoStage)   detectedFormat = "groups_knockout";

  const formatOption = FORMAT_OPTIONS.find(f => f.type === detectedFormat);
  const fmtColor     = formatOption?.color ?? ACCENT;

  // Per-group team distribution (from maxTeams / groupCount)
  const groupCount   = groupStage?.groups.length ?? 0;
  const basePerGroup = maxTeams && groupCount > 0 ? Math.floor(maxTeams / groupCount) : null;
  const grpRemainder = maxTeams && groupCount > 0 ? maxTeams % groupCount : 0;

  // A-playoff info
  const aRounds     = aKoStage?.rounds ?? [];
  const aFirstRound = aRounds[0];
  const aSecondRound = aRounds[1];
  // Universal formula works for both seeded and perfect brackets:
  // seeded:  firstRound.matchCount = byes,  aKoSize = byes + secondRound.matchCount*2 = realTeams ✓
  // perfect: firstRound.matchCount = n/2,   aKoSize = n/2 + (n/4)*2 = n/2 + n/2 = n ✓
  const aKoSize = aSecondRound && aFirstRound
    ? aFirstRound.matchCount! + aSecondRound.matchCount! * 2
    : (aFirstRound?.matchCount ? aFirstRound.matchCount * 2 : 0);

  // B-playoff info
  const bRounds     = bKoStage?.rounds ?? [];
  const bFirstRound = bRounds[0];
  const bSecondRound = bRounds[1];
  const bKoSize = bSecondRound && bFirstRound
    ? bFirstRound.matchCount! + bSecondRound.matchCount! * 2
    : (bFirstRound?.matchCount ? bFirstRound.matchCount * 2 : 0);

  // Group matches total
  const groupMatchTotal = groupStage && maxTeams && groupCount > 0
    ? Array.from({ length: groupCount }, (_, gi) => {
        const tpg = basePerGroup != null ? (gi < grpRemainder ? basePerGroup + 1 : basePerGroup) : 0;
        return tpg > 1 ? (tpg * (tpg - 1)) / 2 : 0;
      }).reduce((a, b) => a + b, 0)
    : 0;

  // Qualifying teams per group (if A-playoff exists)
  const qualifyPerGroup = aKoSize > 0 && groupCount > 0 ? Math.round(aKoSize / groupCount) : null;

  // Real match counts: teams - 1 formula (not bracket slots)
  const aRealTeams = qualifyPerGroup != null && groupCount > 0
    ? qualifyPerGroup * groupCount
    : aKoSize;
  const aHas3P = aRounds.some(r => r.shortName === "3P" || r.name === "3rd Place");
  const aMatchTotal = aRealTeams > 1 ? aRealTeams - 1 + (aHas3P ? 1 : 0) : 0;
  const bRealTeams = maxTeams != null && aRealTeams > 0 && bKoSize > 0
    ? maxTeams - aRealTeams
    : (bKoSize > 0 ? bKoSize : 0);
  const bMatchTotal = bRealTeams > 1 ? bRealTeams - 1 : 0;

  const totalMatches = groupMatchTotal + aMatchTotal + bMatchTotal;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(43,254,186,0.12)", boxShadow: "0 0 18px rgba(43,254,186,0.25)" }}>
          <Layers className="w-5 h-5" style={{ color: ACCENT }} />
        </div>
        <h1 className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>{t("formatOverview")}</h1>
      </div>

      {/* Format type badge */}
      <div className="rounded-2xl border-2 p-5 mb-5 relative overflow-hidden"
        style={{ background: "var(--cat-card-bg)", borderColor: `${fmtColor}40`, boxShadow: `0 0 28px ${fmtColor}12` }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${fmtColor}08, transparent 70%)` }} />
        <div className="flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${fmtColor}15` }}>
              <CheckCircle className="w-5 h-5" style={{ color: fmtColor }} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "var(--cat-text-muted)" }}>
                {t("currentFormat")}
              </p>
              <p className="text-lg font-black" style={{ color: "var(--cat-text)" }}>
                {formatOption ? t(formatOption.titleKey as "fmtGroupsKnockoutTitle") : detectedFormat}
              </p>
            </div>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase shrink-0"
            style={{ background: `${fmtColor}15`, color: fmtColor, border: `1px solid ${fmtColor}30` }}>
            ✓ {t("active")}
          </span>
        </div>
      </div>

      {/* Stage flow */}
      <div className="space-y-3 mb-5">
        {/* ── Group stage ── */}
        {groupStage && (
          <div className="rounded-2xl border overflow-hidden"
            style={{ background: "var(--cat-card-bg)", borderColor: `${GROUP_COLORS[0]}30` }}>
            <div className="flex items-center gap-3 px-4 py-3 border-b"
              style={{ background: `${GROUP_COLORS[0]}08`, borderColor: `${GROUP_COLORS[0]}20` }}>
              <LayoutGrid className="w-4 h-4" style={{ color: GROUP_COLORS[0] }} />
              <span className="font-bold text-sm" style={{ color: "var(--cat-text)" }}>{groupStage.name}</span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: `${GROUP_COLORS[0]}18`, color: GROUP_COLORS[0] }}>
                {t("overviewGroupCount", { count: groupCount })}
              </span>
            </div>
            <div className="p-3 space-y-1.5">
              {groupStage.groups.map((g, gi) => {
                const gc  = GROUP_COLORS[gi % GROUP_COLORS.length];
                const tpg = basePerGroup != null ? (gi < grpRemainder ? basePerGroup + 1 : basePerGroup) : null;
                const upCount   = qualifyPerGroup ?? 0;
                const downCount = (tpg != null && upCount > 0 && bKoStage) ? tpg - upCount : null;
                const isEditing = editingGroupId === g.id;
                const isSaving  = savingGroupId  === g.id;
                const displayName = nameOverrides[g.id] ?? g.name;
                return (
                  <div key={g.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                    style={{ background: `${gc}06`, borderColor: `${gc}25` }}>
                    {/* Color dot */}
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: gc }} />
                    {/* Name (editable) */}
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onBlur={() => saveGroupName(groupStage.id, g.id)}
                        onKeyDown={e => {
                          if (e.key === "Enter") saveGroupName(groupStage.id, g.id);
                          if (e.key === "Escape") setEditingGroupId(null);
                        }}
                        className="flex-1 text-xs font-bold bg-transparent border-b outline-none px-0"
                        style={{ color: gc, borderColor: `${gc}60`, minWidth: 0 }}
                      />
                    ) : (
                      <span className="text-xs font-bold flex-1" style={{ color: gc }}>{displayName}</span>
                    )}
                    {/* Edit pencil */}
                    {!isEditing && (
                      <button
                        onClick={() => { setEditingGroupId(g.id); setEditingName(displayName); }}
                        className="opacity-40 hover:opacity-100 transition-opacity"
                        title={t("overviewRename")}>
                        {isSaving
                          ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: gc }} />
                          : <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: gc }}>
                              <path d="M11.5 2.5a1.414 1.414 0 012 2L5 13H3v-2L11.5 2.5z"/>
                            </svg>
                        }
                      </button>
                    )}
                    {/* Teams count */}
                    {tpg != null && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: `${gc}18`, color: gc }}>
                        {tpg}к
                      </span>
                    )}
                    {/* Advance up */}
                    {upCount > 0 && (
                      <span className="text-[10px] font-medium flex items-center gap-0.5"
                        style={{ color: "#10b981" }}>
                        ↑{upCount} А
                      </span>
                    )}
                    {/* Down to B */}
                    {downCount != null && downCount > 0 && (
                      <span className="text-[10px] font-medium flex items-center gap-0.5"
                        style={{ color: "#8b5cf6" }}>
                        ↓{downCount} Б
                      </span>
                    )}
                  </div>
                );
              })}
              {groupStage.groups.length === 0 && (
                <p className="text-xs text-center py-2" style={{ color: "var(--cat-text-muted)" }}>
                  {t("overviewNoGroups")}
                </p>
              )}
              {groupMatchTotal > 0 && (
                <div className="pt-1 text-xs text-right" style={{ color: "var(--cat-text-muted)" }}>
                  {t("overviewGroupStats", { matches: groupMatchTotal, teams: maxTeams ?? "?" })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Arrow → A-Playoff ── */}
        {aKoStage && (
          <>
            <div className="flex items-center gap-3 px-2">
              <div className="flex-1 h-px" style={{ background: "var(--cat-card-border)" }} />
              <div className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg whitespace-nowrap"
                style={{ background: "rgba(236,72,153,0.08)", color: "#ec4899", border: "1px solid rgba(236,72,153,0.2)" }}>
                <Trophy className="w-3 h-3 shrink-0" />
                {groupStage && qualifyPerGroup
                  ? t("overviewTopQualify", { perGroup: qualifyPerGroup, total: aKoSize })
                  : t("overviewTeamsCount", { count: aKoSize })}
              </div>
              <div className="flex-1 h-px" style={{ background: "var(--cat-card-border)" }} />
            </div>
            <div className="rounded-2xl border overflow-hidden"
              style={{ background: "var(--cat-card-bg)", borderColor: "rgba(236,72,153,0.3)" }}>
              <div className="flex items-center gap-3 px-4 py-3 border-b"
                style={{ background: "rgba(236,72,153,0.06)", borderColor: "rgba(236,72,153,0.2)" }}>
                <Trophy className="w-4 h-4" style={{ color: "#ec4899" }} />
                <span className="font-bold text-sm" style={{ color: "var(--cat-text)" }}>{aKoStage.name}</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ background: "rgba(236,72,153,0.15)", color: "#ec4899" }}>
                  {t("overviewTeamsCount", { count: aKoSize })}
                </span>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {aRounds.map(r => (
                    <span key={r.id} className="px-2.5 py-1 rounded-lg text-xs font-bold"
                      style={r.shortName === "3P" || r.name === "3rd Place"
                        ? { background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }
                        : { background: "rgba(236,72,153,0.1)", color: "#ec4899", border: "1px solid rgba(236,72,153,0.2)" }
                      }>
                      {r.shortName ?? r.name}
                    </span>
                  ))}
                </div>
                <div className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
                  {t("overviewAMatchCount", { count: aMatchTotal })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Arrow → B-Playoff ── */}
        {bKoStage && (
          <>
            <div className="flex items-center gap-3 px-2">
              <div className="flex-1 h-px" style={{ background: "var(--cat-card-border)" }} />
              <div className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg whitespace-nowrap"
                style={{ background: "rgba(139,92,246,0.08)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.2)" }}>
                <GitBranch className="w-3 h-3 shrink-0" />
                {t("overviewNonQualified")}
              </div>
              <div className="flex-1 h-px" style={{ background: "var(--cat-card-border)" }} />
            </div>
            <div className="rounded-2xl border overflow-hidden"
              style={{ background: "var(--cat-card-bg)", borderColor: "rgba(139,92,246,0.3)" }}>
              <div className="flex items-center gap-3 px-4 py-3 border-b"
                style={{ background: "rgba(139,92,246,0.06)", borderColor: "rgba(139,92,246,0.2)" }}>
                <GitBranch className="w-4 h-4" style={{ color: "#8b5cf6" }} />
                <span className="font-bold text-sm" style={{ color: "var(--cat-text)" }}>{bKoStage.name}</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ background: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}>
                  {t("overviewTeamsCount", { count: bKoSize })}
                </span>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {bRounds.map(r => (
                    <span key={r.id} className="px-2.5 py-1 rounded-lg text-xs font-bold"
                      style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.2)" }}>
                      {r.shortName ?? r.name}
                    </span>
                  ))}
                </div>
                <div className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
                  {t("overviewBMatchCount", { count: bMatchTotal })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Total */}
      <div className="rounded-2xl border p-4 mb-6 flex items-center justify-between"
        style={{ background: "var(--cat-card-bg)", borderColor: "rgba(43,254,186,0.3)", boxShadow: "0 0 20px rgba(43,254,186,0.08)" }}>
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5" style={{ color: ACCENT }} />
          <span className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>{t("totalMatchSlots")}</span>
        </div>
        <div className="flex items-center gap-3">
          {groupMatchTotal > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-lg font-semibold"
              style={{ background: "rgba(16,185,129,0.1)", color: GROUP_COLORS[0] }}>
              {t("overviewGroupMatchesBadge", { count: groupMatchTotal })}
            </span>
          )}
          {aMatchTotal > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-lg font-semibold"
              style={{ background: "rgba(236,72,153,0.1)", color: "#ec4899" }}>
              {aMatchTotal} {t("overviewAkoBadge")}
            </span>
          )}
          {bMatchTotal > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-lg font-semibold"
              style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>
              {bMatchTotal} {t("overviewBkoBadge")}
            </span>
          )}
          <span className="text-2xl font-black" style={{ color: ACCENT }}>{totalMatches || "—"}</span>
        </div>
      </div>

      {/* Change format */}
      <div className="rounded-2xl border p-5"
        style={{ background: "rgba(245,158,11,0.04)", borderColor: "rgba(245,158,11,0.25)" }}>
        <div className="flex items-start gap-3 mb-4">
          <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#f59e0b" }} />
          <p className="text-xs leading-relaxed" style={{ color: "var(--cat-text-muted)" }}>
            {t("changeFormatWarning")}
          </p>
        </div>
        <button
          onClick={onChangeFormat}
          disabled={changing}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all hover:opacity-80 disabled:opacity-50"
          style={{ borderColor: "#f59e0b", color: "#f59e0b", background: "rgba(245,158,11,0.06)" }}>
          {changing
            ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("deletingStages")}</>
            : <><Zap className="w-4 h-4" /> {t("changeFormat")}</>
          }
        </button>
      </div>
    </div>
  );
}

// ─── Stages management tab (shown inside Format page when stages exist) ───────

interface StageWithCounts extends ExistingStage {
  matchCount: number;
  scheduledCount: number;
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: "Pending",  color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  draft:    { label: "Draft",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  active:   { label: "Active",   color: "#2BFEBA", bg: "rgba(43,254,186,0.12)"  },
  finished: { label: "Finished", color: "#10b981", bg: "rgba(16,185,129,0.12)"  },
};
const TYPE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  group:    { label: "Groups",   color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  knockout: { label: "Playoff",  color: "#ec4899", bg: "rgba(236,72,153,0.12)" },
  league:   { label: "League",   color: "#06b6d4", bg: "rgba(6,182,212,0.12)"  },
};

function StagesManagementView({
  orgSlug,
  tournamentId,
  classId,
  initialStages,
  onStagesChange,
}: {
  orgSlug: string;
  tournamentId: number;
  classId: number | null;
  initialStages: ExistingStage[];
  onStagesChange: () => void;
}) {
  const base = `/api/org/${orgSlug}/tournament/${tournamentId}`;
  const [stages, setStages]   = useState<StageWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Inline group name editing
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingStageId, setEditingStageId] = useState<number | null>(null);
  const [editingName,    setEditingName]    = useState("");
  const [savingGroupId,  setSavingGroupId]  = useState<number | null>(null);
  const [nameOverrides,  setNameOverrides]  = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = classId ? `${base}/stages?classId=${classId}` : `${base}/stages`;
      const raw: ExistingStage[] = await fetch(url, { credentials: "include" })
        .then(r => r.ok ? r.json() : []).catch(() => []);

      const enriched: StageWithCounts[] = await Promise.all(
        raw.map(async s => {
          const matches: { scheduledAt?: string | null }[] = await fetch(
            `${base}/matches?stageId=${s.id}`, { credentials: "include" }
          ).then(r => r.ok ? r.json() : []).catch(() => []);
          const arr = Array.isArray(matches) ? matches : [];
          return { ...s, matchCount: arr.length, scheduledCount: arr.filter(m => m.scheduledAt).length };
        })
      );
      setStages(enriched);
      if (expandedId === null && enriched.length > 0) setExpandedId(enriched[0].id);
    } finally {
      setLoading(false);
    }
  }, [base, classId, expandedId]);

  useEffect(() => { load(); }, [classId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveGroupName(stageId: number, groupId: number) {
    const name = editingName.trim();
    setEditingGroupId(null);
    if (!name) return;
    setSavingGroupId(groupId);
    try {
      const r = await fetch(
        `${base}/stages/${stageId}/groups/${groupId}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ name }) }
      );
      if (r.ok) setNameOverrides(prev => ({ ...prev, [groupId]: name }));
    } finally {
      setSavingGroupId(null);
    }
  }

  if (loading) return (
    <div className="flex items-center gap-2 py-10" style={{ color: "var(--cat-text-muted)" }}>
      <Loader2 className="w-4 h-4 animate-spin" /> Loading stages…
    </div>
  );

  if (stages.length === 0) return (
    <div className="text-center py-16" style={{ color: "var(--cat-text-muted)" }}>
      <Layers className="w-10 h-10 mx-auto mb-3 opacity-20" />
      <p className="font-bold mb-1" style={{ color: "var(--cat-text)" }}>No stages yet</p>
      <p className="text-sm">Create a format first to generate stages.</p>
    </div>
  );

  const scheduleBase = `/org/${orgSlug}/admin/tournament/${tournamentId}/schedule`;

  return (
    <div className="space-y-3">
      {stages.map((stage, idx) => {
        const isOpen      = expandedId === stage.id;
        const statusStyle = STATUS_STYLE[stage.status ?? "pending"] ?? STATUS_STYLE.pending;
        const typeStyle   = TYPE_STYLE[stage.type] ?? TYPE_STYLE.group;

        return (
          <div key={stage.id} className="rounded-2xl border overflow-hidden transition-all"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>

            {/* ── Header ── */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:opacity-80 transition-opacity"
              onClick={() => setExpandedId(isOpen ? null : stage.id)}
            >
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-black"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
                {idx + 1}
              </div>
              <span className="font-bold text-sm flex-1 text-left" style={{ color: "var(--cat-text)" }}>
                {stage.name}
              </span>
              <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full font-bold"
                style={{ background: typeStyle.bg, color: typeStyle.color }}>
                {typeStyle.label.toUpperCase()}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                style={{ background: statusStyle.bg, color: statusStyle.color }}>
                {statusStyle.label.toUpperCase()}
              </span>
              {stage.matchCount > 0 && (
                <span className="text-xs font-semibold" style={{ color: "var(--cat-text-muted)" }}>
                  {stage.scheduledCount}/{stage.matchCount}
                </span>
              )}
              <ChevronDown className="w-4 h-4 shrink-0 transition-transform"
                style={{ color: "var(--cat-text-muted)", transform: isOpen ? "rotate(180deg)" : "" }} />
            </button>

            {/* ── Expanded body ── */}
            {isOpen && (
              <div className="px-4 pb-4 pt-2 border-t space-y-3"
                style={{ borderColor: "var(--cat-card-border)" }}>

                {/* Groups — with inline name editing */}
                {stage.type === "group" && stage.groups.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {stage.groups.map((g, gi) => {
                      const gc          = ["#10b981","#f59e0b","#8b5cf6","#ec4899","#06b6d4","#f97316","#84cc16","#a855f7"][gi % 8];
                      const isEditing   = editingGroupId === g.id && editingStageId === stage.id;
                      const isSaving    = savingGroupId === g.id;
                      const displayName = nameOverrides[g.id] ?? g.name;
                      return (
                        <div key={g.id} className="flex items-center gap-1 px-2.5 py-1 rounded-lg border"
                          style={{ background: `${gc}10`, borderColor: `${gc}30` }}>
                          {isEditing ? (
                            <>
                              <input
                                autoFocus
                                value={editingName}
                                onChange={e => setEditingName(e.target.value)}
                                onBlur={() => saveGroupName(stage.id, g.id)}
                                onKeyDown={e => {
                                  if (e.key === "Enter") saveGroupName(stage.id, g.id);
                                  if (e.key === "Escape") setEditingGroupId(null);
                                }}
                                className="text-xs font-bold bg-transparent border-b outline-none"
                                style={{ color: gc, borderColor: `${gc}60`, width: Math.max(60, editingName.length * 7) }}
                              />
                              <button onClick={() => saveGroupName(stage.id, g.id)}
                                className="opacity-60 hover:opacity-100 transition-opacity"
                                style={{ color: gc }}>
                                <Save className="w-3 h-3" />
                              </button>
                              <button onClick={() => setEditingGroupId(null)}
                                className="opacity-40 hover:opacity-100 transition-opacity"
                                style={{ color: "var(--cat-text-muted)" }}>
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-xs font-bold" style={{ color: gc }}>
                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin inline" /> : displayName}
                              </span>
                              <button
                                onClick={() => { setEditingGroupId(g.id); setEditingStageId(stage.id); setEditingName(displayName); }}
                                className="ml-1 opacity-30 hover:opacity-80 transition-opacity"
                                style={{ color: gc }}>
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Rounds (playoff/league) */}
                {(stage.type === "knockout" || stage.type === "league") && stage.rounds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {stage.rounds.map(r => (
                      <span key={r.id} className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                        style={{ background: "rgba(236,72,153,0.1)", color: "#ec4899" }}>
                        {r.shortName ?? r.name}{r.matchCount ? ` (${r.matchCount})` : ""}
                      </span>
                    ))}
                  </div>
                )}

                {/* Match stats */}
                {stage.matchCount > 0 ? (
                  <div className="flex items-center gap-4 text-xs" style={{ color: "var(--cat-text-muted)" }}>
                    <span>⚽ {stage.matchCount} matches</span>
                    <span style={{ color: stage.scheduledCount === stage.matchCount ? "#2BFEBA" : "inherit" }}>
                      📅 {stage.scheduledCount} scheduled
                    </span>
                    {stage.matchCount - stage.scheduledCount > 0 && (
                      <span style={{ color: "#f59e0b" }}>
                        ⚠ {stage.matchCount - stage.scheduledCount} unscheduled
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border px-4 py-3 flex items-center gap-3"
                    style={{ background: "rgba(43,254,186,0.05)", borderColor: "rgba(43,254,186,0.2)" }}>
                    <Zap className="w-4 h-4 shrink-0" style={{ color: "#2BFEBA" }} />
                    <div className="flex-1">
                      <p className="text-xs font-bold" style={{ color: "var(--cat-text)" }}>No matches yet</p>
                      <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
                        Go to Schedule → Draw to assign teams, then generate matches.
                      </p>
                    </div>
                    <a href={`${scheduleBase}?classId=${classId}`}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                      style={{ background: "rgba(43,254,186,0.15)", color: "#2BFEBA" }}>
                      Schedule →
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main wizard component ────────────────────────────────────────────────────

export function FormatBuilderPage() {
  const t = useTranslations("formatBuilder");
  const ctx = useTournament();
  const tournamentId = ctx?.tournamentId ?? 0;
  const orgSlug = ctx?.orgSlug ?? "";
  const searchParams = useSearchParams();
  const fromSetup = searchParams?.get("from") === "setup";
  const classId = searchParams ? (Number(searchParams.get("classId")) || null) : null;
  const className = searchParams?.get("className") ?? "";
  const maxTeamsFromUrl = searchParams ? (Number(searchParams.get("maxTeams")) || null) : null;

  const [step, setStep] = useState(0);
  // resolvedMaxTeams: from URL (immediate) or from DB (fallback for direct navigation)
  const [resolvedMaxTeams, setResolvedMaxTeams] = useState<number | null>(maxTeamsFromUrl);
  const [state, setState] = useState<WizardState>({
    format: null,
    expectedTeams: maxTeamsFromUrl ?? 16,
    groupCount: 4,
    qualifyPerGroup: 2,
    knockoutTeams: maxTeamsFromUrl ?? 8,
    groupStageName: "Group Stage",
    playoffStageName: "Playoffs",
    thirdPlace: true,
    bBracket: false,
  });
  const [registeredCount, setRegisteredCount] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [hasEliteFormats, setHasEliteFormats] = useState<boolean | null>(null);
  const [effectivePlan, setEffectivePlan] = useState<string>("free");
  const [maxTeams, setMaxTeams] = useState<number | undefined>(undefined);
  const [planIncludedTeams, setPlanIncludedTeams] = useState<number>(16);
  const [extraTeamPriceCents, setExtraTeamPriceCents] = useState<number>(0);
  const saveTeamsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [existingStages, setExistingStages] = useState<ExistingStage[] | null>(null);
  const [loadingStages, setLoadingStages] = useState(true);
  const [changingFormat, setChangingFormat] = useState(false);
  const [divisionDeleted, setDivisionDeleted] = useState(false);
  const [formatTab, setFormatTab] = useState<"format" | "stages">("format");

  // Fetch maxTeams from DB if not in URL (direct navigation case)
  // Also verify the division still exists
  useEffect(() => {
    if (!classId || !orgSlug || !tournamentId) return;
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/classes/${classId}`, { credentials: "include" })
      .then(r => {
        if (r.status === 404) { setDivisionDeleted(true); return null; }
        return r.ok ? r.json() : null;
      })
      .then((cls: { maxTeams?: number | null } | null) => {
        if (!cls) return;
        if (cls?.maxTeams) {
          setResolvedMaxTeams(cls.maxTeams);
          setState(s => ({
            ...s,
            expectedTeams: cls.maxTeams!,
            knockoutTeams: Math.min(cls.maxTeams!, s.knockoutTeams),
          }));
        }
      })
      .catch(() => {});
  }, [classId, orgSlug, tournamentId]);

  // Загрузка существующих стадий дивизиона
  const stagesUrl = classId
    ? `/api/org/${orgSlug}/tournament/${tournamentId}/stages?classId=${classId}`
    : `/api/org/${orgSlug}/tournament/${tournamentId}/stages`;

  const reloadStages = useCallback(async () => {
    if (!orgSlug || !tournamentId) return;
    const stages: ExistingStage[] = await fetch(stagesUrl, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .catch(() => []);
    setExistingStages(stages.length > 0 ? stages : null);
  }, [orgSlug, tournamentId, stagesUrl]);

  useEffect(() => {
    if (!orgSlug || !tournamentId) return;
    setLoadingStages(true);
    reloadStages().finally(() => setLoadingStages(false));
  }, [orgSlug, tournamentId, classId, reloadStages]);

  // Загрузка реально зарегистрированных команд (для информации)
  useEffect(() => {
    if (!orgSlug || !tournamentId) return;
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/teams`)
      .then(r => r.json())
      .then(d => {
        const teams = Array.isArray(d) ? d : (d.teams ?? []);
        const count = teams.length;
        setRegisteredCount(count);
        // Если команды уже есть — используем их количество как начальное ожидаемое
        if (count > 0) {
          setState(s => ({ ...s, expectedTeams: count }));
        }
      })
      .catch(() => {});
  }, [orgSlug, tournamentId]);

  // Слушаем удаление дивизиона из сайдбара
  useEffect(() => {
    if (!classId) return;
    function onDivisionDeleted(e: Event) {
      const ev = e as CustomEvent<{ classId: number }>;
      if (ev.detail?.classId === classId) setDivisionDeleted(true);
    }
    window.addEventListener("division:deleted", onDivisionDeleted);
    return () => window.removeEventListener("division:deleted", onDivisionDeleted);
  }, [classId]);

  // Загрузка плана и лимитов
  useEffect(() => {
    if (!orgSlug || !tournamentId) return;
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/billing-info`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setHasEliteFormats(d.features?.hasEliteFormats ?? false);
          setEffectivePlan(d.effectivePlan ?? "free");
          setMaxTeams(d.features?.maxTeams ?? undefined);
          setPlanIncludedTeams(d.features?.planIncludedTeams ?? d.features?.maxTeams ?? 16);
          setExtraTeamPriceCents(d.features?.extraTeamPriceCents ?? 0);
        }
      })
      .catch(() => {});
  }, [orgSlug, tournamentId]);

  // Auto-save expectedTeams → division.maxTeams + notify sidebar cart
  function handleTeamsChange(teams: number) {
    if (!classId || !orgSlug || !tournamentId) return;
    if (saveTeamsTimerRef.current) clearTimeout(saveTeamsTimerRef.current);
    saveTeamsTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/classes/${classId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ maxTeams: teams }),
        });
        // Notify sidebar to refresh billing cart live
        window.dispatchEvent(new CustomEvent("billing:refresh"));
      } catch { /* silent */ }
    }, 600);
  }

  function goNext() {
    if (step < STEPS_LIST.length - 1) setStep(s => s + 1);
  }

  function goBack() {
    if (step > 0) setStep(s => s - 1);
  }

  // Умные дефолты expectedTeams по формату
  // Prefer: registered count → division's maxTeams → format default
  const defaultTeams = registeredCount > 0 ? registeredCount : (resolvedMaxTeams ?? 16);
  // Groups: aim for 4-5 teams per group
  const defaultGroups = Math.max(2, Math.ceil(defaultTeams / 5));
  const FORMAT_DEFAULTS: Record<FormatType, { expectedTeams: number; groupCount: number; knockoutTeams: number }> = {
    groups_knockout: { expectedTeams: defaultTeams, groupCount: defaultGroups, knockoutTeams: Math.min(defaultTeams, 8) },
    round_robin:     { expectedTeams: Math.min(defaultTeams, 10), groupCount: 1, knockoutTeams: 4 },
    groups_only:     { expectedTeams: defaultTeams, groupCount: defaultGroups, knockoutTeams: Math.min(defaultTeams, 8) },
    knockout_only:   { expectedTeams: defaultTeams, groupCount: 1, knockoutTeams: defaultTeams },
  };

  function handleFormatSelect(f: FormatType) {
    const defaults = FORMAT_DEFAULTS[f];
    setState(s => ({
      ...s,
      format: f,
      expectedTeams: defaults.expectedTeams,
      groupCount: f === "round_robin" ? 1 : defaults.groupCount,
      knockoutTeams: defaults.knockoutTeams,
    }));
    setStep(1); // Автопереход на следующий шаг
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const hasGroups = state.format === "groups_knockout"
        || state.format === "groups_only"
        || state.format === "round_robin";
      const hasKnockout = state.format === "groups_knockout"
        || state.format === "knockout_only";

      let groupStageId: number | null = null; // will store group stage id for qual rules

      // Создаём групповой этап (если нужен)
      if (hasGroups) {
        const stageRes = await fetch(
          `/api/org/${orgSlug}/tournament/${tournamentId}/stages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: state.groupStageName,
              nameRu: "Групповой этап",
              type: "group",
              order: 1,
              ...(classId && { classId }),
            }),
          }
        );
        const stage = await stageRes.json();
        groupStageId = stage.id; // remember for qualification rules

        if (state.format === "round_robin") {
          // Круговой: одна группа
          const targetSize = state.expectedTeams >= 2 ? state.expectedTeams : null;
          await fetch(
            `/api/org/${orgSlug}/tournament/${tournamentId}/stages/${stage.id}/groups`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ groups: [{ name: "Main Group", targetSize }] }),
            }
          );
        } else {
          // Несколько групп — один POST со всеми группами сразу
          // Вычисляем targetSize на группу: команды делятся равномерно, остаток добавляется в первые группы
          const teamsPerGroup = Math.floor(state.expectedTeams / state.groupCount);
          const remainder = state.expectedTeams % state.groupCount;
          await fetch(
            `/api/org/${orgSlug}/tournament/${tournamentId}/stages/${stage.id}/groups`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                groups: Array.from({ length: state.groupCount }, (_, i) => ({
                  name: `Group ${GROUP_LETTERS[i]}`,
                  targetSize: teamsPerGroup + (i < remainder ? 1 : 0),
                })),
              }),
            }
          );
        }

        // Генерируем слоты матчей для группового этапа (slot-mode: команды TBD)
        await fetch(
          `/api/org/${orgSlug}/tournament/${tournamentId}/matches/generate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stageId: stage.id }),
          }
        ).catch(() => {});
      }

      // Создаём плей-офф этап (если нужен)
      if (hasKnockout) {
        // Real qualifying teams (seeding: top teams skip round 1)
        const qualifyTotal = hasGroups ? state.qualifyPerGroup * state.groupCount : state.knockoutTeams;

        const koRes = await fetch(
          `/api/org/${orgSlug}/tournament/${tournamentId}/stages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: state.playoffStageName,
              nameRu: "Плей-офф А",
              type: "knockout",
              order: hasGroups ? 2 : 1,
              ...(classId && { classId }),
            }),
          }
        );
        const koStage = await koRes.json();

        // Seeded rounds: getRoundDefs takes realTeams, computes bracket size internally
        const roundDefs = getRoundDefs(qualifyTotal, state.thirdPlace);
        await fetch(
          `/api/org/${orgSlug}/tournament/${tournamentId}/stages/${koStage.id}/rounds`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rounds: roundDefs.map((r, i) => ({ ...r, order: i + 1 })) }),
          }
        );

        await fetch(
          `/api/org/${orgSlug}/tournament/${tournamentId}/matches/generate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stageId: koStage.id }),
          }
        ).catch(() => {});

        // Правила квалификации: групповой этап → A-плей-офф
        if (groupStageId && hasGroups) {
          await fetch(
            `/api/org/${orgSlug}/tournament/${tournamentId}/qualification-rules`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fromStageId: groupStageId,
                targetStageId: koStage.id,
                fromRank: 1,
                toRank: qualifyTotal,
                targetSlot: "a_playoff",
                condition: {
                  type: "groups_knockout",
                  qualifyPerGroup: state.qualifyPerGroup,
                  groupCount: state.groupCount,
                },
              }),
            }
          );
        }

        // Б-плей-офф (утешительный) — если включён
        if (state.bBracket && hasGroups) {
          const bTeams = state.expectedTeams - qualifyTotal;
          if (bTeams >= 2) {
            const bKoRes = await fetch(
              `/api/org/${orgSlug}/tournament/${tournamentId}/stages`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: "B-Playoffs",
                  nameRu: "Плей-офф Б",
                  type: "knockout",
                  order: 3,
                  ...(classId && { classId }),
                }),
              }
            );
            const bKoStage = await bKoRes.json();
            const bRoundDefs = getRoundDefs(bTeams, false);
            await fetch(
              `/api/org/${orgSlug}/tournament/${tournamentId}/stages/${bKoStage.id}/rounds`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rounds: bRoundDefs.map((r, i) => ({ ...r, order: i + 1 })) }),
              }
            );
            await fetch(
              `/api/org/${orgSlug}/tournament/${tournamentId}/matches/generate`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stageId: bKoStage.id }),
              }
            ).catch(() => {});

            // Правила квалификации: групповой этап → B-плей-офф
            if (groupStageId) {
              await fetch(
                `/api/org/${orgSlug}/tournament/${tournamentId}/qualification-rules`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    fromStageId: groupStageId,
                    targetStageId: bKoStage.id,
                    fromRank: qualifyTotal + 1,
                    toRank: state.expectedTeams,
                    targetSlot: "b_playoff",
                    condition: {
                      type: "groups_knockout_b",
                      groupCount: state.groupCount,
                      bTeams,
                    },
                  }),
                }
              );
            }
          }
        }
      }

      setDone(true);
    } catch (e) {
      console.error("Format generation error:", e);
    } finally {
      setGenerating(false);
    }
  }

  // Удалить все стадии дивизиона и перейти в виззер
  async function handleChangeFormat() {
    if (!existingStages) return;
    if (!window.confirm(t("confirmDeleteFormat"))) return;
    setChangingFormat(true);
    try {
      // Safety: only delete stages that belong to THIS division (classId guard)
      const stagesToDelete = existingStages.filter(s => s.classId === classId);
      for (const stage of stagesToDelete) {
        await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/stages/${stage.id}`, { method: "DELETE" });
      }
      setExistingStages(null);
    } catch { /* ignore */ } finally {
      setChangingFormat(false);
    }
  }

  if (done) {
    return <DoneScreen orgSlug={orgSlug} tournamentId={tournamentId} fromSetup={fromSetup} classId={classId} className={className} />;
  }

  // ── HARD GUARD: classId обязателен — стадии без дивизиона запрещены ──
  if (!classId) {
    const backHref = orgSlug && tournamentId
      ? `/org/${orgSlug}/admin/tournament/${tournamentId}/schedule`
      : "/";
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <span className="text-2xl">⚠️</span>
        </div>
        <div>
          <p className="text-base font-bold mb-1" style={{ color: "var(--cat-text)" }}>
            Дивизион не выбран
          </p>
          <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
            Откройте Format Builder через карточку дивизиона — classId обязателен.
          </p>
        </div>
        <a href={backHref}
          className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
          style={{ background: ACCENT, color: "#0a0e14" }}>
          ← К расписанию
        </a>
      </div>
    );
  }

  // Загрузка существующих стадий
  if (loadingStages) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

  // Дивизион был удалён пока находились на этой странице
  if (divisionDeleted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(239,68,68,0.1)", border: "1.5px solid rgba(239,68,68,0.3)" }}>
          <Trash2 className="w-8 h-8" style={{ color: "#ef4444" }} />
        </div>
        <div>
          <p className="text-lg font-black mb-1" style={{ color: "var(--cat-text)" }}>
            Дивизион удалён
          </p>
          <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
            Этот дивизион был удалён. Вернитесь и создайте новый.
          </p>
        </div>
        <a
          href={`/org/${orgSlug}/admin/tournament/${tournamentId}/setup`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80"
          style={{ background: ACCENT, color: "#000" }}
        >
          <ChevronLeft className="w-4 h-4" />
          Вернуться к настройке
        </a>
      </div>
    );
  }

  // Если стадии уже существуют — показать вкладки: Format | Stages
  if (existingStages) {
    return (
      <div>
        {/* Back to Setup button */}
        {fromSetup && (
          <a
            href={`/org/${orgSlug}/admin/tournament/${tournamentId}/setup`}
            className="inline-flex items-center gap-1.5 mb-4 text-xs font-bold transition-all hover:opacity-70 rounded-lg px-3 py-1.5"
            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {t("backToSetup")}
          </a>
        )}

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 rounded-2xl w-fit mb-6"
          style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)" }}>
          {[
            { key: "format" as const, icon: <GitBranch className="w-4 h-4" />, label: "Format" },
            { key: "stages" as const, icon: <Layers className="w-4 h-4" />,    label: "Stages" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFormatTab(tab.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={formatTab === tab.key
                ? { background: "var(--cat-card-bg)", color: "#2BFEBA", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }
                : { color: "var(--cat-text-muted)" }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {formatTab === "format" && (
          <FormatSummaryView
            stages={existingStages}
            onChangeFormat={handleChangeFormat}
            changing={changingFormat}
            maxTeams={resolvedMaxTeams ?? undefined}
          />
        )}
        {formatTab === "stages" && (
          <StagesManagementView
            orgSlug={orgSlug}
            tournamentId={tournamentId}
            classId={classId}
            initialStages={existingStages}
            onStagesChange={reloadStages}
          />
        )}
      </div>
    );
  }

  const currentStepKey = STEPS_LIST[step];
  const canNext = (() => {
    if (currentStepKey === "format") return state.format !== null;
    return true;
  })();

  return (
    <div className="min-h-[70vh] flex flex-col">
      {/* Заголовок страницы */}
      <div className="mb-8">
        {/* Back to Setup button — shown when navigated from Setup Wizard */}
        {fromSetup && (
          <a
            href={`/org/${orgSlug}/admin/tournament/${tournamentId}/setup`}
            className="inline-flex items-center gap-1.5 mb-4 text-xs font-bold transition-all hover:opacity-70 rounded-lg px-3 py-1.5"
            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {t("backToSetup")}
          </a>
        )}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(43,254,186,0.12)", boxShadow: "0 0 18px rgba(43,254,186,0.25)" }}>
            <Layers className="w-5 h-5" style={{ color: ACCENT }} />
          </div>
          <h1 className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>{t("pageTitle")}</h1>
        </div>
        <p className="text-sm ml-12" style={{ color: "var(--cat-text-muted)" }}>{t("pageSubtitle")}</p>
      </div>

      {/* Прогресс шагов */}
      <StepDots current={step} />

      {/* Контент шага */}
      <div className="flex-1">
        {currentStepKey === "format" && (
          <FormatStep
            state={state}
            onSelect={handleFormatSelect}
            basePath={`/org/${orgSlug}/admin/tournament/${tournamentId}/format`}
            hasEliteFormats={hasEliteFormats}
            effectivePlan={effectivePlan}
            billingUrl={`/org/${orgSlug}/admin/tournament/${tournamentId}/billing`}
          />
        )}
        {currentStepKey === "structure" && (
          <StructureStep
            state={state}
            setState={setState}
            registeredCount={registeredCount}
            planIncludedTeams={planIncludedTeams}
            extraTeamPriceCents={extraTeamPriceCents}
            onTeamsChange={handleTeamsChange}
            billingUrl={`/org/${orgSlug}/admin/tournament/${tournamentId}/billing`}
          />
        )}
        {currentStepKey === "slots" && (
          <SlotPreviewStep state={state} />
        )}
        {currentStepKey === "generate" && (
          <GenerateStep state={state} generating={generating} />
        )}
      </div>

      {/* Навигация */}
      {currentStepKey !== "format" && (
        <div className="flex items-center justify-between mt-10 pt-6 border-t"
          style={{ borderColor: "var(--cat-card-border)" }}>
          <button onClick={goBack}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
            style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)", background: "var(--cat-card-bg)" }}>
            <ChevronLeft className="w-4 h-4" /> {t("back")}
          </button>

          {currentStepKey !== "generate" ? (
            <button
              onClick={goNext}
              disabled={!canNext}
              className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
              style={{
                background: ACCENT,
                color: "#000",
                boxShadow: canNext ? `0 0 18px rgba(43,254,186,0.4)` : "none",
              }}>
              {t("next")} <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-black transition-all disabled:opacity-60"
              style={{
                background: generating ? "var(--cat-card-border)" : ACCENT,
                color: generating ? "var(--cat-text-muted)" : "#000",
                boxShadow: generating ? "none" : `0 0 28px rgba(43,254,186,0.5)`,
              }}>
              {generating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("generating")}</>
                : <><Zap className="w-4 h-4" /> {t("createFormat")}</>
              }
            </button>
          )}
        </div>
      )}
    </div>
  );
}
