"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useTournament } from "@/lib/tournament-context";
import {
  Plus, Pencil, Trash2, UserPlus, X, Check,
  Users2, CalendarDays, Clock, Link2, RefreshCw,
  Download, ChevronDown, ChevronUp, Calculator,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type RefereeLevel = "national" | "regional" | "local" | "trainee";

interface Referee {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  level: string | null;
  colorTag: string | null;
  notes: string | null;
  accessToken?: string | null;
}

interface Team {
  id: number;
  name: string;
}

interface Match {
  id: number;
  scheduledAt: string | null;
  homeTeam: Team | null;
  awayTeam: Team | null;
  field: { id: number; name: string } | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}

interface MatchRefereeAssignment {
  id: number;
  refereeId: number;
  role: string;
  firstName: string;
  lastName: string;
  colorTag: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#ef4444", // red
  "#f59e0b", // amber
  "#10b981", // green
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];

const LEVELS: RefereeLevel[] = ["national", "regional", "local", "trainee"];
const ROLES = ["main", "assistant1", "assistant2", "fourth"] as const;
type Role = typeof ROLES[number];

type CalcPattern = "every" | "every2" | "every3" | "2on1off" | "3on1off";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function isoDate(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ColorDot({ color, size = 10 }: { color: string | null; size?: number }) {
  return (
    <span
      className="rounded-full inline-block shrink-0"
      style={{
        width: size,
        height: size,
        background: color ?? "var(--cat-text-muted)",
        border: "1.5px solid rgba(0,0,0,0.12)",
      }}
    />
  );
}

function LevelBadge({ level, t }: { level: string | null; t: (k: string) => string }) {
  if (!level) return null;
  const colors: Record<string, { bg: string; text: string }> = {
    national:  { bg: "rgba(239,68,68,0.12)",   text: "#DC2626" },
    regional:  { bg: "rgba(245,158,11,0.12)",  text: "#D97706" },
    local:     { bg: "rgba(16,185,129,0.12)",  text: "#059669" },
    trainee:   { bg: "rgba(107,114,128,0.12)", text: "#6B7280" },
  };
  const style = colors[level] ?? colors.trainee;
  const labelKey = `level${level.charAt(0).toUpperCase()}${level.slice(1)}` as
    "levelNational" | "levelRegional" | "levelLocal" | "levelTrainee";
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
      style={{ background: style.bg, color: style.text }}
    >
      {t(labelKey)}
    </span>
  );
}

// ─── Referee Form ─────────────────────────────────────────────────────────────

interface RefereeFormProps {
  initial?: Partial<Referee>;
  onSave: (data: Omit<Referee, "id">) => Promise<void>;
  onCancel: () => void;
  t: (k: string) => string;
}

function RefereeForm({ initial, onSave, onCancel, t }: RefereeFormProps) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [level, setLevel] = useState<string>(initial?.level ?? "");
  const [colorTag, setColorTag] = useState<string>(initial?.colorTag ?? PRESET_COLORS[0]);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    setSaving(true);
    setError("");
    try {
      await onSave({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        level: level || null,
        colorTag: colorTag || null,
        notes: notes.trim() || null,
      });
    } catch {
      setError(t("errorSave"));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--cat-text-muted)" }}>
            {t("firstName")} *
          </label>
          <input
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            required
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
            style={{
              background: "var(--cat-input-bg, var(--cat-card-bg))",
              borderColor: "var(--cat-card-border)",
              color: "var(--cat-text)",
            }}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--cat-text-muted)" }}>
            {t("lastName")} *
          </label>
          <input
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            required
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
            style={{
              background: "var(--cat-input-bg, var(--cat-card-bg))",
              borderColor: "var(--cat-card-border)",
              color: "var(--cat-text)",
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--cat-text-muted)" }}>
            {t("email")}
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
            style={{
              background: "var(--cat-input-bg, var(--cat-card-bg))",
              borderColor: "var(--cat-card-border)",
              color: "var(--cat-text)",
            }}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--cat-text-muted)" }}>
            {t("phone")}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
            style={{
              background: "var(--cat-input-bg, var(--cat-card-bg))",
              borderColor: "var(--cat-card-border)",
              color: "var(--cat-text)",
            }}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: "var(--cat-text-muted)" }}>
          {t("level")}
        </label>
        <select
          value={level}
          onChange={e => setLevel(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
          style={{
            background: "var(--cat-input-bg, var(--cat-card-bg))",
            borderColor: "var(--cat-card-border)",
            color: "var(--cat-text)",
          }}
        >
          <option value="">—</option>
          {LEVELS.map(l => (
            <option key={l} value={l}>{t(`level${l.charAt(0).toUpperCase()}${l.slice(1)}`)}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: "var(--cat-text-muted)" }}>
          {t("colorTag")}
        </label>
        <div className="flex items-center gap-2">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColorTag(c)}
              className="w-6 h-6 rounded-full transition-transform hover:scale-110"
              style={{
                background: c,
                border: colorTag === c ? "2.5px solid var(--cat-text)" : "2px solid transparent",
                outline: colorTag === c ? "1.5px solid var(--cat-card-border)" : "none",
              }}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: "var(--cat-text-muted)" }}>
          {t("notes")}
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 resize-none"
          style={{
            background: "var(--cat-input-bg, var(--cat-card-bg))",
            borderColor: "var(--cat-card-border)",
            color: "var(--cat-text)",
          }}
        />
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: "var(--cat-accent)", color: "#000" }}
        >
          {saving ? t("saving") : t("save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }}
        >
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}

// ─── Assign Dialog ────────────────────────────────────────────────────────────

interface AssignDialogProps {
  matchId: number;
  referees: Referee[];
  existingAssignments: MatchRefereeAssignment[];
  onAssign: (matchId: number, refereeId: number, role: Role) => Promise<void>;
  onClose: () => void;
  t: (k: string) => string;
}

function AssignDialog({ matchId, referees, existingAssignments, onAssign, onClose, t }: AssignDialogProps) {
  const [selectedRefereeId, setSelectedRefereeId] = useState<number | "">("");
  const [selectedRole, setSelectedRole] = useState<Role | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const occupiedRoles = new Set(existingAssignments.map(a => a.role));
  const assignedRefereeIds = new Set(existingAssignments.map(a => a.refereeId));

  async function handleAssign() {
    if (!selectedRefereeId || !selectedRole) return;
    setSaving(true);
    setError("");
    try {
      await onAssign(matchId, selectedRefereeId as number, selectedRole as Role);
      onClose();
    } catch {
      setError(t("errorAssign"));
      setSaving(false);
    }
  }

  function roleLabel(role: string) {
    const map: Record<string, string> = {
      main: t("roleMain"),
      assistant1: t("roleAssistant1"),
      assistant2: t("roleAssistant2"),
      fourth: t("roleFourth"),
    };
    return map[role] ?? role;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-2xl p-5 w-full max-w-sm shadow-2xl"
        style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base" style={{ color: "var(--cat-text)" }}>
            {t("assignReferee")}
          </h3>
          <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--cat-text-muted)" }}>
              {t("selectReferee")}
            </label>
            <select
              value={selectedRefereeId}
              onChange={e => setSelectedRefereeId(Number(e.target.value) || "")}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--cat-input-bg, var(--cat-card-bg))",
                borderColor: "var(--cat-card-border)",
                color: "var(--cat-text)",
              }}
            >
              <option value="">—</option>
              {referees
                .filter(r => !assignedRefereeIds.has(r.id))
                .map(r => (
                  <option key={r.id} value={r.id}>
                    {r.firstName} {r.lastName}
                    {r.level ? ` · ${r.level}` : ""}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--cat-text-muted)" }}>
              {t("selectRole")}
            </label>
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value as Role | "")}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--cat-input-bg, var(--cat-card-bg))",
                borderColor: "var(--cat-card-border)",
                color: "var(--cat-text)",
              }}
            >
              <option value="">—</option>
              {ROLES.map(r => (
                <option key={r} value={r} disabled={occupiedRoles.has(r)}>
                  {roleLabel(r)}{occupiedRoles.has(r) ? ` (${t("assigned")})` : ""}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAssign}
              disabled={!selectedRefereeId || !selectedRole || saving}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ background: "var(--cat-accent)", color: "#000" }}
            >
              {saving ? t("saving") : t("assignReferee")}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }}
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Import Panel ────────────────────────────────────────────────────────

