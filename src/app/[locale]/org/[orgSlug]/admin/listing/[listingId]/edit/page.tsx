"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CountrySelect } from "@/components/ui/country-select";
import { CityInput } from "@/components/ui/city-input";
import {
  Save, CheckCircle2, AlertCircle, Plus, Trash2,
  Upload, X, Image as ImageIcon, Globe,
} from "lucide-react";

/* ─── Language config ─── */
const LANGS = [
  { code: "en", label: "EN", name: "English", flag: "🇬🇧", base: true },
  { code: "ru", label: "RU", name: "Русский", flag: "🇷🇺", base: false },
  { code: "et", label: "ET", name: "Eesti",   flag: "🇪🇪", base: false },
] as const;
type LangCode = "en" | "ru" | "et";

/* ─── Types ─── */
type AgeGroup = {
  name: string;
  gender: string;
  minBirthYear: number;
  maxBirthYear: number;
};

/** Translatable text content — per language */
type LangFields = {
  name: string;
  description: string;
  regulations: string;
  pricing: string;
  prizeInfo: string;
};

/** Non-translatable (shared across all languages) */
type BaseFields = {
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  country: string;
  city: string;
  venue: string;
  level: string;
  formats: string[];
  ageGroups: AgeGroup[];
  contactEmail: string;
  contactPhone: string;
  website: string;
  instagram: string;
  facebook: string;
};

const FORMAT_OPTIONS = ["4x4", "5x5", "6x6", "7x7", "8x8", "9x9", "10x10", "11x11"];
const LEVEL_OPTIONS  = ["Local", "Regional", "National", "International"];
const GENDER_OPTIONS = [
  { value: "M",     label: "Boys"  },
  { value: "F",     label: "Girls" },
  { value: "Mixed", label: "Mixed" },
];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 20 }, (_, i) => CURRENT_YEAR - 5 - i);
const LEVEL_COLORS: Record<string, string> = {
  Local: "#94A3B8", Regional: "#60A5FA", National: "#34D399", International: "#FBBF24",
};

function emptyLang(): LangFields {
  return { name: "", description: "", regulations: "", pricing: "", prizeInfo: "" };
}
function emptyBase(): BaseFields {
  return {
    startDate: "", endDate: "", registrationDeadline: "", country: "", city: "",
    venue: "", level: "", formats: [], ageGroups: [],
    contactEmail: "", contactPhone: "", website: "", instagram: "", facebook: "",
  };
}
function newAgeGroup(): AgeGroup {
  return { name: "", gender: "M", minBirthYear: CURRENT_YEAR - 12, maxBirthYear: CURRENT_YEAR - 12 };
}
function parseFormats(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((f): f is string => typeof f === "string");
  if (typeof raw === "string" && raw.startsWith("[")) { try { return JSON.parse(raw); } catch { /**/ } }
  return [];
}
function parseAgeGroups(raw: unknown): AgeGroup[] {
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return [];
    return arr.map((g: Record<string, unknown>) => ({
      name:         String(g.name ?? ""),
      gender:       String(g.gender ?? "M"),
      minBirthYear: Number(g.minBirthYear ?? CURRENT_YEAR - 12),
      maxBirthYear: Number(g.maxBirthYear ?? g.minBirthYear ?? CURRENT_YEAR - 12),
    }));
  } catch { return []; }
}

/* ─── Media upload zone ─── */
function MediaUpload({ label, hint, currentUrl, onUpload, onDelete, uploading, aspect = "card" }: {
  label: string; hint: string; currentUrl: string | null;
  onUpload: (f: File) => void; onDelete: () => void;
  uploading: boolean; aspect?: "square" | "card";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cls = aspect === "square" ? "w-24 h-24" : "w-full h-28";
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--cat-text-secondary)" }}>{label}</p>
      <div className={`relative ${cls} rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-all`}
        style={{ borderColor: currentUrl ? "transparent" : "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}
        onClick={() => inputRef.current?.click()}>
        {currentUrl ? (
          <>
            <img src={currentUrl} alt="" className="absolute inset-0 w-full h-full object-cover rounded-xl" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center z-10 hover:bg-red-500 transition-colors"
              style={{ background: "rgba(0,0,0,0.6)" }}>
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 p-3 text-center">
            {uploading
              ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: "var(--cat-text-muted)" }} />
              : <ImageIcon className="w-5 h-5" style={{ color: "var(--cat-text-muted)" }} />
            }
            <span className="text-[10px] leading-tight" style={{ color: "var(--cat-text-muted)" }}>{hint}</span>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) { onUpload(f); e.target.value = ""; } }} />
    </div>
  );
}

