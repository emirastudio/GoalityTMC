"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Package, Layers, Sparkles, Zap, Check } from "lucide-react";
import { OfferingsCatalogTab } from "./catalog-tab";
import { OfferingsPackagesTab } from "./packages-tab";
import type { OfferingSettings, OfferingDTO } from "@/lib/offerings/types";

// Two clean tabs: Services (was Catalog) + Packages.
// Per-team deals and payment instructions live in the Payments section
// (separately designed). This page focuses on building the catalogue.
type TabKey = "catalog" | "packages";

export default function OfferingsPage() {
  const params = useParams<{ orgSlug: string; tournamentId: string; locale: string }>();
  const orgSlug = params.orgSlug;
  const tournamentId = Number(params.tournamentId);
  const t = useTranslations("offeringsAdmin");

  const [settings, setSettings] = useState<OfferingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("catalog");
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/offerings/settings`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setSettings)
      .catch(() => setSettings(null))
      .finally(() => setLoading(false));
  }, [orgSlug, tournamentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--cat-text-muted)" }} />
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; Icon: React.ElementType }[] = [
    { key: "catalog", label: t("tabServices"), Icon: Layers },
    { key: "packages", label: t("tabPackages"), Icon: Package },
  ];

  return (
    <div className="space-y-7 max-w-6xl">
      {/* ── Premium page header ───────────────────────────── */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg, var(--cat-badge-open-bg) 0%, rgba(99,102,241,0.08) 100%)",
            border: "1px solid var(--cat-card-border)",
            boxShadow: "0 0 24px var(--cat-accent-glow)",
          }}>
          <Sparkles className="w-6 h-6" style={{ color: "var(--cat-accent)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-black tracking-tight" style={{ color: "var(--cat-text)" }}>
            {t("pageTitle")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--cat-text-muted)" }}>
            {t("pageSubtitle")}
          </p>
        </div>
      </div>

      {/* ── Segmented tabs — bigger and glowy ─────────────── */}
      <div className="inline-flex gap-1 p-1.5 rounded-2xl"
        style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)" }}>
        {tabs.map(({ key, label, Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
              style={{
                background: active ? "var(--cat-card-bg)" : "transparent",
                color: active ? "var(--cat-accent)" : "var(--cat-text-muted)",
                border: active ? "1px solid var(--cat-card-border)" : "1px solid transparent",
                boxShadow: active ? "0 0 16px var(--cat-accent-glow)" : "none",
              }}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {tab === "catalog" && (
        <OfferingsCatalogTab orgSlug={orgSlug} tournamentId={tournamentId} refreshKey={refreshKey} onChange={triggerRefresh} />
      )}
      {tab === "packages" && (
        <div className="space-y-5">
          <AutoAssignCard
            orgSlug={orgSlug}
            tournamentId={tournamentId}
            settings={settings}
            onChange={setSettings}
          />
          <OfferingsPackagesTab orgSlug={orgSlug} tournamentId={tournamentId} refreshKey={refreshKey} onChange={triggerRefresh} />
        </div>
      )}
    </div>
  );
}

// ─── AutoAssignCard ──────────────────────────────────────────
// The only tournament-wide knob living on this page: the default
// package auto-attached when a club confirms accommodation. Payment
// instructions moved to the Payments section.

function AutoAssignCard({
  orgSlug,
  tournamentId,
  settings,
  onChange,
}: {
  orgSlug: string;
  tournamentId: number;
  settings: OfferingSettings | null;
  onChange: (next: OfferingSettings | null) => void;
}) {
  const t = useTranslations("offeringsAdmin");
  const [packageOptions, setPackageOptions] = useState<OfferingDTO[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/offerings`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.offerings) {
          setPackageOptions(
            (d.offerings as OfferingDTO[]).filter((o) => !o.isArchived && o.kind === "package")
          );
        }
      })
      .catch(() => { /* non-critical */ });
  }, [orgSlug, tournamentId]);

  async function save(patch: Partial<OfferingSettings>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/offerings/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const d: OfferingSettings = await res.json();
        onChange(d);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return null;

  return (
    <div className="rounded-2xl p-6 border"
      style={{
        background: "linear-gradient(135deg, var(--cat-card-bg) 0%, rgba(99,102,241,0.04) 100%)",
        borderColor: "var(--cat-card-border)",
      }}>
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "var(--cat-badge-open-bg)",
            border: "1px solid var(--cat-card-border)",
          }}>
          <Zap className="w-5 h-5" style={{ color: "var(--cat-accent)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold flex items-center gap-2" style={{ color: "var(--cat-text)" }}>
            {t("autoAssignTitle")}
            {saving && <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--cat-text-muted)" }} />}
            {saved && <Check className="w-4 h-4" style={{ color: "#10b981" }} />}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--cat-text-muted)" }}>
            {t("autoAssignHint")}
          </p>
          <select
            value={settings.autoAssignPackageOfferingId ?? ""}
            onChange={(e) =>
              save({
                autoAssignPackageOfferingId: e.target.value ? Number(e.target.value) : null,
              })
            }
            disabled={saving}
            className="w-full mt-3 px-4 py-3 rounded-xl text-base border outline-none"
            style={{
              background: "var(--cat-bg)",
              borderColor: "var(--cat-card-border)",
              color: "var(--cat-text)",
            }}
          >
            <option value="">— {t("autoAssignManual")} —</option>
            {packageOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
