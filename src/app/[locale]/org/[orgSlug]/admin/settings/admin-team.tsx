"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Users, UserPlus, Trash2, Clock, Mail, Copy, Check, AlertTriangle, Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface AdminRow {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}
interface PendingInvite {
  id: number;
  invitedEmail: string;
  invitedName: string | null;
  invitedBy: number;
  createdAt: string;
  expiresAt: string;
}

export function OrgAdminTeam({ orgSlug }: { orgSlug: string }) {
  const t = useTranslations("orgAdminTeam");

  const [loading, setLoading] = useState(true);
  const [gateBlocked, setGateBlocked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [pending, setPending] = useState<PendingInvite[]>([]);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/org/${orgSlug}/admins`, { credentials: "include" });
      if (!res.ok) {
        setAdmins([]);
        setPending([]);
        return;
      }
      const data = await res.json();
      setCurrentUserId(data.currentUserId ?? null);
      setAdmins(data.admins ?? []);
      setPending(data.pendingInvites ?? []);
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => { load(); }, [load]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setLastInviteLink(null);
    setInviteSending(true);
    try {
      const res = await fetch(`/api/org/${orgSlug}/admins`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, name: inviteName }),
      });
      if (res.status === 402) {
        setGateBlocked(true);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setInviteError(data.error ?? t("genericError"));
        return;
      }
      setLastInviteLink(data.invite?.inviteLink ?? null);
      setInviteEmail("");
      setInviteName("");
      load();
    } finally {
      setInviteSending(false);
    }
  }

  async function removeInvite(id: number) {
    const res = await fetch(`/api/org/${orgSlug}/admins/${id}?type=invite`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) load();
  }
  async function removeAdmin(id: number) {
    if (!confirm(t("removeConfirm"))) return;
    const res = await fetch(`/api/org/${orgSlug}/admins/${id}?type=admin`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? t("genericError"));
      return;
    }
    load();
  }

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  }

  if (loading) {
    return (
      <div className="mt-8 max-w-xl rounded-2xl p-6 border flex items-center gap-2"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text-muted)" }}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">{t("loading")}</span>
      </div>
    );
  }

  return (
    <div className="mt-8 max-w-xl space-y-4">
      {/* Header */}
      <div className="rounded-2xl p-6 border"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(99,102,241,0.12)" }}>
            <Users className="w-4 h-4" style={{ color: "#6366f1" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold" style={{ color: "var(--cat-text)" }}>{t("title")}</h2>
            <p className="text-xs mt-1" style={{ color: "var(--cat-text-muted)" }}>{t("description")}</p>
          </div>
        </div>

        {/* Gate hint for Free / Starter plans */}
        {gateBlocked && (
          <div className="mt-4 rounded-xl p-3 flex items-start gap-2"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <Lock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#F59E0B" }} />
            <div className="text-xs" style={{ color: "var(--cat-text-secondary)" }}>
              {t.rich("upgradeHint", {
                billing: (chunks) => (
                  <Link href={`/org/${orgSlug}/admin/billing`} className="underline font-semibold" style={{ color: "var(--cat-accent)" }}>{chunks}</Link>
                ),
              })}
            </div>
          </div>
        )}

        {/* Current admins */}
        <div className="mt-5">
          <h3 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: "var(--cat-text-muted)" }}>
            {t("currentAdmins")} · {admins.length}
          </h3>
          <div className="space-y-1.5">
            {admins.map(a => (
              <div key={a.id}
                className="flex items-center gap-3 p-3 rounded-xl border"
                style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shrink-0"
                  style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }}>
                  {(a.name || a.email).split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--cat-text)" }}>
                    {a.name || a.email}
                    {a.id === currentUserId && (
                      <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
                        {t("you")}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] truncate" style={{ color: "var(--cat-text-muted)" }}>{a.email}</p>
                </div>
                {a.id !== currentUserId && (
                  <button
                    type="button"
                    onClick={() => removeAdmin(a.id)}
                    className="p-1.5 rounded-lg transition-all hover:opacity-70"
                    title={t("remove")}
                    style={{ color: "#ef4444" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pending invites */}
        {pending.length > 0 && (
          <div className="mt-5">
            <h3 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: "var(--cat-text-muted)" }}>
              {t("pending")} · {pending.length}
            </h3>
            <div className="space-y-1.5">
              {pending.map(inv => (
                <div key={inv.id}
                  className="flex items-center gap-3 p-3 rounded-xl border"
                  style={{ background: "rgba(99,102,241,0.04)", borderColor: "rgba(99,102,241,0.2)" }}>
                  <Clock className="w-4 h-4 shrink-0" style={{ color: "#6366f1" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--cat-text)" }}>
                      {inv.invitedEmail}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                      {t("expires")} {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeInvite(inv.id)}
                    className="p-1.5 rounded-lg transition-all hover:opacity-70"
                    title={t("cancelInvite")}
                    style={{ color: "#ef4444" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite form */}
        <form onSubmit={handleInvite} className="mt-5 space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: "var(--cat-text-muted)" }}>
            {t("inviteSection")}
          </h3>
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-[1fr_1fr_auto]">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: "var(--cat-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
            />
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder={t("namePlaceholder")}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: "var(--cat-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
            />
            <button
              type="submit"
              disabled={inviteSending || !inviteEmail}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)", border: "none", cursor: inviteSending ? "wait" : "pointer" }}
            >
              {inviteSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {t("inviteButton")}
            </button>
          </div>
          {inviteError && (
            <div className="flex items-start gap-2 text-xs" style={{ color: "#ef4444" }}>
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{inviteError}</span>
            </div>
          )}
          {lastInviteLink && (
            <div className="rounded-lg p-2.5 flex items-center gap-2"
              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: "#10b981" }} />
              <code className="text-[11px] flex-1 truncate font-mono" style={{ color: "var(--cat-text)" }}>
                {lastInviteLink}
              </code>
              <button
                type="button"
                onClick={() => copyLink(lastInviteLink)}
                className="p-1 rounded-md transition-all hover:opacity-80"
                title={t("copyLink")}
                style={{ color: copied ? "#10b981" : "var(--cat-text-muted)" }}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
