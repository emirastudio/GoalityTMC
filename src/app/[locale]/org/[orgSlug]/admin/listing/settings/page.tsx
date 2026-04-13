"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Upload, Trash2, Plus, X, Save, CheckCircle2, AlertCircle } from "lucide-react";

type AgeGroup = {
  name: string;
  gender: "boys" | "girls" | "mixed";
};

export default function ListingSettingsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const t = useTranslations("adminListing");

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deletingLogo, setDeletingLogo] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/org/${orgSlug}/listing`)
      .then((r) => r.json())
      .then((data) => {
        if (data.listing) {
          setLogoUrl(data.listing.logoUrl ?? null);
          setName(data.listing.name ?? "");
          try {
            setAgeGroups(JSON.parse(data.listing.ageGroups ?? "[]"));
          } catch {
            setAgeGroups([]);
          }
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [orgSlug]);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/org/${orgSlug}/listing/logo`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setLogoUrl(data.logoUrl);
      showToast("success", t("logoUploaded"));
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Upload error");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function handleLogoDelete() {
    setDeletingLogo(true);
    try {
      const res = await fetch(`/api/org/${orgSlug}/listing/logo`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete logo");
      setLogoUrl(null);
      showToast("success", t("logoRemoved"));
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Delete error");
    } finally {
      setDeletingLogo(false);
    }
  }

  function addAgeGroup() {
    setAgeGroups((prev) => [...prev, { name: "", gender: "mixed" }]);
  }

  function removeAgeGroup(idx: number) {
    setAgeGroups((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateAgeGroup(idx: number, field: keyof AgeGroup, value: string) {
    setAgeGroups((prev) =>
      prev.map((ag, i) => (i === idx ? { ...ag, [field]: value } : ag))
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      showToast("error", t("nameRequired"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/org/${orgSlug}/listing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ageGroups: JSON.stringify(ageGroups),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      showToast("success", t("settingsSaved"));
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Save error");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--cat-input-bg, var(--cat-tag-bg))",
    border: "1px solid var(--cat-input-border, var(--cat-card-border))",
    color: "var(--cat-text)",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 14,
    width: "100%",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--cat-text-secondary)",
    marginBottom: 6,
    display: "block",
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--cat-card-bg)",
    border: "1px solid var(--cat-card-border)",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  };

  if (loading) {
    return <div className="text-sm" style={{ color: "var(--cat-text-secondary)" }}>{t("loading")}</div>;
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--cat-text)" }}>{t("settingsTitle")}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--cat-text-secondary)" }}>
            {t("settingsDesc")}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--cat-accent)", color: "#0A0E14" }}
        >
          <Save className="w-4 h-4" />
          {saving ? t("saving") : t("save")}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4 text-sm font-medium"
          style={
            toast.type === "success"
              ? { background: "rgba(43,254,186,0.1)", border: "1px solid rgba(43,254,186,0.3)", color: "var(--cat-accent)" }
              : { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }
          }
        >
          {toast.type === "success"
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />
          }
          {toast.msg}
        </div>
      )}

      {/* Logo */}
      <div style={cardStyle}>
        <h2 className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: "var(--cat-accent)" }}>
          {t("logoSection")}
        </h2>
        <div className="flex items-center gap-4">
          {/* Logo preview */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden shrink-0"
            style={{ background: "var(--cat-tag-bg)", border: "1.5px solid var(--cat-card-border)" }}
          >
            {logoUrl
              ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              : <span className="text-3xl font-black" style={{ color: "var(--cat-text-muted)" }}>?</span>
            }
          </div>

          {/* Upload / Delete */}
          <div className="flex flex-col gap-2">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
              id="logo-upload"
            />
            <label
              htmlFor="logo-upload"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-bold text-sm cursor-pointer transition-all hover:opacity-90"
              style={{
                background: "var(--cat-accent)",
                color: "#0A0E14",
                opacity: uploadingLogo ? 0.6 : undefined,
                pointerEvents: uploadingLogo ? "none" : undefined,
              }}
            >
              <Upload className="w-4 h-4" />
              {uploadingLogo ? t("uploadingLogo") : logoUrl ? t("changeLogo") : t("uploadLogo")}
            </label>
            {logoUrl && (
              <button
                onClick={handleLogoDelete}
                disabled={deletingLogo}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-bold text-sm border transition-all hover:opacity-80 disabled:opacity-50"
                style={{ borderColor: "rgba(239,68,68,0.4)", color: "#ef4444" }}
              >
                <Trash2 className="w-4 h-4" />
                {deletingLogo ? t("removingLogo") : t("removeLogo")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tournament name */}
      <div style={cardStyle}>
        <h2 className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: "var(--cat-accent)" }}>
          {t("tournamentNameSection")}
        </h2>
        <div>
          <label style={labelStyle}>{t("tournamentNameLabel")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. International Youth Cup"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Age groups */}
      <div style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: "var(--cat-accent)" }}>
            {t("ageGroupsSection")}
          </h2>
          <button
            type="button"
            onClick={addAgeGroup}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all hover:opacity-80"
            style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)" }}
          >
            <Plus className="w-3.5 h-3.5" />
            {t("addGroup")}
          </button>
        </div>

        {ageGroups.length === 0 && (
          <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
            {t("noAgeGroups")}
          </p>
        )}

        <div className="space-y-2">
          {ageGroups.map((ag, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={ag.name}
                onChange={(e) => updateAgeGroup(idx, "name", e.target.value)}
                placeholder="e.g. U10, U12 Boys"
                style={{ ...inputStyle, flex: 1 }}
              />
              <select
                value={ag.gender}
                onChange={(e) => updateAgeGroup(idx, "gender", e.target.value)}
                style={{
                  ...inputStyle,
                  width: "auto",
                  minWidth: 100,
                  cursor: "pointer",
                }}
              >
                <option value="boys">{t("genderBoys")}</option>
                <option value="girls">{t("genderGirls")}</option>
                <option value="mixed">{t("genderMixed")}</option>
              </select>
              <button
                type="button"
                onClick={() => removeAgeGroup(idx)}
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all hover:opacity-80"
                style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl px-6 py-3 font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--cat-accent)", color: "#0A0E14" }}
        >
          <Save className="w-4 h-4" />
          {saving ? t("saving") : t("saveSettings")}
        </button>
      </div>
    </div>
  );
}
