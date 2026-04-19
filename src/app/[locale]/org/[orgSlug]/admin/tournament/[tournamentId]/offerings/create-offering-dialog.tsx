"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { X, Loader2, Check } from "lucide-react";
import type { OfferingDTO, OfferingInclusion, OfferingKind, OfferingPriceModel } from "@/lib/offerings/types";
import { OFFERING_ICONS, OfferingIcon } from "@/lib/offerings/icons";

// Semantic grouping for the radio-card picker below. Keeps the order in
// the dropdown stable for API/older code via PRICE_MODELS (flat sequence)
// while giving humans a readable layout.
const PRICE_MODEL_GROUPS: { key: string; models: OfferingPriceModel[] }[] = [
  { key: "priceModelGroupTeam", models: ["flat", "per_team", "per_unit"] },
  { key: "priceModelGroupPerson", models: ["per_person", "per_player", "per_staff", "per_accompanying"] },
  { key: "priceModelGroupTimePerson", models: ["per_night", "per_meal"] },
];
const INCLUSIONS: OfferingInclusion[] = ["required", "default", "optional"];

/**
 * Combined create+edit dialog for offerings and packages.
 * `initial` = null → create mode. `initial` = OfferingDTO → edit mode.
 * For packages, the user picks existing single offerings as contents.
 */
// Seed-values для режима create: передаются из блока «Шаблоны» при клике
// на карточку шаблона. Не включают `id` — это не edit, форма остаётся в
// режиме создания, просто поля уже предзаполнены.
export type OfferingPrefill = {
  kind?: OfferingKind;
  title?: string;
  icon?: string | null;
  description?: string | null;
  inclusion?: OfferingInclusion;
  priceModel?: OfferingPriceModel;
  priceCents?: number;
  nightsCount?: number | null;
};

