"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminFetch, useTournament } from "@/lib/tournament-context";
import {
  Download, Search, Users, Check, ChevronDown, Plus, X,
  Trash2, Link2, Megaphone, Send, Mail, MessageSquare,
  Loader2, ClipboardList, Table2, Copy, ExternalLink,
  Shield, CheckCircle2, AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Team {
  id: number;
  registrationId: number;
  name: string | null;
  displayName: string | null;
  birthYear: number | null;
  gender: string | null;
  squadAlias: string | null;
  regNumber: number;
  status: "draft" | "open" | "confirmed" | "cancelled";
  notes: string | null;
  createdAt: string;
  club: { id: number; name: string; badgeUrl: string | null; slug: string | null } | null;
  class: { id: number; name: string } | null;
  playerCount: number;
  staffCount: number;
  orderTotal: string;
  paidTotal: string;
  balance: string;
}

interface TournamentInfo {
  name: string;
  slug: string;
  registrationOpen: boolean;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  draft:     { bg: "rgba(100,116,139,0.1)", text: "#64748b", border: "rgba(100,116,139,0.3)" },
  open:      { bg: "rgba(16,185,129,0.1)",  text: "#10b981", border: "rgba(16,185,129,0.3)" },
  confirmed: { bg: "rgba(245,158,11,0.1)",  text: "#f59e0b", border: "rgba(245,158,11,0.3)" },
  cancelled: { bg: "rgba(239,68,68,0.1)",   text: "#ef4444", border: "rgba(239,68,68,0.3)" },
};

const ALL_STATUSES = ["open", "confirmed", "cancelled"] as const;

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status, t }: { status: string; t: (k: string) => string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.draft;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {t(status)}
    </span>
  );
}

// ─── Invite Block ─────────────────────────────────────────────────────────────

