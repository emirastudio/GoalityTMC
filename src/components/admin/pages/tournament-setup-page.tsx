"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAdminFetch, useTournament } from "@/lib/tournament-context";
import { TournamentMediaUpload } from "@/components/admin/tournament-media-upload";
import { StadiumsPageContent } from "@/components/admin/pages/stadiums-page";
import { Link } from "@/i18n/navigation";
import {
  Trophy, GraduationCap, ShoppingBag, Plus, Trash2,
  Save, Loader2, Check, Info, ImageIcon, Sparkles,
  MapPin, Hotel, Megaphone, Phone, ChevronDown,
  GitBranch, Rocket, AlertCircle, ExternalLink,
  Globe, Calendar, Users, DollarSign, LayoutGrid,
  CheckCircle2, Circle, ArrowRight, X, Zap, Crown, Gift,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
//  Типы данных
// ─────────────────────────────────────────────────────────────

interface TournamentClass {
  id?: number;
  name: string;
  format: string | null;
  minBirthYear: number | null;
  maxBirthYear: number | null;
  maxTeams: number | null;
  maxPlayers: number | null;
  maxStaff: number | null;
  startDate?: string | null;
  endDate?: string | null;
  _deleted?: boolean;
}

interface TournamentProduct {
  id?: number;
  name: string;
  category: string;
  price: string;
  perPerson: boolean;
  isRequired: boolean;
  sortOrder: number;
  _deleted?: boolean;
}

interface TournamentData {
  id: number;
  name: string;
  year: number;
  startDate: string | null;
  endDate: string | null;
  registrationDeadline: string | null;
  registrationOpen: boolean;
  currency: string;
  logoUrl: string | null;
  coverUrl: string | null;
  classes: TournamentClass[];
  products: TournamentProduct[];
}

interface TournamentField {
  id?: number;
  name: string;
  address: string;
  mapUrl: string;
  scheduleUrl: string;
  notes: string;
  sortOrder: number;
  _deleted?: boolean;
}

interface TournamentHotel {
  id?: number;
  name: string;
  address: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  notes: string;
  sortOrder: number;
  _deleted?: boolean;
}

interface TournamentInfoData {
  // Contact
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  // Social media
  instagram?: string;
  facebook?: string;
  twitter?: string;
  youtube?: string;
  // Legacy (kept for backward compat, not shown in setup)
  hotelName?: string;
  hotelAddress?: string;
  hotelCheckIn?: string;
  hotelCheckOut?: string;
  venueName?: string;
  venueAddress?: string;
  venueMapUrl?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

// Шаги мастера настройки
type StepKey = "basics" | "media" | "divisions" | "format" | "venue" | "products" | "info" | "publish";

const FORMATS = ["5x5", "6x6", "7x7", "8x8", "9x9", "11x11"];
const CATEGORIES = ["registration", "accommodation", "transfer", "meals", "extra"];

function toDateInput(val: string | null): string {
  if (!val) return "";
  return val.slice(0, 10);
}

// ─────────────────────────────────────────────────────────────
//  Анимация сохранения
// ─────────────────────────────────────────────────────────────

function SaveSuccessOverlay({ visible }: { visible: boolean }) {
  const t = useTranslations("orgAdmin");
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{ animation: "fadeInOut 1.6s ease forwards" }}>
      <style>{`
        @keyframes fadeInOut {
          0%   { opacity: 0; transform: scale(0.85); }
          20%  { opacity: 1; transform: scale(1.05); }
          35%  { opacity: 1; transform: scale(1); }
          75%  { opacity: 1; }
          100% { opacity: 0; transform: scale(0.95); }
        }
        @keyframes spinOnce {
          from { transform: rotate(0deg) scale(1); }
          50%  { transform: rotate(180deg) scale(1.3); }
          to   { transform: rotate(360deg) scale(1); }
        }
        @keyframes pop {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .save-icon { animation: spinOnce 0.6s ease forwards; }
        .save-check { animation: pop 0.4s ease 0.3s forwards; opacity: 0; }
      `}</style>
      <div className="flex flex-col items-center gap-4 px-10 py-8 rounded-3xl shadow-2xl"
        style={{ background: "linear-gradient(135deg, #0d9488, #0891b2)", color: "#fff", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)" }}>
        <div className="relative">
          <div className="save-icon"><Sparkles className="w-14 h-14 opacity-90" /></div>
          <div className="save-check absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#fff" }}>
            <Check className="w-4 h-4" style={{ color: "#0d9488" }} />
          </div>
        </div>
        <div className="text-center">
          <p className="text-xl font-black tracking-tight">{t("savedTitle")}</p>
          <p className="text-sm opacity-75 mt-1">{t("savedRefreshing")}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Определение шагов мастера
// ─────────────────────────────────────────────────────────────

interface StepDef {
  key: StepKey;
  icon: React.ElementType;
  labelKey: string;
  hintKey: string;
  required: boolean;
}

const STEPS: StepDef[] = [
  { key: "basics",    icon: Trophy,         labelKey: "stepBasics",    hintKey: "stepBasicsHint",    required: true },
  { key: "media",     icon: ImageIcon,      labelKey: "stepMedia",     hintKey: "stepMediaHint",     required: false },
  { key: "divisions", icon: GraduationCap,  labelKey: "stepDivisions", hintKey: "stepDivisionsHint", required: true },
  { key: "format",    icon: GitBranch,      labelKey: "stepFormat",    hintKey: "stepFormatHint",    required: true },
  { key: "venue",     icon: MapPin,         labelKey: "stepVenue",     hintKey: "stepVenueHint",     required: false },
  { key: "products",  icon: ShoppingBag,    labelKey: "stepProducts",  hintKey: "stepProductsHint",  required: false },
  { key: "info",      icon: Info,           labelKey: "stepInfo",      hintKey: "stepInfoHint",      required: false },
  { key: "publish",   icon: Rocket,         labelKey: "stepPublish",   hintKey: "stepPublishHint",   required: true },
];

// ─────────────────────────────────────────────────────────────
//  Plan status widget (horizontal bar at top of hub)
// ─────────────────────────────────────────────────────────────

function computePlanViolations(
  plan: string,
  maxDivisions: number,
  activeClasses: number,
  startDate: string,
  endDate: string,
) {
  const maxDays = plan === "free" ? 1 : plan === "starter" ? 2 : Infinity;
  const maxDiv = maxDivisions >= 9999 ? Infinity : maxDivisions;

  const days = startDate && endDate
    ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
    : null;

  const divOk = maxDiv === Infinity || activeClasses === 0 || activeClasses <= maxDiv;
  const daysOk = !days || maxDays === Infinity || days <= maxDays;

  return { divOk, daysOk, days, maxDays, maxDiv, allOk: divOk && daysOk };
}

function PlanWidget({ planInfo, activeClasses, startDate, endDate, orgSlug, tournamentId }: {
  planInfo: { effectivePlan: string; maxDivisions: number; maxTeams: number; extraTeamPrice: number } | null;
  activeClasses: number;
  startDate: string;
  endDate: string;
  orgSlug: string;
  tournamentId: number;
}) {
  const t = useTranslations("orgAdmin");
  if (!planInfo) return null;
  const plan = planInfo.effectivePlan;

  const planColor: Record<string, string> = { free: "#6b7280", starter: "#2563EB", pro: "#059669", elite: "#EA580C" };
  const pc = planColor[plan] ?? "#6b7280";

  const { divOk, daysOk, days, maxDays, maxDiv, allOk } = computePlanViolations(
    plan, planInfo.maxDivisions, activeClasses, startDate, endDate
  );

  const billingUrl = `/org/${orgSlug}/admin/tournament/${tournamentId}/billing`;

  if (allOk && plan === "free") {
    // All good on free — show calm green status
    return (
      <div className="rounded-2xl border px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(5,150,105,0.05)", borderColor: "rgba(5,150,105,0.2)" }}>
        <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#059669" }} />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold" style={{ color: "#059669" }}>{t("freeTournamentOk")}</span>
          <span className="text-xs ml-2" style={{ color: "var(--cat-text-muted)" }}>
            {t("limitDivisions")}: {activeClasses}/{maxDiv === Infinity ? "∞" : maxDiv} ·{" "}
            {t("limitDays")}: {days ?? "—"}/{maxDays === Infinity ? "∞" : maxDays} ·{" "}
            {t("limitTeams")}: {planInfo.maxTeams}
          </span>
        </div>
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0"
          style={{ background: `${pc}18`, color: pc }}>
          {plan}
        </span>
      </div>
    );
  }

  // Paid plan or violations — show full widget
  const violations: string[] = [];
  if (!divOk) violations.push(`${t("limitDivisions")}: ${activeClasses}/${maxDiv === Infinity ? "∞" : maxDiv}`);
  if (!daysOk) violations.push(`${t("limitDays")}: ${days}/${maxDays}`);

  return (
    <div className="rounded-2xl border px-4 py-3 flex items-center gap-3 flex-wrap"
      style={{
        background: allOk ? `${pc}08` : "rgba(220,38,38,0.06)",
        borderColor: allOk ? `${pc}30` : "rgba(220,38,38,0.3)",
      }}>
      <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0"
        style={{ background: `${pc}18`, color: pc }}>
        {plan}
      </span>
      <div className="flex items-center gap-3 flex-1 flex-wrap text-xs" style={{ color: "var(--cat-text-muted)" }}>
        <span style={{ color: divOk ? "var(--cat-text-muted)" : "#DC2626" }}>
          {divOk ? "✓" : "✗"} {t("limitDivisions")}: <strong>{activeClasses}/{maxDiv === Infinity ? "∞" : maxDiv}</strong>
        </span>
        {days !== null && (
          <span style={{ color: daysOk ? "var(--cat-text-muted)" : "#DC2626" }}>
            {daysOk ? "✓" : "✗"} {t("limitDays")}: <strong>{days}/{maxDays === Infinity ? "∞" : maxDays}</strong>
          </span>
        )}
        <span style={{ color: "var(--cat-text-muted)" }}>
          ✓ {t("limitTeams")}: <strong>
            {planInfo.maxTeams}
            {planInfo.extraTeamPrice > 0 ? ` (+€${planInfo.extraTeamPrice}/${t("perTeam")})` : ""}
          </strong>
        </span>
      </div>
      {!allOk && (
        <a href={billingUrl}
          className="shrink-0 text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all hover:opacity-80"
          style={{ background: "#DC2626", color: "#fff", textDecoration: "none" }}>
          <Zap className="w-3 h-3" />
          {t("upgradeThisTournament")}
        </a>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  HubCard — expandable card for each section
// ─────────────────────────────────────────────────────────────

function HubCard({
  icon: Icon, title, badge, summary, isOpen, onToggle, onSave, onAfterSave, saving, children,
}: {
  icon: React.ElementType;
  title: string;
  badge: "done" | "required" | "optional";
  summary: string;
  isOpen: boolean;
  onToggle: () => void;
  onSave?: () => Promise<void>;
  onAfterSave?: () => void;
  saving?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("orgAdmin");
  const [localSaving, setLocalSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const badgeCfg = {
    done:     { bg: "rgba(5,150,105,0.12)",  text: "#059669", label: t("stepDone") },
    required: { bg: "rgba(215,119,8,0.12)",  text: "#D97706", label: t("stepRequired") },
    optional: { bg: "rgba(100,116,139,0.12)", text: "#64748B", label: t("stepOptional") },
  }[badge];

  const handleSave = async () => {
    if (!onSave) return;
    setLocalSaving(true);
    try {
      await onSave();
      setJustSaved(true);
      setTimeout(() => {
        setJustSaved(false);
        if (onAfterSave) onAfterSave();
        else onToggle();
      }, 700);
    } finally {
      setLocalSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border overflow-hidden transition-all duration-200"
      style={{
        background: "var(--cat-card-bg)",
        borderColor: isOpen ? "rgba(43,254,186,0.35)" : "var(--cat-card-border)",
        boxShadow: isOpen ? "0 0 28px rgba(43,254,186,0.07)" : "none",
      }}>
      {/* ── Header (always visible, clickable) ── */}
      <button onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-all hover:opacity-80">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
          style={{ background: isOpen ? "rgba(43,254,186,0.15)" : "var(--cat-tag-bg)" }}>
          <Icon className="w-4.5 h-4.5" style={{ color: isOpen ? ACCENT_CLR : "var(--cat-text-muted)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-black" style={{ color: "var(--cat-text)" }}>{title}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: badgeCfg.bg, color: badgeCfg.text }}>
              {badgeCfg.label}
            </span>
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--cat-text-muted)" }}>{summary}</p>
        </div>
        <ChevronDown className="w-4 h-4 shrink-0 transition-transform duration-200"
          style={{ color: "var(--cat-text-muted)", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
      </button>

      {/* ── Body (shown when open) ── */}
      {isOpen && (
        <div className="border-t px-5 pb-5 pt-4 space-y-5"
          style={{ borderColor: "rgba(43,254,186,0.12)" }}>
          {children}
          {onSave && (
            <div className="flex justify-end pt-1">
              <button onClick={handleSave} disabled={localSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-60"
                style={{ background: ACCENT_CLR, color: "#000", boxShadow: `0 0 16px rgba(43,254,186,0.3)` }}>
                {localSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />{t("saving")}</>
                ) : justSaved ? (
                  <><Check className="w-4 h-4" />{t("savedTitle")}</>
                ) : (
                  <><Save className="w-4 h-4" />{t("saveAndContinue")}</>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Заголовок шага
// ─────────────────────────────────────────────────────────────

function StepHeader({ icon: Icon, title, description, badge }: {
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="flex items-start gap-4 mb-6 pb-5 border-b" style={{ borderColor: "var(--cat-card-border)" }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: "var(--cat-accent)", boxShadow: "0 0 20px var(--cat-accent-glow, rgba(0,200,150,0.25))" }}>
        <Icon className="w-6 h-6" style={{ color: "var(--cat-accent-text)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-black" style={{ color: "var(--cat-text)" }}>{title}</h2>
          {badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
              style={{ background: "var(--badge-warning-bg)", color: "var(--badge-warning-text)" }}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{description}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Поле ввода (premium style)
// ─────────────────────────────────────────────────────────────

function Field({ label, hint, required, children }: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--cat-text)" }}>
        {label}{required && <span className="ml-1" style={{ color: "var(--cat-accent)" }}>*</span>}
      </label>
      {hint && <p className="text-xs mb-2" style={{ color: "var(--cat-text-muted)" }}>{hint}</p>}
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--cat-accent)] transition-all";
const inputStyle = {
  background: "var(--cat-input-bg, var(--cat-card-bg))",
  border: "1px solid var(--cat-card-border)",
  color: "var(--cat-text)",
};

// ─────────────────────────────────────────────────────────────
//  ШАГ 1: Основное
// ─────────────────────────────────────────────────────────────

function StepBasics({ name, setName, year, setYear, startDate, setStartDate, endDate, setEndDate, regDeadline, setRegDeadline, currency, setCurrency }: {
  name: string; setName: (v: string) => void;
  year: number; setYear: (v: number) => void;
  startDate: string; setStartDate: (v: string) => void;
  endDate: string; setEndDate: (v: string) => void;
  regDeadline: string; setRegDeadline: (v: string) => void;
  currency: string; setCurrency: (v: string) => void;
}) {
  const t = useTranslations("orgAdmin");

  return (
    <div className="space-y-5">
      <StepHeader icon={Trophy} title={t("stepBasics")} description={t("stepBasicsHint")} badge={t("required")} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <Field label={t("tournamentName")} required>
            <input className={inputCls} style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder={t("tournamentNamePlaceholder")} />
          </Field>
        </div>
        <div>
          <Field label={t("year")} required>
            <input type="number" className={inputCls} style={inputStyle} value={year} onChange={e => setYear(Number(e.target.value))} min={2020} max={2040} />
          </Field>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t("startDate")}>
          <input type="date" className={inputCls} style={inputStyle} value={startDate} onChange={e => setStartDate(e.target.value)} />
        </Field>
        <Field label={t("endDate")}>
          <input type="date" className={inputCls} style={inputStyle} value={endDate} onChange={e => setEndDate(e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t("registrationDeadline")} hint={t("registrationDeadlineHint")}>
          <input type="date" className={inputCls} style={inputStyle} value={regDeadline} onChange={e => setRegDeadline(e.target.value)} />
        </Field>
        <Field label={t("currency")}>
          <select className={inputCls} style={inputStyle} value={currency} onChange={e => setCurrency(e.target.value)}>
            <option value="EUR">EUR — Euro</option>
            <option value="USD">USD — US Dollar</option>
            <option value="GBP">GBP — British Pound</option>
            <option value="RUB">RUB — Russian Ruble</option>
          </select>
        </Field>
      </div>

      {/* Подсказка о следующем шаге */}
      <div className="rounded-2xl border px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(59,130,246,0.06)", borderColor: "rgba(59,130,246,0.2)" }}>
        <Info className="w-4 h-4 shrink-0" style={{ color: "#3b82f6" }} />
        <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("basicsNextHint")}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ШАГ 2: Медиа (логотип + обложка)
// ─────────────────────────────────────────────────────────────

function StepMedia({ orgSlug, tournamentId, coverUrl, logoUrl, onLogoChange, onCoverChange }: {
  orgSlug: string;
  tournamentId: number;
  coverUrl: string | null;
  logoUrl: string | null;
  onLogoChange?: (url: string | null) => void;
  onCoverChange?: (url: string | null) => void;
}) {
  const t = useTranslations("orgAdmin");

  return (
    <div className="space-y-5">
      <StepHeader icon={ImageIcon} title={t("stepMedia")} description={t("stepMediaHint")} />
      <TournamentMediaUpload
        orgSlug={orgSlug}
        tournamentId={tournamentId}
        initialCoverUrl={coverUrl}
        initialLogoUrl={logoUrl}
        onLogoChange={onLogoChange}
        onCoverChange={onCoverChange}
      />
      <div className="rounded-2xl border px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(139,92,246,0.06)", borderColor: "rgba(139,92,246,0.2)" }}>
        <Sparkles className="w-4 h-4 shrink-0" style={{ color: "#8b5cf6" }} />
        <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("mediaHint")}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ШАГ 3: Дивизионы
// ─────────────────────────────────────────────────────────────

function StepDivisions({ classes, setClasses, planInfo, divisionLimitError, tournamentStartDate, tournamentEndDate }: {
  classes: TournamentClass[];
  setClasses: (v: TournamentClass[]) => void;
  planInfo: { effectivePlan: string; maxDivisions: number; extraDivisionPrice: number } | null;
  divisionLimitError: { currentPlan: string; maxDivisions: number; attempted: number } | null;
  tournamentStartDate?: string;
  tournamentEndDate?: string;
}) {
  const t = useTranslations("orgAdmin");
  const active = classes.filter(c => !c._deleted);
  const atLimit = planInfo ? active.length >= planInfo.maxDivisions : false;

  const addClass = () => {
    if (atLimit) return;
    setClasses([...classes, {
      name: "", format: null, minBirthYear: null, maxBirthYear: null,
      maxTeams: null, maxPlayers: 25, maxStaff: 5,
      startDate: tournamentStartDate || null,
      endDate: tournamentEndDate || null,
    }]);
  };

  const updateClass = (idx: number, patch: Partial<TournamentClass>) => {
    const updated = [...classes];
    const realIdx = classes.indexOf(active[idx]);
    updated[realIdx] = { ...updated[realIdx], ...patch };
    setClasses(updated);
  };

  const deleteClass = (idx: number) => {
    const updated = [...classes];
    const realIdx = classes.indexOf(active[idx]);
    if (updated[realIdx].id) {
      updated[realIdx] = { ...updated[realIdx], _deleted: true };
    } else {
      updated.splice(realIdx, 1);
    }
    setClasses(updated);
  };

  return (
    <div className="space-y-5">
      <StepHeader icon={GraduationCap} title={t("stepDivisions")} description={t("stepDivisionsHint")} badge={t("required")} />

      {/* Лимит плана */}
      {planInfo && (
        <div className="flex items-center justify-between rounded-2xl border px-4 py-3"
          style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" style={{ color: "var(--cat-accent)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>
              {active.length} / {planInfo.maxDivisions === 9999 ? "∞" : planInfo.maxDivisions} {t("divisions")}
            </span>
          </div>
          <span className="text-xs px-2 py-1 rounded-full font-bold uppercase"
            style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}>
            {planInfo.effectivePlan}
          </span>
        </div>
      )}

      {/* Ошибка лимита дивизионов */}
      {divisionLimitError && (
        <div className="rounded-2xl border px-4 py-3 flex items-start gap-3"
          style={{ background: "var(--badge-error-bg)", borderColor: "var(--badge-error-text)" }}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--badge-error-text)" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--badge-error-text)" }}>
              {t("divisionLimitTitle", { max: divisionLimitError.maxDivisions })}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
              {t("divisionLimitHint")}
            </p>
          </div>
        </div>
      )}

      {/* Список дивизионов */}
      <div className="space-y-3">
        {active.map((cls, idx) => (
          <div key={idx} className="rounded-2xl border p-4"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black"
                style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}>
                {idx + 1}
              </div>
              <span className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>{cls.name || t("newDivision")}</span>
              <button onClick={() => deleteClass(idx)} className="ml-auto p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                style={{ color: "var(--badge-error-text)", background: "var(--badge-error-bg)" }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="col-span-2">
                <Field label={t("divisionName")}>
                  <input className={inputCls} style={inputStyle} value={cls.name} onChange={e => updateClass(idx, { name: e.target.value })} placeholder="U12, Men Open..." />
                </Field>
              </div>
              <div>
                <Field label={t("startDate")}>
                  <input type="date" className={inputCls} style={inputStyle} value={cls.startDate ?? ""} onChange={e => updateClass(idx, { startDate: e.target.value || null })} />
                </Field>
              </div>
              <div>
                <Field label={t("endDate")}>
                  <input type="date" className={inputCls} style={inputStyle} value={cls.endDate ?? ""} onChange={e => updateClass(idx, { endDate: e.target.value || null })} />
                </Field>
              </div>
              <div>
                <Field label={t("format")}>
                  <select className={inputCls} style={inputStyle} value={cls.format ?? ""} onChange={e => updateClass(idx, { format: e.target.value || null })}>
                    <option value="">{t("selectFormat")}</option>
                    {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </Field>
              </div>
              <div>
                <Field label={t("maxTeams")}>
                  <input type="number" className={inputCls} style={inputStyle} value={cls.maxTeams ?? ""} onChange={e => updateClass(idx, { maxTeams: e.target.value ? Number(e.target.value) : null })} min={2} max={100} />
                </Field>
              </div>
              <div>
                <Field label={t("minBirthYear")}>
                  <input type="number" className={inputCls} style={inputStyle} value={cls.minBirthYear ?? ""} onChange={e => updateClass(idx, { minBirthYear: e.target.value ? Number(e.target.value) : null })} placeholder="2010" />
                </Field>
              </div>
              <div>
                <Field label={t("maxBirthYear")}>
                  <input type="number" className={inputCls} style={inputStyle} value={cls.maxBirthYear ?? ""} onChange={e => updateClass(idx, { maxBirthYear: e.target.value ? Number(e.target.value) : null })} placeholder="2015" />
                </Field>
              </div>
              <div>
                <Field label={t("maxPlayers")}>
                  <input type="number" className={inputCls} style={inputStyle} value={cls.maxPlayers ?? ""} onChange={e => updateClass(idx, { maxPlayers: e.target.value ? Number(e.target.value) : null })} min={1} max={50} />
                </Field>
              </div>
              <div>
                <Field label={t("maxStaff")}>
                  <input type="number" className={inputCls} style={inputStyle} value={cls.maxStaff ?? ""} onChange={e => updateClass(idx, { maxStaff: e.target.value ? Number(e.target.value) : null })} min={0} max={20} />
                </Field>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Кнопка добавления */}
      <button
        onClick={addClass}
        disabled={atLimit}
        className="w-full rounded-2xl border-2 border-dashed py-4 flex items-center justify-center gap-2 text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-40"
        style={{ borderColor: "var(--cat-accent)", color: "var(--cat-accent)", background: "transparent" }}
      >
        <Plus className="w-4 h-4" />
        {t("addDivision")}
      </button>

      {active.length === 0 && (
        <div className="text-center py-8 rounded-2xl border-2 border-dashed"
          style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-muted)" }}>
          <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-25" />
          <p className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>{t("noDivisions")}</p>
          <p className="text-xs mt-1">{t("noDivisionsHint")}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ШАГ 4: Формат турнира — единственный источник правды: Format Builder
// ─────────────────────────────────────────────────────────────

// Inline format wizard REMOVED. Format Builder page is the single source of truth.
// Setup step 4 shows status cards with links to Format Builder.

const ACCENT_CLR = "#2BFEBA";

// ── StepFormat: status cards linking to Format Builder ────────────────────

// Map from format type to human label
const FORMAT_LABELS: Record<string, string> = {
  groups_knockout: "Groups + Playoff",
  round_robin:     "Round Robin",
  groups_only:     "Groups only",
  knockout_only:   "Knockout only",
};

function StepFormat({ orgSlug, tournamentId, classes, configured, setConfigured }: {
  orgSlug: string;
  tournamentId: number;
  classes: TournamentClass[];
  configured: Set<string>;
  setConfigured: (v: Set<string>) => void;
}) {
  const t = useTranslations("orgAdmin");
  const activeClasses = classes.filter(c => !c._deleted && c.name);

  // stageInfo: classKey → { type, groupCount } for already-configured divisions
  const [stageInfo, setStageInfo] = useState<Record<string, { type: string; groupCount: number } | null>>({});

  // On mount: fetch existing stages for each class to auto-mark as configured
  useEffect(() => {
    if (!orgSlug || !tournamentId) return;
    activeClasses.forEach(cls => {
      if (!cls.id) return;
      const key = String(cls.id);
      fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/stages?classId=${cls.id}`)
        .then(r => r.ok ? r.json() : [])
        .then((stages: { type: string }[]) => {
          if (stages.length > 0) {
            const hasGroup    = stages.some(s => s.type === "group");
            const hasKnockout = stages.some(s => s.type === "knockout");
            const hasLeague   = stages.some(s => s.type === "league");
            let type = "groups_knockout";
            if (hasGroup && hasKnockout) type = "groups_knockout";
            else if (hasGroup && !hasKnockout) type = hasLeague ? "round_robin" : "groups_only";
            else if (!hasGroup && hasKnockout) type = "knockout_only";
            else if (hasLeague) type = "round_robin";
            const groupStage = (stages as { type: string; groups?: unknown[] }[]).find(s => s.type === "group");
            const groupCount = groupStage?.groups?.length ?? 0;
            setStageInfo(prev => ({ ...prev, [key]: { type, groupCount } }));
            setConfigured(new Set([...configured, key]));
          } else {
            setStageInfo(prev => ({ ...prev, [key]: null }));
          }
        })
        .catch(() => null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug, tournamentId, activeClasses.map(c => c.id).join(",")]);

  return (
    <div className="space-y-5">
      <StepHeader icon={GitBranch} title={t("stepFormat")} description={t("stepFormatHint")} badge={t("required")} />

      {/* Slot concept banner */}
      <div className="rounded-2xl border p-5"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(59,130,246,0.06))", borderColor: "rgba(99,102,241,0.25)" }}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(99,102,241,0.15)" }}>
            <Sparkles className="w-4 h-4" style={{ color: "#6366f1" }} />
          </div>
          <div>
            <p className="text-sm font-bold mb-1" style={{ color: "var(--cat-text)" }}>
              {t("slotConceptTitle")}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--cat-text-muted)" }}>
              {t("slotConceptDesc")}
            </p>
          </div>
        </div>
      </div>

      {/* Per-division status cards */}
      {activeClasses.length === 0 ? (
        <div className="text-center py-8 rounded-2xl border-2 border-dashed"
          style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-muted)" }}>
          <GitBranch className="w-10 h-10 mx-auto mb-2 opacity-25" />
          <p className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>{t("formatNoDivisions")}</p>
          <p className="text-xs mt-1">{t("formatNoDivisionsHint")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeClasses.map(cls => {
            const key = String(cls.id ?? cls.name);
            const info = stageInfo[key];
            const hasSavedStages = !!info;
            const formatUrl = `/org/${orgSlug}/admin/tournament/${tournamentId}/format?classId=${cls.id}&className=${encodeURIComponent(cls.name)}&from=setup`;

            if (hasSavedStages) {
              // ── Configured: green card + Edit link ──
              return (
                <div key={key} className="rounded-2xl border p-4 flex items-center gap-4"
                  style={{ background: "rgba(43,254,186,0.05)", borderColor: "rgba(43,254,186,0.35)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(43,254,186,0.12)" }}>
                    <CheckCircle2 className="w-5 h-5" style={{ color: ACCENT_CLR }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>{cls.name}</p>
                    <p className="text-xs font-semibold" style={{ color: ACCENT_CLR }}>
                      {FORMAT_LABELS[info.type] ?? info.type}
                      {info.groupCount > 0 ? ` · ${info.groupCount} ${t("groups")}` : ""}
                    </p>
                  </div>
                  <a
                    href={formatUrl}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 shrink-0"
                    style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    {t("editFormat")}
                  </a>
                </div>
              );
            }

            // ── Not configured: neutral card + Configure link ──
            return (
              <div key={key} className="rounded-2xl border p-4 flex items-center gap-4"
                style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "var(--cat-tag-bg)" }}>
                  <GitBranch className="w-5 h-5" style={{ color: "var(--cat-accent)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>{cls.name}</p>
                  <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("formatNotConfigured")}</p>
                </div>
                <a
                  href={formatUrl}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 shrink-0"
                  style={{ background: ACCENT_CLR, color: "#000", boxShadow: `0 0 14px rgba(43,254,186,0.4)` }}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  {t("configureFormat")}
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ШАГ 5: Площадки
// ─────────────────────────────────────────────────────────────

function StepVenue({ fields, setFields }: {
  fields: TournamentField[];
  setFields: (v: TournamentField[]) => void;
}) {
  const t = useTranslations("orgAdmin");
  const active = fields.filter(f => !f._deleted);

  // Add-stadium form state
  const [showAdd, setShowAdd] = useState(active.length === 0);
  const [sName, setSName] = useState("");
  const [sAddress, setSAddress] = useState("");
  const [sMapUrl, setSMapUrl] = useState("");

  const addStadium = (count: number) => {
    if (!sName.trim()) return;
    const base = sName.trim();
    const addr = sAddress.trim();
    const map = sMapUrl.trim();
    const newFields = count === 1
      ? [{ name: base, address: addr, mapUrl: map, scheduleUrl: "", notes: "", sortOrder: active.length }]
      : Array.from({ length: count }, (_, i) => ({
          name: `${base} ${i + 1}`,
          address: addr, mapUrl: map, scheduleUrl: "", notes: "", sortOrder: active.length + i,
        }));
    setFields([...fields, ...newFields]);
    setSName(""); setSAddress(""); setSMapUrl("");
    setShowAdd(false);
  };

  const update = (idx: number, patch: Partial<TournamentField>) => {
    const updated = [...fields];
    const realIdx = fields.indexOf(active[idx]);
    updated[realIdx] = { ...updated[realIdx], ...patch };
    setFields(updated);
  };

  const remove = (idx: number) => {
    const updated = [...fields];
    const realIdx = fields.indexOf(active[idx]);
    if (updated[realIdx].id) {
      updated[realIdx] = { ...updated[realIdx], _deleted: true };
    } else {
      updated.splice(realIdx, 1);
    }
    setFields(updated);
  };

  // Group consecutive fields by shared address (= same stadium)
  type FieldGroup = { address: string; mapUrl: string; label: string; indices: number[] };
  const groups: FieldGroup[] = [];
  for (let i = 0; i < active.length; i++) {
    const f = active[i];
    const addr = f.address.trim();
    const lastGroup = groups[groups.length - 1];
    if (addr && lastGroup && lastGroup.address === addr) {
      lastGroup.indices.push(i);
    } else {
      // Infer stadium label: strip trailing " N" from first field name
      const label = f.name.replace(/\s+\d+$/, "").trim();
      groups.push({ address: addr, mapUrl: f.mapUrl.trim(), label, indices: [i] });
    }
  }

  return (
    <div className="space-y-5">
      <StepHeader icon={MapPin} title={t("stepVenue")} description={t("stepVenueHint")} />

      {/* ── Add stadium form ── */}
      {showAdd && (
        <div className="rounded-2xl border p-5 space-y-4"
          style={{ background: "rgba(43,254,186,0.04)", borderColor: "rgba(43,254,186,0.25)" }}>
          <p className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--cat-text)" }}>
            <MapPin className="w-4 h-4" style={{ color: ACCENT_CLR }} />
            {t("addStadium")}
          </p>

          {/* Name (required) */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--cat-text-muted)" }}>
              {t("stadiumNameLabel")} <span style={{ color: ACCENT_CLR }}>*</span>
            </label>
            <input
              className={inputCls}
              style={inputStyle}
              value={sName}
              onChange={e => setSName(e.target.value)}
              placeholder={t("stadiumNamePlaceholder")}
              autoFocus
            />
          </div>

          {/* Address */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--cat-text-muted)" }}>
              {t("address")}
            </label>
            <input
              className={inputCls}
              style={inputStyle}
              value={sAddress}
              onChange={e => setSAddress(e.target.value)}
              placeholder={t("addressPlaceholder")}
            />
          </div>

          {/* Google Maps */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--cat-text-muted)" }}>
              {t("googleMapsLink")}
            </label>
            <input
              className={inputCls}
              style={inputStyle}
              value={sMapUrl}
              onChange={e => setSMapUrl(e.target.value)}
              placeholder="https://maps.google.com/..."
            />
          </div>

          {/* Field count picker */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--cat-text-muted)" }}>
              {t("fieldCountLabel")}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => addStadium(n)}
                  disabled={!sName.trim()}
                  className="py-3 rounded-xl font-black transition-all hover:scale-[1.03] flex flex-col items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: n === 1 ? "var(--cat-tag-bg)" : `rgba(43,254,186,${0.08 + n * 0.04})`,
                    color: n === 1 ? "var(--cat-text-secondary)" : ACCENT_CLR,
                    border: `1px solid ${n === 1 ? "var(--cat-card-border)" : "rgba(43,254,186,0.3)"}`,
                  }}>
                  <span className="text-xl font-black" style={{ color: n === 1 ? "var(--cat-text)" : ACCENT_CLR }}>{n}</span>
                  <span className="text-[10px] opacity-70">{n === 1 ? t("fieldSingular") : t("fieldPlural")}</span>
                </button>
              ))}
            </div>
          </div>

          {active.length > 0 && (
            <button onClick={() => { setSName(""); setSAddress(""); setSMapUrl(""); setShowAdd(false); }}
              className="text-xs hover:opacity-70 transition-opacity"
              style={{ color: "var(--cat-text-muted)" }}>
              {t("cancel")}
            </button>
          )}
        </div>
      )}

      {/* ── Fields list (grouped by stadium / address) ── */}
      <div className="space-y-4">
        {groups.map((group, gi) => (
          <div key={gi}>
            {/* Stadium group header (only if has address and >1 field, or has address) */}
            {group.address && (
              <div className="flex items-start gap-2 mb-2 px-1">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: ACCENT_CLR }} />
                <div>
                  {group.label && (
                    <p className="text-xs font-bold" style={{ color: "var(--cat-text)" }}>{group.label}</p>
                  )}
                  <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>{group.address}</p>
                  {group.mapUrl && (
                    <a href={group.mapUrl} target="_blank" rel="noreferrer"
                      className="text-[11px] hover:underline" style={{ color: ACCENT_CLR }}>
                      Google Maps ↗
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Individual field cards */}
            <div className="space-y-2">
              {group.indices.map((fieldIdx) => {
                const field = active[fieldIdx];
                return (
                  <div key={fieldIdx} className="rounded-2xl border p-4"
                    style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", marginLeft: group.address ? "1rem" : 0 }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black"
                        style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>
                        {fieldIdx + 1}
                      </div>
                      <span className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>{field.name || t("newField")}</span>
                      <button onClick={() => remove(fieldIdx)} className="ml-auto p-1.5 rounded-lg hover:opacity-70"
                        style={{ color: "var(--badge-error-text)", background: "var(--badge-error-bg)" }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label={t("fieldName")}>
                        <input className={inputCls} style={inputStyle} value={field.name}
                          onChange={e => update(fieldIdx, { name: e.target.value })}
                          placeholder={t("fieldNamePlaceholder")} />
                      </Field>
                      <Field label={t("address")}>
                        <input className={inputCls} style={inputStyle} value={field.address}
                          onChange={e => update(fieldIdx, { address: e.target.value })}
                          placeholder={t("addressPlaceholder")} />
                      </Field>
                      <Field label={t("googleMapsLink")}>
                        <input className={inputCls} style={inputStyle} value={field.mapUrl}
                          onChange={e => update(fieldIdx, { mapUrl: e.target.value })}
                          placeholder="https://maps.google.com/..." />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field label={t("notes")}>
                          <textarea className={inputCls} style={inputStyle} value={field.notes}
                            onChange={e => update(fieldIdx, { notes: e.target.value })}
                            rows={2} placeholder={t("fieldNotesPlaceholder")} />
                        </Field>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Add another stadium ── */}
      {!showAdd && (
        <button onClick={() => setShowAdd(true)}
          className="w-full rounded-2xl border-2 border-dashed py-4 flex items-center justify-center gap-2 text-sm font-semibold transition-all hover:opacity-80"
          style={{ borderColor: "var(--cat-accent)", color: "var(--cat-accent)" }}>
          <Plus className="w-4 h-4" /> {t("addStadium")}
        </button>
      )}

      {active.length === 0 && !showAdd && (
        <div className="text-center py-6 rounded-2xl"
          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-25" />
          <p className="text-sm">{t("noFields")}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ШАГ 6: Продукты и сборы
// ─────────────────────────────────────────────────────────────

function StepProducts({ products, setProducts }: {
  products: TournamentProduct[];
  setProducts: (v: TournamentProduct[]) => void;
}) {
  const t = useTranslations("orgAdmin");
  const active = products.filter(p => !p._deleted);

  const addProduct = () => {
    setProducts([...products, { name: "", category: "registration", price: "0", perPerson: false, isRequired: false, sortOrder: active.length }]);
  };

  const update = (idx: number, patch: Partial<TournamentProduct>) => {
    const updated = [...products];
    const realIdx = products.indexOf(active[idx]);
    updated[realIdx] = { ...updated[realIdx], ...patch };
    setProducts(updated);
  };

  const remove = (idx: number) => {
    const updated = [...products];
    const realIdx = products.indexOf(active[idx]);
    if (updated[realIdx].id) {
      updated[realIdx] = { ...updated[realIdx], _deleted: true };
    } else {
      updated.splice(realIdx, 1);
    }
    setProducts(updated);
  };

  const categoryColor: Record<string, string> = {
    registration: "#10b981",
    accommodation: "#3b82f6",
    transfer: "#f59e0b",
    meals: "#ef4444",
    extra: "#8b5cf6",
  };

  return (
    <div className="space-y-5">
      <StepHeader icon={ShoppingBag} title={t("stepProducts")} description={t("stepProductsHint")} />

      <div className="space-y-3">
        {active.map((prod, idx) => (
          <div key={idx} className="rounded-2xl border p-4"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", borderLeftWidth: 3, borderLeftColor: categoryColor[prod.category] ?? "var(--cat-accent)" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${categoryColor[prod.category]}20`, color: categoryColor[prod.category] }}>
                {t(`category_${prod.category}`)}
              </span>
              <span className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>{prod.name || t("newProduct")}</span>
              <button onClick={() => remove(idx)} className="ml-auto p-1.5 rounded-lg hover:opacity-70"
                style={{ color: "var(--badge-error-text)", background: "var(--badge-error-bg)" }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <Field label={t("productName")}>
                  <input className={inputCls} style={inputStyle} value={prod.name} onChange={e => update(idx, { name: e.target.value })} placeholder={t("productNamePlaceholder")} />
                </Field>
              </div>
              <Field label={t("category")}>
                <select className={inputCls} style={inputStyle} value={prod.category} onChange={e => update(idx, { category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{t(`category_${c}`)}</option>)}
                </select>
              </Field>
              <Field label={t("price")}>
                <input type="number" className={inputCls} style={inputStyle} value={prod.price} onChange={e => update(idx, { price: e.target.value })} min="0" step="0.01" />
              </Field>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={prod.isRequired} onChange={e => update(idx, { isRequired: e.target.checked })}
                    className="rounded" />
                  <span className="text-xs" style={{ color: "var(--cat-text-secondary)" }}>{t("required")}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={prod.perPerson} onChange={e => update(idx, { perPerson: e.target.checked })}
                    className="rounded" />
                  <span className="text-xs" style={{ color: "var(--cat-text-secondary)" }}>{t("perPerson")}</span>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addProduct}
        className="w-full rounded-2xl border-2 border-dashed py-4 flex items-center justify-center gap-2 text-sm font-semibold transition-all hover:opacity-80"
        style={{ borderColor: "var(--cat-accent)", color: "var(--cat-accent)" }}>
        <Plus className="w-4 h-4" /> {t("addProduct")}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ШАГ 7: Информация (отель + площадка + еда + экстренный)
// ─────────────────────────────────────────────────────────────

function StepInfo({ tInfo, setTInfo }: {
  tInfo: TournamentInfoData;
  setTInfo: (v: TournamentInfoData) => void;
}) {
  const t = useTranslations("orgAdmin");
  const patch = (key: keyof TournamentInfoData, value: string) =>
    setTInfo({ ...tInfo, [key]: value });

  return (
    <div className="space-y-5">
      <StepHeader icon={Info} title={t("stepInfoNew")} description={t("stepInfoNewHint")} />

      {/* Contact */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: "var(--cat-card-border)", background: "rgba(43,254,186,0.05)" }}>
          <Phone className="w-4 h-4" style={{ color: ACCENT_CLR }} />
          <span className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>{t("organizerContact")}</span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t("contactName")}>
            <input className={inputCls} style={inputStyle} value={tInfo.contactName ?? ""}
              onChange={e => patch("contactName", e.target.value)} placeholder="John Smith" />
          </Field>
          <Field label={t("contactPhone")}>
            <input className={inputCls} style={inputStyle} value={tInfo.contactPhone ?? ""}
              onChange={e => patch("contactPhone", e.target.value)} placeholder="+372 000 0000" />
          </Field>
          <Field label={t("contactEmail")}>
            <input type="email" className={inputCls} style={inputStyle} value={tInfo.contactEmail ?? ""}
              onChange={e => patch("contactEmail", e.target.value)} placeholder="info@tournament.com" />
          </Field>
          <Field label={t("website")}>
            <input type="url" className={inputCls} style={inputStyle} value={tInfo.website ?? ""}
              onChange={e => patch("website", e.target.value)} placeholder="https://..." />
          </Field>
        </div>
      </div>

      {/* Social media */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: "var(--cat-card-border)", background: "rgba(139,92,246,0.05)" }}>
          <Sparkles className="w-4 h-4" style={{ color: "#8b5cf6" }} />
          <span className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>{t("socialMedia")}</span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t("instagram")}>
            <input className={inputCls} style={inputStyle} value={tInfo.instagram ?? ""}
              onChange={e => patch("instagram", e.target.value)} placeholder="@tournament" />
          </Field>
          <Field label={t("facebook")}>
            <input className={inputCls} style={inputStyle} value={tInfo.facebook ?? ""}
              onChange={e => patch("facebook", e.target.value)} placeholder="facebook.com/..." />
          </Field>
          <Field label={t("twitter")}>
            <input className={inputCls} style={inputStyle} value={tInfo.twitter ?? ""}
              onChange={e => patch("twitter", e.target.value)} placeholder="@tournament" />
          </Field>
          <Field label={t("youtube")}>
            <input className={inputCls} style={inputStyle} value={tInfo.youtube ?? ""}
              onChange={e => patch("youtube", e.target.value)} placeholder="youtube.com/@..." />
          </Field>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ШАГ 8: Публикация
// ─────────────────────────────────────────────────────────────

function StepPublish({
  data, classes, venueFieldCount, products, regOpen, setRegOpen, orgSlug, tournamentId, planInfo, startDate, endDate, extraTeamsUnpaid,
}: {
  data: TournamentData | null;
  classes: TournamentClass[];
  venueFieldCount: number;
  products: TournamentProduct[];
  regOpen: boolean;
  setRegOpen: (v: boolean) => void;
  orgSlug: string;
  tournamentId: number;
  planInfo: { effectivePlan: string; maxDivisions: number; maxTeams: number; extraTeamPrice: number; extrasBlocked?: boolean; extrasPaymentDue?: string | null } | null;
  startDate: string;
  endDate: string;
  extraTeamsUnpaid?: { owed: number; owedCents: number } | null;
}) {
  const t = useTranslations("orgAdmin");
  const activeClasses = classes.filter(c => !c._deleted && c.name);
  const activeProducts = products.filter(p => !p._deleted && p.name);

  const checks = [
    { label: t("checkName"), done: !!(data?.name) },
    { label: t("checkDates"), done: !!(data?.startDate && data?.endDate) },
    { label: t("checkDivisions"), done: activeClasses.length > 0 },
    { label: t("checkFields"), done: venueFieldCount > 0, optional: true },
  ];

  const allReady = checks.filter(c => !c.optional).every(c => c.done);
  const publicUrl = `/${orgSlug ? `t/${orgSlug}` : ""}`;

  // Plan violation check
  const plan = planInfo?.effectivePlan ?? "free";
  const billingUrl = `/org/${orgSlug}/admin/tournament/${tournamentId}/billing`;
  const { allOk: planOk, divOk, daysOk } = planInfo
    ? computePlanViolations(plan, planInfo.maxDivisions, activeClasses.length, startDate, endDate)
    : { allOk: true, divOk: true, daysOk: true };
  const isFreeAndOk = plan === "free" && planOk;
  const extrasBlocked = planInfo?.extrasBlocked ?? false;
  const extrasPaymentDue = planInfo?.extrasPaymentDue ?? null;

  return (
    <div className="space-y-5">
      <StepHeader icon={Rocket} title={t("stepPublish")} description={t("stepPublishHint")}
        badge={regOpen ? t("live") : undefined} />

      {/* Чеклист готовности */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--cat-card-border)" }}>
          <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>{t("readinessCheck")}</p>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--cat-card-border)" }}>
          {checks.map(check => (
            <div key={check.label} className="flex items-center gap-3 px-4 py-3">
              {check.done
                ? <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "var(--badge-success-text)" }} />
                : <Circle className="w-5 h-5 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
              }
              <span className="text-sm" style={{ color: check.done ? "var(--cat-text)" : "var(--cat-text-muted)" }}>
                {check.label}
              </span>
              {!check.done && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
                  style={check.optional
                    ? { background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }
                    : { background: "var(--badge-warning-bg)", color: "var(--badge-warning-text)" }
                  }>
                  {check.optional ? t("optional") : t("required")}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: GraduationCap, value: activeClasses.length, label: t("divisions"), color: "#3b82f6" },
          { icon: MapPin, value: venueFieldCount, label: t("fields"), color: "#10b981" },
          { icon: ShoppingBag, value: activeProducts.length, label: t("products"), color: "#f59e0b" },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border p-4 text-center"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
              <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: stat.color }} />
              <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Extras overdue block (divisions) */}
      {extrasBlocked && (
        <div className="rounded-2xl border p-4 flex items-start gap-3"
          style={{ background: "rgba(220,38,38,0.06)", borderColor: "rgba(220,38,38,0.3)" }}>
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#dc2626" }} />
          <div>
            <p className="text-sm font-bold" style={{ color: "#dc2626" }}>{t("extrasOverdue")}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{t("extrasBlockedHint")}</p>
            <a href={billingUrl} className="inline-block mt-2 text-xs font-bold underline" style={{ color: "#dc2626" }}>
              {t("payExtras")} →
            </a>
          </div>
        </div>
      )}

      {/* Extra teams unpaid block (shown after failed close-registration attempt) */}
      {extraTeamsUnpaid && (
        <div className="rounded-2xl border p-4 flex items-start gap-3"
          style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.4)" }}>
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: "#f59e0b" }}>
              Extra teams invoice — €{(extraTeamsUnpaid.owedCents / 100).toFixed(2)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
              {extraTeamsUnpaid.owed} team(s) over plan limit. Pay the invoice to close registration and start the tournament.
            </p>
            <a href={billingUrl} className="inline-block mt-2 text-xs font-bold underline" style={{ color: "#f59e0b" }}>
              Pay €{(extraTeamsUnpaid.owedCents / 100).toFixed(2)} →
            </a>
          </div>
        </div>
      )}

      {/* Переключатель регистрации */}
      <div className="rounded-2xl border p-5"
        style={{
          background: regOpen ? "rgba(16,185,129,0.06)" : "var(--cat-card-bg)",
          borderColor: extrasBlocked ? "rgba(220,38,38,0.3)" : regOpen ? "rgba(16,185,129,0.3)" : "var(--cat-card-border)",
        }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bold" style={{ color: "var(--cat-text)" }}>
              {regOpen ? t("registrationOpen") : t("registrationClosed")}
            </p>
            <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
              {extrasBlocked
                ? (extrasPaymentDue ? `${t("extrasDueDate")} ${new Date(extrasPaymentDue + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}` : t("extrasOverdue"))
                : regOpen ? t("registrationOpenHint") : t("registrationClosedHint")
              }
            </p>
          </div>
          <button
            onClick={() => setRegOpen(!regOpen)}
            disabled={(!allReady && !regOpen) || (extrasBlocked && !regOpen)}
            className="relative inline-flex h-7 w-12 items-center rounded-full transition-all disabled:opacity-40"
            style={{ background: regOpen ? "var(--cat-accent)" : "var(--cat-card-border)" }}
          >
            <span className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform"
              style={{ transform: regOpen ? "translateX(24px)" : "translateX(2px)" }} />
          </button>
        </div>
      </div>

      {!allReady && (
        <div className="rounded-2xl border px-4 py-3 flex items-start gap-3"
          style={{ background: "var(--badge-warning-bg)", borderColor: "var(--badge-warning-text)" }}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--badge-warning-text)" }} />
          <p className="text-sm" style={{ color: "var(--badge-warning-text)" }}>{t("publishNotReady")}</p>
        </div>
      )}

      {/* Plan status — honest: only show upgrade if actually needed */}
      {isFreeAndOk ? (
        // Free and within limits — celebrate!
        <div className="rounded-2xl border p-5 flex items-start gap-4"
          style={{ background: "rgba(5,150,105,0.06)", borderColor: "rgba(5,150,105,0.25)" }}>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(5,150,105,0.15)" }}>
            <CheckCircle2 className="w-5 h-5" style={{ color: "#059669" }} />
          </div>
          <div>
            <p className="text-sm font-black mb-0.5" style={{ color: "#059669" }}>{t("publishFreeReady")}</p>
            <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("publishFreeReadyDesc")}</p>
          </div>
        </div>
      ) : !planOk ? (
        // Limits exceeded — show specific violations + upgrade
        <div className="rounded-2xl border p-5"
          style={{ background: "rgba(220,38,38,0.05)", borderColor: "rgba(220,38,38,0.25)" }}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-sm font-black mb-0.5" style={{ color: "var(--cat-text)" }}>
                {t("tournamentUpgradeTitle")}
              </p>
              <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("tournamentUpgradeDesc")}</p>
            </div>
            <a href={billingUrl}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all hover:opacity-90"
              style={{ background: "#DC2626", color: "#fff", textDecoration: "none" }}>
              <Zap className="w-3.5 h-3.5" /> {t("upgradeThisTournament")}
            </a>
          </div>
          <div className="space-y-2">
            {!divOk && (
              <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl"
                style={{ background: "rgba(220,38,38,0.08)", color: "#DC2626" }}>
                <X className="w-3.5 h-3.5 shrink-0" />
                <span>{t("limitDivisions")}: {activeClasses.length} — {t("limitExceeded")} · Pro €49 / Elite €89 {t("perTournament")}</span>
              </div>
            )}
            {!daysOk && (
              <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl"
                style={{ background: "rgba(220,38,38,0.08)", color: "#DC2626" }}>
                <X className="w-3.5 h-3.5 shrink-0" />
                <span>{t("limitDays")}: — {t("limitExceeded")} · Starter €19 / Pro €49 {t("perTournament")}</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {([
              { icon: Rocket, name: "Starter", price: "€19", color: "#2563EB" },
              { icon: Zap, name: "Pro", price: "€49", color: "#059669" },
              { icon: Crown, name: "Elite", price: "€89", color: "#EA580C" },
            ] as const).map(p => (
              <a key={p.name} href={billingUrl}
                className="flex flex-col items-center py-2.5 px-2 rounded-xl text-center transition-all hover:opacity-80"
                style={{ background: `${p.color}12`, border: `1px solid ${p.color}30`, textDecoration: "none" }}>
                <p.icon className="w-4 h-4 mb-0.5" style={{ color: p.color }} />
                <span className="text-[11px] font-black" style={{ color: p.color }}>{p.name}</span>
                <span className="text-[10px] font-bold mt-0.5" style={{ color: "var(--cat-text)" }}>{p.price}</span>
                <span className="text-[9px]" style={{ color: "var(--cat-text-muted)" }}>{t("perTournament")}</span>
              </a>
            ))}
          </div>
        </div>
      ) : (
        // Paid plan — just show current plan info
        <div className="rounded-2xl border px-4 py-3 flex items-center gap-3"
          style={{ background: "rgba(43,254,186,0.04)", borderColor: "rgba(43,254,186,0.2)" }}>
          <CheckCircle2 className="w-4 h-4" style={{ color: ACCENT_CLR }} />
          <p className="text-xs font-semibold" style={{ color: "var(--cat-text-muted)" }}>
            {t("thisTournamentPlan")}: <strong style={{ color: "var(--cat-text)" }}>{plan}</strong>
          </p>
          <a href={billingUrl} className="ml-auto text-xs font-semibold transition-all hover:opacity-70"
            style={{ color: "var(--cat-text-muted)", textDecoration: "none" }}>
            {t("publishUpgradeBtn")} →
          </a>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Setup Hub — main component
// ─────────────────────────────────────────────────────────────

export function TournamentSetupPageContent() {
  const t = useTranslations("orgAdmin");
  const adminFetch = useAdminFetch();
  const ctx = useTournament();
  const searchParams = useSearchParams();

  // Which section is expanded (null = all collapsed)
  const tabParam = searchParams?.get("tab");
  const initialOpen: StepKey = tabParam === "classes" ? "divisions"
    : tabParam === "products" ? "products"
    : tabParam === "fields" ? "venue"
    : tabParam === "info" ? "info"
    : tabParam === "media" ? "media"
    : "basics";
  const [openSection, setOpenSection] = useState<StepKey | null>(initialOpen);

  const toggleSection = (key: StepKey) =>
    setOpenSection(prev => prev === key ? null : key);

  // ── Tournament data ────────────────────────────────────────
  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSaveOverlay, setShowSaveOverlay] = useState(false);
  const [saving, setSaving] = useState(false);

  // Plan limits
  const [planInfo, setPlanInfo] = useState<{
    effectivePlan: string; maxDivisions: number; maxTeams: number;
    extraDivisionPrice: number; extraTeamPrice: number;
    extrasBlocked?: boolean; extrasPaymentDue?: string | null;
  } | null>(null);
  const [divisionLimitError, setDivisionLimitError] = useState<{
    currentPlan: string; maxDivisions: number; attempted: number;
  } | null>(null);
  const [extraTeamsUnpaid, setExtraTeamsUnpaid] = useState<{
    owed: number; owedCents: number;
  } | null>(null);

  // Basics form
  const [name, setName] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [regDeadline, setRegDeadline] = useState("");
  const [regOpen, setRegOpen] = useState(false);
  const [currency, setCurrency] = useState("EUR");

  // Divisions + products
  const [classes, setClasses] = useState<TournamentClass[]>([]);
  const [products, setProducts] = useState<TournamentProduct[]>([]);
  const [configuredFormats, setConfiguredFormats] = useState<Set<string>>(new Set());

  // Venue + info
  const [venueFieldCount, setVenueFieldCount] = useState(0);
  const [hotels, setHotels] = useState<TournamentHotel[]>([]);
  const [tInfo, setTInfo] = useState<TournamentInfoData>({});
  const [hotelsSaving, setHotelsSaving] = useState(false);
  const [infoSaving, setInfoSaving] = useState(false);

  // ── Data fetching ──────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const billingUrl = ctx
        ? `/api/org/${ctx.orgSlug}/tournament/${ctx.tournamentId}/billing-info`
        : null;
      const stadiumsUrl = ctx
        ? `/api/org/${ctx.orgSlug}/tournament/${ctx.tournamentId}/stadiums`
        : null;
      const [res, infoRes, stadiumsRes, hotelsRes, billingRes] = await Promise.all([
        adminFetch("/api/admin/tournaments"),
        adminFetch("/api/admin/tournament-info"),
        stadiumsUrl ? fetch(stadiumsUrl, { credentials: "include" }) : Promise.resolve(null),
        adminFetch("/api/admin/tournament-hotels"),
        billingUrl ? fetch(billingUrl, { credentials: "include" }) : Promise.resolve(null),
      ]);
      if (!res.ok) throw new Error("Failed to load tournament data");
      const d: TournamentData = await res.json();
      setData(d);
      setName(d.name);
      setYear(d.year);
      setStartDate(toDateInput(d.startDate));
      setEndDate(toDateInput(d.endDate));
      setRegDeadline(toDateInput(d.registrationDeadline));
      setRegOpen(d.registrationOpen);
      setCurrency(d.currency);
      setClasses((d.classes ?? []).map((c: TournamentClass) => ({ ...c, format: c.format ?? null, maxTeams: c.maxTeams ?? null })));
      setProducts(d.products ?? []);
      if (stadiumsRes && stadiumsRes.ok) {
        const d = await stadiumsRes.json();
        const fieldCount = (d.stadiums ?? []).reduce(
          (sum: number, s: { fields?: unknown[] }) => sum + (s.fields?.length ?? 0), 0
        ) + (d.standaloneFields?.length ?? 0);
        setVenueFieldCount(fieldCount);
      }
      if (hotelsRes.ok) {
        const h = await hotelsRes.json();
        setHotels(Array.isArray(h) ? h.map((x: TournamentHotel) => ({
          id: x.id, name: x.name ?? "", address: x.address ?? "",
          contactName: x.contactName ?? "", contactPhone: x.contactPhone ?? "",
          contactEmail: x.contactEmail ?? "", notes: x.notes ?? "", sortOrder: x.sortOrder ?? 0,
        })) : []);
      }
      if (infoRes.ok) {
        const info = await infoRes.json();
        setTInfo({
          contactName: info.contactName ?? "", contactPhone: info.contactPhone ?? "",
          contactEmail: info.contactEmail ?? "", website: info.website ?? "",
          instagram: info.instagram ?? "", facebook: info.facebook ?? "",
          twitter: info.twitter ?? "", youtube: info.youtube ?? "",
          hotelName: info.hotelName ?? "", hotelAddress: info.hotelAddress ?? "",
          hotelCheckIn: info.hotelCheckIn ?? "", hotelCheckOut: info.hotelCheckOut ?? "",
          venueName: info.venueName ?? "", venueAddress: info.venueAddress ?? "",
          venueMapUrl: info.venueMapUrl ?? "", emergencyContact: info.emergencyContact ?? "",
          emergencyPhone: info.emergencyPhone ?? "",
        });
      }
      if (billingRes && billingRes.ok) {
        const billing = await billingRes.json();
        const plan = billing.effectivePlan ?? "free";
        setPlanInfo({
          effectivePlan: plan,
          maxDivisions: billing.features?.maxDivisions ?? 1,
          maxTeams: billing.features?.maxTeams ?? 12,
          extraDivisionPrice: 9,
          extraTeamPrice: plan === "free" ? 0 : plan === "starter" ? 1 : 2,
          extrasBlocked:    billing.extrasOwed?.blocked ?? false,
          extrasPaymentDue: billing.extrasOwed?.paymentDue ?? null,
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [adminFetch, ctx]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Save functions ─────────────────────────────────────────
  const saveMain = async (payload: Record<string, unknown>): Promise<boolean> => {
    setSaving(true);
    setDivisionLimitError(null);
    setExtraTeamsUnpaid(null);
    try {
      const res = await adminFetch("/api/admin/tournaments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 402) {
        const err = await res.json();
        if (err.code === "DIVISION_LIMIT") {
          setDivisionLimitError({ currentPlan: err.currentPlan, maxDivisions: err.maxDivisions, attempted: err.attempted });
          return false;
        }
        if (err.error === "extra_teams_unpaid") {
          setExtraTeamsUnpaid({ owed: err.owed, owedCents: err.owedCents });
          return false;
        }
        throw new Error(err.error ?? "Plan limit reached");
      }
      if (!res.ok) throw new Error("Save failed");
      const updated: TournamentData = await res.json();
      setData(updated);
      setClasses(updated.classes ?? []);
      setProducts(updated.products ?? []);
      return true;
    } catch {
      setError("Failed to save. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  };


  const saveInfoData = async () => {
    setInfoSaving(true);
    try {
      await adminFetch("/api/admin/tournament-info", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tInfo),
      });
    } finally {
      setInfoSaving(false);
    }
  };

  // ── Computed state ─────────────────────────────────────────
  const orgSlug = ctx?.orgSlug ?? "";
  const tournamentId = ctx?.tournamentId ?? 0;
  const activeClasses = classes.filter(c => !c._deleted);

  // Section completion status
  const isDone = {
    basics: !!(data?.name && data?.startDate && data?.endDate),
    media: !!(data?.logoUrl || data?.coverUrl),
    divisions: activeClasses.length > 0,
    format: activeClasses.length > 0 && activeClasses.every(c => configuredFormats.has(String(c.id ?? c.name))),
    venue: venueFieldCount > 0,
    products: products.filter(p => !p._deleted).length > 0,
    info: !!(tInfo.contactPhone || tInfo.contactEmail || tInfo.instagram || tInfo.facebook),
    publish: data?.registrationOpen ?? false,
  };

  // Summary strings
  const summaries: Record<StepKey, string> = {
    basics: [name, startDate && endDate ? `${startDate} – ${endDate}` : null, currency].filter(Boolean).join(" · ") || t("newTournament"),
    media: [data?.logoUrl ? "Logo ✓" : null, data?.coverUrl ? "Cover ✓" : null].filter(Boolean).join(" · ") || t("mediaHint"),
    divisions: activeClasses.length > 0 ? activeClasses.map(c => c.name || t("newDivision")).join(", ") : t("noDivisions"),
    format: activeClasses.length > 0 ? activeClasses.map(c => c.name).join(", ") : t("formatNoDivisions"),
    venue: venueFieldCount > 0 ? `${venueFieldCount} ${t("fields")}` : t("noFields"),
    products: products.filter(p => !p._deleted).length > 0 ? `${products.filter(p => !p._deleted).length} ${t("products")}` : t("stepProducts"),
    info: tInfo.contactPhone || tInfo.contactEmail ? [tInfo.contactName, tInfo.contactPhone].filter(Boolean).join(" · ") : t("stepInfoNew"),
    publish: data?.registrationOpen ? t("registrationOpen") : t("registrationClosed"),
  };

  const getBadge = (key: StepKey): "done" | "required" | "optional" => {
    const step = STEPS.find(s => s.key === key);
    if (isDone[key]) return "done";
    if (step?.required) return "required";
    return "optional";
  };

  // ── Loading / Error states ─────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3" style={{ color: "var(--cat-text-muted)" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--cat-accent)" }} />
        <span className="text-sm font-semibold">{t("loading")}</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--badge-error-text)" }} />
          <p className="font-bold mb-2" style={{ color: "var(--cat-text)" }}>{t("loadError")}</p>
          <p className="text-sm mb-4" style={{ color: "var(--cat-text-muted)" }}>{error}</p>
          <button onClick={fetchData} className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}>
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  // ── Main render: Setup Hub ─────────────────────────────────
  return (
    <>
      <SaveSuccessOverlay visible={showSaveOverlay} />

      <div className="max-w-2xl mx-auto space-y-3 pb-16">

        {/* ── Tournament header ── */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center shrink-0"
            style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)" }}>
            {data?.logoUrl
              ? <img src={data.logoUrl} alt="" className="w-full h-full object-cover" />
              : <Trophy className="w-5 h-5" style={{ color: "var(--cat-accent)" }} />
            }
          </div>
          <div>
            <h1 className="text-lg font-black" style={{ color: "var(--cat-text)" }}>
              {name || t("newTournament")}
            </h1>
            <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("setup")}</p>
          </div>
        </div>

        {/* ── Plan widget ── */}
        <PlanWidget
          planInfo={planInfo}
          activeClasses={activeClasses.length}
          startDate={startDate}
          endDate={endDate}
          orgSlug={orgSlug}
          tournamentId={tournamentId}
        />

        {/* ── 1. Basics ── */}
        <HubCard
          icon={Trophy}
          title={`1. ${t("stepBasics")}`}
          badge={getBadge("basics")}
          summary={summaries.basics}
          isOpen={openSection === "basics"}
          onToggle={() => toggleSection("basics")}
          onSave={async () => { await saveMain({ name, year, startDate: startDate || null, endDate: endDate || null, registrationDeadline: regDeadline || null, registrationOpen: regOpen, currency }); }}
          onAfterSave={() => setOpenSection("media")}
          saving={saving}
        >
          <StepBasics
            name={name} setName={setName}
            year={year} setYear={setYear}
            startDate={startDate} setStartDate={setStartDate}
            endDate={endDate} setEndDate={setEndDate}
            regDeadline={regDeadline} setRegDeadline={setRegDeadline}
            currency={currency} setCurrency={setCurrency}
          />
        </HubCard>

        {/* ── 2. Media (auto-saves on upload, just needs Continue) ── */}
        <HubCard
          icon={ImageIcon}
          title={`2. ${t("stepMedia")}`}
          badge={getBadge("media")}
          summary={summaries.media}
          isOpen={openSection === "media"}
          onToggle={() => toggleSection("media")}
          onSave={async () => { /* uploads auto-save */ }}
          onAfterSave={() => setOpenSection("divisions")}
          saving={false}
        >
          <StepMedia
            orgSlug={orgSlug}
            tournamentId={tournamentId}
            coverUrl={data?.coverUrl ?? null}
            logoUrl={data?.logoUrl ?? null}
            onLogoChange={(url) => setData(prev => prev ? { ...prev, logoUrl: url } : prev)}
            onCoverChange={(url) => setData(prev => prev ? { ...prev, coverUrl: url } : prev)}
          />
        </HubCard>

        {/* ── 3. Divisions ── */}
        <HubCard
          icon={GraduationCap}
          title={`3. ${t("stepDivisions")}`}
          badge={getBadge("divisions")}
          summary={summaries.divisions}
          isOpen={openSection === "divisions"}
          onToggle={() => toggleSection("divisions")}
          onSave={async () => { await saveMain({ classes: classes.map(c => ({ ...c })) }); }}
          onAfterSave={() => setOpenSection("format")}
          saving={saving}
        >
          <StepDivisions
            classes={classes}
            setClasses={setClasses}
            planInfo={planInfo}
            divisionLimitError={divisionLimitError}
            tournamentStartDate={startDate}
            tournamentEndDate={endDate}
          />
        </HubCard>

        {/* ── 4. Format (saves via its own wizard) ── */}
        <HubCard
          icon={GitBranch}
          title={`4. ${t("stepFormat")}`}
          badge={getBadge("format")}
          summary={summaries.format}
          isOpen={openSection === "format"}
          onToggle={() => toggleSection("format")}
          onSave={async () => { /* format wizard saves its own stages */ }}
          onAfterSave={() => setOpenSection("venue")}
          saving={false}
        >
          <StepFormat
            orgSlug={orgSlug}
            tournamentId={tournamentId}
            classes={classes}
            configured={configuredFormats}
            setConfigured={setConfiguredFormats}
          />
        </HubCard>

        {/* ── 5. Venue ── */}
        <HubCard
          icon={MapPin}
          title={`5. ${t("stepVenue")}`}
          badge={getBadge("venue")}
          summary={summaries.venue}
          isOpen={openSection === "venue"}
          onToggle={() => toggleSection("venue")}
        >
          <StadiumsPageContent onCountChange={setVenueFieldCount} />
        </HubCard>

        {/* ── 6. Products ── */}
        <HubCard
          icon={ShoppingBag}
          title={`6. ${t("stepProducts")}`}
          badge={getBadge("products")}
          summary={summaries.products}
          isOpen={openSection === "products"}
          onToggle={() => toggleSection("products")}
          onSave={async () => { await saveMain({ products: products.filter(p => !p._deleted).map((p, i) => ({ ...p, sortOrder: i })) }); }}
          onAfterSave={() => setOpenSection("info")}
          saving={saving}
        >
          <StepProducts products={products} setProducts={setProducts} />
        </HubCard>

        {/* ── 7. Info ── */}
        <HubCard
          icon={Info}
          title={`7. ${t("stepInfo")}`}
          badge={getBadge("info")}
          summary={summaries.info}
          isOpen={openSection === "info"}
          onToggle={() => toggleSection("info")}
          onSave={saveInfoData}
          onAfterSave={() => setOpenSection("publish")}
          saving={infoSaving}
        >
          <StepInfo tInfo={tInfo} setTInfo={setTInfo} />
        </HubCard>

        {/* ── 8. Publish ── */}
        <HubCard
          icon={Rocket}
          title={`8. ${t("stepPublish")}`}
          badge={getBadge("publish")}
          summary={summaries.publish}
          isOpen={openSection === "publish"}
          onToggle={() => toggleSection("publish")}
          onSave={async () => {
            const ok = await saveMain({ registrationOpen: regOpen });
            if (ok) {
              setShowSaveOverlay(true);
              // Only redirect to billing if plan limits are exceeded
              const plan = planInfo?.effectivePlan ?? "free";
              const { allOk } = planInfo
                ? computePlanViolations(plan, planInfo.maxDivisions, activeClasses.length, startDate, endDate)
                : { allOk: true };
              if (!allOk) {
                const locale = window.location.pathname.split("/")[1] ?? "en";
                setTimeout(() => {
                  window.location.href = `/${locale}/org/${orgSlug}/admin/tournament/${tournamentId}/billing`;
                }, 1600);
              }
            }
          }}
          saving={saving}
        >
          <StepPublish
            data={data}
            classes={classes}
            venueFieldCount={venueFieldCount}
            products={products}
            regOpen={regOpen}
            setRegOpen={setRegOpen}
            orgSlug={orgSlug}
            tournamentId={tournamentId}
            planInfo={planInfo}
            extraTeamsUnpaid={extraTeamsUnpaid}
            startDate={startDate}
            endDate={endDate}
          />
        </HubCard>

        {/* ── Danger Zone ── */}
        <DangerZone orgSlug={orgSlug} tournamentId={tournamentId} tournamentName={name} />

      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
//  Danger Zone — запрос на удаление турнира
// ─────────────────────────────────────────────────────────────

function DangerZone({ orgSlug, tournamentId, tournamentName }: {
  orgSlug: string;
  tournamentId: number;
  tournamentName: string;
}) {
  const t = useTranslations("orgAdmin");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "cancel">("idle");
  const [hasRequest, setHasRequest] = useState(false);

  // Check if request already exists
  useEffect(() => {
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/delete-request`, { method: "GET" })
      .catch(() => null);
    // We'll determine from data on setup load — for now check via tournament data
  }, [orgSlug, tournamentId]);

  const submit = async () => {
    setStatus("sending");
    const res = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/delete-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      setStatus("sent");
      setHasRequest(true);
      setOpen(false);
    } else {
      const d = await res.json().catch(() => ({}));
      if (d.error === "already_requested") { setStatus("sent"); setHasRequest(true); setOpen(false); }
      else setStatus("idle");
    }
  };

  const cancelRequest = async () => {
    setStatus("cancel");
    await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/delete-request`, { method: "DELETE" });
    setStatus("idle");
    setHasRequest(false);
  };

  return (
    <div className="mt-8 rounded-2xl border-2 border-dashed p-5"
      style={{ borderColor: "rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.02)" }}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-black" style={{ color: "#DC2626" }}>{t("dangerZone")}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{t("dangerZoneDesc")}</p>
        </div>

        {hasRequest || status === "sent" ? (
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626" }}>
              ⏳ {t("deleteRequestSent")}
            </span>
            <button onClick={cancelRequest} disabled={status === "cancel"}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all hover:opacity-70"
              style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-muted)" }}>
              {t("cancelRequest")}
            </button>
          </div>
        ) : (
          <button onClick={() => setOpen(true)}
            className="text-xs font-black px-4 py-2 rounded-xl border-2 transition-all hover:bg-red-50"
            style={{ borderColor: "rgba(220,38,38,0.4)", color: "#DC2626" }}>
            {t("requestDelete")}
          </button>
        )}
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="w-full max-w-md rounded-3xl border p-6"
            style={{ background: "var(--cat-card-bg)", borderColor: "rgba(220,38,38,0.3)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(220,38,38,0.1)" }}>
                <AlertCircle className="w-5 h-5" style={{ color: "#DC2626" }} />
              </div>
              <div>
                <p className="text-sm font-black" style={{ color: "var(--cat-text)" }}>{t("requestDeleteTitle")}</p>
                <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{tournamentName}</p>
              </div>
              <button onClick={() => setOpen(false)} className="ml-auto p-1.5 rounded-lg hover:opacity-60"
                style={{ color: "var(--cat-text-muted)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--cat-text-muted)" }}>
              {t("requestDeleteDesc")}
            </p>

            <div className="mb-4">
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--cat-text-muted)" }}>
                {t("deleteReason")} <span style={{ color: "var(--cat-text-muted)", fontWeight: 400 }}>({t("optional")})</span>
              </label>
              <textarea
                className={inputCls}
                style={inputStyle}
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={t("deleteReasonPlaceholder")}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-70"
                style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)" }}>
                {t("cancel")}
              </button>
              <button onClick={submit} disabled={status === "sending"}
                className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: "#DC2626", color: "#fff" }}>
                {status === "sending" ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t("sendDeleteRequest")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
