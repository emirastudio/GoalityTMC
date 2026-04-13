"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Building2, Upload, Save, Trash2, Loader2, Check,
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
    </div>
  );
}