function InviteBlock({ orgSlug, tournamentInfo, locale }: {
  orgSlug: string;
  tournamentInfo: TournamentInfo | null;
  locale: string;
}) {
  const t = useTranslations("admin.teams");
  const [copied, setCopied] = useState(false);

  if (!tournamentInfo) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://goality.app";
  const registerUrl = `${origin}/${locale}/t/${orgSlug}/${tournamentInfo.slug}/register`;

  const channels = [
    {
      icon: MessageSquare, label: "WhatsApp", color: "#25D366",
      href: `https://wa.me/?text=${encodeURIComponent(`${tournamentInfo.name}\n\n${registerUrl}`)}`,
    },
    {
      icon: Send, label: "Telegram", color: "#0088CC",
      href: `https://t.me/share/url?url=${encodeURIComponent(registerUrl)}&text=${encodeURIComponent(tournamentInfo.name)}`,
    },
    {
      icon: Mail, label: "Email", color: "#6366F1",
      href: `mailto:?subject=${encodeURIComponent(tournamentInfo.name)}&body=${encodeURIComponent(`${tournamentInfo.name}\n\n${registerUrl}`)}`,
    },
  ];

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(registerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* */ }
  }

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-3"
        style={{ borderBottom: "1px solid var(--cat-divider)" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "var(--cat-badge-open-bg)" }}>
          <Megaphone className="w-4 h-4" style={{ color: "var(--cat-accent)" }} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-black" style={{ color: "var(--cat-text)" }}>
            {t("inviteTitle")}
          </h3>
          <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
            {t("inviteDesc")}
          </p>
        </div>
        {tournamentInfo.registrationOpen && (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full"
            style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)", border: "1px solid var(--cat-badge-open-border)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {t("regOpen")}
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Registration link */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2"
            style={{ color: "var(--cat-text-muted)" }}>{t("regLinkLabel")}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-mono truncate"
              style={{ background: "var(--cat-input-bg)", borderColor: "var(--cat-input-border)", color: "var(--cat-text-secondary)" }}>
              <Link2 className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-accent)" }} />
              {registerUrl}
            </div>
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0"
              style={{
                background: copied ? "rgba(16,185,129,0.12)" : "var(--cat-badge-open-bg)",
                color: copied ? "#10b981" : "var(--cat-accent)",
                border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : "var(--cat-badge-open-border)"}`,
              }}>
              {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t("copied") : t("copyLink")}
            </button>
            <a href={registerUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)", border: "1px solid var(--cat-card-border)" }}>
              <ExternalLink className="w-3.5 h-3.5" />
              {t("open")}
            </a>
          </div>
        </div>

        {/* Share channels */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2"
            style={{ color: "var(--cat-text-muted)" }}>{t("share")}</p>
          <div className="grid grid-cols-3 gap-3">
            {channels.map(ch => (
              <a key={ch.label} href={ch.href} target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 py-3 rounded-xl border transition-all hover:opacity-80"
                style={{ background: `${ch.color}10`, borderColor: `${ch.color}30`, color: ch.color }}>
                <ch.icon className="w-5 h-5" />
                <span className="text-xs font-bold">{ch.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inline Add Row ───────────────────────────────────────────────────────────

function AddRow({ classes, defaultClassId, onAdd }: {
  classes: { id: number; name: string }[];
  defaultClassId: string;
  onAdd: (data: { name: string; clubName: string; classId: string }) => Promise<boolean>;
}) {
  const t = useTranslations("admin.teams");
  const [name, setName] = useState("");
  const [clubName, setClubName] = useState("");
  const [classId, setClassId] = useState(defaultClassId);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    const ok = await onAdd({ name: name.trim(), clubName: clubName.trim(), classId });
    setSaving(false);
    if (ok) {
      setName(""); setClubName("");
      nameRef.current?.focus();
    }
  }

  return (
    <tr style={{ background: "rgba(43,254,186,0.03)" }}>
      {/* # */}
      <td className="px-3 py-2" style={{ borderTop: "1px dashed var(--cat-card-border)" }}>
        <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>—</span>
      </td>
      {/* Club name */}
      <td className="px-2 py-2" style={{ borderTop: "1px dashed var(--cat-card-border)" }}>
        <input value={clubName} onChange={e => setClubName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder={t("clubNamePlaceholder")}
          className="w-full px-2 py-1 rounded-lg text-sm outline-none"
          style={{ background: "var(--cat-input-bg)", border: "1px solid var(--cat-card-border)", color: "var(--cat-text)" }} />
      </td>
      {/* Team name */}
      <td className="px-3 py-2" style={{ borderTop: "1px dashed var(--cat-card-border)" }}>
        <input ref={nameRef} value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder={t("teamNamePlaceholder")}
          className="w-full px-2 py-1 rounded-lg text-sm outline-none"
          style={{ background: "var(--cat-input-bg)", border: "1px solid var(--cat-accent)", color: "var(--cat-text)" }} />
      </td>
      {/* Birth year (empty) */}
      <td className="px-3 py-2" style={{ borderTop: "1px dashed var(--cat-card-border)" }} />
      {/* Players (empty) */}
      <td className="px-3 py-2" style={{ borderTop: "1px dashed var(--cat-card-border)" }} />
      {/* Staff (empty) */}
      <td className="px-3 py-2" style={{ borderTop: "1px dashed var(--cat-card-border)" }} />
      {/* Division */}
      {classes.length > 0 && (
        <td className="px-3 py-2" style={{ borderTop: "1px dashed var(--cat-card-border)" }}>
          <select value={classId} onChange={e => setClassId(e.target.value)}
            className="w-full px-2 py-1 rounded-lg text-xs outline-none"
            style={{ background: "var(--cat-input-bg)", border: "1px solid var(--cat-card-border)", color: "var(--cat-text)" }}>
            <option value="">{t("noDivision")}</option>
            {classes.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
        </td>
      )}
      {/* Balance (empty) */}
      <td className="px-3 py-2" style={{ borderTop: "1px dashed var(--cat-card-border)" }} />
      {/* Status (empty) */}
      <td className="px-3 py-2" style={{ borderTop: "1px dashed var(--cat-card-border)" }} />
      {/* Add button */}
      <td className="px-3 py-2" style={{ borderTop: "1px dashed var(--cat-card-border)" }}>
        <button onClick={submit} disabled={saving || !name.trim()}
          className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
          style={{ background: "var(--cat-accent)", color: "#0A0E14" }}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          {t("addRow")}
        </button>
      </td>
    </tr>
  );
}

// ─── Paste List Tab ───────────────────────────────────────────────────────────

function PasteListTab({ classes, defaultClassId, onCreated }: {
  classes: { id: number; name: string }[];
  defaultClassId: string;
  onCreated: () => void;
}) {
  const t = useTranslations("admin.teams");
  const adminFetch = useAdminFetch();
  const tournament = useTournament();
  const [text, setText] = useState("");
  const [classId, setClassId] = useState(defaultClassId);
  const [parsed, setParsed] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [limitError, setLimitError] = useState<string | null>(null);

  function parse() {
    const lines = text.split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 0);
    setParsed(lines);
  }

  async function createAll() {
    if (!parsed.length || !tournament?.tournamentId) return;
    setCreating(true);
    setProgress(0);
    setLimitError(null);
    let created = 0;
    try {
      for (let i = 0; i < parsed.length; i++) {
        const res = await adminFetch("/api/admin/teams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: parsed[i], tournamentId: tournament.tournamentId, classId: classId || null }),
        });
        if (!res.ok) break;
        created++;
        setProgress(created);
      }
      if (created > 0 && !limitError) {
        setDone(true);
        setText(""); setParsed([]);
        setTimeout(() => { setDone(false); setProgress(0); onCreated(); }, 1500);
      } else if (created > 0) {
        onCreated();
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4 p-5">
      <div>
        <p className="text-xs font-semibold mb-1" style={{ color: "var(--cat-text-muted)" }}>
          {t("pasteHint")}
        </p>
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setParsed([]); }}
          rows={8}
          placeholder={t("pastePlaceholder")}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none font-mono"
          style={{ background: "var(--cat-input-bg)", border: "1px solid var(--cat-card-border)", color: "var(--cat-text)" }}
        />
      </div>

      {classes.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: "var(--cat-text-muted)" }}>{t("division")}:</span>
          <select value={classId} onChange={e => setClassId(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: "var(--cat-input-bg)", border: "1px solid var(--cat-card-border)", color: "var(--cat-text)" }}>
            <option value="">{t("noDivision")}</option>
            {classes.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={parse} disabled={!text.trim()}
          className="px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)", border: "1px solid var(--cat-card-border)" }}>
          {t("parseList")}
        </button>
        {parsed.length > 0 && (
          <button onClick={createAll} disabled={creating || done}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
            style={{ background: "var(--cat-accent)", color: "#0A0E14" }}>
            {done ? <Check className="w-4 h-4" /> : creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {done ? t("created") : creating ? `${progress} / ${parsed.length}` : t("createAll", { count: parsed.length })}
          </button>
        )}
      </div>


      {parsed.length > 0 && (
        <div className="rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--cat-card-border)" }}>
          <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide"
            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)", borderBottom: "1px solid var(--cat-card-border)" }}>
            {t("previewTeams", { count: parsed.length })}
          </div>
          <div className="divide-y" style={{ borderColor: "var(--cat-card-border)" }}>
            {parsed.map((name, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2">
                <Shield className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
                <span className="text-sm" style={{ color: "var(--cat-text)" }}>{name}</span>
                <button onClick={() => setParsed(prev => prev.filter((_, j) => j !== i))}
                  className="ml-auto hover:opacity-70" style={{ color: "var(--cat-text-muted)" }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TeamsPageContent() {
  const t = useTranslations("admin.teams");
  const tTeam = useTranslations("team");
  const locale = useLocale();
  const router = useRouter();
  const adminFetch = useAdminFetch();
  const tournament = useTournament();

  const searchParams = useSearchParams();
  const classIdParam = searchParams.get("classId");
  const className = searchParams.get("className");

  const [teams, setTeams] = useState<Team[]>([]);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [tournamentInfo, setTournamentInfo] = useState<TournamentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"table" | "paste">("table");
  const [statusDropdown, setStatusDropdown] = useState<number | null>(null);
  const [classDropdown, setClassDropdown] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [uploadingBadge, setUploadingBadge] = useState<number | null>(null);
  const [hoveredLogoId, setHoveredLogoId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const classDropdownRef = useRef<HTMLDivElement>(null);

  // Load teams
  const fetchTeams = useCallback(() => {
    const url = classIdParam
      ? `/api/admin/teams?classId=${classIdParam}`
      : "/api/admin/teams";
    adminFetch(url)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setTeams(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [classIdParam]);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  // Load classes + tournament info
  useEffect(() => {
    if (!tournament?.tournamentId) return;
    adminFetch(`/api/admin/classes?tournamentId=${tournament.tournamentId}`)
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setClasses(d); }).catch(() => {});
    adminFetch("/api/admin/tournaments")
      .then(r => r.json())
      .then(d => {
        if (d?.name) setTournamentInfo({ name: d.name, slug: d.slug, registrationOpen: d.registrationOpen ?? false });
      }).catch(() => {});
  }, [tournament?.tournamentId]);

  // Close dropdowns on outside click
  useEffect(() => {
    function h(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStatusDropdown(null);
      }
      if (classDropdownRef.current && !classDropdownRef.current.contains(e.target as Node)) {
        setClassDropdown(null);
      }
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = teams.filter(team => {
    if (search) {
      const q = search.toLowerCase();
      const label = team.displayName ?? team.name ?? (team.birthYear ? String(team.birthYear) : "");
      return label.toLowerCase().includes(q) ||
        team.club?.name?.toLowerCase().includes(q) ||
        team.regNumber?.toString().includes(q) ||
        team.birthYear?.toString().includes(q);
    }
    return true;
  });

  async function handleAddTeam({ name, clubName, classId }: { name: string; clubName: string; classId: string }) {
    if (!tournament?.tournamentId) return false;
    try {
      const res = await adminFetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, clubName, classId: classId || classIdParam || null, tournamentId: tournament.tournamentId }),
      });
      if (res.ok) { fetchTeams(); return true; }
    } catch { /* */ }
    return false;
  }

  async function handleStatusChange(teamId: number, status: string) {
    setStatusDropdown(null);
    try {
      await adminFetch(`/api/admin/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchTeams();
    } catch { /* */ }
  }

  async function handleClassChange(teamId: number, registrationId: number, classId: number | null) {
    setClassDropdown(null);
    // Optimistic update
    setTeams(prev => prev.map(t => t.id === teamId
      ? { ...t, class: classId ? (classes.find(c => c.id === classId) ?? null) : null }
      : t
    ));
    try {
      await adminFetch(`/api/admin/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId, classId }),
      });
    } catch { fetchTeams(); }
  }

  async function handleCopyInvite(clubId: number | undefined, teamId: number) {
    if (!clubId) return;
    try {
      const res = await adminFetch("/api/admin/generate-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId }),
      });
      const data = await res.json();
      if (data.inviteUrl) {
        await navigator.clipboard.writeText(data.inviteUrl);
        setCopiedId(teamId);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch { /* */ }
  }

  function exportCSV() {
    const headers = ["#", "Club", "Team", "Class", "Players", "Balance", "Status"];
    const rows = filtered.map(tm => [
      tm.regNumber, tm.club?.name ?? "", tm.name ?? "", tm.class?.name ?? "",
      tm.playerCount, tm.balance, tm.status,
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => {
        const s = String(cell);
        return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `teams-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function navigateToTeam(team: Team) {
    const path = tournament?.orgSlug
      ? `/${locale}/org/${tournament.orgSlug}/admin/tournament/${tournament.tournamentId}/teams/${team.id}`
      : `/${locale}/admin/teams/${team.id}`;
    router.push(path);
  }

  async function handleBadgeFileChange(e: React.ChangeEvent<HTMLInputElement>, clubId: number) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadingBadge(clubId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await adminFetch(`/api/admin/clubs/${clubId}/badge`, { method: "POST", body: fd });
      if (res.ok) {
        const { badgeUrl } = await res.json();
        setTeams(prev => prev.map(t =>
          t.club?.id === clubId ? { ...t, club: { ...t.club!, badgeUrl } } : t
        ));
      }
    } finally {
      setUploadingBadge(null);
    }
  }

  const showClassCol = !classIdParam;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--cat-text)" }}>
            {className || t("title")}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            {filtered.length} {t("teams").toLowerCase()}
          </p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)", border: "1px solid var(--cat-card-border)" }}>
          <Download className="w-4 h-4" /> {t("export")}
        </button>
      </div>

      {/* ── Main card ── */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b"
          style={{ borderColor: "var(--cat-card-border)" }}>
          <button onClick={() => setTab("table")}
            className="flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all border-b-2"
            style={{
              color: tab === "table" ? "var(--cat-accent)" : "var(--cat-text-muted)",
              borderColor: tab === "table" ? "var(--cat-accent)" : "transparent",
            }}>
            <Table2 className="w-4 h-4" /> {t("tabTable")}
            {teams.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: tab === "table" ? "var(--cat-badge-open-bg)" : "var(--cat-tag-bg)", color: tab === "table" ? "var(--cat-accent)" : "var(--cat-text-muted)" }}>
                {teams.length}
              </span>
            )}
          </button>
          <button onClick={() => setTab("paste")}
            className="flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all border-b-2"
            style={{
              color: tab === "paste" ? "var(--cat-accent)" : "var(--cat-text-muted)",
              borderColor: tab === "paste" ? "var(--cat-accent)" : "transparent",
            }}>
            <ClipboardList className="w-4 h-4" /> {t("tabPaste")}
          </button>
        </div>

        {/* ── TABLE TAB ── */}
        {tab === "table" && (
          <>
            {/* Search */}
            <div className="p-4 border-b" style={{ borderColor: "var(--cat-card-border)" }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--cat-text-muted)" }} />
                <input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "var(--cat-input-bg)", border: "1px solid var(--cat-card-border)", color: "var(--cat-text)" }}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12"
                style={{ color: "var(--cat-text-muted)" }}>
                <Loader2 className="w-5 h-5 animate-spin" /> {t("loading")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--cat-card-border)" }}>
                      <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)", width: 60 }}>#</th>
                      <th className="px-2 py-3 text-left text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)", width: 44 }}>{t("clubCol")}</th>
                      <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>{t("teamCol")}</th>
                      <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)", width: 60 }}>{t("birthYearCol")}</th>
                      <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)", width: 70 }}>{t("playersCol")}</th>
                      <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)", width: 60 }}>{t("staffCol")}</th>
                      {showClassCol && <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>{t("divisionCol")}</th>}
                      <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)", width: 90 }}>{t("balanceCol")}</th>
                      <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)", width: 140 }}>{t("statusCol")}</th>
                      <th style={{ width: 48 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(team => {
                      const balance = parseFloat(team.balance);
                      return (
                        <tr key={team.id}
                          onClick={() => navigateToTeam(team)}
                          className="group cursor-pointer transition-all hover:opacity-80"
                          style={{ borderBottom: "1px solid var(--cat-card-border)" }}>

                          {/* # */}
                          <td className="px-3 py-3">
                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded"
                              style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
                              {team.regNumber}
                            </span>
                          </td>

                          {/* Club — logo + click to upload */}
                          <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                            {team.club ? (
                              <label
                                title={`${team.club.name} — click to change logo`}
                                onMouseEnter={() => setHoveredLogoId(team.club!.id)}
                                onMouseLeave={() => setHoveredLogoId(null)}
                                style={{ position: "relative", display: "inline-block", cursor: uploadingBadge === team.club.id ? "wait" : "pointer", lineHeight: 0 }}
                              >
                                {team.club.badgeUrl ? (
                                  <img src={team.club.badgeUrl} alt={team.club.name}
                                    style={{ width: 36, height: 36, objectFit: "contain", display: "block", borderRadius: 6, opacity: uploadingBadge === team.club.id ? 0.4 : 1, transition: "opacity 0.15s" }} />
                                ) : (
                                  <div style={{ width: 36, height: 36, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--cat-tag-bg)", opacity: uploadingBadge === team.club.id ? 0.4 : 1, transition: "opacity 0.15s" }}>
                                    <Shield className="w-4 h-4" style={{ color: "var(--cat-text-muted)" }} />
                                  </div>
                                )}
                                {/* Overlay */}
                                <div style={{
                                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                                  borderRadius: 6,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  background: "rgba(0,0,0,0.55)",
                                  opacity: (hoveredLogoId === team.club.id || uploadingBadge === team.club.id) ? 1 : 0,
                                  transition: "opacity 0.15s",
                                  pointerEvents: "none",
                                }}>
                                  {uploadingBadge === team.club.id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#fff" }} />
                                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                  }
                                </div>
                                {/* Native file input — activated by label click */}
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                                  style={{ display: "none" }}
                                  disabled={uploadingBadge === team.club.id}
                                  onChange={e => handleBadgeFileChange(e, team.club!.id)}
                                />
                              </label>
                            ) : (
                              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                                style={{ background: "var(--cat-tag-bg)" }}>
                                <Shield className="w-4 h-4" style={{ color: "var(--cat-text-muted)" }} />
                              </div>
                            )}
                          </td>

                          {/* Team name */}
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>
                                {team.displayName ?? team.name ?? (team.birthYear ? String(team.birthYear) : "—")}
                              </span>
                              {team.squadAlias && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                  style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
                                  {team.squadAlias}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Birth year */}
                          <td className="px-3 py-3 text-sm" style={{ color: "var(--cat-text-muted)" }}>
                            {team.birthYear ?? "—"}
                          </td>

                          {/* Players */}
                          <td className="px-3 py-3 text-sm" style={{ color: "var(--cat-text-muted)" }}>
                            {team.playerCount}
                          </td>

                          {/* Staff */}
                          <td className="px-3 py-3 text-sm" style={{ color: "var(--cat-text-muted)" }}>
                            {team.staffCount}
                          </td>

                          {/* Division — inline dropdown */}
                          {showClassCol && (
                            <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                              <div ref={classDropdown === team.id ? classDropdownRef : undefined} className="relative inline-block">
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    setClassDropdown(prev => prev === team.id ? null : team.id);
                                  }}
                                  className="flex items-center gap-1 text-sm cursor-pointer hover:opacity-70 transition-opacity"
                                  style={{ color: team.class ? "var(--cat-text)" : "var(--cat-text-muted)" }}>
                                  <span>{team.class?.name || "—"}</span>
                                  <ChevronDown className="w-3 h-3 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
                                </button>
                                {classDropdown === team.id && (
                                  <div className="absolute top-full left-0 mt-1 rounded-xl border shadow-xl z-50 py-1 min-w-[140px]"
                                    style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                                    <button
                                      onClick={() => handleClassChange(team.id, team.registrationId, null)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-all hover:opacity-80"
                                      style={{ color: "var(--cat-text-muted)" }}>
                                      {!team.class && <Check className="w-3 h-3" style={{ color: "var(--cat-accent)" }} />}
                                      <span>—</span>
                                    </button>
                                    {classes.map(c => (
                                      <button key={c.id}
                                        onClick={() => handleClassChange(team.id, team.registrationId, c.id)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-all hover:opacity-80"
                                        style={{ color: "var(--cat-text)" }}>
                                        {team.class?.id === c.id && <Check className="w-3 h-3" style={{ color: "var(--cat-accent)" }} />}
                                        <span>{c.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          )}

                          {/* Balance */}
                          <td className="px-3 py-3">
                            <span className="text-sm font-semibold"
                              style={{ color: balance >= 0 ? "#10b981" : "#ef4444" }}>
                              {balance >= 0 ? "" : "-"}€{Math.abs(balance).toFixed(2)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                            <div className="relative inline-block">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setStatusDropdown(prev => prev === team.id ? null : team.id);
                                }}
                                className="flex items-center gap-1 cursor-pointer">
                                <StatusBadge status={team.status} t={k => tTeam(k)} />
                                <ChevronDown className="w-3 h-3" style={{ color: "var(--cat-text-muted)" }} />
                              </button>

                              {statusDropdown === team.id && (
                                <div ref={dropdownRef}
                                  className="absolute top-full left-0 mt-1 rounded-xl border shadow-xl z-50 py-1 min-w-[140px]"
                                  style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                                  {ALL_STATUSES.map(s => (
                                    <button key={s} onClick={() => handleStatusChange(team.id, s)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-all hover:opacity-80">
                                      {team.status === s && <Check className="w-3 h-3" style={{ color: "var(--cat-accent)" }} />}
                                      <StatusBadge status={s} t={k => tTeam(k)} />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleCopyInvite(team.club?.id, team.id)}
                                title={t("copyLink")}
                                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
                                style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }}>
                                {copiedId === team.id
                                  ? <Check className="w-3.5 h-3.5" />
                                  : <Link2 className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Add row */}
                    <AddRow
                      classes={classes}
                      defaultClassId={classIdParam ?? ""}
                      onAdd={handleAddTeam}
                    />
                  </tbody>
                </table>

                {filtered.length === 0 && !loading && (
                  <div className="text-center py-12" style={{ color: "var(--cat-text-muted)" }}>
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">{search ? t("noResults") : t("noTeams")}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--cat-text-muted)" }}>
                      {t("addRowHint")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── PASTE TAB ── */}
        {tab === "paste" && (
          <PasteListTab
            classes={classes}
            defaultClassId={classIdParam ?? ""}
            onCreated={() => { fetchTeams(); setTab("table"); }}
          />
        )}
      </div>

      {/* ── Invite Block ── */}
      {tournament?.orgSlug && (
        <InviteBlock
          orgSlug={tournament.orgSlug}
          tournamentInfo={tournamentInfo}
          locale={locale}
        />
      )}

    </div>
  );
}
