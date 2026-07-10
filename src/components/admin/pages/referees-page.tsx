"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useTournament } from "@/lib/tournament-context";
import {
  Plus, Pencil, Trash2, UserPlus, X, Check,
  Users2, CalendarDays, Clock, Link2, RefreshCw,
  Download, ChevronDown, ChevronUp, Calculator, Loader2,
  Mail,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type RefereeLevel =
  | "local"
  | "uefa_d"
  | "uefa_c"
  | "uefa_b"
  | "uefa_a"
  | "uefa_pro"
  | "fifa";

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

const LEVELS: RefereeLevel[] = [
  "local",
  "uefa_d",
  "uefa_c",
  "uefa_b",
  "uefa_a",
  "uefa_pro",
  "fifa",
];

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

/** Build the i18n key for a level, e.g. "uefa_a" → "levelUefa_a" */
function levelKey(level: string): string {
  const capitalized = level.charAt(0).toUpperCase() + level.slice(1);
  return `level${capitalized}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OnlineDot() {
  return (
    <span
      className="rounded-full inline-block shrink-0"
      style={{
        width: 8,
        height: 8,
        background: "#10b981",
        border: "1.5px solid rgba(0,0,0,0.12)",
      }}
    />
  );
}

function LevelBadge({ level, t }: { level: string | null; t: (k: string) => string }) {
  if (!level) return null;

  const colors: Record<string, { bg: string; text: string }> = {
    local:    { bg: "rgba(107,114,128,0.12)", text: "#6B7280" },
    uefa_d:   { bg: "rgba(16,185,129,0.12)",  text: "#059669" },
    uefa_c:   { bg: "rgba(59,130,246,0.12)",  text: "#2563EB" },
    uefa_b:   { bg: "rgba(139,92,246,0.12)",  text: "#7C3AED" },
    uefa_a:   { bg: "rgba(245,158,11,0.12)",  text: "#D97706" },
    uefa_pro: { bg: "rgba(239,68,68,0.12)",   text: "#DC2626" },
    fifa:     { bg: "rgba(234,179,8,0.15)",   text: "#92400E" },
    // legacy levels kept for backward compat
    national: { bg: "rgba(239,68,68,0.12)",   text: "#DC2626" },
    regional: { bg: "rgba(245,158,11,0.12)",  text: "#D97706" },
    trainee:  { bg: "rgba(107,114,128,0.12)", text: "#6B7280" },
  };

  const style = colors[level] ?? colors.local;
  const key = levelKey(level);

  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap"
      style={{ background: style.bg, color: style.text }}
    >
      {t(key)}
    </span>
  );
}

// ─── Referee Form (used in edit modal) ────────────────────────────────────────

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
            <option key={l} value={l}>{t(levelKey(l))}</option>
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

// ─── Inline Add Row (table row, no color picker) ──────────────────────────────

interface InlineAddRowProps {
  onSave: (data: Omit<Referee, "id">) => Promise<void>;
  t: (k: string) => string;
}

function InlineAddRow({ onSave, t }: InlineAddRowProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [phone,     setPhone]     = useState("");
  const [level,     setLevel]     = useState("");
  const [saving,    setSaving]    = useState(false);
  const [flash,     setFlash]     = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  const canSave = firstName.trim().length > 0 && lastName.trim().length > 0;

  async function doSave() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await onSave({
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        email:     email.trim() || null,
        phone:     phone.trim() || null,
        level:     level || null,
        colorTag:  PRESET_COLORS[0],
        notes:     null,
      });
      setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setLevel("");
      setFlash(true);
      setTimeout(() => { setFlash(false); firstRef.current?.focus(); }, 800);
    } finally {
      setSaving(false);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); doSave(); }
  }

  const cellClass = "px-3 py-2";

  return (
    <tr
      style={{
        background: flash ? "rgba(16,185,129,0.06)" : "var(--cat-tag-bg)",
        borderTop: `1px dashed ${canSave ? "var(--cat-accent)" : "var(--cat-card-border)"}`,
      }}
    >
      {/* green dot placeholder */}
      <td className={cellClass}>
        <span className="block w-2 h-2 rounded-full mx-auto" style={{ background: "var(--cat-card-border)" }} />
      </td>
      {/* First + Last */}
      <td className={cellClass}>
        <div className="flex gap-1">
          <input
            ref={firstRef}
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            onKeyDown={onKey}
            placeholder={t("firstName") + " *"}
            className="bg-transparent text-sm outline-none min-w-0 w-24 placeholder:opacity-40"
            style={{ color: "var(--cat-text)" }}
          />
          <input
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            onKeyDown={onKey}
            placeholder={t("lastName") + " *"}
            className="bg-transparent text-sm outline-none min-w-0 w-24 placeholder:opacity-40"
            style={{ color: "var(--cat-text)" }}
          />
        </div>
      </td>
      {/* Email */}
      <td className={cellClass}>
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={onKey}
          type="email"
          placeholder={t("email")}
          className="bg-transparent text-xs outline-none min-w-0 w-full placeholder:opacity-30"
          style={{ color: "var(--cat-text-muted)" }}
        />
      </td>
      {/* Phone */}
      <td className={cellClass}>
        <input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          onKeyDown={onKey}
          type="tel"
          placeholder={t("phone")}
          className="bg-transparent text-xs outline-none min-w-0 w-full placeholder:opacity-30"
          style={{ color: "var(--cat-text-muted)" }}
        />
      </td>
      {/* Level */}
      <td className={cellClass}>
        <select
          value={level}
          onChange={e => setLevel(e.target.value)}
          className="bg-transparent text-xs outline-none min-w-0 w-full"
          style={{ color: "var(--cat-text-muted)" }}
        >
          <option value="">—</option>
          {LEVELS.map(l => (
            <option key={l} value={l}>{t(levelKey(l))}</option>
          ))}
        </select>
      </td>
      {/* Actions: save btn + 2 empty cols */}
      <td className={cellClass} colSpan={3}>
        <button
          onClick={doSave}
          disabled={!canSave || saving}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-25 hover:opacity-80"
          style={{ background: "var(--cat-accent)", color: "#000" }}
          title="Enter"
        >
          {saving
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : flash
              ? <Check className="w-3 h-3" />
              : <Plus className="w-3 h-3" />
          }
          {t("addReferee")}
        </button>
      </td>
    </tr>
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
      setTimeout(() => { onDone(); }, 1200);
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
        placeholder={t("bulkPastePlaceholder")}
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
          {errors.length > 0 && t("bulkErrorsSuffix", { n: errors.length })}
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
  const effectiveMatchesPerRef = Math.max(
    1,
    Math.round(matchCount * utilization),
  );
  const estimated = Math.ceil(totalSlots / effectiveMatchesPerRef);
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
      className="rounded-xl border mb-4 overflow-hidden"
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
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("calcMatches")}</span>
            <span className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>{matchCount}</span>
          </div>
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
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("calcRoles")}</span>
            <select
              value={rolesPerMatch}
              onChange={e => setRolesPerMatch(parseInt(e.target.value))}
              className="rounded-lg border px-2 py-1 text-sm outline-none"
              style={{ ...inputStyle, width: "auto" }}
            >
              <option value={1}>{t("calcRoles1")}</option>
              <option value={2}>{t("calcRoles2")}</option>
              <option value={3}>{t("calcRoles3")}</option>
              <option value={4}>{t("calcRoles4")}</option>
            </select>
          </div>
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
          <div style={{ borderTop: "1px solid var(--cat-card-border)", margin: "4px 0" }} />
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

// ─── Field Group (match grid for one field) ───────────────────────────────────

interface FieldGroupProps {
  fieldName: string;
  matches: Match[];
  assignments: Record<number, MatchRefereeAssignment[]>;
  referees: Referee[];
  onAssignClick: (match: Match) => void;
  onUnassign: (matchId: number, refereeId: number) => void;
  t: (k: string) => string;
  roleLabel: (role: string) => string;
}

function FieldGroup({
  fieldName,
  matches,
  assignments,
  referees,
  onAssignClick,
  onUnassign,
  t,
  roleLabel,
}: FieldGroupProps) {
  // 2 cols on sm, 3 on md, 4 on lg – clamp to actual count if fewer
  const gridCols =
    matches.length === 1 ? "grid-cols-1" :
    matches.length === 2 ? "grid-cols-2" :
    matches.length === 3 ? "grid-cols-2 md:grid-cols-3" :
    "grid-cols-2 md:grid-cols-3 xl:grid-cols-4";

  return (
    <div className="mb-5">
      <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--cat-accent)" }}>
        {fieldName}
      </p>
      <div className={`grid gap-3 ${gridCols}`}>
        {matches.map(match => {
          const matchAssignments = assignments[match.id] ?? [];
          return (
            <div
              key={match.id}
              className="rounded-xl border overflow-hidden flex flex-col"
              style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}
            >
              {/* Match header */}
              <div className="px-3 py-2.5" style={{ background: "var(--cat-tag-bg)" }}>
                <p className="text-xs font-semibold truncate" style={{ color: "var(--cat-text)" }}>
                  {match.homeTeam?.name ?? "—"} {t("vs")} {match.awayTeam?.name ?? "—"}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  {match.scheduledAt && (
                    <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                      <Clock className="w-2.5 h-2.5" />
                      {formatTime(match.scheduledAt)}
                    </span>
                  )}
                  {match.scheduledAt && (
                    <span className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                      · {formatDate(match.scheduledAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* Assigned refs */}
              <div className="flex-1 px-3 py-2 space-y-1 min-h-[2rem]">
                {matchAssignments.length === 0 ? (
                  <p className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>—</p>
                ) : (
                  matchAssignments.map(a => (
                    <div key={`${match.id}-${a.refereeId}`} className="flex items-center gap-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: a.colorTag ?? "var(--cat-text-muted)" }}
                      />
                      <span className="text-[10px] truncate flex-1" style={{ color: "var(--cat-text)" }}>
                        {a.firstName} {a.lastName}
                      </span>
                      <span className="text-[9px] uppercase font-semibold" style={{ color: "var(--cat-text-muted)" }}>
                        {roleLabel(a.role)}
                      </span>
                      <button
                        onClick={() => onUnassign(match.id, a.refereeId)}
                        className="w-4 h-4 flex items-center justify-center rounded transition-opacity hover:opacity-70 shrink-0"
                        style={{ color: "#ef4444" }}
                        title={t("unassign")}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Assign button */}
              {referees.length > 0 && (
                <div className="px-3 pb-2.5">
                  <button
                    onClick={() => onAssignClick(match)}
                    className="w-full flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-semibold transition-opacity hover:opacity-80"
                    style={{ background: "var(--cat-accent)", color: "#000" }}
                  >
                    <UserPlus className="w-2.5 h-2.5" />
                    {t("assignReferee")}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
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
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingReferee, setEditingReferee] = useState<Referee | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
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

  // ── Group filtered matches by field
  const matchesByField = filteredMatches.reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.field?.name ?? "__no_field__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const fieldNames = Object.keys(matchesByField).sort((a, b) => {
    if (a === "__no_field__") return 1;
    if (b === "__no_field__") return -1;
    return a.localeCompare(b);
  });

  // ── Token / link handlers
  async function handleGetLink(referee: Referee) {
    const existingToken = tokenMap[referee.id]?.token ?? referee.accessToken;

    if (existingToken && !window.confirm(t("regenerateWarning"))) {
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
        const { assigned, skipped, noReferee, alreadyAssigned } = await r.json() as {
          assigned: number; skipped: number; noReferee: number; alreadyAssigned: number;
        };
        const parts = [t("autoAssignResultAssigned", { n: assigned })];
        if (alreadyAssigned > 0) parts.push(t("autoAssignResultAlready", { n: alreadyAssigned }));
        if (noReferee > 0) parts.push(t("autoAssignResultNoRef", { n: noReferee }));
        setAutoAssignToast(parts.join(" · "));
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

  // ── Table header style helpers
  const thClass = "px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider";
  const thStyle = { color: "var(--cat-text-muted)", background: "var(--cat-tag-bg)", borderBottom: "1px solid var(--cat-card-border)" };
  const tdClass = "px-3 py-2.5 text-sm align-middle";
  const tdStyle = { color: "var(--cat-text)", borderBottom: "1px solid var(--cat-card-border)" };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* ─── Header ─── */}
      <div>
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

      {/* ─── Referee Table (full-width) ─── */}
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
          {!showBulkImport && (
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
          )}
        </div>

        {/* Bulk import panel */}
        {showBulkImport && (
          <div className="p-4">
            <BulkImportPanel
              base={base}
              onDone={async () => {
                setShowBulkImport(false);
                await loadReferees();
              }}
              t={t as (k: string, values?: Record<string, string | number>) => string}
            />
          </div>
        )}

        {/* Edit form overlay */}
        {editingReferee && (
          <div className="p-4">
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
          </div>
        )}

        {/* Full-width table */}
        {!editingReferee && (
          <div className="overflow-x-auto">
            {rosterLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "var(--cat-text-muted)" }} />
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={thClass} style={{ ...thStyle, width: 28 }} />
                    <th className={thClass} style={thStyle}>{t("firstName")} / {t("lastName")}</th>
                    <th className={thClass} style={thStyle}>{t("email")}</th>
                    <th className={thClass} style={thStyle}>{t("phone")}</th>
                    <th className={thClass} style={thStyle}>{t("level")}</th>
                    <th className={thClass} style={{ ...thStyle, width: 100 }}>{t("inviteBtn")}</th>
                    <th className={thClass} style={{ ...thStyle, width: 40 }} />
                    <th className={thClass} style={{ ...thStyle, width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {referees.map(referee => {
                    const ts = tokenMap[referee.id];
                    const hasToken = !!(ts?.token ?? referee.accessToken);
                    const isCopied = ts?.copied ?? false;
                    const isGenerating = ts?.generating ?? false;

                    return (
                      <tr
                        key={referee.id}
                        className="transition-colors hover:bg-black/5"
                      >
                        {/* Green dot */}
                        <td className={tdClass} style={tdStyle}>
                          <div className="flex justify-center">
                            <OnlineDot />
                          </div>
                        </td>
                        {/* Name */}
                        <td className={tdClass} style={tdStyle}>
                          <span className="font-semibold">
                            {referee.firstName} {referee.lastName}
                          </span>
                        </td>
                        {/* Email */}
                        <td className={tdClass} style={{ ...tdStyle, color: "var(--cat-text-muted)" }}>
                          {referee.email ?? <span className="opacity-30">—</span>}
                        </td>
                        {/* Phone */}
                        <td className={tdClass} style={{ ...tdStyle, color: "var(--cat-text-muted)" }}>
                          {referee.phone ?? <span className="opacity-30">—</span>}
                        </td>
                        {/* Level badge */}
                        <td className={tdClass} style={tdStyle}>
                          <LevelBadge level={referee.level} t={t} />
                        </td>
                        {/* Invite / renew link btn */}
                        <td className={tdClass} style={tdStyle}>
                          <button
                            onClick={() => handleGetLink(referee)}
                            disabled={isGenerating}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-40 whitespace-nowrap"
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
                              <Mail className="w-3 h-3" />
                            )}
                            <span className="hidden sm:inline">
                              {isCopied
                                ? t("linkCopied")
                                : hasToken
                                  ? t("renewBtn")
                                  : t("inviteBtn")}
                            </span>
                          </button>
                        </td>
                        {/* Edit */}
                        <td className={tdClass} style={tdStyle}>
                          <button
                            onClick={() => setEditingReferee(referee)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
                            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}
                            title={t("editReferee")}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </td>
                        {/* Delete */}
                        <td className={tdClass} style={tdStyle}>
                          <button
                            onClick={() => handleDeleteReferee(referee.id)}
                            disabled={deletingId === referee.id}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70 disabled:opacity-30"
                            style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}
                            title={t("deleteReferee")}
                          >
                            {deletingId === referee.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />
                            }
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Inline add row — always at the bottom when not editing */}
                  {!showBulkImport && (
                    <InlineAddRow onSave={handleCreateReferee} t={t} />
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ─── Match field grid ─── */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        {/* Panel header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-wrap gap-3"
          style={{ borderColor: "var(--cat-card-border)" }}
        >
          <h2 className="font-bold text-base" style={{ color: "var(--cat-text)" }}>
            {t("matchAssignments")}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Auto-assign role */}
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
            {/* Auto-assign btn */}
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
                <option key={d} value={d}>{formatDate(d)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-5">
          {/* Auto-assign toast */}
          {autoAssignToast && (
            <div
              className="mb-4 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ background: "rgba(16,185,129,0.12)", color: "#059669" }}
            >
              {autoAssignToast}
            </div>
          )}

          {/* Conflict note */}
          <p className="text-xs mb-4" style={{ color: "var(--cat-text-muted)" }}>
            {t("autoAssignConflictNote")}
          </p>

          {/* Calculator */}
          <RefereeCalculator
            matchCount={matches.length}
            t={t as (k: string, values?: Record<string, string | number>) => string}
          />

          {/* Match grid grouped by field */}
          {matchesLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "var(--cat-text-muted)" }} />
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t("noMatches")}</p>
            </div>
          ) : (
            fieldNames.map(fn => (
              <FieldGroup
                key={fn}
                fieldName={fn === "__no_field__" ? t("fieldNoField") : fn}
                matches={matchesByField[fn]}
                assignments={assignments}
                referees={referees}
                onAssignClick={setAssignDialogMatch}
                onUnassign={handleUnassign}
                t={t}
                roleLabel={roleLabel}
              />
            ))
          )}
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
