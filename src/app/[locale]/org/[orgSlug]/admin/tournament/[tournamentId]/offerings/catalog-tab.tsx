"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, Plus, Trash2, Edit3, Archive, Package, Copy, Sparkles, RotateCcw } from "lucide-react";
import { CreateOfferingDialog, type OfferingPrefill } from "./create-offering-dialog";
import { TemplateEditDialog } from "./template-edit-dialog";
import { formatMoney, type OfferingDTO, type OfferingInclusion, type OfferingKind, type OfferingPriceModel } from "@/lib/offerings/types";
import { OfferingIcon } from "@/lib/offerings/icons";

// Шаблон услуги — preset на уровне организации. Кликом создаёт новую услугу
// с предзаполненными полями. См. src/lib/offerings/template-presets.ts.
export type OfferingTemplate = {
  id: number;
  organizationId: number;
  slug: string | null;
  title: string;
  titleRu: string | null;
  titleEt: string | null;
  description: string | null;
  descriptionRu: string | null;
  descriptionEt: string | null;
  icon: string | null;
  kind: OfferingKind;
  inclusion: OfferingInclusion;
  priceModel: OfferingPriceModel;
  defaultPriceCents: number;
  currency: string;
  nightsCount: number | null;
  sortOrder: number;
  isBuiltin: boolean;
};

const INCLUSION_COLOR: Record<string, { bg: string; fg: string; border: string }> = {
  required: { bg: "rgba(239,68,68,0.10)", fg: "#ef4444", border: "rgba(239,68,68,0.30)" },
  default:  { bg: "rgba(59,130,246,0.10)", fg: "#3b82f6", border: "rgba(59,130,246,0.30)" },
  optional: { bg: "var(--cat-tag-bg)", fg: "var(--cat-text-muted)", border: "var(--cat-card-border)" },
};

/**
 * Services tab — premium grid of offering cards.
 * Each card reads like a spec sheet: icon, name, inclusion pill, price
 * with its pricing model, and a short description. Clicking edit opens
 * the same create/edit dialog used by the "+ Create service" button.
 */