export function CreateOfferingDialog({
  orgSlug,
  tournamentId,
  allOfferings,
  initial,
  initialKind,
  prefill,
  onClose,
  onCreated,
}: {
  orgSlug: string;
  tournamentId: number;
  allOfferings: OfferingDTO[];
  initial: OfferingDTO | null;
  /** Force-select a starting kind when creating (e.g. "package"). */
  initialKind?: OfferingKind;
  /** Pre-fill fields when creating (e.g. from a template card). */
  prefill?: OfferingPrefill;
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useTranslations("offeringsAdmin");
  const isEdit = !!initial;

  const [kind, setKind] = useState<OfferingKind>(initial?.kind ?? prefill?.kind ?? initialKind ?? "single");
  const [title, setTitle] = useState(initial?.title ?? prefill?.title ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? prefill?.icon ?? "");
  const [description, setDescription] = useState(initial?.description ?? prefill?.description ?? "");
  const [inclusion, setInclusion] = useState<OfferingInclusion>(initial?.inclusion ?? prefill?.inclusion ?? "optional");
  const [priceModel, setPriceModel] = useState<OfferingPriceModel>(initial?.priceModel ?? prefill?.priceModel ?? "per_person");
  const [priceEur, setPriceEur] = useState(
    String(((initial?.priceCents ?? prefill?.priceCents ?? 0)) / 100)
  );
  const [packageOverrideEnabled, setPackageOverrideEnabled] = useState(
    initial?.kind === "package" && initial.packagePriceOverrideCents !== null
  );
  const [packageOverrideEur, setPackageOverrideEur] = useState(
    initial?.packagePriceOverrideCents ? String(initial.packagePriceOverrideCents / 100) : ""
  );
  const [childIds, setChildIds] = useState<number[]>(initial?.childOfferingIds ?? []);
  // Per-night offerings can fix a nights count (e.g. «3 ночи») so the math
  // stops being tournament-dates dependent. Empty string → use tournament dates.
  const [nightsCount, setNightsCount] = useState(
    initial?.nightsCount != null
      ? String(initial.nightsCount)
      : prefill?.nightsCount != null
        ? String(prefill.nightsCount)
        : ""
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligibleChildren = useMemo(
    () => allOfferings.filter(o => o.kind === "single" && !o.isArchived && o.id !== initial?.id),
    [allOfferings, initial]
  );

  function toggleChild(id: number) {
    setChildIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) { setError(t("titleRequired")); return; }
    setSubmitting(true);
    try {
      const priceCents = Math.round(Number(priceEur || 0) * 100);
      const packagePriceOverrideCents =
        kind === "package" && packageOverrideEnabled
          ? Math.round(Number(packageOverrideEur || 0) * 100)
          : null;

      const body: Record<string, unknown> = {
        kind,
        title: title.trim(),
        icon: icon.trim().slice(0, 4) || null,
        description: description.trim() || null,
        inclusion,
        priceModel,
        priceCents,
        packagePriceOverrideCents,
        nightsCount:
          priceModel === "per_night" && nightsCount.trim() !== ""
            ? Math.max(0, parseInt(nightsCount, 10) || 0)
            : null,
      };
      if (kind === "package") body.childOfferingIds = childIds;

      const url = isEdit
        ? `/api/org/${orgSlug}/tournament/${tournamentId}/offerings/${initial!.id}`
        : `/api/org/${orgSlug}/tournament/${tournamentId}/offerings`;
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? t("saveError"));
        return;
      }
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border overflow-hidden shadow-2xl"
        style={{
          background: "var(--cat-bg)",
          borderColor: "var(--cat-card-border)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--cat-card-border)" }}>
          <h3 className="text-base font-bold" style={{ color: "var(--cat-text)" }}>
            {isEdit ? t("editOfferingTitle") : t("createOfferingTitle")}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: "var(--cat-text-muted)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto" style={{ flex: 1 }}>
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--cat-text-muted)" }}>
                {t("kindLabel")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["single", "package"] as OfferingKind[]).map(k => {
                  const active = kind === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      className="px-3 py-2 rounded-lg text-sm font-bold border"
                      style={{
                        background: active ? "var(--cat-badge-open-bg)" : "var(--cat-card-bg)",
                        borderColor: active ? "var(--cat-accent)" : "var(--cat-card-border)",
                        color: active ? "var(--cat-accent)" : "var(--cat-text-secondary)",
                      }}
                    >
                      {k === "single" ? t("kindSingle") : t("kindPackage")}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>{t("titleLabel")}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--cat-text-muted)" }}>{t("iconLabel")}</label>
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5">
              {OFFERING_ICONS.map(({ key, Icon, label }) => {
                const active = icon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIcon(active ? "" : key)}
                    title={label}
                    className="aspect-square flex items-center justify-center rounded-lg border transition-all"
                    style={{
                      background: active ? "var(--cat-badge-open-bg)" : "var(--cat-card-bg)",
                      borderColor: active ? "var(--cat-accent)" : "var(--cat-card-border)",
                      color: active ? "var(--cat-accent)" : "var(--cat-text-secondary)",
                      cursor: "pointer",
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>{t("descriptionLabel")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--cat-text-muted)" }}>{t("inclusionLabel")}</label>
            <div className="grid grid-cols-3 gap-2">
              {INCLUSIONS.map(i => {
                const active = inclusion === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setInclusion(i)}
                    className="px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border"
                    style={{
                      background: active ? "var(--cat-badge-open-bg)" : "var(--cat-card-bg)",
                      borderColor: active ? "var(--cat-accent)" : "var(--cat-card-border)",
                      color: active ? "var(--cat-accent)" : "var(--cat-text-muted)",
                    }}
                  >
                    {t(`incl_${i}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price model picker — grouped radio cards.
              Far clearer than a flat dropdown: the organiser sees the
              pricing math upfront (example line under each title). */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "var(--cat-text-muted)" }}>
              {t("priceModelLabel")}
            </label>
            <div className="space-y-3">
              {PRICE_MODEL_GROUPS.map((group) => (
                <div key={group.key}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
                    style={{ color: "var(--cat-text-muted)" }}>
                    {t(group.key)}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {group.models.map((m) => {
                      const selected = priceModel === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPriceModel(m)}
                          className="text-left px-3 py-2.5 rounded-xl border transition-all"
                          style={{
                            background: selected ? "var(--cat-badge-open-bg)" : "var(--cat-card-bg)",
                            borderColor: selected ? "var(--cat-accent)" : "var(--cat-card-border)",
                            boxShadow: selected ? "0 0 0 1px var(--cat-accent), 0 0 14px var(--cat-accent-glow)" : "none",
                          }}
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            <div className="w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0"
                              style={{
                                borderColor: selected ? "var(--cat-accent)" : "var(--cat-card-border)",
                                background: selected ? "var(--cat-accent)" : "transparent",
                              }}>
                              {selected && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--cat-accent-text)" }} />}
                            </div>
                            <span className="text-sm font-bold truncate"
                              style={{ color: selected ? "var(--cat-accent)" : "var(--cat-text)" }}>
                              {t(`pm_${m}_title`)}
                            </span>
                          </div>
                          <p className="text-[11px] leading-snug pl-5"
                            style={{ color: "var(--cat-text-muted)" }}>
                            {t(`pm_${m}_example`)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Base price + optional nights override for per_night. */}
          <div className="flex items-start gap-3 flex-wrap">
            <div className="w-[10rem]">
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>
                {t("priceLabel")}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono"
                  style={{ color: "var(--cat-text-muted)" }}>€</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={priceEur}
                  onChange={(e) => setPriceEur(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-lg text-sm border outline-none text-right font-mono"
                  style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
                />
              </div>
            </div>

            {priceModel === "per_night" && (
              <div className="w-[11rem]">
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>
                  {t("nightsCountLabel")}
                </label>
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={nightsCount}
                  onChange={(e) => setNightsCount(e.target.value)}
                  placeholder={t("nightsCountAuto")}
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none text-right font-mono"
                  style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
                />
                <p className="text-[10px] mt-1" style={{ color: "var(--cat-text-muted)" }}>
                  {t("nightsCountHint")}
                </p>
              </div>
            )}
          </div>

          {kind === "package" && (
            <div className="space-y-3 p-3 rounded-xl border"
              style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--cat-text-muted)" }}>
                    {t("contentsLabel")}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                    {t("selected", { n: childIds.length })}
                  </span>
                </div>
                {eligibleChildren.length === 0 ? (
                  <p className="text-xs py-2" style={{ color: "var(--cat-text-muted)" }}>
                    {t("noChildrenAvailable")}
                  </p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {eligibleChildren.map(c => {
                      const checked = childIds.includes(c.id);
                      return (
                        <label key={c.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:opacity-80"
                          style={{ background: checked ? "var(--cat-badge-open-bg)" : "var(--cat-card-bg)" }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleChild(c.id)}
                            style={{ accentColor: "var(--cat-accent)" }}
                          />
                          <span className="text-sm flex-1" style={{ color: "var(--cat-text)" }}>
                            {c.icon ?? "•"} {c.title}
                          </span>
                          <span className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                            {((c.priceCents) / 100).toFixed(2)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={packageOverrideEnabled}
                  onChange={(e) => setPackageOverrideEnabled(e.target.checked)}
                  style={{ accentColor: "var(--cat-accent)", marginTop: "2px" }}
                />
                <div className="flex-1">
                  <div className="text-xs font-bold" style={{ color: "var(--cat-text)" }}>
                    {t("bundlePriceOverride")}
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                    {t("bundlePriceOverrideHint")}
                  </p>
                  {packageOverrideEnabled && (
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={packageOverrideEur}
                      onChange={(e) => setPackageOverrideEur(e.target.value)}
                      placeholder="0.00"
                      className="mt-2 w-32 px-2 py-1 rounded text-sm border outline-none font-mono"
                      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
                    />
                  )}
                </div>
              </label>
            </div>
          )}

          {error && (
            <div className="text-xs" style={{ color: "#ef4444" }}>{error}</div>
          )}
        </form>

        <div className="flex gap-2 px-5 py-3 border-t" style={{ borderColor: "var(--cat-card-border)" }}>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-bold border"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
            style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)", cursor: submitting ? "wait" : "pointer" }}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEdit ? t("saveChanges") : t("create")}
          </button>
        </div>
      </div>
    </div>
  );
}
