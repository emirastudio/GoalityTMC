"use client";

import { useEffect, useState } from "react";
import { Check, X, Loader2, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type Member = {
  id: number;
  email: string;
  name: string | null;
  role: "club_admin" | "team_coach";
  teams: { id: number; label: string; status: "pending" | "approved" }[];
  hasPending: boolean;
  isSelf: boolean;
};

// Lists every coach in the club who has at least one team-junction
// row in `pending` status — i.e. they signed themselves up via the
// public registration and haven't been confirmed yet by the admin.
//
// Pending state is purely a moderation hint — the coach already has
// full access to register their team for tournaments. The admin can
// either confirm (clears the badge) or remove (revokes access).
export function PendingCoachesPanel({ clubId }: { clubId: number }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const tr = useTranslations("pendingCoaches");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/members`);
      if (res.ok) setMembers(await res.json());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [clubId]); // eslint-disable-line react-hooks/exhaustive-deps

  const pending = members.filter((m) => m.hasPending);
  if (loading) return null;
  if (pending.length === 0) return null;

  async function approve(memberId: number, teamId: number) {
    setBusy(`approve:${memberId}:${teamId}`);
    setError(null);
    try {
      const res = await fetch(
        `/api/clubs/${clubId}/members/${memberId}/teams/${teamId}/approve`,
        { method: "POST" }
      );
      if (!res.ok) {
        setError(tr("confirmFailed"));
        return;
      }
      await load();
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove(memberId: number, label: string) {
    if (!confirm(tr("removeConfirm", { label }))) return;
    setBusy(`remove:${memberId}`);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${clubId}/members/${memberId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? tr("removeFailed"));
        return;
      }
      await load();
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      className="rounded-2xl p-5 border"
      style={{
        background: "rgba(245,158,11,0.06)",
        borderColor: "rgba(245,158,11,0.35)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <UserCheck className="w-4 h-4" style={{ color: "#f59e0b" }} />
        <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
          {tr("title")}
        </p>
        <span
          className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b" }}
        >
          {pending.length}
        </span>
      </div>
      <p className="text-xs mb-3" style={{ color: "var(--cat-text-muted)" }}>
        {tr("description")}
      </p>

      {error && (
        <p className="text-xs mb-2" style={{ color: "#ef4444" }}>{error}</p>
      )}

      <ul className="space-y-2">
        {pending.map((m) => {
          const label = m.name ?? m.email;
          return m.teams
            .filter((t) => t.status === "pending")
            .map((tm) => (
              <li
                key={`${m.id}-${tm.id}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2 border"
                style={{
                  background: "var(--cat-card-bg)",
                  borderColor: "var(--cat-card-border)",
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--cat-text)" }}>
                    {label}
                  </p>
                  <p className="text-[11px] truncate" style={{ color: "var(--cat-text-muted)" }}>
                    {m.email} · {tr("teamLabel")}: <span style={{ color: "var(--cat-text-secondary)" }}>{tm.label}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => approve(m.id, tm.id)}
                  disabled={busy !== null}
                  title={tr("confirmAction")}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}
                >
                  {busy === `approve:${m.id}:${tm.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {tr("confirmAction")}
                </button>
                <button
                  type="button"
                  onClick={() => remove(m.id, label)}
                  disabled={busy !== null}
                  title={tr("remove")}
                  className="p-1.5 rounded-lg hover:opacity-70 transition-all cursor-pointer disabled:opacity-40"
                  style={{ color: "#ef4444" }}
                >
                  {busy === `remove:${m.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                </button>
              </li>
            ));
        })}
      </ul>
    </div>
  );
}