export function OfferingsCatalogTab({
  orgSlug, tournamentId, refreshKey, onChange,
}: {
  orgSlug: string;
  tournamentId: number;
  refreshKey: number;
  onChange: () => void;
}) {
  const t = useTranslations("offeringsAdmin");
  const locale = useLocale();
  const [offerings, setOfferings] = useState<OfferingDTO[] | null>(null);
  const [templates, setTemplates] = useState<OfferingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<OfferingPrefill | null>(null);
  const [editing, setEditing] = useState<OfferingDTO | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<OfferingTemplate | "new" | null>(null);
  const [templatesBusy, setTemplatesBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [offRes, tmplRes] = await Promise.all([
        fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/offerings`, { credentials: "include" }),
        fetch(`/api/org/${orgSlug}/offering-templates`, { credentials: "include" }),
      ]);
      if (offRes.ok) {
        const d = await offRes.json();
        setOfferings(d.offerings);
      } else {
        setOfferings([]);
      }
      if (tmplRes.ok) {
        const d = await tmplRes.json();
        setTemplates(d.templates ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [orgSlug, tournamentId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  // Перегрузить только шаблоны (после edit/delete/reset) без общего спиннера.
  const reloadTemplates = useCallback(async () => {
    const res = await fetch(`/api/org/${orgSlug}/offering-templates`, { credentials: "include" });
    if (res.ok) {
      const d = await res.json();
      setTemplates(d.templates ?? []);
    }
  }, [orgSlug]);

  // Клик по карточке шаблона — открыть диалог создания услуги с pre-fill.
  function useTemplate(tmpl: OfferingTemplate, locale: string) {
    setCreatePrefill({
      kind: tmpl.kind,
      title: pickLocaleTitle(tmpl, locale),
      icon: tmpl.icon,
      description: pickLocaleDescription(tmpl, locale),
      inclusion: tmpl.inclusion,
      priceModel: tmpl.priceModel,
      priceCents: tmpl.defaultPriceCents,
      nightsCount: tmpl.nightsCount,
    });
    setCreateOpen(true);
  }

  async function deleteTemplate(id: number) {
    if (!confirm(t("templates.confirmDelete"))) return;
    setTemplatesBusy(true);
    try {
      await fetch(`/api/org/${orgSlug}/offering-templates/${id}`, {
        method: "DELETE", credentials: "include",
      });
      await reloadTemplates();
    } finally { setTemplatesBusy(false); }
  }

  async function resetTemplates() {
    if (!confirm(t("templates.confirmReset"))) return;
    setTemplatesBusy(true);
    try {
      await fetch(`/api/org/${orgSlug}/offering-templates/reset`, {
        method: "POST", credentials: "include",
      });
      await reloadTemplates();
    } finally { setTemplatesBusy(false); }
  }

  async function removeOffering(id: number) {
    if (!confirm(t("confirmDelete"))) return;
    const res = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/offerings/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) { load(); onChange(); }
  }

  // Client-side duplicate: reuses the offerings POST with the original's
  // fields and a localised « (copy) » suffix. Package children are carried
  // over so an organiser can fork a bundle and tweak its contents.
  async function duplicateOffering(source: OfferingDTO) {
    const suffix = ` ${t("copySuffix")}`;
    const body = {
      kind: source.kind,
      title: `${source.title}${suffix}`,
      titleRu: source.titleRu ? `${source.titleRu}${suffix}` : null,
      titleEt: source.titleEt ? `${source.titleEt}${suffix}` : null,
      description: source.description,
      icon: source.icon,
      inclusion: source.inclusion,
      priceModel: source.priceModel,
      priceCents: source.priceCents,
      packagePriceOverrideCents: source.packagePriceOverrideCents,
      childOfferingIds: source.childOfferingIds,
      scopeClassIds: source.scopeClassIds,
      availableFrom: source.availableFrom,
      availableUntil: source.availableUntil,
      inventoryLimit: source.inventoryLimit,
      sortOrder: source.sortOrder + 1,
    };
    const res = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/offerings`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) { load(); onChange(); }
  }

  if (loading || !offerings) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--cat-text-muted)" }} />
      </div>
    );
  }

  // Packages live on their own tab — filter them out here to keep focus.
  const visible = offerings.filter(o => !o.isArchived && o.kind === "single");
  const archivedCount = offerings.filter(o => o.isArchived && o.kind === "single").length;

  return (
    <div className="space-y-5">
      {/* Count + primary CTA */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
          {t("servicesCount", { n: visible.length })}
        </p>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-95"
          style={{
            background: "var(--cat-accent)",
            color: "var(--cat-accent-text)",
            boxShadow: "0 0 22px var(--cat-accent-glow)",
          }}
        >
          <Plus className="w-4 h-4" /> {t("createService")}
        </button>
      </div>

      {visible.length === 0 ? (
        <EmptyCatalog t={t} onCreate={() => setCreateOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((o) => (
            <OfferingCard
              key={o.id}
              offering={o}
              label={{
                inclusion: t(`incl_${o.inclusion}`),
                priceModel: t(`pm_${o.priceModel}`),
                edit: t("edit"),
                delete: t("delete"),
                duplicate: t("duplicate"),
              }}
              onEdit={() => setEditing(o)}
              onDuplicate={() => duplicateOffering(o)}
              onDelete={() => removeOffering(o.id)}
            />
          ))}
        </div>
      )}

      {archivedCount > 0 && (
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--cat-text-muted)" }}>
          <Archive className="w-3.5 h-3.5" />
          {t("archivedHint", { n: archivedCount })}
        </div>
      )}

      {/* ─── Шаблоны услуг ─────────────────────────────────────
          Блок под каталогом. Клик по карточке → открывает диалог
          создания с заполненными полями. Организатор правит цену/
          название/и т.д. под свой турнир и жмёт Create. */}
      <TemplatesBlock
        templates={templates}
        locale={locale}
        busy={templatesBusy}
        onUse={(tmpl) => useTemplate(tmpl, locale)}
        onEdit={(tmpl) => setEditingTemplate(tmpl)}
        onDelete={(id) => deleteTemplate(id)}
        onCreate={() => setEditingTemplate("new")}
        onReset={() => resetTemplates()}
        t={t}
      />

      {createOpen && (
        <CreateOfferingDialog
          orgSlug={orgSlug}
          tournamentId={tournamentId}
          allOfferings={offerings}
          initial={null}
          prefill={createPrefill ?? undefined}
          onClose={() => { setCreateOpen(false); setCreatePrefill(null); }}
          onCreated={() => { setCreateOpen(false); setCreatePrefill(null); load(); onChange(); }}
        />
      )}
      {editing && (
        <CreateOfferingDialog
          orgSlug={orgSlug}
          tournamentId={tournamentId}
          allOfferings={offerings}
          initial={editing}
          onClose={() => setEditing(null)}
          onCreated={() => { setEditing(null); load(); onChange(); }}
        />
      )}
      {editingTemplate && (
        <TemplateEditDialog
          orgSlug={orgSlug}
          template={editingTemplate === "new" ? null : editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSaved={() => { setEditingTemplate(null); reloadTemplates(); }}
        />
      )}
    </div>
  );
}