/* ─── Card section wrapper ─── */
function Card({ title, accent, children }: { title: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      <div className="px-5 py-3 border-b" style={{ borderColor: "var(--cat-card-border)", background: accent ? "rgba(43,254,186,0.03)" : undefined }}>
        <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: accent ? "var(--cat-accent)" : "var(--cat-text-secondary)" }}>{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ─── Main page ─── */
export default function ListingEditPage() {
  const params   = useParams();
  const orgSlug  = params.orgSlug as string;
  const listingId = params.listingId as string;
  const t = useTranslations("adminListing");

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [activeLang, setActiveLang] = useState<LangCode>("en");

  // Translatable content per language
  const [translations, setTranslations] = useState<Record<LangCode, LangFields>>({
    en: emptyLang(), ru: emptyLang(), et: emptyLang(),
  });

  // Shared (non-translatable) fields
  const [base, setBase] = useState<BaseFields>(emptyBase());

  // Media
  const [logoUrl,      setLogoUrl]      = useState<string | null>(null);
  const [coverUrl,     setCoverUrl]     = useState<string | null>(null);
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [uploadingLogo,  setUploadingLogo]  = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingCard,  setUploadingCard]  = useState(false);

  /* ── Load listing ── */
  useEffect(() => {
    fetch(`/api/org/${orgSlug}/listing/${listingId}`)
      .then(r => r.json())
      .then(({ listing: l }) => {
        if (!l) return;
        // Load base (non-translatable) fields
        setBase({
          startDate:            l.startDate            ?? "",
          endDate:              l.endDate              ?? "",
          registrationDeadline: l.registrationDeadline ?? "",
          country:              l.country              ?? "",
          city:                 l.city                 ?? "",
          venue:                l.venue                ?? "",
          level:                l.level                ?? "",
          formats:              parseFormats(l.formats),
          ageGroups:            parseAgeGroups(l.ageGroups),
          contactEmail:         l.contactEmail         ?? "",
          contactPhone:         l.contactPhone         ?? "",
          website:              l.website              ?? "",
          instagram:            l.instagram            ?? "",
          facebook:             l.facebook             ?? "",
        });
        // Load media
        setLogoUrl(l.logoUrl ?? null);
        setCoverUrl(l.coverUrl ?? null);
        setCardImageUrl(l.cardImageUrl ?? null);
        // Load English content from main columns
        const enFields: LangFields = {
          name:        l.name        ?? "",
          description: l.description ?? "",
          regulations: l.regulations ?? "",
          pricing:     l.pricing     ?? "",
          prizeInfo:   l.prizeInfo   ?? "",
        };
        // Load other languages from translations column
        const stored: Record<string, Partial<LangFields>> =
          typeof l.translations === "object" && l.translations ? l.translations : {};
        setTranslations({
          en: enFields,
          ru: { ...emptyLang(), ...(stored.ru ?? {}) },
          et: { ...emptyLang(), ...(stored.et ?? {}) },
        });
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [orgSlug, listingId]);

  /* ── Helpers ── */
  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }
  function setLangField(field: keyof LangFields, value: string) {
    setTranslations(prev => ({ ...prev, [activeLang]: { ...prev[activeLang], [field]: value } }));
  }
  function setBaseField<K extends keyof BaseFields>(key: K, value: BaseFields[K]) {
    setBase(prev => ({ ...prev, [key]: value }));
  }
  function toggleFormat(fmt: string) {
    setBase(prev => ({
      ...prev,
      formats: prev.formats.includes(fmt) ? prev.formats.filter(f => f !== fmt) : [...prev.formats, fmt],
    }));
  }
  function addAgeGroup() {
    setBase(prev => ({ ...prev, ageGroups: [...prev.ageGroups, newAgeGroup()] }));
  }
  function removeAgeGroup(idx: number) {
    setBase(prev => ({ ...prev, ageGroups: prev.ageGroups.filter((_, i) => i !== idx) }));
  }
  function updateAgeGroup(idx: number, field: keyof AgeGroup, value: string | number) {
    setBase(prev => ({
      ...prev,
      ageGroups: prev.ageGroups.map((ag, i) => i === idx ? { ...ag, [field]: value } : ag),
    }));
  }

  /* ── Save ── */
  async function handleSave() {
    if (!translations.en.name.trim()) { showToast("error", "Tournament name (English) is required"); return; }
    setSaving(true);
    try {
      // English content → main columns; all languages → translations column
      const { en: enFields, ...otherLangs } = translations;
      const payload = {
        ...base,
        ...enFields,                             // name, description, etc. → main columns
        formats: JSON.stringify(base.formats),
        ageGroups: JSON.stringify(base.ageGroups),
        translations: otherLangs,                // { ru: {...}, et: {...} }
        registrationDeadline: base.registrationDeadline || null,
        venue:     base.venue     || null,
        level:     base.level     || null,
        instagram: base.instagram || null,
        facebook:  base.facebook  || null,
        prizeInfo: enFields.prizeInfo || null,
      };
      const res = await fetch(`/api/org/${orgSlug}/listing/${listingId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      showToast("success", "Saved");
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  /* ── Media upload helpers ── */
  async function uploadMedia(file: File, endpoint: string, setUrl: (u: string | null) => void, setBusy: (b: boolean) => void) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/org/${orgSlug}/listing/${listingId}/${endpoint}`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setUrl(data.logoUrl ?? data.coverUrl ?? data.cardImageUrl ?? null);
    } catch (e) { showToast("error", e instanceof Error ? e.message : "Upload failed"); }
    finally { setBusy(false); }
  }
  async function deleteMedia(endpoint: string, setUrl: (u: string | null) => void) {
    try { await fetch(`/api/org/${orgSlug}/listing/${listingId}/${endpoint}`, { method: "DELETE" }); setUrl(null); }
    catch { showToast("error", "Delete failed"); }
  }

  /* ── Styles ── */
  const inp: React.CSSProperties = {
    background: "var(--cat-input-bg, var(--cat-tag-bg))",
    border: "1px solid var(--cat-input-border, var(--cat-card-border))",
    color: "var(--cat-text)", borderRadius: 12, padding: "10px 14px", fontSize: 14, width: "100%", outline: "none",
  };
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
    color: "var(--cat-text-secondary)", marginBottom: 6, display: "block",
  };

  if (loading) return <div className="text-sm" style={{ color: "var(--cat-text-secondary)" }}>{t("loading")}</div>;

  const currentLang = translations[activeLang];
  const enFallback  = (field: keyof LangFields) => translations.en[field];
  const isNonEn     = activeLang !== "en";

  return (
    <div className="max-w-2xl pb-8">
      {/* Back */}
      <div className="mb-4">
        <Link href={`/org/${orgSlug}/admin/listing/${listingId}`} className="text-sm hover:underline" style={{ color: "var(--cat-text-secondary)" }}>
          {t("editBack")}
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--cat-text)" }}>{t("editTitle")}</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-secondary)" }}>{t("editDesc")}</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--cat-accent)", color: "#0A0E14" }}>
          <Save className="w-4 h-4" />{saving ? t("saving") : t("save")}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4 text-sm font-medium"
          style={toast.type === "success"
            ? { background: "rgba(43,254,186,0.1)", border: "1px solid rgba(43,254,186,0.3)", color: "var(--cat-accent)" }
            : { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }
          }>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* ══ LANGUAGE SWITCHER ══ */}
      <div className="rounded-2xl border p-4 mb-4"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--cat-text-secondary)" }}>
              {t("contentLanguage")}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {LANGS.map(({ code, label, name, flag, base: isBase }) => {
              const active = activeLang === code;
              // Check if this language has any filled content
              const filled = code === "en"
                ? !!translations.en.name
                : Object.values(translations[code as LangCode]).some(v => v.trim());
              return (
                <button key={code} type="button" onClick={() => setActiveLang(code as LangCode)}
                  title={name}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border"
                  style={active
                    ? { background: "var(--cat-accent)", color: "#0A0E14", borderColor: "var(--cat-accent)" }
                    : { background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)", borderColor: "var(--cat-card-border)" }
                  }>
                  <span>{flag}</span>
                  <span>{label}</span>
                  {isBase && <span className="text-[9px] opacity-60">base</span>}
                  {!isBase && filled && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? "#0A0E14" : "var(--cat-accent)" }} />
                  )}
                </button>
              );
            })}
          </div>
          {isNonEn && (
            <p className="text-[11px] w-full mt-1" style={{ color: "var(--cat-text-muted)" }}>
              🇬🇧 {t("fallbackNote")}
            </p>
          )}
        </div>
      </div>

      {/* ══ MEDIA (not translatable) ══ */}
      <Card title={t("mediaSection")}>
        <div className="grid grid-cols-3 gap-5 mb-3">
          <MediaUpload label={t("logoLabel")} hint={t("logoHint")} currentUrl={logoUrl} aspect="square"
            onUpload={f => uploadMedia(f, "logo", setLogoUrl, setUploadingLogo)}
            onDelete={() => deleteMedia("logo", setLogoUrl)}
            uploading={uploadingLogo} />
          <MediaUpload label={t("coverLabel")} hint={t("coverHint")} currentUrl={coverUrl}
            onUpload={f => uploadMedia(f, "cover", setCoverUrl, setUploadingCover)}
            onDelete={() => deleteMedia("cover", setCoverUrl)}
            uploading={uploadingCover} />
          <MediaUpload label={t("cardLabel")} hint={t("cardHint")} currentUrl={cardImageUrl}
            onUpload={f => uploadMedia(f, "card-image", setCardImageUrl, setUploadingCard)}
            onDelete={() => deleteMedia("card-image", setCardImageUrl)}
            uploading={uploadingCard} />
        </div>
        <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
          {t("mediaNote")}
        </p>
      </Card>

      {/* ══ BASIC INFO (translatable) ══ */}
      <div className="mt-4">
        <Card title={`Basic info · ${LANGS.find(l => l.code === activeLang)?.flag} ${LANGS.find(l => l.code === activeLang)?.name}`} accent>
          <div className="space-y-4">
            <div>
              <label style={lbl}>
                {t("nameLabel")}{activeLang === "en" && " *"}
              </label>
              <input type="text" value={currentLang.name}
                onChange={e => setLangField("name", e.target.value)}
                placeholder={isNonEn ? (enFallback("name") || t("descFallback")) : t("namePlaceholder")}
                style={{ ...inp, ...(isNonEn && !currentLang.name ? { color: "var(--cat-text-muted)" } : {}) }}
              />
              {isNonEn && enFallback("name") && !currentLang.name && (
                <p className="text-[11px] mt-1" style={{ color: "var(--cat-text-muted)" }}>
                  🇬🇧 {t("fallbackTo")} &ldquo;{enFallback("name")}&rdquo;
                </p>
              )}
            </div>
            <div>
              <label style={lbl}>{t("descriptionLabel")}</label>
              <textarea value={currentLang.description}
                onChange={e => setLangField("description", e.target.value)}
                rows={4}
                placeholder={isNonEn ? (enFallback("description") ? t("descTranslation") : t("descFallback")) : t("descPlaceholder")}
                style={{ ...inp, resize: "vertical" }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* ══ DATES & LOCATION (NOT translatable) ══ */}
      <div className="mt-4">
        <Card title={t("datesSection")}>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label style={lbl}>{t("startDate")}</label>
              <input type="date" value={base.startDate} onChange={e => setBaseField("startDate", e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>{t("endDate")}</label>
              <input type="date" value={base.endDate} onChange={e => setBaseField("endDate", e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>{t("registrationDeadline")}</label>
              <input type="date" value={base.registrationDeadline} onChange={e => setBaseField("registrationDeadline", e.target.value)} style={inp} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label style={lbl}>{t("countryLabel")}</label>
              <CountrySelect value={base.country} onChange={v => setBaseField("country", v)} />
            </div>
            <div>
              <label style={lbl}>{t("cityLabel")}</label>
              <CityInput value={base.city} country={base.country} onChange={v => setBaseField("city", v)} />
            </div>
          </div>
          <div>
            <label style={lbl}>{t("venueLabel")}</label>
            <input type="text" value={base.venue} onChange={e => setBaseField("venue", e.target.value)}
              placeholder={t("venuePlaceholder")} style={inp} />
          </div>
        </Card>
      </div>

      {/* ══ TOURNAMENT LEVEL (NOT translatable) ══ */}
      <div className="mt-4">
        <Card title={t("levelLabel")}>
          <div className="flex flex-wrap gap-2 mb-2">
            {LEVEL_OPTIONS.map(lvl => {
              const active = base.level === lvl;
              const c = LEVEL_COLORS[lvl];
              return (
                <button key={lvl} type="button" onClick={() => setBaseField("level", active ? "" : lvl)}
                  className="rounded-xl px-5 py-2 text-sm font-bold transition-all border"
                  style={active
                    ? { background: c + "25", color: c, borderColor: c + "60" }
                    : { background: "transparent", color: "var(--cat-text-muted)", borderColor: "var(--cat-card-border)" }
                  }>
                  {lvl}
                </button>
              );
            })}
          </div>
          <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>{t("levelHint")}</p>
        </Card>
      </div>

      {/* ══ AGE CATEGORIES (NOT translatable) ══ */}
      <div className="mt-4">
        <Card title={t("ageSection")}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm" style={{ color: "var(--cat-text-secondary)" }}>
              {base.ageGroups.length === 0 ? t("noCategories") : t("categoriesCount", { count: base.ageGroups.length })}
            </p>
            <button onClick={addAgeGroup} type="button"
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all hover:opacity-80"
              style={{ background: "rgba(43,254,186,0.12)", color: "var(--cat-accent)", border: "1px solid rgba(43,254,186,0.25)" }}>
              <Plus className="w-3.5 h-3.5" /> {t("addCategory")}
            </button>
          </div>

          {base.ageGroups.length === 0 && (
            <div className="text-center py-5 rounded-xl border border-dashed" style={{ borderColor: "var(--cat-card-border)" }}>
              <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t("categoryPlaceholder")}</p>
            </div>
          )}

          <div className="space-y-3">
            {base.ageGroups.map((ag, idx) => (
              <div key={idx} className="rounded-xl p-3 space-y-3"
                style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)" }}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <label style={{ ...lbl, marginBottom: 4 }}>{t("catName")}</label>
                    <input type="text" value={ag.name}
                      onChange={e => updateAgeGroup(idx, "name", e.target.value)}
                      placeholder={t("catNamePlaceholder")}
                      style={{ ...inp, padding: "8px 12px" }} />
                  </div>
                  <div>
                    <label style={{ ...lbl, marginBottom: 4 }}>{t("catGender")}</label>
                    <div className="flex gap-1">
                      {GENDER_OPTIONS.map(g => (
                        <button key={g.value} type="button" onClick={() => updateAgeGroup(idx, "gender", g.value)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all"
                          style={ag.gender === g.value
                            ? { background: "var(--cat-accent)", color: "#0A0E14" }
                            : { background: "var(--cat-card-bg)", color: "var(--cat-text-secondary)", border: "1px solid var(--cat-card-border)" }
                          }>{g.label}</button>
                      ))}
                    </div>
                  </div>
                  <button type="button" onClick={() => removeAgeGroup(idx)}
                    className="mt-5 p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                    style={{ color: "var(--cat-text-muted)" }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label style={{ ...lbl, marginBottom: 4 }}>{t("catBirthFrom")}</label>
                    <select value={ag.minBirthYear} onChange={e => updateAgeGroup(idx, "minBirthYear", Number(e.target.value))}
                      style={{ ...inp, padding: "8px 12px" }}>
                      {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label style={{ ...lbl, marginBottom: 4 }}>{t("catBirthTo")}</label>
                    <select value={ag.maxBirthYear} onChange={e => updateAgeGroup(idx, "maxBirthYear", Number(e.target.value))}
                      style={{ ...inp, padding: "8px 12px" }}>
                      {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label style={{ ...lbl, marginBottom: 4 }}>{t("catPreview")}</label>
                    <div className="rounded-xl px-3 py-2 text-sm font-bold"
                      style={{ background: "rgba(43,254,186,0.1)", color: "var(--cat-accent)", border: "1px solid rgba(43,254,186,0.2)" }}>
                      {ag.name || "—"}
                      <span className="ml-1.5 text-xs font-normal opacity-70">
                        {ag.minBirthYear === ag.maxBirthYear ? ag.minBirthYear : `${ag.minBirthYear}–${ag.maxBirthYear}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ══ FORMAT (NOT translatable) ══ */}
      <div className="mt-4">
        <Card title={t("formatSection")}>
          <div className="flex flex-wrap gap-2 mb-2">
            {FORMAT_OPTIONS.map(fmt => {
              const active = base.formats.includes(fmt);
              return (
                <button key={fmt} type="button" onClick={() => toggleFormat(fmt)}
                  className="rounded-xl px-4 py-2 text-sm font-bold transition-all border"
                  style={active
                    ? { background: "var(--cat-accent)", color: "#0A0E14", borderColor: "var(--cat-accent)" }
                    : { background: "transparent", color: "var(--cat-text-secondary)", borderColor: "var(--cat-card-border)" }
                  }>{fmt}</button>
              );
            })}
          </div>
          {base.formats.length > 0 && (
            <p className="text-xs" style={{ color: "var(--cat-text-secondary)" }}>{t("formatSelected")} {base.formats.join(", ")}</p>
          )}
        </Card>
      </div>

      {/* ══ FEES, PRIZES, REGULATIONS (translatable) ══ */}
      <div className="mt-4">
        <Card title={`${t("feesSection")} · ${LANGS.find(l => l.code === activeLang)?.flag} ${LANGS.find(l => l.code === activeLang)?.name}`} accent>
          <div className="space-y-4">
            <div>
              <label style={lbl}>{t("feesLabel")}</label>
              <textarea value={currentLang.pricing}
                onChange={e => setLangField("pricing", e.target.value)} rows={3}
                placeholder={isNonEn && enFallback("pricing") ? `${t("descTranslation")} — ${t("descFallback")}` : t("feesPlaceholder")}
                style={{ ...inp, resize: "vertical" }} />
            </div>
            <div>
              <label style={lbl}>{t("prizesLabel")}</label>
              <textarea value={currentLang.prizeInfo}
                onChange={e => setLangField("prizeInfo", e.target.value)} rows={3}
                placeholder={isNonEn && enFallback("prizeInfo") ? t("descTranslation") : t("prizesPlaceholder")}
                style={{ ...inp, resize: "vertical" }} />
            </div>
            <div>
              <label style={lbl}>{t("regsLabel")}</label>
              <textarea value={currentLang.regulations}
                onChange={e => setLangField("regulations", e.target.value)} rows={4}
                placeholder={isNonEn && enFallback("regulations") ? `${t("descTranslation")} — ${t("descFallback")}` : t("regsPlaceholder")}
                style={{ ...inp, resize: "vertical" }} />
            </div>
          </div>
        </Card>
      </div>

      {/* ══ CONTACT (NOT translatable) ══ */}
      <div className="mt-4">
        <Card title={t("contactSection")}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label style={lbl}>{t("emailLabel")}</label>
              <input type="email" value={base.contactEmail} onChange={e => setBaseField("contactEmail", e.target.value)}
                placeholder={t("emailPlaceholder")} style={inp} />
            </div>
            <div>
              <label style={lbl}>{t("phoneLabel")}</label>
              <input type="tel" value={base.contactPhone} onChange={e => setBaseField("contactPhone", e.target.value)}
                placeholder={t("phonePlaceholder")} style={inp} />
            </div>
          </div>
          <div>
            <label style={lbl}>{t("websiteLabel")}</label>
            <input type="url" value={base.website} onChange={e => setBaseField("website", e.target.value)}
              placeholder={t("websitePlaceholder")} style={inp} />
          </div>
        </Card>
      </div>

      {/* ══ SOCIAL (NOT translatable) ══ */}
      <div className="mt-4">
        <Card title={t("socialSection")}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={lbl}>{t("instagramLabel")}</label>
              <input type="text" value={base.instagram} onChange={e => setBaseField("instagram", e.target.value)}
                placeholder={t("instagramPlaceholder")} style={inp} />
            </div>
            <div>
              <label style={lbl}>{t("facebookLabel")}</label>
              <input type="text" value={base.facebook} onChange={e => setBaseField("facebook", e.target.value)}
                placeholder={t("facebookPlaceholder")} style={inp} />
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom save */}
      <div className="flex justify-end pt-5">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 rounded-xl px-6 py-3 font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--cat-accent)", color: "#0A0E14" }}>
          <Save className="w-4 h-4" />{saving ? t("saving") : t("saveChanges")}
        </button>
      </div>
    </div>
  );
}
