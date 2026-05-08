"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Globe, Image as ImageIcon, Loader2, Save, Check } from "lucide-react";
import { CountrySelect } from "@/components/ui/country-select";
import { CityInput } from "@/components/ui/city-input";
import { ImageCropperModal } from "@/components/admin/image-cropper-modal";

const ACCENT = "#2BFEBA";

/**
 * The unique fields from the legacy `/settings` page that have no equivalent
 * in the main `/setup` wizard:
 *
 *  - Location (country + city)
 *  - Catalog image (different aspect ratio than cover; used in /catalog cards)
 *
 * Embedded near the bottom of the unified `/setup` page (just above the
 * existing Danger Zone) so admins have ONE place for everything tournament-
 * related. Talks to `/api/org/.../settings` just like the old page did.
 */
export function TournamentExtraSettingsBlock({
  orgSlug, tournamentId,
}: {
  orgSlug: string;
  tournamentId: number;
}) {
  const t = useTranslations("orgAdmin");
  const apiBase = `/api/org/${orgSlug}/tournament/${tournamentId}`;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [cardImageUrl, setCardImage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgSlug || !tournamentId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/settings`);
      if (!res.ok) throw new Error("Failed to load");
      const d = await res.json();
      setCountry(d.country ?? "");
      setCity(d.city ?? "");
      setCardImage(d.cardImageUrl ?? null);
    } catch {
      setError(t("extraSettingsLoadError"));
    } finally {
      setLoading(false);
    }
  }, [orgSlug, tournamentId, apiBase, t]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: country || null,
          city: city || null,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError(t("extraSettingsSaveError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border p-8 flex items-center justify-center"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Location */}
      <div className="rounded-2xl border p-5"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(139,92,246,0.12)" }}>
            <Globe className="w-4.5 h-4.5" style={{ color: "#8b5cf6" }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black" style={{ color: "var(--cat-text)" }}>{t("locationSection")}</p>
            <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("locationSectionHint")}</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all disabled:opacity-60"
            style={{ background: ACCENT, color: "#000" }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? t("saving") : saved ? t("saved") : t("save")}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--cat-text-muted)" }}>
              {t("country")}
            </label>
            <CountrySelect value={country} onChange={setCountry} placeholder={t("countryPlaceholder")} variant="default" />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--cat-text-muted)" }}>
              {t("city")}
            </label>
            <CityInput value={city} onChange={setCity} country={country} placeholder={t("cityPlaceholder")} variant="default" />
          </div>
        </div>
        {error && <p className="text-xs mt-3" style={{ color: "#ef4444" }}>{error}</p>}
      </div>

      {/* Catalog image */}
      <div className="rounded-2xl border p-5"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(236,72,153,0.12)" }}>
            <ImageIcon className="w-4.5 h-4.5" style={{ color: "#ec4899" }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black" style={{ color: "var(--cat-text)" }}>{t("catalogImageSection")}</p>
            <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("catalogImageHint")}</p>
          </div>
        </div>
        <CatalogImageUpload
          url={cardImageUrl}
          endpoint={`${apiBase}/card-image`}
          onUploaded={setCardImage}
        />
      </div>
    </div>
  );
}

// ─── Catalog image uploader (copy of the inline component from settings) ──────

function CatalogImageUpload({
  url, endpoint, onUploaded,
}: {
  url: string | null;
  endpoint: string;
  onUploaded: (newUrl: string) => void;
}) {
  const t = useTranslations("orgAdmin");
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  async function uploadBlob(blob: Blob, filename = "upload.jpg") {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, filename);
      const res = await fetch(endpoint, { method: "POST", body: fd });
      if (res.ok) {
        const d = await res.json();
        onUploaded(d.url ?? d.cardImageUrl ?? "");
      }
    } finally { setUploading(false); }
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => setCropSrc((e.target?.result as string) ?? null);
    reader.readAsDataURL(file);
  }

  async function handleCropDone(blob: Blob) {
    setCropSrc(null);
    await uploadBlob(blob);
  }

  const inputId = `card-image-${endpoint.replace(/\//g, "-")}`;

  return (
    <>
      <label
        htmlFor={inputId}
        className="relative w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all hover:opacity-80 cursor-pointer select-none"
        style={{
          borderColor: url ? ACCENT : "var(--cat-card-border)",
          background: url ? `${ACCENT}08` : "var(--cat-tag-bg)",
          overflow: "hidden",
          aspectRatio: "700 / 400",
        }}
      >
        {url && <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <div className="relative z-10 flex flex-col items-center gap-1 pointer-events-none px-3 py-1.5 rounded-lg"
          style={{ background: url ? "rgba(0,0,0,0.55)" : "transparent" }}>
          {uploading
            ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: url ? "#fff" : ACCENT }} />
            : <ImageIcon className="w-5 h-5" style={{ color: url ? "#fff" : "var(--cat-text-muted)" }} />}
          <span className="text-xs font-semibold" style={{ color: url ? "#fff" : "var(--cat-text-muted)" }}>
            {url ? t("change") : t("catalogImageUpload")}
          </span>
        </div>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={uploading}
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) { handleFile(f); e.target.value = ""; }
          }}
        />
      </label>
      {cropSrc && (
        <ImageCropperModal
          src={cropSrc}
          aspect={700 / 400}
          shape="rect"
          onDone={handleCropDone}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </>
  );
}

