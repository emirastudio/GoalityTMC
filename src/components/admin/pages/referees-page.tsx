"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useTournament } from "@/lib/tournament-context";
import {
  Plus, Pencil, Trash2, UserPlus, X, Check,
  Users2, CalendarDays, Clock,
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
  const [editingReferee, setEditingReferee] = useState<Referee | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ── Matches state
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [assignments, setAssignments] = useState<Record<number, MatchRefereeAssignment[]>>({});
  const [assignDialogMatch, setAssignDialogMatch] = useState<Match | null>(null);

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
              {!showAddForm && !editingReferee && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ background: "var(--cat-accent)", color: "#000" }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t("addReferee")}
                </button>
              )}
            </div>

            <div className="p-4 space-y-3">
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
              ) : referees.length === 0 && !showAddForm ? (
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

            <div className="p-4 space-y-3">
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