// ─── Helpers: локализованные заголовок/описание из шаблона ─────
function pickLocaleTitle(tmpl: OfferingTemplate, locale: string): string {
  if (locale === "ru" && tmpl.titleRu) return tmpl.titleRu;
  if (locale === "et" && tmpl.titleEt) return tmpl.titleEt;
  return tmpl.title;
}
function pickLocaleDescription(tmpl: OfferingTemplate, locale: string): string | null {
  if (locale === "ru" && tmpl.descriptionRu) return tmpl.descriptionRu;
  if (locale === "et" && tmpl.descriptionEt) return tmpl.descriptionEt;
  return tmpl.description;
}

function EmptyCatalog({ t, onCreate }: { t: (k: string) => string; onCreate: () => void }) {
  return (
    <div className="rounded-3xl p-12 border text-center"
      style={{
        background: "linear-gradient(135deg, var(--cat-card-bg) 0%, rgba(99,102,241,0.04) 100%)",
        borderColor: "var(--cat-card-border)",
      }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{
          background: "var(--cat-badge-open-bg)",
          border: "1px solid var(--cat-card-border)",
          boxShadow: "0 0 24px var(--cat-accent-glow)",
        }}>
        <Package className="w-7 h-7" style={{ color: "var(--cat-accent)" }} />
      </div>
      <h3 className="text-lg font-bold mb-1" style={{ color: "var(--cat-text)" }}>
        {t("emptyCatalogTitle")}
      </h3>
      <p className="text-sm mb-5 max-w-sm mx-auto" style={{ color: "var(--cat-text-muted)" }}>
        {t("emptyCatalog")}
      </p>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
        style={{
          background: "var(--cat-accent)",
          color: "var(--cat-accent-text)",
          boxShadow: "0 0 22px var(--cat-accent-glow)",
        }}
      >
        <Plus className="w-4 h-4" /> {t("createService")}
      </button>
    </div>
  );
}

