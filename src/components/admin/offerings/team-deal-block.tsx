"use client";

/**
 * Team-page unified deal block (offerings v3).
 *
 * Single premium card on `/admin/tournament/[tId]/teams/[teamId]` that lets
 * the organiser:
 *   • assign a base package (or swap it via "Change package")
 *   • add extra offerings on top (inclusion=optional)
 *   • see each package child as its own row with SERVICE / CONDITIONS / PRICE
 *   • inline-edit any line price (click the price → input → Enter)
 *   • gift a line to the team (🎁 → price 0, struck-through original shown)
 *   • tweak free-slot counts (players/staff/accompanying) and meal override
 *   • attach tournament-wide adjustments (discount / surcharge)
 *   • publish / unpublish to the club
 *
 * All math is rebuilt server-side on every edit via the calculator.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Loader2, Plus, Trash2, Check, Eye, EyeOff, Package as PackageIcon,
  Gift, RotateCcw, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  formatMoney,
  priceModelLabel,
  type DealBreakdown,
  type OfferingDTO,
} from "@/lib/offerings/types";
import { OfferingIcon } from "@/lib/offerings/icons";

interface DealRow {
  id: number;
  offeringId: number;
  offeringTitle: string;
  offeringKind: "single" | "package";
  offeringInclusion: "required" | "default" | "optional";
  offeringIcon: string | null;
  state: string;
  isPublished: boolean;
  dueDate: string | null;
  breakdown: DealBreakdown | null;
}

export function TeamDealBlock({
  orgSlug,
  tournamentId,
  teamId,
}: {
  orgSlug: string;
  tournamentId: number;
  teamId: number;
}) {
  const t = useTranslations("offeringsTeam");

  const [loading, setLoading] = useState(true);
  const [registrationId, setRegistrationId] = useState<number | null>(null);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [catalog, setCatalog] = useState<OfferingDTO[]>([]);
  const [saving, setSaving] = useState(false);
  const [addOnId, setAddOnId] = useState<string>("");
  const [packageId, setPackageId] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dealsRes, catalogRes] = await Promise.all([
        fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/teams/${teamId}/deals`, { credentials: "include" }),
        fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/offerings`, { credentials: "include" }),
      ]);
      if (dealsRes.ok) {
        const d = await dealsRes.json();
        setRegistrationId(d.registrationId);
        setDeals(d.deals);
      }
      if (catalogRes.ok) {
        const c = await catalogRes.json();
        setCatalog((c.offerings as OfferingDTO[]).filter(o => !o.isArchived));
      }
    } finally {
      setLoading(false);
    }
  }, [orgSlug, tournamentId, teamId]);

  useEffect(() => { load(); }, [load]);

  const dealIds = new Set(deals.map(d => d.offeringId));
  const packageOptions = catalog.filter(o => o.kind === "package");
  const addOnOptions = catalog.filter(o =>
    o.kind === "single" && !dealIds.has(o.id) && o.inclusion !== "required"
  );
  // Primary = the team's package deal (if any). Single services — even
  // a required one — render as add-ons so the UI doesn't force-promote
  // them to «package» status when there is no real package assigned.
  const primaryDeal = deals.find(d => d.offeringKind === "package") ?? null;
  const addOnDeals = deals.filter(d => d !== primaryDeal);

  async function assignPackage() {
    if (!packageId) return;
    await postAssign(Number(packageId));
    setPackageId("");
  }
  async function changePackage(newOfferingId: number) {
    if (!primaryDeal) return;
    if (!confirm(t("confirmChangePackage"))) return;
    setSaving(true);
    try {
      // Remove current primary deal, assign the new one.
      await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/deals/${primaryDeal.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      await postAssign(newOfferingId);
    } finally {
      setSaving(false);
    }
  }
  async function addAddOn() {
    if (!addOnId) return;
    await postAssign(Number(addOnId));
    setAddOnId("");
  }

  async function postAssign(offeringId: number) {
    if (!registrationId) return;
    setSaving(true);
    try {
      await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/deals`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offeringId, registrationIds: [registrationId] }),
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function removeDeal(dealId: number) {
    if (!confirm(t("confirmRemoveDeal"))) return;
    await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/deals/${dealId}`, {
      method: "DELETE",
      credentials: "include",
    });
    await load();
  }

  async function togglePublish(deal: DealRow) {
    setSaving(true);
    try {
      await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/deals/${deal.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !deal.isPublished }),
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function setLinePrice(dealId: number, offeringId: number, priceCents: number | null, reason?: string) {
    if (priceCents === null) {
      await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/deals/${dealId}/items/${offeringId}/price`, {
        method: "DELETE", credentials: "include",
      });
    } else {
      await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/deals/${dealId}/items/${offeringId}/price`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceCents, reason: reason ?? null }),
      });
    }
    await load();
  }

  async function toggleGift(dealId: number, offeringId: number, makeGift: boolean) {
    await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/deals/${dealId}/items/${offeringId}/gift`, {
      method: makeGift ? "POST" : "DELETE",
      credentials: "include",
    });
    await load();
  }

  async function patchDealFreeSlots(dealId: number, patch: {
    freePlayersCount?: number;
    freeStaffCount?: number;
    freeAccompanyingCount?: number;
    mealsCountOverride?: number | null;
  }) {
    await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/deals/${dealId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await load();
  }

  if (loading) {
    return (
      <div className="rounded-2xl p-6 border flex items-center gap-2"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text-muted)" }}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">{t("loading")}</span>
      </div>
    );
  }

  if (!registrationId) {
    return (
      <div className="rounded-2xl p-6 border"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t("notRegistered")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-5 border space-y-5"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold" style={{ color: "var(--cat-text)" }}>{t("title")}</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{t("subtitle")}</p>
        </div>
      </div>

      {/* Primary package deal (if one is assigned). Services without a
          package are perfectly valid — we just skip this block then. */}
      {primaryDeal && (
        <DealSection
          deal={primaryDeal}
          isPrimary
          packageOptions={packageOptions}
          onChangePackage={changePackage}
          onRemove={() => removeDeal(primaryDeal.id)}
          onTogglePublish={() => togglePublish(primaryDeal)}
          onSetLinePrice={setLinePrice}
          onToggleGift={toggleGift}
          onPatchFreeSlots={(patch) => patchDealFreeSlots(primaryDeal.id, patch)}
        />
      )}

      {/* Add-on deals (single services assigned without a package OR on
          top of one — same layout either way). */}
      {addOnDeals.map(d => (
        <DealSection
          key={d.id}
          deal={d}
          isPrimary={false}
          packageOptions={[]}
          onChangePackage={async () => { /* add-ons don't swap */ }}
          onRemove={() => removeDeal(d.id)}
          onTogglePublish={() => togglePublish(d)}
          onSetLinePrice={setLinePrice}
          onToggleGift={toggleGift}
          onPatchFreeSlots={(patch) => patchDealFreeSlots(d.id, patch)}
        />
      ))}

      {/* Pickers — always visible so services can be assigned
          independently of packages, or packages added later. */}
      {!primaryDeal && packageOptions.length > 0 && (
        <div className="rounded-xl p-4 border"
          style={{ background: "var(--cat-bg)", borderColor: "var(--cat-card-border)" }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--cat-text-muted)" }}>
            {t("choosePackage")}
          </p>
          <div className="flex gap-2">
            <select
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
            >
              <option value="">— {t("selectPackage")} —</option>
              {packageOptions.map(o => (
                <option key={o.id} value={o.id}>{o.title}</option>
              ))}
            </select>
            <button
              onClick={assignPackage}
              disabled={!packageId || saving}
              className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
              style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)", cursor: saving ? "wait" : "pointer" }}
            >
              {t("assign")}
            </button>
          </div>
        </div>
      )}

      {addOnOptions.length > 0 && (
        <div className="rounded-xl p-3 border border-dashed"
          style={{ borderColor: "var(--cat-card-border)" }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--cat-text-muted)" }}>
            {t("addExtra")}
          </p>
          <div className="flex gap-2">
            <select
              value={addOnId}
              onChange={(e) => setAddOnId(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg text-sm border outline-none"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
            >
              <option value="">— {t("selectExtra")} —</option>
              {addOnOptions.map(o => (
                <option key={o.id} value={o.id}>
                  {o.title} · {formatMoney(o.priceCents, o.currency)} {priceModelLabel(o.priceModel)}
                </option>
              ))}
            </select>
            <button
              onClick={addAddOn}
              disabled={!addOnId || saving}
              className="px-3 py-1.5 rounded-lg text-sm font-bold disabled:opacity-50 inline-flex items-center gap-1.5"
              style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)", cursor: saving ? "wait" : "pointer" }}
            >
              <Plus className="w-3.5 h-3.5" /> {t("add")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DealSection ─────────────────────────────────────────────

function DealSection({
  deal,
  isPrimary,
  packageOptions,
  onChangePackage,
  onRemove,
  onTogglePublish,
  onSetLinePrice,
  onToggleGift,
  onPatchFreeSlots,
}: {
  deal: DealRow;
  isPrimary: boolean;
  packageOptions: OfferingDTO[];
  onChangePackage: (offeringId: number) => Promise<void> | void;
  onRemove: () => void;
  onTogglePublish: () => void;
  onSetLinePrice: (dealId: number, offeringId: number, priceCents: number | null, reason?: string) => Promise<void>;
  onToggleGift: (dealId: number, offeringId: number, makeGift: boolean) => Promise<void>;
  onPatchFreeSlots: (patch: {
    freePlayersCount?: number;
    freeStaffCount?: number;
    freeAccompanyingCount?: number;
    mealsCountOverride?: number | null;
  }) => Promise<void>;
}) {
  const t = useTranslations("offeringsTeam");
  const b = deal.breakdown;

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ background: "var(--cat-bg)", borderColor: deal.isPublished ? "rgba(16,185,129,0.4)" : "var(--cat-card-border)" }}>
      {/* Header row — "Package & Pricing" banner + actions */}
      <div className="flex items-center gap-4 px-5 py-4 border-b"
        style={{ borderColor: "var(--cat-card-border)" }}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }}>
          <OfferingIcon iconKey={deal.offeringIcon} fallback={deal.offeringKind === "package" ? PackageIcon : undefined} size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--cat-text-muted)" }}>
              {isPrimary && deal.offeringKind === "package" ? t("packageAndPricing") : t("extraService")}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg font-bold truncate" style={{ color: "var(--cat-text)" }}>
              {deal.offeringTitle}
            </span>
            {deal.offeringKind === "package" && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1" }}>
                PKG
              </span>
            )}
            {!isPrimary && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
                {t("addOn")}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onTogglePublish}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
          style={{
            background: deal.isPublished ? "rgba(16,185,129,0.12)" : "var(--cat-tag-bg)",
            color: deal.isPublished ? "#10b981" : "var(--cat-text-muted)",
            border: `1px solid ${deal.isPublished ? "rgba(16,185,129,0.35)" : "var(--cat-card-border)"}`,
          }}
          title={deal.isPublished ? t("publishedHint") : t("notPublishedHint")}
        >
          {deal.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {deal.isPublished ? t("published") : t("draft")}
        </button>
        <button
          onClick={onRemove}
          className="p-2 rounded-lg hover:opacity-70"
          style={{ color: "#ef4444" }}
          title={t("remove")}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Change package dropdown — only for primary+package */}
      {isPrimary && deal.offeringKind === "package" && packageOptions.length > 1 && (
        <div className="px-4 py-2 border-b flex items-center gap-2"
          style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>
          <span className="text-[11px] font-semibold" style={{ color: "var(--cat-text-muted)" }}>
            {t("changePackage")}
          </span>
          <select
            value={deal.offeringId}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v && v !== deal.offeringId) onChangePackage(v);
            }}
            className="px-2 py-1 rounded text-[12px] border outline-none"
            style={{ background: "var(--cat-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
          >
            {packageOptions.map(o => (
              <option key={o.id} value={o.id}>{o.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_minmax(0,1.2fr)_auto_auto] gap-3 px-5 py-3 text-[11px] font-bold uppercase tracking-wider"
        style={{ color: "var(--cat-text-muted)", background: "var(--cat-card-bg)", borderBottom: "1px solid var(--cat-card-border)" }}>
        <span>{t("colService")}</span>
        <span>{t("colConditions")}</span>
        <span className="text-right">{t("colPrice")}</span>
        <span />
      </div>

      {/* Lines */}
      <div className="divide-y" style={{ borderColor: "var(--cat-card-border)" }}>
        {b?.lines.map((l) => (
          <LineRow
            key={l.offeringId}
            line={l}
            currency={b.currency}
            onSetPrice={(cents, reason) => onSetLinePrice(deal.id, l.offeringId, cents, reason)}
            onClearOverride={() => onSetLinePrice(deal.id, l.offeringId, null)}
            onToggleGift={(makeGift) => onToggleGift(deal.id, l.offeringId, makeGift)}
          />
        ))}
      </div>

      {/* Free slots — only useful on packages / anything per-person-ish.
          `key` remounts the block whenever server-side counts change, so the
          local editable state tracks props without a setState-in-effect. */}
      {isPrimary && b && (
        <FreeSlotsBlock
          key={`${b.freeSlots.playersCount}:${b.freeSlots.staffCount}:${b.freeSlots.accompanyingCount}:${b.freeSlots.mealsCountOverride ?? "null"}`}
          freeSlots={b.freeSlots}
          onSave={onPatchFreeSlots}
        />
      )}

      {/* Totals. Historical adjustments (discount / surcharge) still rendered
          if they exist in DB — but no inline form to add new ones (organiser
          now edits prices inline instead of stacking discounts). */}
      {b && (
        <div className="px-5 py-4 border-t space-y-1.5"
          style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>
          {b.adjustments.length > 0 && (
            <>
              <div className="flex justify-between text-sm" style={{ color: "var(--cat-text-muted)" }}>
                <span>{t("subtotal")}</span>
                <span className="font-mono tabular-nums">{formatMoney(b.subtotalCents, b.currency)}</span>
              </div>
              {b.adjustments.map(a => (
                <div key={a.id} className="flex justify-between items-center text-[13px]"
                  style={{ color: a.kind === "discount" ? "#10b981" : "#f59e0b" }}>
                  <span>{a.reason}</span>
                  <span className="font-mono tabular-nums">
                    {a.kind === "discount" ? "−" : "+"}{formatMoney(Math.abs(a.effectCents), b.currency)}
                  </span>
                </div>
              ))}
            </>
          )}

          <div className="flex justify-between items-center pt-2"
            style={{ color: "var(--cat-text)" }}>
            <span className="text-base font-bold">{t("total")}</span>
            <span className="text-xl font-black tabular-nums">{formatMoney(b.totalCents, b.currency)}</span>
          </div>
          {b.paidCents > 0 && (
            <div className="flex justify-between text-[13px]" style={{ color: "#10b981" }}>
              <span>{t("paid")}</span>
              <span className="font-mono tabular-nums">{formatMoney(b.paidCents, b.currency)}</span>
            </div>
          )}
          {b.outstandingCents > 0 && (
            <div className="flex justify-between text-[13px] font-semibold" style={{ color: "#f59e0b" }}>
              <span>{t("outstanding")}</span>
              <span className="font-mono tabular-nums">{formatMoney(b.outstandingCents, b.currency)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Line row with inline price edit + gift button ─────────

function LineRow({
  line,
  currency,
  onSetPrice,
  onClearOverride,
  onToggleGift,
}: {
  line: NonNullable<DealBreakdown["lines"]>[number];
  currency: string;
  onSetPrice: (cents: number, reason?: string) => Promise<void>;
  onClearOverride: () => Promise<void>;
  onToggleGift: (makeGift: boolean) => Promise<void>;
}) {
  const t = useTranslations("offeringsTeam");
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState((line.unitPriceCents / 100).toString());
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) {
      setValue((line.unitPriceCents / 100).toString());
      setTimeout(() => inputRef.current?.select(), 10);
    }
  }, [editing, line.unitPriceCents]);

  async function commit() {
    const cents = Math.round(Number(value) * 100);
    if (Number.isFinite(cents) && cents >= 0 && cents !== line.unitPriceCents) {
      await onSetPrice(cents);
    }
    setEditing(false);
  }
  function cancel() {
    setEditing(false);
    setValue((line.unitPriceCents / 100).toString());
  }

  const isGift = line.isGift;
  const hasOverride = line.originalUnitPriceCents != null && line.originalUnitPriceCents !== line.unitPriceCents;

  return (
    <div className="grid grid-cols-[1fr_minmax(0,1.2fr)_auto_auto] gap-3 items-center px-5 py-4">
      {/* SERVICE */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="shrink-0" style={{ color: "var(--cat-text-muted)" }}>
          <OfferingIcon iconKey={line.icon} size={18} />
        </span>
        <div className="min-w-0">
          <div className="text-base font-semibold truncate" style={{ color: "var(--cat-text)" }}>
            {line.title}
          </div>
        </div>
      </div>

      {/* CONDITIONS */}
      <div className="text-[13px] leading-snug min-w-0" style={{ color: "var(--cat-text-muted)" }}>
        <span className="truncate block">{line.conditionsText}</span>
      </div>

      {/* PRICE */}
      <div className="text-right">
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            value={value}
            min={0}
            step="0.01"
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commit(); }
              if (e.key === "Escape") { e.preventDefault(); cancel(); }
            }}
            className="w-28 text-right px-3 py-2 rounded-lg border font-mono text-lg outline-none"
            style={{
              background: "var(--cat-card-bg)",
              borderColor: "var(--cat-accent)",
              color: "var(--cat-text)",
            }}
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex flex-col items-end gap-0.5 font-mono tabular-nums cursor-text hover:opacity-80 -mr-1 px-2 py-1 rounded"
            title={t("editPriceHint")}
          >
            {hasOverride && (
              <span className="text-[11px] line-through" style={{ color: "var(--cat-text-muted)" }}>
                {formatMoney(line.originalUnitPriceCents!, currency)}
              </span>
            )}
            <span
              className="text-lg"
              style={{
                color: isGift ? "#10b981" : hasOverride ? "#f59e0b" : "var(--cat-text)",
                fontWeight: isGift ? 800 : 700,
              }}
            >
              {formatMoney(line.unitPriceCents, currency)}
            </span>
          </button>
        )}
      </div>

      {/* ACTIONS — gift toggle + clear override */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onToggleGift(!isGift)}
          className="p-2 rounded-lg transition-colors hover:opacity-80"
          title={isGift ? t("giftRevert") : t("giftApply")}
          style={{
            background: isGift ? "rgba(16,185,129,0.12)" : "transparent",
            color: isGift ? "#10b981" : "var(--cat-text-muted)",
          }}
        >
          <Gift className="w-4 h-4" />
        </button>
        {hasOverride && !isGift && !editing && (
          <button
            onClick={onClearOverride}
            className="p-2 rounded-lg hover:opacity-70"
            title={t("clearOverride")}
            style={{ color: "var(--cat-text-muted)" }}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Free slots block ────────────────────────────────────────

function FreeSlotsBlock({
  freeSlots,
  onSave,
}: {
  freeSlots: DealBreakdown["freeSlots"];
  onSave: (patch: {
    freePlayersCount?: number;
    freeStaffCount?: number;
    freeAccompanyingCount?: number;
    mealsCountOverride?: number | null;
  }) => Promise<void>;
}) {
  const t = useTranslations("offeringsTeam");
  const hasAny =
    freeSlots.playersCount > 0 ||
    freeSlots.staffCount > 0 ||
    freeSlots.accompanyingCount > 0 ||
    freeSlots.mealsCountOverride != null;
  const [open, setOpen] = useState(hasAny);
  const [saving, setSaving] = useState(false);
  const [players, setPlayers] = useState(String(freeSlots.playersCount));
  const [staff, setStaff] = useState(String(freeSlots.staffCount));
  const [accompanying, setAccompanying] = useState(String(freeSlots.accompanyingCount));
  const [meals, setMeals] = useState(freeSlots.mealsCountOverride == null ? "" : String(freeSlots.mealsCountOverride));
  // Parent remounts this component via `key` when server-side free slots
  // change — no prop→state sync effect needed here.

  const dirty =
    Number(players || 0) !== freeSlots.playersCount ||
    Number(staff || 0) !== freeSlots.staffCount ||
    Number(accompanying || 0) !== freeSlots.accompanyingCount ||
    (meals === "" ? freeSlots.mealsCountOverride != null : Number(meals) !== freeSlots.mealsCountOverride);

  async function save() {
    setSaving(true);
    try {
      await onSave({
        freePlayersCount: Math.max(0, parseInt(players || "0", 10) || 0),
        freeStaffCount: Math.max(0, parseInt(staff || "0", 10) || 0),
        freeAccompanyingCount: Math.max(0, parseInt(accompanying || "0", 10) || 0),
        mealsCountOverride: meals === "" ? null : Math.max(0, parseInt(meals, 10) || 0),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-t" style={{ borderColor: "var(--cat-card-border)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2 text-[11px] font-bold uppercase tracking-wider hover:opacity-80"
        style={{
          color: hasAny ? "var(--cat-accent)" : "var(--cat-text-muted)",
          background: hasAny ? "rgba(59,130,246,0.04)" : "transparent",
          borderLeft: hasAny ? "3px solid var(--cat-accent)" : "3px solid transparent",
        }}
      >
        <span className="flex items-center gap-2">
          <Gift className="w-3.5 h-3.5" />
          {t("freeSlots")}
          {hasAny && (
            <span className="text-[10px] font-normal normal-case"
              style={{ color: "var(--cat-text-muted)" }}>
              {freeSlots.playersCount > 0 && `${freeSlots.playersCount}P `}
              {freeSlots.staffCount > 0 && `${freeSlots.staffCount}S `}
              {freeSlots.accompanyingCount > 0 && `${freeSlots.accompanyingCount}A `}
              {freeSlots.mealsCountOverride != null && `· ${freeSlots.mealsCountOverride}M`}
            </span>
          )}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="px-4 py-3 space-y-2"
          style={{ background: "rgba(59,130,246,0.03)", borderLeft: "3px solid var(--cat-accent)" }}>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: t("slotPlayers"), val: players, set: setPlayers },
              { label: t("slotStaff"), val: staff, set: setStaff },
              { label: t("slotAccompanying"), val: accompanying, set: setAccompanying },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1"
                  style={{ color: "var(--cat-text-muted)" }}>
                  {label}
                </label>
                <input
                  type="number"
                  min={0}
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  className="w-full px-2 py-1 rounded text-sm border font-mono text-right outline-none"
                  style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
                />
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{ color: "var(--cat-text-muted)" }}>
                {t("slotMeals")}
              </label>
              <input
                type="number"
                min={0}
                value={meals}
                placeholder={t("slotMealsDefault")}
                onChange={(e) => setMeals(e.target.value)}
                className="w-full px-2 py-1 rounded text-sm border font-mono text-right outline-none"
                style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] italic" style={{ color: "var(--cat-text-muted)" }}>
              {t("freeSlotsHint")}
            </p>
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="px-3 py-1 rounded text-[11px] font-bold disabled:opacity-40 inline-flex items-center gap-1"
              style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              {t("save")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

