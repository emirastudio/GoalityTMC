"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Package as PackageIcon, Plus, Edit3, Trash2, Copy } from "lucide-react";
import { formatMoney, type OfferingDTO } from "@/lib/offerings/types";
import { OfferingIcon } from "@/lib/offerings/icons";
import { CreateOfferingDialog } from "./create-offering-dialog";

/**
 * Packages tab — premium card list.
 * Each card:
 *   • Large icon + big title + description
 *   • Big effective price (with strike-through of sum when overridden)
 *   • Child services grid as chips with their individual prices
 *   • Edit / Delete actions
 */
export function OfferingsPackagesTab({
  orgSlug, tournamentId, refreshKey, onChange,
}: {
  orgSlug: string;
  tournamentId: number;
  refreshKey: number;
  onChange: () => void;
}) {
  const t = useTranslations("offeringsAdmin");
  const [offerings, setOfferings] = useState<OfferingDTO[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<OfferingDTO | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/offerings`, { credentials: "include" });
      if (!res.ok) { setOfferings([]); return; }
      const d = await res.json();
      setOfferings(d.offerings);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, tournamentId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  async function removePackage(id: number) {
    if (!confirm(t("confirmDelete"))) return;
    const res = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/offerings/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) { load(); onChange(); }
  }

  async function duplicatePackage(source: OfferingDTO) {
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

  const byId = new Map(offerings.map(o => [o.id, o]));
  const packages = offerings.filter(o => o.kind === "package" && !o.isArchived);

  const createButton = (
    <button
      onClick={() => setCreateOpen(true)}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-95"
      style={{
        background: "var(--cat-accent)",
        color: "var(--cat-accent-text)",
        boxShadow: "0 0 22px var(--cat-accent-glow)",
      }}
    >
      <Plus className="w-4 h-4" /> {t("createPackage")}
    </button>
  );

  const dialog = createOpen && (
    <CreateOfferingDialog
      orgSlug={orgSlug}
      tournamentId={tournamentId}
      allOfferings={offerings}
      initial={null}
      initialKind="package"
      onClose={() => setCreateOpen(false)}
      onCreated={() => { setCreateOpen(false); load(); onChange(); }}
    />
  );
  const editDialog = editing && (
    <CreateOfferingDialog
      orgSlug={orgSlug}
      tournamentId={tournamentId}
      allOfferings={offerings}
      initial={editing}
      onClose={() => setEditing(null)}
      onCreated={() => { setEditing(null); load(); onChange(); }}
    />
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
          {t("packagesCount", { n: packages.length })}
        </p>
        {createButton}
      </div>

      {packages.length === 0 ? (
        <EmptyPackages t={t} onCreate={() => setCreateOpen(true)} />
      ) : (
        <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
          {packages.map((pkg) => {
            const children = pkg.childOfferingIds
              .map((id) => byId.get(id))
              .filter((c): c is OfferingDTO => !!c);
            const sumCents = children.reduce((s, c) => s + c.priceCents, 0);
            const effectiveCents = pkg.packagePriceOverrideCents ?? sumCents;
            const hasOverride = pkg.packagePriceOverrideCents !== null && sumCents !== effectiveCents;

            return (
              <div key={pkg.id}
                className="rounded-2xl border overflow-hidden transition-all hover:translate-y-[-1px]"
                style={{
                  background: "linear-gradient(135deg, var(--cat-card-bg) 0%, rgba(99,102,241,0.03) 100%)",
                  borderColor: "var(--cat-card-border)",
                }}>
                {/* Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(99,102,241,0.10)",
                        border: "1px solid rgba(99,102,241,0.25)",
                        boxShadow: "0 0 22px rgba(99,102,241,0.18)",
                      }}>
                      <OfferingIcon iconKey={pkg.icon} fallback={PackageIcon} size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-black leading-tight" style={{ color: "var(--cat-text)" }}>
                        {pkg.title}
                      </h3>
                      {pkg.description && (
                        <p className="text-sm mt-1 line-clamp-2" style={{ color: "var(--cat-text-muted)" }}>
                          {pkg.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-3xl font-black tabular-nums leading-none"
                        style={{
                          color: "var(--cat-accent)",
                          textShadow: "0 0 22px var(--cat-accent-glow)",
                        }}>
                        {formatMoney(effectiveCents, pkg.currency)}
                      </p>
                      {hasOverride && (
                        <p className="text-xs line-through tabular-nums mt-1"
                          style={{ color: "var(--cat-text-muted)" }}>
                          {formatMoney(sumCents, pkg.currency)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contents list */}
                <div className="px-6 pb-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2"
                    style={{ color: "var(--cat-text-muted)" }}>
                    {t("contentsLabel")}
                  </p>
                  {children.length === 0 ? (
                    <p className="text-sm italic py-3" style={{ color: "var(--cat-text-muted)" }}>
                      {t("emptyChildren")}
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {children.map((c) => (
                        <li key={c.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg"
                          style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)" }}>
                          <span className="shrink-0" style={{ color: "var(--cat-accent)" }}>
                            <OfferingIcon iconKey={c.icon} size={16} />
                          </span>
                          <span className="flex-1 text-sm font-semibold truncate"
                            style={{ color: "var(--cat-text)" }}>
                            {c.title}
                          </span>
                          <span className="text-sm font-bold tabular-nums"
                            style={{ color: "var(--cat-text)" }}>
                            {formatMoney(c.priceCents, c.currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 p-3 border-t"
                  style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}>
                  <button
                    onClick={() => setEditing(pkg)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors hover:opacity-80"
                    style={{
                      background: "var(--cat-card-bg)",
                      color: "var(--cat-text)",
                      border: "1px solid var(--cat-card-border)",
                    }}
                  >
                    <Edit3 className="w-3.5 h-3.5" /> {t("edit")}
                  </button>
                  <button
                    onClick={() => duplicatePackage(pkg)}
                    className="inline-flex items-center justify-center px-3 py-2 rounded-lg transition-colors hover:opacity-80"
                    title={t("duplicate")}
                    style={{
                      background: "var(--cat-card-bg)",
                      color: "var(--cat-text-muted)",
                      border: "1px solid var(--cat-card-border)",
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removePackage(pkg.id)}
                    className="inline-flex items-center justify-center px-3 py-2 rounded-lg transition-colors hover:opacity-80"
                    title={t("delete")}
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
          })}
        </div>
      )}

      {dialog}
      {editDialog}
    </div>
  );
}

function EmptyPackages({ t, onCreate }: { t: (k: string) => string; onCreate: () => void }) {
  return (
    <div className="rounded-3xl p-12 border text-center"
      style={{
        background: "linear-gradient(135deg, var(--cat-card-bg) 0%, rgba(99,102,241,0.04) 100%)",
        borderColor: "var(--cat-card-border)",
      }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{
          background: "rgba(99,102,241,0.10)",
          border: "1px solid rgba(99,102,241,0.25)",
          boxShadow: "0 0 24px rgba(99,102,241,0.18)",
        }}>
        <PackageIcon className="w-7 h-7" style={{ color: "#818cf8" }} />
      </div>
      <h3 className="text-lg font-bold mb-1" style={{ color: "var(--cat-text)" }}>
        {t("emptyPackages")}
      </h3>
      <p className="text-sm mb-5 max-w-sm mx-auto" style={{ color: "var(--cat-text-muted)" }}>
        {t("emptyPackagesHint")}
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
        <Plus className="w-4 h-4" /> {t("createPackage")}
      </button>
    </div>
  );
}
