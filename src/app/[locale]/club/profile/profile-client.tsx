"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Building2, Upload, Save, Trash2, Loader2, Check, AlertTriangle, Download,
} from "lucide-react";

type ClubData = {
  id: number;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  country: string | null;
  city: string | null;
  badgeUrl: string | null;
};

type Manager = {
  id: number;
  name: string | null;
  email: string;
  teamId: number | null;
  accessLevel: string;
};

type Props = {
  clubId: number;
};

export function ClubProfileClient({ clubId }: Props) {
  const t = useTranslations("clubDashboard");

  const [club, setClub] = useState<ClubData | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  // Badge upload
  const [uploading, setUploading] = useState(false);

  // Account deletion flow (GDPR Art. 17 — right to erasure)
  const [deletionExpanded, setDeletionExpanded] = useState(false);
  const [deletionConfirmText, setDeletionConfirmText] = useState("");
  const [deletionState, setDeletionState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [deletionError, setDeletionError] = useState<string | null>(null);

  // Data export (GDPR Art. 15 / 20)
  const [exportLoading, setExportLoading] = useState(false);

  async function handleExport() {
    setExportLoading(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/export`, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = `goality-club-${clubId}-${new Date().toISOString().slice(0, 10)}.json`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silently fail — the download dialog is the success signal
    } finally {
      setExportLoading(false);
    }
  }

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [clubRes, managersRes] = await Promise.all([
        fetch(`/api/clubs/${clubId}/profile`),
        fetch(`/api/clubs/${clubId}/managers`),
      ]);

      if (clubRes.ok) {
        const data: ClubData = await clubRes.json();
        setClub(data);
        setName(data.name);
        setEmail(data.contactEmail ?? "");
        setPhone(data.contactPhone ?? "");
        setCountry(data.country ?? "");
        setCity(data.city ?? "");
      }

      if (managersRes.ok) {
        const data: Manager[] = await managersRes.json();
        setManagers(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save contact info
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveState("saving");
    try {
      const res = await fetch(`/api/clubs/${clubId}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contactEmail: email, contactPhone: phone, country, city }),
      });
      if (res.ok) {
        const updated = await res.json();
        setClub(updated);
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } else {
        setSaveState("idle");
      }
    } catch {
      setSaveState("idle");
    }
  }

  async function handleRequestDeletion() {
    if (deletionConfirmText.trim() !== club?.name) {
      setDeletionError(t("dangerConfirmMismatch"));
      return;
    }
    setDeletionState("sending");
    setDeletionError(null);
    try {
      const res = await fetch("/api/auth/request-deletion", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setDeletionState("sent");
      } else {
        const data = await res.json().catch(() => ({}));
        setDeletionError(data.error ?? t("dangerGenericError"));
        setDeletionState("error");
      }
    } catch {
      setDeletionError(t("dangerGenericError"));
      setDeletionState("error");
    }
  }

  // Badge upload
  async function handleBadgeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("badge", file);
      const res = await fetch(`/api/clubs/${clubId}/badge`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setClub((prev) => (prev ? { ...prev, badgeUrl: data.badgeUrl } : prev));
      }
    } catch {
      // ignore
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--cat-text-muted)" }} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--cat-text)" }}>
          {t("profileTitle")}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--cat-text-muted)" }}>
          {t("profileDesc")}
        </p>
      </div>

      {/* ── Badge Section ── */}
      <div
        className="rounded-2xl p-6 border"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        <h2 className="text-base font-bold mb-4" style={{ color: "var(--cat-text)" }}>
          {t("badgeSection")}
        </h2>
        <div className="flex items-center gap-5">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black overflow-hidden shrink-0"
            style={{
              background: club?.badgeUrl
                ? "var(--cat-tag-bg)"
                : "linear-gradient(135deg, var(--cat-accent), var(--cat-accent)cc)",
              color: "#000",
              border: club?.badgeUrl ? "2px solid var(--cat-card-border)" : "none",
            }}
          >
            {club?.badgeUrl ? (
              <img src={club.badgeUrl} alt={club.name} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-10 h-10" />
            )}
          </div>
          <label
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80 cursor-pointer"
            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-accent)" }}
          >
            <Upload className="w-4 h-4" />
            {uploading ? "..." : club?.badgeUrl ? t("changeBadge") : t("uploadBadge")}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBadgeUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* ── Contact Info Form ── */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl p-6 border space-y-4"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        <h2 className="text-base font-bold" style={{ color: "var(--cat-text)" }}>
          {t("contactSection")}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>
              {t("nameLabel")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1"
              style={{
                background: "var(--cat-bg)",
                borderColor: "var(--cat-card-border)",
                color: "var(--cat-text)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>
              {t("emailLabel")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1"
              style={{
                background: "var(--cat-bg)",
                borderColor: "var(--cat-card-border)",
                color: "var(--cat-text)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>
              {t("phoneLabel")}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1"
              style={{
                background: "var(--cat-bg)",
                borderColor: "var(--cat-card-border)",
                color: "var(--cat-text)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>
              {t("countryLabel")}
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1"
              style={{
                background: "var(--cat-bg)",
                borderColor: "var(--cat-card-border)",
                color: "var(--cat-text)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>
              {t("cityLabel")}
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1"
              style={{
                background: "var(--cat-bg)",
                borderColor: "var(--cat-card-border)",
                color: "var(--cat-text)",
              }}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saveState === "saving"}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
            style={{
              background: saveState === "saved" ? "#10b981" : "var(--cat-accent)",
              color: "#000",
            }}
          >
            {saveState === "saving" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("saving")}
              </>
            ) : saveState === "saved" ? (
              <>
                <Check className="w-4 h-4" />
                {t("saved")}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {t("save")}
              </>
            )}
          </button>
        </div>
      </form>

      {/* ── Managers Section ── */}
      <div
        className="rounded-2xl p-6 border"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        <h2 className="text-base font-bold mb-4" style={{ color: "var(--cat-text)" }}>
          {t("managersSection")}
        </h2>

        {managers.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: "var(--cat-text-muted)" }}>
            {t("noManagers")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--cat-text-muted)" }}>
                  <th className="text-left py-2 px-3 font-medium text-xs">{t("managerName")}</th>
                  <th className="text-left py-2 px-3 font-medium text-xs">{t("managerEmail")}</th>
                  <th className="text-left py-2 px-3 font-medium text-xs">{t("managerAccess")}</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {managers.map((m) => (
                  <tr
                    key={m.id}
                    className="border-t"
                    style={{ borderColor: "var(--cat-card-border)" }}
                  >
                    <td className="py-2.5 px-3" style={{ color: "var(--cat-text)" }}>
                      {m.name ?? "—"}
                    </td>
                    <td className="py-2.5 px-3" style={{ color: "var(--cat-text-secondary)" }}>
                      {m.email}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: m.teamId ? "rgba(59,130,246,0.12)" : "rgba(16,185,129,0.12)",
                          color: m.teamId ? "#3b82f6" : "#10b981",
                        }}
                      >
                        {m.teamId ? t("managerTeam") : t("clubAdmin")}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        className="p-1 rounded hover:opacity-70 transition-opacity cursor-pointer"
                        style={{ color: "#ef4444" }}
                        title={t("removeManager")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Your data: export (GDPR Art. 15 / 20) ── */}
      <div
        className="rounded-2xl p-6 border"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(59,130,246,0.12)" }}
          >
            <Download className="w-4 h-4" style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--cat-text)" }}>
              {t("exportTitle")}
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--cat-text-muted)" }}>
              {t("exportDesc")}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exportLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
          style={{
            background: "rgba(59,130,246,0.1)",
            color: "#3B82F6",
            border: "1px solid rgba(59,130,246,0.3)",
          }}
        >
          {exportLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("exportPreparing")}
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              {t("exportButton")}
            </>
          )}
        </button>
      </div>

      {/* ── Danger zone: account deletion (GDPR Art. 17) ── */}
      <div
        className="rounded-2xl p-6 border"
        style={{
          background: "var(--cat-card-bg)",
          borderColor: "rgba(239,68,68,0.3)",
        }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(239,68,68,0.12)" }}
          >
            <AlertTriangle className="w-4 h-4" style={{ color: "#ef4444" }} />
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--cat-text)" }}>
              {t("dangerZoneTitle")}
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--cat-text-muted)" }}>
              {t("dangerZoneDesc")}
            </p>
          </div>
        </div>

        {deletionState === "sent" ? (
          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.3)",
            }}
          >
            <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#10b981" }} />
            <div>
              <p className="text-sm font-bold" style={{ color: "#10b981" }}>
                {t("dangerSentTitle")}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--cat-text-secondary)" }}>
                {t("dangerSentBody")}
              </p>
            </div>
          </div>
        ) : !deletionExpanded ? (
          <button
            type="button"
            onClick={() => setDeletionExpanded(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90 cursor-pointer"
            style={{
              background: "rgba(239,68,68,0.1)",
              color: "#ef4444",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            <Trash2 className="w-4 h-4" />
            {t("dangerDeleteButton")}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>
              {t("dangerConfirmInstruction")}{" "}
              <strong style={{ color: "var(--cat-text)" }}>{club?.name}</strong>
            </p>
            <input
              type="text"
              value={deletionConfirmText}
              onChange={(e) => {
                setDeletionConfirmText(e.target.value);
                setDeletionError(null);
              }}
              placeholder={club?.name ?? ""}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1"
              style={{
                background: "var(--cat-bg)",
                borderColor: "rgba(239,68,68,0.3)",
                color: "var(--cat-text)",
              }}
            />
            {deletionError && (
              <p className="text-xs" style={{ color: "#ef4444" }}>
                {deletionError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeletionExpanded(false);
                  setDeletionConfirmText("");
                  setDeletionError(null);
                }}
                disabled={deletionState === "sending"}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50 cursor-pointer"
                style={{
                  background: "var(--cat-tag-bg)",
                  color: "var(--cat-text)",
                  border: "1px solid var(--cat-card-border)",
                }}
              >
                {t("dangerCancel")}
              </button>
              <button
                type="button"
                onClick={handleRequestDeletion}
                disabled={
                  deletionState === "sending" ||
                  deletionConfirmText.trim() !== club?.name
                }
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40 cursor-pointer"
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                }}
              >
                {deletionState === "sending" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("dangerSending")}
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    {t("dangerConfirmButton")}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