interface BulkImportPanelProps {
  base: string;
  onDone: () => void;
  t: (k: string, values?: Record<string, string | number>) => string;
}

function BulkImportPanel({ base, onDone, t }: BulkImportPanelProps) {
  const [text, setText] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  async function handleImport() {
    const lines = text
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    setProgress({ done: 0, total: lines.length });
    setResult(null);
    setErrors([]);

    let imported = 0;
    const errs: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const [namePart, emailPart] = line.split(",").map(s => s.trim());
      const nameTokens = (namePart ?? "").trim().split(/\s+/);
      if (nameTokens.length < 2) {
        errs.push(line);
        setProgress({ done: i + 1, total: lines.length });
        continue;
      }
      const lastName = nameTokens[nameTokens.length - 1];
      const firstName = nameTokens.slice(0, -1).join(" ");
      const email = emailPart && emailPart.includes("@") ? emailPart : undefined;

      try {
        const res = await fetch(`${base}/referees`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName, email: email ?? null }),
        });
        if (res.ok) {
          imported++;
        } else {
          errs.push(line);
        }
      } catch {
        errs.push(line);
      }
      setProgress({ done: i + 1, total: lines.length });
    }

    setErrors(errs);
    setResult(t("bulkSuccess", { n: imported }));
    setProgress(null);

    if (errs.length === 0) {
      setTimeout(() => {
        onDone();
      }, 1200);
    } else {
      onDone();
    }
  }

  const isImporting = progress !== null;

  return (
    <div
      className="rounded-xl p-4 mb-2"
      style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)" }}
    >
      <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "var(--cat-accent)" }}>
        {t("bulkImport")}
      </p>
      <label className="block text-xs font-semibold mb-1" style={{ color: "var(--cat-text-muted)" }}>
        {t("bulkPaste")}
      </label>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={6}
        disabled={isImporting}
        placeholder={"John Smith\nJane Doe, jane@example.com"}
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 resize-none font-mono disabled:opacity-50"
        style={{
          background: "var(--cat-input-bg, var(--cat-card-bg))",
          borderColor: "var(--cat-card-border)",
          color: "var(--cat-text)",
        }}
      />

      {isImporting && (
        <p className="text-xs mt-2" style={{ color: "var(--cat-text-muted)" }}>
          {t("bulkProgress", { done: progress.done, total: progress.total })}
        </p>
      )}
      {result && (
        <p className="text-xs mt-2 font-semibold" style={{ color: "#10b981" }}>
          {result}
          {errors.length > 0 && `, ${errors.length} errors`}
        </p>
      )}

      <div className="flex gap-2 mt-3">
        <button
          onClick={handleImport}
          disabled={isImporting || !text.trim()}
          className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ background: "var(--cat-accent)", color: "#000" }}
        >
          {isImporting
            ? t("bulkProgress", { done: progress!.done, total: progress!.total })
            : t("bulkImportBtn")}
        </button>
        <button
          onClick={onDone}
          disabled={isImporting}
          className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70 disabled:opacity-40"
          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)", border: "1px solid var(--cat-card-border)" }}
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}

