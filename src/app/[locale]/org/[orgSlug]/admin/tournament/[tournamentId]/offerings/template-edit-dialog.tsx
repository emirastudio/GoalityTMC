"use client";

/**
 * Диалог CRUD для шаблонов услуг на уровне организации.
 * Template = organization_offering_templates (см. миграцию 0026).
 *
 * По замыслу это pre-set для быстрого создания `offerings` в турнире.
 * Поля те же, что у offering: title, priceModel, defaultPriceCents,
 * inclusion, icon, plus локали (ru/et).
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X, Loader2, Check } from "lucide-react";
import type { OfferingInclusion, OfferingKind, OfferingPriceModel } from "@/lib/offerings/types";
import type { OfferingTemplate } from "./catalog-tab";

const PRICE_MODELS: OfferingPriceModel[] = [
  "flat", "per_team", "per_unit",
  "per_person", "per_player", "per_staff", "per_accompanying",
  "per_night", "per_meal",
];
const INCLUSIONS: OfferingInclusion[] = ["required", "default", "optional"];

export function TemplateEditDialog({
  orgSlug,
  template,
  onClose,
  onSaved,
}: {
  orgSlug: string;
  template: OfferingTemplate | null; // null = create new
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("offeringsAdmin");
  const isEdit = !!template;

  const [title, setTitle] = useState(template?.title ?? "");
  const [titleRu, setTitleRu] = useState(template?.titleRu ?? "");
  const [titleEt, setTitleEt] = useState(template?.titleEt ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [icon, setIcon] = useState(template?.icon ?? "");
  const [kind] = useState<OfferingKind>(template?.kind ?? "single");
  const [inclusion, setInclusion] = useState<OfferingInclusion>(template?.inclusion ?? "optional");
  const [priceModel, setPriceModel] = useState<OfferingPriceModel>(template?.priceModel ?? "per_person");
  const [priceEur, setPriceEur] = useState(String((template?.defaultPriceCents ?? 0) / 100));
  const [nightsCount, setNightsCount] = useState(
    template?.nightsCount != null ? String(template.nightsCount) : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) { setError(t("titleRequired")); return; }
    setSubmitting(true);
    try {
      const body = {
        title: title.trim(),
        titleRu: titleRu.trim() || null,
        titleEt: titleEt.trim() || null,
        description: description.trim() || null,
        icon: icon.trim().slice(0, 4) || null,
        kind,
        inclusion,
        priceModel,
        defaultPriceCents: Math.round(Number(priceEur || 0) * 100),
        nightsCount:
          priceModel === "per_night" && nightsCount.trim() !== ""
            ? Math.max(0, parseInt(nightsCount, 10) || 0)
            : null,
      };

      const url = isEdit
        ? `/api/org/${orgSlug}/offering-templates/${template!.id}`
        : `/api/org/${orgSlug}/offering-templates`;
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
      onSaved();
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
            {isEdit ? t("templates.editDialogTitle") : t("templates.createDialogTitle")}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: "var(--cat-text-muted)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto" style={{ flex: 1 }}>
          {/* Titles (EN + localised) */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>
              {t("templates.titleEnLabel")}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>
                {t("templates.titleRuLabel")}
              </label>
              <input
                type="text"
                value={titleRu}
                onChange={(e) => setTitleRu(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>
                {t("templates.titleEtLabel")}
              </label>
              <input
                type="text"
                value={titleEt}
                onChange={(e) => setTitleEt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>
              {t("descriptionLabel")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>
              {t("templates.iconEmojiLabel")}
            </label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value.slice(0, 4))}
              placeholder="🏨"
              className="w-20 px-3 py-2 rounded-lg text-center border outline-none"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--cat-text-muted)" }}>
              {t("inclusionLabel")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {INCLUSIONS.map((i) => {
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

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>
              {t("priceModelLabel")}
            </label>
            <select
              value={priceModel}
              onChange={(e) => setPriceModel(e.target.value as OfferingPriceModel)}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
            >
              {PRICE_MODELS.map((m) => (
                <option key={m} value={m}>{t(`pm_${m}_title`)}</option>
              ))}
            </select>
          </div>

          <div className="flex items-start gap-3 flex-wrap">
            <div className="w-[10rem]">
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>
                {t("templates.defaultPriceLabel")}
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
              </div>
            )}
          </div>

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
