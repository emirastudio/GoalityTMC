"use client";

import { useEffect, useState } from "react";
import { Trash2, Shield, User as UserIcon } from "lucide-react";

type Member = {
  id: number;
  email: string;
  name: string | null;
  role: "club_admin" | "team_coach";
  teams: { id: number; label: string }[];
  isSelf: boolean;
};

// Admin-only panel listing every clubUser of the club. Lets the
// club admin remove a member (last-admin and self-removal are
// blocked server-side). Pairs with the existing InvitePanel —
// invite a new admin first, then this panel can transfer or remove.
export function MembersPanel({ clubId }: { clubId: number }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/members`);
      if (res.ok) setMembers(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [clubId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function remove(memberId: number, label: string) {
    if (!confirm(`Remove ${label} from the club? They will lose access immediately.`)) return;
    setRemoving(memberId);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${clubId}/members/${memberId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to remove");
        return;
      }
      await load();
    } finally {
      setRemoving(null);
    }
  }

  if (loading) return null;

  return (
    <div
      className="rounded-2xl p-5 border"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>
          Club members
        </p>
        <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
          {members.length} {members.length === 1 ? "person" : "people"}
        </span>
      </div>

      {error && (
        <p className="text-xs mb-2" style={{ color: "#ef4444" }}>
          {error}
        </p>
      )}

      <ul className="space-y-2">
        {members.map((m) => {
          const label = m.name ?? m.email;
          const Icon = m.role === "club_admin" ? Shield : UserIcon;
          const iconColor = m.role === "club_admin" ? "var(--cat-accent)" : "var(--cat-text-muted)";
          return (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2 border"
              style={{
                background: "var(--cat-tag-bg)",
                borderColor: "var(--cat-card-border)",
              }}
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color: iconColor }} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate" style={{ color: "var(--cat-text)" }}>
                  {label}
                  {m.isSelf && (
                    <span
                      className="ml-2 text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: "var(--cat-accent)", color: "#000" }}
                    >
                      you
                    </span>
                  )}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--cat-text-muted)" }}>
                  {m.role === "club_admin" ? "Club admin" : `Coach · ${m.teams.map((t) => t.label).join(", ") || "—"}`}
                  {" · "}
                  {m.email}
                </p>
              </div>
              {!m.isSelf && (
                <button
                  type="button"
                  onClick={() => remove(m.id, label)}
                  disabled={removing === m.id}
                  className="p-2 rounded-lg hover:opacity-70 transition-all cursor-pointer disabled:opacity-40"
                  style={{ color: "#ef4444" }}
                  title="Remove from club"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
