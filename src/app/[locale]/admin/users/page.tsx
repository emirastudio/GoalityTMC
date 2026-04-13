"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Users, Building2, Shield, ChevronDown, Search, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type OrgAdmin = {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  orgId: number | null;
  orgName: string | null;
  orgSlug: string | null;
  orgPlan: string | null;
  orgEliteSubStatus: string | null;
};

type ClubMember = {
  id: number;
  email: string;
  name: string | null;
  accessLevel: string;
  createdAt: string;
  clubId: number | null;
  clubName: string | null;
  tournamentId: number | null;
  tournamentName: string | null;
  orgId: number | null;
  orgName: string | null;
  orgSlug: string | null;
  orgPlan: string | null;
};

// ─── Plan badge ──────────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) return <span className="text-xs text-gray-400">—</span>;
  const styles: Record<string, string> = {
    elite:   "bg-yellow-100 text-yellow-800",
    pro:     "bg-blue-100 text-blue-700",
    starter: "bg-green-100 text-green-700",
    free:    "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[plan] ?? styles.free}`}>
      {plan}
    </span>
  );
}

// ─── Plan Override Modal ──────────────────────────────────────────────────────

type OverrideTarget = {
  entityType: "organization";
  entityId: number;
  entityName: string;
  currentPlan: string;
};

const PLANS = ["free", "starter", "pro", "elite"] as const;

