"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CountrySelect } from "@/components/ui/country-select";
import { CityInput } from "@/components/ui/city-input";
import { Save, CheckCircle2, AlertCircle } from "lucide-react";

type FormData = {
  name: string;
  description: string;
  website: string;
  startDate: string;
  endDate: string;
  country: string;
  city: string;
  regulations: string;
  formats: string;
  divisions: string;
  pricing: string;
  contactEmail: string;
  contactPhone: string;
};

const EMPTY: FormData = {
  name: "", description: "", website: "",
  startDate: "", endDate: "", country: "", city: "",
  regulations: "", formats: "", divisions: "", pricing: "",
  contactEmail: "", contactPhone: "",
};

export default function ListingEditPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const t = useTranslations("adminListing");

  const [form, setForm] = useState<FormData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    fetch(`/api/org/${orgSlug}/listing`)
      .then((r) => r.json())
      .then((data) => {
        if (data.listing) {
          const l = data.listing;
          setForm({
            name:         l.name          ?? "",
            description:  l.description   ?? "",
            website:      l.website        ?? "",
            startDate:    l.startDate      ?? "",
            endDate:      l.endDate        ?? "",
            country:      l.country        ?? "",
            city:         l.city           ?? "",
            regulations:  l.regulations    ?? "",
            formats:      l.formats        ?? "",
            divisions:    l.divisions      ?? "",
            pricing:      l.pricing        ?? "",
            contactEmail: l.contactEmail   ?? "",
            contactPhone: l.contactPhone   ?? "",
          });
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [orgSlug]);

  function set(key: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      showToast("error", t("nameRequired"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/org/${orgSlug}/listing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      showToast("success", t("savedSuccessfully"));
    } catch (e: unknown) {
      showToast("error", e instanceof Error ? e.message : "Error saving");
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
    <div className="max-w-2xl space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--cat-text)" }}>{t("editInfoTitle")}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--cat-text-secondary)" }}>
            {t("editInfoDesc")}
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

      {/* Section 1: Basic Info */}
      <div style={cardStyle}>
        <h2 className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: "var(--cat-accent)" }}>
          {t("basicInfoSection")}
        </h2>
        <div className="space-y-4">
          <div>
            <label style={labelStyle}>{t("tournamentNameLabel")}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. International Youth Cup 2025"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{t("descriptionLabel2")}</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder="Tell teams about your tournament..."
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
          <div>
            <label style={labelStyle}>{t("websiteLabel2")}</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://yourtournament.com"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Dates & Location */}
      <div style={cardStyle}>
        <h2 className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: "var(--cat-accent)" }}>
          {t("datesLocationSection")}
        </h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label style={labelStyle}>{t("startDateLabel")}</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{t("endDateLabel")}</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => set("endDate", e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>{t("countryLabel2")}</label>
            <CountrySelect
              value={form.country}
              onChange={(v) => set("country", v)}
            />
          </div>
          <div>
            <label style={labelStyle}>{t("cityLabel2")}</label>
            <CityInput
              value={form.city}
              country={form.country}
              onChange={(v) => set("city", v)}
            />
          </div>
        </div>
      </div>

      {/* Section 3: Tournament Details */}
      <div style={cardStyle}>
        <h2 className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: "var(--cat-accent)" }}>
          {t("tournamentDetailsSection")}
        </h2>
        <div className="space-y-4">
          <div>
            <label style={labelStyle}>{t("regulationsLabel")}</label>
            <textarea
              value={form.regulations}
              onChange={(e) => set("regulations", e.target.value)}
              rows={4}
              placeholder="Tournament rules and regulations (markdown supported)"
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
          <div>
            <label style={labelStyle}>{t("formatsLabel")}</label>
            <textarea
              value={form.formats}
              onChange={(e) => set("formats", e.target.value)}
              rows={3}
              placeholder="e.g. Group stage + Knockout, 7v7, 11v11"
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
          <div>
            <label style={labelStyle}>{t("divisionsLabel")}</label>
            <textarea
              value={form.divisions}
              onChange={(e) => set("divisions", e.target.value)}
              rows={3}
              placeholder="e.g. U8 Boys, U10 Girls, U12 Mixed"
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
          <div>
            <label style={labelStyle}>{t("pricingLabel")}</label>
            <textarea
              value={form.pricing}
              onChange={(e) => set("pricing", e.target.value)}
              rows={3}
              placeholder="e.g. €150 per team, includes 3 meals"
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
        </div>
      </div>

      {/* Section 4: Contact */}
      <div style={cardStyle}>
        <h2 className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: "var(--cat-accent)" }}>
          {t("contactSection2")}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>{t("contactEmailLabel")}</label>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => set("contactEmail", e.target.value)}
              placeholder="info@tournament.com"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{t("contactPhonelLabel")}</label>
            <input
              type="tel"
              value={form.contactPhone}
              onChange={(e) => set("contactPhone", e.target.value)}
              placeholder="+372 5000 0000"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Bottom save */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl px-6 py-3 font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--cat-accent)", color: "#0A0E14" }}
        >
          <Save className="w-4 h-4" />
          {saving ? t("saving") : t("saveChanges")}
        </button>
      </div>
    </div>
  );
}
