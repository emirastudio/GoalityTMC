"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Save, Check } from "lucide-react";
import { CountrySelect } from "@/components/ui/country-select";
import { CityInput } from "@/components/ui/city-input";

const ACCENT = "#2BFEBA";

/**
 * Inline Location (country + city) fields for the tournament Setup wizard's
 * "Basics" step. Loads + saves via /api/org/{slug}/tournament/{id}/settings.
 * Self-contained — no card wrapper, just the labelled inputs + a small
 * Save button so admins can persist location without leaving the basics flow.
 */
export function TournamentLocationFields({
  orgSlug,
  tournamentId,
}: {
  orgSlug: string;
  tournamentId: number;
}) {
  const t = useTranslations("orgAdmin");
  const apiBase = `/api/org/${orgSlug}/tournament/${tournamentId}`;

  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!orgSlug || !tournamentId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/settings`);
        if (res.ok) {
          const d = await res.json();
          if (cancelled) return;
          setCountry(d.country ?? "");
          setCity(d.city ?? "");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orgSlug, tournamentId, apiBase]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`${apiBase}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: country || null, city: city || null }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-4 items-end">
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
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all disabled:opacity-60 sm:self-end"
        style={{ background: ACCENT, color: "#000", height: "fit-content" }}
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
        {saving ? t("saving") : saved ? t("saved") : t("save")}
      </button>
    </div>
  );
}