// ─── Referee Calculator ───────────────────────────────────────────────────────

interface CalculatorProps {
  matchCount: number;
  t: (k: string, values?: Record<string, string | number>) => string;
}

function RefereeCalculator({ matchCount, t }: CalculatorProps) {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState(60);
  const [pattern, setPattern] = useState<CalcPattern>("every");
  const [rolesPerMatch, setRolesPerMatch] = useState(1);
  const [buffer, setBuffer] = useState(15);

  const utilizationByPattern: Record<CalcPattern, number> = {
    every: 1.0,
    every2: 0.5,
    every3: 1 / 3,
    "2on1off": 2 / 3,
    "3on1off": 3 / 4,
  };

  const totalSlots = matchCount * rolesPerMatch;
  const utilization = utilizationByPattern[pattern];
  // How many matches can one referee do in a day assuming matches are sequential?
  // With full utilization: floor(480 / (duration + buffer)) as approx daily cap
  // But we compute it as: matchesPerRef based on utilization ratio of total slots
  const matchesPerRef =
    utilization > 0
      ? Math.max(1, Math.floor((1 / (1 - utilization + 1)) * (1 / utilization)))
      : 1;

  // Simplified: matchesPerRef = how many consecutive matches a referee handles given pattern
  // e.g. every=1 slot per cycle, every2=1 of 2, 2on1off=2 of 3 → matchesPerRef = cycle_on / cycle_total * N
  // Use: estimated = ceil(totalSlots / matchesPerRef)
  const effectiveMatchesPerRef = Math.max(
    1,
    Math.round(matchCount * utilization),
  );
  const estimated = Math.ceil(totalSlots / effectiveMatchesPerRef);
  // Minimum: based on one full working day capacity
  const dailyCapacity = Math.max(1, Math.floor(480 / (duration + buffer)));
  const minimum = Math.ceil(totalSlots / (dailyCapacity * rolesPerMatch));
  const recommended = Math.max(minimum, estimated);

  const patternOptions: Array<{ value: CalcPattern; label: string }> = [
    { value: "every",    label: t("calcPatternEvery") },
    { value: "every2",   label: t("calcPatternEvery2") },
    { value: "every3",   label: t("calcPatternEvery3") },
    { value: "2on1off",  label: t("calcPattern2on1off") },
    { value: "3on1off",  label: t("calcPattern3on1off") },
  ];

  const inputClass = "rounded-lg border px-2 py-1 text-sm outline-none w-20 text-center";
  const inputStyle = {
    background: "var(--cat-input-bg, var(--cat-card-bg))",
    borderColor: "var(--cat-card-border)",
    color: "var(--cat-text)",
  };

  return (
    <div
      className="rounded-xl border mb-3 overflow-hidden"
      style={{ borderColor: "var(--cat-card-border)" }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-black/5"
        style={{ background: "var(--cat-tag-bg)" }}
      >
        <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--cat-text)" }}>
          <Calculator className="w-4 h-4" style={{ color: "var(--cat-accent)" }} />
          {t("calculator")}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4" style={{ color: "var(--cat-text-muted)" }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: "var(--cat-text-muted)" }} />
        )}
      </button>

      {open && (
        <div className="px-4 py-4 space-y-3" style={{ background: "var(--cat-card-bg)" }}>
          {/* Matches (auto) */}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>Matches</span>
            <span className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>{matchCount}</span>
          </div>

          {/* Duration */}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("calcDuration")}</span>
            <input
              type="number"
              min={10}
              max={300}
              value={duration}
              onChange={e => setDuration(Math.max(10, parseInt(e.target.value) || 60))}
              className={inputClass}
              style={inputStyle}
            />
          </div>

          {/* Pattern */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs shrink-0" style={{ color: "var(--cat-text-muted)" }}>{t("calcPattern")}</span>
            <select
              value={pattern}
              onChange={e => setPattern(e.target.value as CalcPattern)}
              className="rounded-lg border px-2 py-1 text-sm outline-none"
              style={{ ...inputStyle, width: "auto" }}
            >
              {patternOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Roles per match */}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("calcRoles")}</span>
            <select
              value={rolesPerMatch}
              onChange={e => setRolesPerMatch(parseInt(e.target.value))}
              className="rounded-lg border px-2 py-1 text-sm outline-none"
              style={{ ...inputStyle, width: "auto" }}
            >
              <option value={1}>1 — main</option>
              <option value={2}>2 — +asst1</option>
              <option value={3}>3 — +asst2</option>
              <option value={4}>4 — full</option>
            </select>
          </div>

          {/* Buffer */}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("calcBuffer")}</span>
            <input
              type="number"
              min={0}
              max={120}
              value={buffer}
              onChange={e => setBuffer(Math.max(0, parseInt(e.target.value) || 15))}
              className={inputClass}
              style={inputStyle}
            />
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid var(--cat-card-border)", margin: "4px 0" }} />

          {/* Result */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("calcResult")}</p>
              <p className="text-2xl font-black mt-0.5" style={{ color: "var(--cat-accent)" }}>
                {recommended}
              </p>
            </div>
            <p className="text-xs pb-1" style={{ color: "var(--cat-text-muted)" }}>
              {t("calcPerRef", { n: effectiveMatchesPerRef })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function RefereesPage() {
  const ctx = useTournament();
  const t = useTranslations("refereesAdmin");
  const orgSlug = ctx?.orgSlug ?? "";
  const tournamentId = ctx?.tournamentId ?? 0;
  const base = `/api/org/${orgSlug}/tournament/${tournamentId}`;

  // ── Roster state
  const [referees, setReferees] = useState<Referee[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingReferee, setEditingReferee] = useState<Referee | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  // token map: refereeId → { token, copied, generating }
  const [tokenMap, setTokenMap] = useState<Record<number, { token: string; copied: boolean; generating: boolean }>>({});

  // ── Matches state
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [assignments, setAssignments] = useState<Record<number, MatchRefereeAssignment[]>>({});
  const [assignDialogMatch, setAssignDialogMatch] = useState<Match | null>(null);

  // ── Auto-assign state
  const [autoAssignRole, setAutoAssignRole] = useState<Role>("main");
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [autoAssignToast, setAutoAssignToast] = useState<string | null>(null);

  // ── Load roster
  const loadReferees = useCallback(async () => {
    const r = await fetch(`${base}/referees`);
    if (r.ok) {
      const d = await r.json();
      setReferees(d.referees ?? []);
    }
    setRosterLoading(false);
  }, [base]);

  // ── Load matches
  const loadMatches = useCallback(async () => {
    const r = await fetch(`${base}/matches`);
    if (r.ok) {
      const data = await r.json();
      const list: Match[] = Array.isArray(data) ? data : (data.matches ?? []);
      setMatches(list);
    }
    setMatchesLoading(false);
  }, [base]);

  // ── Load assignments for a single match (lazy)
  const loadAssignments = useCallback(async (matchId: number) => {
    const r = await fetch(`${base}/matches/${matchId}/referees`);
    if (r.ok) {
      const d = await r.json();
      setAssignments(prev => ({ ...prev, [matchId]: d.referees ?? [] }));
    }
  }, [base]);

  // ── Reload all visible assignments
  const reloadAllAssignments = useCallback(async (matchList: Match[]) => {
    await Promise.all(matchList.map(m => loadAssignments(m.id)));
  }, [loadAssignments]);

  useEffect(() => { loadReferees(); }, [loadReferees]);
  useEffect(() => { loadMatches(); }, [loadMatches]);

  // Load assignments for all visible matches
  const visibleMatchIds = matches.map(m => m.id);
  useEffect(() => {
    visibleMatchIds.forEach(id => loadAssignments(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches.length, base]);

  // ── Unique dates for date filter
  const uniqueDates = Array.from(
    new Set(matches.map(m => isoDate(m.scheduledAt)).filter(Boolean))
  ).sort();

  const filteredMatches = selectedDate === "all"
    ? matches
    : matches.filter(m => isoDate(m.scheduledAt) === selectedDate);

  // ── Token / link handlers
  async function handleGetLink(referee: Referee) {
    const existingToken = tokenMap[referee.id]?.token ?? referee.accessToken;

    if (existingToken && !window.confirm(t("regenerateWarning"))) {
      // Already have a token — just copy it again without regenerating
      const url = `${window.location.origin}/referee/${existingToken}`;
      await navigator.clipboard.writeText(url);
      setTokenMap(prev => ({
        ...prev,
        [referee.id]: { ...prev[referee.id], token: existingToken, copied: true, generating: false },
      }));
      setTimeout(() => {
        setTokenMap(prev => ({
          ...prev,
          [referee.id]: { ...prev[referee.id], copied: false },
        }));
      }, 2000);
      return;
    }

    setTokenMap(prev => ({
      ...prev,
      [referee.id]: { token: prev[referee.id]?.token ?? "", copied: false, generating: true },
    }));

    try {
      const res = await fetch(`${base}/referees/${referee.id}/token`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const { token: newToken } = await res.json();
      const url = `${window.location.origin}/referee/${newToken}`;
      await navigator.clipboard.writeText(url);
      setTokenMap(prev => ({
        ...prev,
        [referee.id]: { token: newToken, copied: true, generating: false },
      }));
      setTimeout(() => {
        setTokenMap(prev => ({
          ...prev,
          [referee.id]: { ...prev[referee.id], copied: false },
        }));
      }, 2000);
    } catch {
      setTokenMap(prev => ({
        ...prev,
        [referee.id]: { token: prev[referee.id]?.token ?? "", copied: false, generating: false },
      }));
    }
  }

  // ── CRUD handlers
  async function handleCreateReferee(data: Omit<Referee, "id">) {
    const r = await fetch(`${base}/referees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error("Failed to create");
    await loadReferees();
    setShowAddForm(false);
  }

  async function handleUpdateReferee(data: Omit<Referee, "id">) {
    if (!editingReferee) return;
    const r = await fetch(`${base}/referees/${editingReferee.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error("Failed to update");
    await loadReferees();
    setEditingReferee(null);
  }

  async function handleDeleteReferee(id: number) {
    if (!window.confirm(t("confirmDelete"))) return;
    setDeletingId(id);
    try {
      await fetch(`${base}/referees/${id}`, { method: "DELETE" });
      await loadReferees();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAssign(matchId: number, refereeId: number, role: Role) {
    const r = await fetch(`${base}/matches/${matchId}/referees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refereeId, role }),
    });
    if (!r.ok) throw new Error("Failed to assign");
    await loadAssignments(matchId);
  }

  async function handleUnassign(matchId: number, refereeId: number) {
    const r = await fetch(`${base}/matches/${matchId}/referees`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refereeId }),
    });
    if (r.ok) await loadAssignments(matchId);
  }

  // ── Auto-assign handler
  async function handleAutoAssign() {
    setAutoAssigning(true);
    setAutoAssignToast(null);
    try {
      const r = await fetch(`${base}/referees/auto-assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: autoAssignRole }),
      });
      if (r.ok) {
        const { assigned, skipped } = await r.json() as { assigned: number; skipped: number };
        setAutoAssignToast(
          t("autoAssignResult", { assigned, skipped }),
        );
        await reloadAllAssignments(matches);
        setTimeout(() => setAutoAssignToast(null), 4000);
      }
    } finally {
      setAutoAssigning(false);
    }
  }

  function roleLabel(role: string) {
    const map: Record<string, string> = {
      main: t("roleMain"),
      assistant1: t("roleAssistant1"),
      assistant2: t("roleAssistant2"),
      fourth: t("roleFourth"),
    };
    return map[role] ?? role;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Users2 className="w-6 h-6" style={{ color: "var(--cat-accent)" }} />
          <h1 className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>
            {t("pageTitle")}
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
          {t("pageSubtitle")}
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ─── LEFT PANEL: Roster ─── */}
        <div>
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
          >
            {/* Panel header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: "var(--cat-card-border)" }}
            >
              <h2 className="font-bold text-base" style={{ color: "var(--cat-text)" }}>
                {t("rosterTitle")}
              </h2>
              {!showAddForm && !editingReferee && !showBulkImport && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowBulkImport(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{
                      background: "var(--cat-tag-bg)",
                      color: "var(--cat-text-secondary)",
                      border: "1px solid var(--cat-card-border)",
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {t("bulkImport")}
                  </button>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{ background: "var(--cat-accent)", color: "#000" }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t("addReferee")}
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 space-y-3">
              {/* Bulk import panel */}
              {showBulkImport && (
                <BulkImportPanel
                  base={base}
                  onDone={async () => {
                    setShowBulkImport(false);
                    await loadReferees();
                  }}
                  t={t as (k: string, values?: Record<string, string | number>) => string}
                />
              )}

              {/* Add form */}
              {showAddForm && (
                <div
                  className="rounded-xl p-4 mb-2"
                  style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)" }}
                >
                  <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "var(--cat-accent)" }}>
                    {t("addReferee")}
                  </p>
                  <RefereeForm
                    onSave={handleCreateReferee}
                    onCancel={() => setShowAddForm(false)}
                    t={t}
                  />
                </div>
              )}

              {/* Roster list */}
              {rosterLoading ? (
                <div className="py-8 text-center text-sm" style={{ color: "var(--cat-text-muted)" }}>
                  ...
                </div>
              ) : referees.length === 0 && !showAddForm && !showBulkImport ? (
                <div className="py-8 text-center">
                  <Users2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t("noReferees")}</p>
                </div>
              ) : (
                referees.map(referee => (
                  <div key={referee.id}>
                    {editingReferee?.id === referee.id ? (
                      <div
                        className="rounded-xl p-4"
                        style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)" }}
                      >
                        <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "var(--cat-accent)" }}>
                          {t("editReferee")}
                        </p>
                        <RefereeForm
                          initial={editingReferee}
                          onSave={handleUpdateReferee}
                          onCancel={() => setEditingReferee(null)}
                          t={t}
                        />
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors hover:bg-black/5"
                        style={{ borderLeft: `3px solid ${referee.colorTag ?? "transparent"}` }}
                      >
                        <ColorDot color={referee.colorTag} size={10} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>
                              {referee.firstName} {referee.lastName}
                            </span>
                            <LevelBadge level={referee.level} t={t} />
                          </div>
                          {(referee.email || referee.phone) && (
                            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--cat-text-muted)" }}>
                              {[referee.email, referee.phone].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Copy / Regenerate link button */}
                          {(() => {
                            const ts = tokenMap[referee.id];
                            const hasToken = !!(ts?.token ?? referee.accessToken);
                            const isCopied = ts?.copied ?? false;
                            const isGenerating = ts?.generating ?? false;
                            return (
                              <button
                                onClick={() => handleGetLink(referee)}
                                disabled={isGenerating}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                                style={{
                                  background: isCopied ? "rgba(16,185,129,0.12)" : "var(--cat-tag-bg)",
                                  color: isCopied ? "#10b981" : "var(--cat-text-muted)",
                                  border: "1px solid var(--cat-card-border)",
                                }}
                                title={hasToken ? t("regenerateToken") : t("copyLink")}
                              >
                                {isCopied ? (
                                  <Check className="w-3 h-3" />
                                ) : isGenerating ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : hasToken ? (
                                  <RefreshCw className="w-3 h-3" />
                                ) : (
                                  <Link2 className="w-3 h-3" />
                                )}
                                <span className="hidden sm:inline">
                                  {isCopied ? t("linkCopied") : hasToken ? t("regenerateToken") : t("copyLink")}
                                </span>
                              </button>
                            );
                          })()}
                          <button
                            onClick={() => { setEditingReferee(referee); setShowAddForm(false); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
                            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}
                            title={t("editReferee")}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteReferee(referee.id)}
                            disabled={deletingId === referee.id}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70 disabled:opacity-30"
                            style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}
                            title={t("deleteReferee")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANEL: Match assignments ─── */}
        <div>
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
          >
            {/* Panel header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: "var(--cat-card-border)" }}
            >
              <h2 className="font-bold text-base" style={{ color: "var(--cat-text)" }}>
                {t("matchAssignments")}
              </h2>
              <div className="flex items-center gap-2">
                {/* Auto-assign controls */}
                <select
                  value={autoAssignRole}
                  onChange={e => setAutoAssignRole(e.target.value as Role)}
                  className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                  style={{
                    background: "var(--cat-tag-bg)",
                    borderColor: "var(--cat-card-border)",
                    color: "var(--cat-text-secondary)",
                  }}
                  title={t("autoAssignRole")}
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>{roleLabel(r)}</option>
                  ))}
                </select>
                <button
                  onClick={handleAutoAssign}
                  disabled={autoAssigning || referees.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)", border: "1px solid var(--cat-card-border)" }}
                  title={t("autoAssignAll")}
                >
                  {autoAssigning ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  {t("autoAssign")}
                </button>
                {/* Date filter */}
                <select
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                  style={{
                    background: "var(--cat-tag-bg)",
                    borderColor: "var(--cat-card-border)",
                    color: "var(--cat-text-secondary)",
                  }}
                >
                  <option value="all">{t("allDates")}</option>
                  {uniqueDates.map(d => (
                    <option key={d} value={d}>
                      {formatDate(d)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4">
              {/* Auto-assign toast */}
              {autoAssignToast && (
                <div
                  className="mb-3 px-3 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: "rgba(16,185,129,0.12)", color: "#059669" }}
                >
                  {autoAssignToast}
                </div>
              )}

              {/* Calculator */}
              <RefereeCalculator
                matchCount={matches.length}
                t={t as (k: string, values?: Record<string, string | number>) => string}
              />

              {/* Match list */}
              <div className="space-y-3">
                {matchesLoading ? (
                  <div className="py-8 text-center text-sm" style={{ color: "var(--cat-text-muted)" }}>
                    ...
                  </div>
                ) : filteredMatches.length === 0 ? (
                  <div className="py-8 text-center">
                    <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t("noMatches")}</p>
                  </div>
                ) : (
                  filteredMatches.map(match => {
                    const matchAssignments = assignments[match.id] ?? [];
                    return (
                      <div
                        key={match.id}
                        className="rounded-xl border overflow-hidden"
                        style={{ borderColor: "var(--cat-card-border)" }}
                      >
                        {/* Match header */}
                        <div
                          className="px-4 py-3"
                          style={{ background: "var(--cat-tag-bg)" }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate" style={{ color: "var(--cat-text)" }}>
                                {match.homeTeam?.name ?? "—"} {t("vs")} {match.awayTeam?.name ?? "—"}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {match.scheduledAt && (
                                  <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                                    <Clock className="w-3 h-3" />
                                    {formatTime(match.scheduledAt)}
                                    {" · "}
                                    {formatDate(match.scheduledAt)}
                                  </span>
                                )}
                                {match.field && (
                                  <span className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                                    · {match.field.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            {referees.length > 0 && (
                              <button
                                onClick={() => setAssignDialogMatch(match)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 shrink-0"
                                style={{ background: "var(--cat-accent)", color: "#000" }}
                              >
                                <UserPlus className="w-3 h-3" />
                                {t("assignReferee")}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Assignments list */}
                        {matchAssignments.length > 0 && (
                          <div className="divide-y" style={{ borderColor: "var(--cat-card-border)" }}>
                            {matchAssignments.map(a => (
                              <div
                                key={`${match.id}-${a.refereeId}`}
                                className="flex items-center gap-2.5 px-4 py-2.5"
                              >
                                <ColorDot color={a.colorTag} size={8} />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm" style={{ color: "var(--cat-text)" }}>
                                    {a.firstName} {a.lastName}
                                  </span>
                                  <span
                                    className="ml-2 text-[10px] font-semibold uppercase tracking-wide"
                                    style={{ color: "var(--cat-text-muted)" }}
                                  >
                                    {roleLabel(a.role)}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleUnassign(match.id, a.refereeId)}
                                  className="w-6 h-6 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70 shrink-0"
                                  style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}
                                  title={t("unassign")}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {matchAssignments.length === 0 && (
                          <div className="px-4 py-2.5">
                            <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
                              —
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assign dialog */}
      {assignDialogMatch && (
        <AssignDialog
          matchId={assignDialogMatch.id}
          referees={referees}
          existingAssignments={assignments[assignDialogMatch.id] ?? []}
          onAssign={handleAssign}
          onClose={() => setAssignDialogMatch(null)}
          t={t}
        />
      )}
    </div>
  );
}