function PlanOverrideModal({
  target,
  onClose,
  onSuccess,
}: {
  target: OverrideTarget;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useTranslations("superAdmin");
  const [plan, setPlan] = useState<string>(target.currentPlan);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError(t("overrideReasonRequired"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/plan-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: target.entityType,
          entityId: target.entityId,
          newPlan: plan,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("overrideError"));
      } else {
        onSuccess();
        onClose();
      }
    } catch {
      setError(t("overrideNetworkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl shadow-2xl" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--cat-card-border)" }}>
          <div>
            <h3 className="font-bold text-base" style={{ color: "var(--cat-text)" }}>{t("overrideModalTitle")}</h3>
            <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-secondary)" }}>{target.entityName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: "var(--cat-text-muted)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--cat-text)" }}>
              {t("overrideCurrentPlan")}: <PlanBadge plan={target.currentPlan} />
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PLANS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlan(p)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                    plan === p
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "hover:opacity-80"
                  }`}
                  style={plan !== p ? { borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)", background: "transparent" } : {}}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--cat-text)" }}>
              {t("overrideReason")} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("overrideReasonPlaceholder")}
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none"
              style={{
                background: "var(--cat-input-bg, var(--cat-bg))",
                border: "1px solid var(--cat-card-border)",
                color: "var(--cat-text)",
              }}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm font-medium hover:opacity-80"
              style={{ border: "1px solid var(--cat-card-border)", color: "var(--cat-text-secondary)" }}
            >
              {t("overrideCancel")}
            </button>
            <button
              type="submit"
              disabled={loading || plan === target.currentPlan}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: "var(--cat-accent, #1e3a5f)" }}
            >
              {loading ? t("overrideSaving") : t("overrideApply")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const t = useTranslations("superAdmin");
  const [orgAdmins, setOrgAdmins] = useState<OrgAdmin[]>([]);
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"admins" | "clubs">("admins");
  const [search, setSearch] = useState("");
  const [overrideTarget, setOverrideTarget] = useState<OverrideTarget | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setOrgAdmins(data.orgAdmins ?? []);
      setClubMembers(data.clubMembers ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const filteredAdmins = orgAdmins.filter((u) =>
    [u.email, u.name, u.orgName].some((s) => s?.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredClubs = clubMembers.filter((u) =>
    [u.email, u.name, u.clubName, u.tournamentName, u.orgName].some((s) =>
      s?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--cat-text)" }}>{t("users")}</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-secondary)" }}>
            {t("usersSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--cat-text-muted)" }}>
          <Shield className="w-4 h-4" />
          <span>{orgAdmins.length} {t("orgAdmins")}</span>
          <span>·</span>
          <Users className="w-4 h-4" />
          <span>{clubMembers.length} {t("clubUsers")}</span>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex rounded-xl p-1 gap-1" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
          <button
            onClick={() => setTab("admins")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "admins" ? "text-white" : "hover:opacity-80"}`}
            style={tab === "admins" ? { background: "var(--cat-accent, #1e3a5f)" } : { color: "var(--cat-text-secondary)" }}
          >
            <Shield className="w-4 h-4" />
            {t("orgAdmins")}
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${tab === "admins" ? "bg-white/20" : "bg-gray-200 text-gray-600"}`}>
              {orgAdmins.length}
            </span>
          </button>
          <button
            onClick={() => setTab("clubs")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "clubs" ? "text-white" : "hover:opacity-80"}`}
            style={tab === "clubs" ? { background: "var(--cat-accent, #1e3a5f)" } : { color: "var(--cat-text-secondary)" }}
          >
            <Users className="w-4 h-4" />
            {t("clubUsers")}
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${tab === "clubs" ? "bg-white/20" : "bg-gray-200 text-gray-600"}`}>
              {clubMembers.length}
            </span>
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--cat-text-muted)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9 pr-4 py-2 rounded-lg text-sm w-72 outline-none"
            style={{
              background: "var(--cat-card-bg)",
              border: "1px solid var(--cat-card-border)",
              color: "var(--cat-text)",
            }}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20" style={{ color: "var(--cat-text-muted)" }}>
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto opacity-40" />
            <p className="text-sm">{t("loading")}</p>
          </div>
        </div>
      ) : tab === "admins" ? (
        /* ── Org Admins Table ────────────────────────────── */
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--cat-card-border)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--cat-card-bg)", borderBottom: "1px solid var(--cat-card-border)" }}>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>{t("colUser")}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>{t("colOrganization")}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>{t("colRole")}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>{t("colPlan")}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>{t("colRegistered")}</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>{t("colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm" style={{ color: "var(--cat-text-muted)" }}>
                    {t("noResults")}
                  </td>
                </tr>
              ) : filteredAdmins.map((u, i) => (
                <tr
                  key={u.id}
                  className="hover:opacity-90 transition-opacity"
                  style={{
                    background: i % 2 === 0 ? "var(--cat-bg)" : "var(--cat-card-bg)",
                    borderBottom: "1px solid var(--cat-card-border)",
                  }}
                >
                  <td className="px-5 py-3">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--cat-text)" }}>{u.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{u.email}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {u.orgName ? (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
                        <div>
                          <p className="text-sm" style={{ color: "var(--cat-text)" }}>{u.orgName}</p>
                          <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>/{u.orgSlug}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("global")}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.role === "super_admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {u.role === "super_admin" ? "Super Admin" : "Admin"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <PlanBadge plan={u.orgPlan} />
                  </td>
                  <td className="px-5 py-3 text-sm" style={{ color: "var(--cat-text-secondary)" }}>
                    {new Date(u.createdAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {u.orgId && (
                      <button
                        onClick={() => setOverrideTarget({
                          entityType: "organization",
                          entityId: u.orgId!,
                          entityName: u.orgName!,
                          currentPlan: u.orgPlan ?? "free",
                        })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                        style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)", color: "var(--cat-text)" }}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                        {t("changePlan")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Club Members Table ──────────────────────────── */
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--cat-card-border)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--cat-card-bg)", borderBottom: "1px solid var(--cat-card-border)" }}>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>{t("colUser")}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>{t("colClubTournament")}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>{t("colOrganization")}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>{t("colLevel")}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>{t("colOrgPlan")}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>{t("colRegistered")}</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>{t("colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredClubs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm" style={{ color: "var(--cat-text-muted)" }}>
                    {t("noResults")}
                  </td>
                </tr>
              ) : filteredClubs.map((u, i) => (
                <tr
                  key={u.id}
                  className="hover:opacity-90 transition-opacity"
                  style={{
                    background: i % 2 === 0 ? "var(--cat-bg)" : "var(--cat-card-bg)",
                    borderBottom: "1px solid var(--cat-card-border)",
                  }}
                >
                  <td className="px-5 py-3">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--cat-text)" }}>{u.name || "—"}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{u.email}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--cat-text)" }}>{u.clubName ?? "—"}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{u.tournamentName ?? ""}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {u.orgName ? (
                      <div>
                        <p className="text-sm" style={{ color: "var(--cat-text)" }}>{u.orgName}</p>
                        <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>/{u.orgSlug}</p>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.accessLevel === "write" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {u.accessLevel}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <PlanBadge plan={u.orgPlan} />
                  </td>
                  <td className="px-5 py-3 text-sm" style={{ color: "var(--cat-text-secondary)" }}>
                    {new Date(u.createdAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {u.orgId && (
                      <button
                        onClick={() => setOverrideTarget({
                          entityType: "organization",
                          entityId: u.orgId!,
                          entityName: u.orgName!,
                          currentPlan: u.orgPlan ?? "free",
                        })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                        style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)", color: "var(--cat-text)" }}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                        {t("changePlan")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Plan Override Modal */}
      {overrideTarget && (
        <PlanOverrideModal
          target={overrideTarget}
          onClose={() => setOverrideTarget(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