// ─── TemplatesBlock ────────────────────────────────────────
// Ряд карточек "Шаблонов услуг" под каталогом. Каждая карточка — pre-set
// на уровне организации. Клик по пустой области карточки → "Использовать"
// (создать услугу с pre-fill). Edit/Delete — кнопки по hover.
function TemplatesBlock({
  templates, locale, busy,
  onUse, onEdit, onDelete, onCreate, onReset, t,
}: {
  templates: OfferingTemplate[];
  locale: string;
  busy: boolean;
  onUse: (t: OfferingTemplate) => void;
  onEdit: (t: OfferingTemplate) => void;
  onDelete: (id: number) => void;
  onCreate: () => void;
  onReset: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const hasBuiltins = templates.some((x) => x.isBuiltin);
  return (
    <div className="pt-8 mt-4 border-t" style={{ borderColor: "var(--cat-card-border)" }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "var(--cat-badge-open-bg)",
              color: "var(--cat-accent)",
              border: "1px solid var(--cat-card-border)",
            }}>
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: "var(--cat-text)" }}>
              {t("templates.title")}
            </h3>
            <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
              {t("templates.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasBuiltins === false && (
            <button
              onClick={onReset}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border"
              style={{
                background: "var(--cat-card-bg)",
                borderColor: "var(--cat-card-border)",
                color: "var(--cat-text-muted)",
              }}
              title={t("templates.resetHint")}
            >
              <RotateCcw className="w-3.5 h-3.5" /> {t("templates.reset")}
            </button>
          )}
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{
              background: "var(--cat-card-bg)",
              color: "var(--cat-text)",
              border: "1px solid var(--cat-card-border)",
            }}
          >
            <Plus className="w-3.5 h-3.5" /> {t("templates.createCustom")}
          </button>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-2xl p-6 border text-center"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <p className="text-sm mb-3" style={{ color: "var(--cat-text-muted)" }}>
            {t("templates.emptyHint")}
          </p>
          <button
            onClick={onReset}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold"
            style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}
          >
            <RotateCcw className="w-4 h-4" /> {t("templates.reset")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {templates.map((tmpl) => (
            <TemplateCard
              key={tmpl.id}
              tmpl={tmpl}
              locale={locale}
              priceModelLabel={t(`pm_${tmpl.priceModel}`)}
              useLabel={t("templates.use")}
              editLabel={t("templates.edit")}
              deleteLabel={t("templates.delete")}
              builtinLabel={t("templates.builtin")}
              onUse={() => onUse(tmpl)}
              onEdit={() => onEdit(tmpl)}
              onDelete={() => onDelete(tmpl.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  tmpl, locale, priceModelLabel, useLabel, editLabel, deleteLabel, builtinLabel,
  onUse, onEdit, onDelete,
}: {
  tmpl: OfferingTemplate;
  locale: string;
  priceModelLabel: string;
  useLabel: string;
  editLabel: string;
  deleteLabel: string;
  builtinLabel: string;
  onUse: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const title = pickLocaleTitle(tmpl, locale);
  const description = pickLocaleDescription(tmpl, locale);
  const isRequired = tmpl.inclusion === "required";
  return (
    <div
      className="group rounded-2xl border overflow-hidden transition-all hover:translate-y-[-1px] cursor-pointer flex flex-col"
      style={{
        background: "var(--cat-card-bg)",
        // Required шаблоны — тонкий красный left-border, без наложения
        // бейджей на заголовок.
        borderColor: isRequired ? "rgba(239,68,68,0.35)" : "var(--cat-card-border)",
        borderLeftWidth: isRequired ? "3px" : "1px",
      }}
      onClick={onUse}
      title={useLabel}
    >
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Top row: icon + title (2 lines max) */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "var(--cat-badge-open-bg)",
              border: "1px solid var(--cat-card-border)",
              color: "var(--cat-accent)",
            }}>
            <OfferingIcon iconKey={tmpl.icon} size={18} />
          </div>
          <h4 className="text-sm font-bold leading-tight line-clamp-2 min-w-0 flex-1" style={{ color: "var(--cat-text)" }}>
            {title}
          </h4>
        </div>

        {/* Meta row: priceModel pill + builtin/required tag */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{
              background: "var(--cat-badge-open-bg)",
              color: "var(--cat-accent)",
              border: "1px solid var(--cat-card-border)",
            }}>
            {priceModelLabel}
          </span>
          {isRequired && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(239,68,68,0.10)",
                color: "#ef4444",
                border: "1px solid rgba(239,68,68,0.30)",
              }}>
              req.
            </span>
          )}
          {tmpl.isBuiltin && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ml-auto"
              style={{
                background: "var(--cat-tag-bg)",
                color: "var(--cat-text-muted)",
              }}>
              {builtinLabel}
            </span>
          )}
        </div>

        {/* Description — 2 lines max, wraps naturally */}
        {description && (
          <p className="text-[11px] leading-snug line-clamp-2" style={{ color: "var(--cat-text-muted)" }}>
            {description}
          </p>
        )}
      </div>

      {/* Bottom strip: price + hover actions. Всегда в отдельной секции —
          исключает наложение на текст. Actions появляются только по hover. */}
      <div className="px-4 py-2.5 flex items-center justify-between border-t"
        style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}>
        <p className="text-sm font-black font-mono tabular-nums"
          style={{ color: tmpl.defaultPriceCents > 0 ? "var(--cat-accent)" : "var(--cat-text-muted)" }}>
          {tmpl.defaultPriceCents > 0
            ? formatMoney(tmpl.defaultPriceCents, tmpl.currency)
            : "—"}
        </p>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 rounded-lg"
            title={editLabel}
            style={{
              background: "var(--cat-card-bg)",
              color: "var(--cat-text-muted)",
              border: "1px solid var(--cat-card-border)",
            }}
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg"
            title={deleteLabel}
            style={{
              background: "rgba(239,68,68,0.08)",
              color: "#ef4444",
              border: "1px solid rgba(239,68,68,0.25)",
            }}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function OfferingCard({
  offering: o,
  label,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  offering: OfferingDTO;
  label: { inclusion: string; priceModel: string; edit: string; delete: string; duplicate: string };
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const incColor = INCLUSION_COLOR[o.inclusion];
  const priceCents = o.kind === "package" ? (o.packagePriceOverrideCents ?? 0) : o.priceCents;
  const priceModelShort = label.priceModel;

  return (
    <div
      className="group rounded-2xl border overflow-hidden transition-all hover:translate-y-[-1px]"
      style={{
        background: "var(--cat-card-bg)",
        borderColor: "var(--cat-card-border)",
      }}
    >
      {/* Top strip — icon + inclusion + actions */}
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "var(--cat-badge-open-bg)",
            border: "1px solid var(--cat-card-border)",
            color: "var(--cat-accent)",
          }}>
          <OfferingIcon iconKey={o.icon} size={22} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full border"
          style={{ background: incColor.bg, color: incColor.fg, borderColor: incColor.border }}>
          {label.inclusion}
        </span>
      </div>

      {/* Title + description */}
      <div className="px-5">
        <h3 className="text-lg font-bold leading-tight" style={{ color: "var(--cat-text)" }}>
          {o.title}
        </h3>
        {o.description && (
          <p className="text-sm mt-1.5 leading-snug line-clamp-2" style={{ color: "var(--cat-text-muted)" }}>
            {o.description}
          </p>
        )}
      </div>

      {/* Price strip */}
      <div className="px-5 mt-4 pt-4 border-t flex items-end justify-between gap-3"
        style={{ borderColor: "var(--cat-card-border)" }}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--cat-text-muted)" }}>
            {priceModelShort}
          </p>
          <p className="text-2xl font-black tabular-nums mt-0.5"
            style={{
              color: "var(--cat-accent)",
              textShadow: "0 0 18px var(--cat-accent-glow)",
            }}>
            {formatMoney(priceCents, o.currency)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 p-3 pt-3 mt-2 border-t"
        style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}>
        <button
          onClick={onEdit}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors hover:opacity-80"
          style={{
            background: "var(--cat-card-bg)",
            color: "var(--cat-text)",
            border: "1px solid var(--cat-card-border)",
          }}
        >
          <Edit3 className="w-3.5 h-3.5" /> {label.edit}
        </button>
        <button
          onClick={onDuplicate}
          className="inline-flex items-center justify-center px-3 py-2 rounded-lg transition-colors hover:opacity-80"
          title={label.duplicate}
          style={{
            background: "var(--cat-card-bg)",
            color: "var(--cat-text-muted)",
            border: "1px solid var(--cat-card-border)",
          }}
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="inline-flex items-center justify-center px-3 py-2 rounded-lg transition-colors hover:opacity-80"
          title={label.delete}
          style={{
            background: "rgba(239,68,68,0.08)",
            color: "#ef4444",
            border: "1px solid rgba(239,68,68,0.25)",
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
