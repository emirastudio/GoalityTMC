"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Globe, Loader2, Save, Check } from "lucide-react";
import { CountrySelect } from "@/components/ui/country-select";
import { CityInput } from "@/components/ui/city-input";

const ACCENT = "#2BFEBA";

/**
 * Location (country + city) for the tournament — formerly part of the legacy
 * `/settings` page. The other unique field, the catalog image, lives inside
 * StepMedia next to logo + cover. Embedded near the bottom of `/setup` just
 * above the Danger Zone.
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

  const load = useCallback(async () => {
    if (!orgSlug || !tournamentId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/settings`);
      if (!res.ok) throw new Error("Failed to load");
      const d = await res.json();
      setCountry(d.country ?? "");
      setCity(d.city ?? "");
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

    </div>
  );
}

