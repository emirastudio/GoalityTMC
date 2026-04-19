"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X, Loader2, Plus, Trash2, Check, Minus } from "lucide-react";
import { formatMoney, type DealBreakdown, type DealListItem } from "@/lib/offerings/types";
import { OfferingIcon } from "@/lib/offerings/icons";

interface PaymentRow {
  id: number;
  amountCents: number;
  currency: string;
  method: "bank_transfer" | "stripe" | "cash";
  receivedAt: string;
  reference: string | null;
  note: string | null;
}

/**
 * Slide-over drawer for a single team deal. Shows the full pricing
 * breakdown, exposes "+ Add adjustment" and "+ Record payment" affordances,
 * and reloads the breakdown after each mutation so the math is always live.
 */
export function DealDrawer({
  orgSlug,
  tournamentId,
  deal,
  onClose,
  onChange,
}: {
  orgSlug: string;
  tournamentId: number;
  deal: DealListItem;
  onClose: () => void;
  onChange: () => void;
}) {
  const t = useTranslations("offeringsAdmin");
  const [breakdown, setBreakdown] = useState<DealBreakdown | null>(deal.breakdown);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [adjOpen, setAdjOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, pRes] = await Promise.all([
        fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/deals/${deal.id}`, { credentials: "include" }),
        fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/deals/${deal.id}/payments`, { credentials: "include" }),
      ]);
      if (bRes.ok) {
        const d = await bRes.json();
        setBreakdown(d.breakdown);
      }
      if (pRes.ok) {
        const d = await pRes.json();
        setPayments(d.payments);
      }
    } finally {
      setLoading(false);
    }
  }, [orgSlug, tournamentId, deal.id]);

  useEffect(() => { load(); }, [load]);

  const refresh = () => { load(); onChange(); };

  async function deleteAdjustment(adjId: number) {
    const res = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/deals/${deal.id}/adjustments/${adjId}`, {
      method: "DELETE", credentials: "include",
    });
    if (res.ok) refresh();
  }
  async function deletePayment(payId: number) {
    if (!confirm(t("confirmDeletePayment"))) return;
    const res = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/deals/${deal.id}/payments/${payId}`, {
      method: "DELETE", credentials: "include",
    });
    if (res.ok) refresh();
  }
  async function deleteDeal() {
    if (!confirm(t("confirmDeleteDeal"))) return;
    const res = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/deals/${deal.id}`, {
      method: "DELETE", credentials: "include",
    });
    if (res.ok) { onChange(); onClose(); }
  }

  return (
    <div className="fixed inset-0 z-40" onClick={onClose} style={{ background: "rgba(0,0,0,0.35)" }}>
      <aside
        className="absolute top-0 right-0 h-full w-full sm:w-[460px] overflow-y-auto"
        style={{ background: "var(--cat-card-bg)", borderLeft: "1px solid var(--cat-card-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 px-5 py-3 border-b flex items-center justify-between z-10"
          style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>
          <div>
            <h3 className="text-base font-bold" style={{ color: "var(--cat-text)" }}>{deal.teamName}</h3>
            <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>{deal.offeringTitle}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: "var(--cat-text-muted)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {!breakdown ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--cat-text-muted)" }} />
          </div>
        ) : (
          <div className="p-5 space-y-6">
            {/* Lines */}
            <section>
              <h4 className="text-[11px] font-black uppercase tracking-wider mb-2" style={{ color: "var(--cat-text-muted)" }}>
                {t("breakdownItems")}
              </h4>
              <div className="rounded-xl border overflow-hidden"
                style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}>
                {breakdown.lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 items-center border-b last:border-b-0"
                    style={{ borderColor: "var(--cat-card-border)" }}>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate flex items-center gap-1.5" style={{ color: "var(--cat-text)" }}>
                        <span style={{ color: "var(--cat-accent)", display: "inline-flex" }}>
                          <OfferingIcon iconKey={l.icon} size={13} />
                        </span>
                        <span className="truncate">{l.title}</span>
                      </div>
                      <div className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                        {formatMoney(l.unitPriceCents, breakdown.currency)} × {l.quantity}
                      </div>
                    </div>
                    <div className="text-sm font-mono tabular-nums" style={{ color: "var(--cat-text)" }}>
                      {formatMoney(l.lineCents, breakdown.currency)}
                    </div>
                  </div>
                ))}
                <div className="px-3 py-2 grid grid-cols-[1fr_auto] gap-2 text-sm"
                  style={{ background: "var(--cat-bg)", fontWeight: 700 }}>
                  <span style={{ color: "var(--cat-text)" }}>{t("subtotal")}</span>
                  <span className="font-mono tabular-nums" style={{ color: "var(--cat-text)" }}>
                    {formatMoney(breakdown.subtotalCents, breakdown.currency)}
                  </span>
                </div>
              </div>
            </section>

            {/* Adjustments */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[11px] font-black uppercase tracking-wider" style={{ color: "var(--cat-text-muted)" }}>
                  {t("adjustments")}
                </h4>
                <button
                  onClick={() => setAdjOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold"
                  style={{ color: "var(--cat-accent)" }}
                >
                  <Plus className="w-3 h-3" /> {t("addAdjustment")}
                </button>
              </div>
              {breakdown.adjustments.length === 0 ? (
                <p className="text-xs py-2" style={{ color: "var(--cat-text-muted)" }}>{t("noAdjustments")}</p>
              ) : (
                <div className="space-y-1.5">
                  {breakdown.adjustments.map(a => (
                    <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg"
                      style={{
                        background: a.kind === "discount" ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
                        border: `1px solid ${a.kind === "discount" ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)"}`,
                      }}>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: "var(--cat-text)" }}>
                          {a.reason}
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                          {a.mode === "percent_bps"
                            ? `${(a.value / 100).toFixed(a.value % 100 === 0 ? 0 : 1)}%`
                            : a.mode === "per_player"
                            ? t("perPlayerValue", { v: formatMoney(a.value, breakdown.currency) })
                            : formatMoney(a.value, breakdown.currency)}
                        </div>
                      </div>
                      <span className="text-sm font-mono tabular-nums font-bold"
                        style={{ color: a.kind === "discount" ? "#10b981" : "#f59e0b" }}>
                        {a.kind === "discount" ? "−" : "+"}{formatMoney(Math.abs(a.effectCents), breakdown.currency)}
                      </span>
                      <button onClick={() => deleteAdjustment(a.id)}
                        className="p-1 rounded hover:opacity-70" style={{ color: "var(--cat-text-muted)" }}>
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Total */}
            <section className="rounded-xl p-3 border"
              style={{ background: "var(--cat-badge-open-bg)", borderColor: "var(--cat-accent)" }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--cat-accent)" }}>
                  {t("total")}
                </span>
                <span className="text-xl font-black tabular-nums" style={{ color: "var(--cat-accent)" }}>
                  {formatMoney(breakdown.totalCents, breakdown.currency)}
                </span>
              </div>
            </section>

            {/* Payments */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[11px] font-black uppercase tracking-wider" style={{ color: "var(--cat-text-muted)" }}>
                  {t("payments")}
                </h4>
                <button
                  onClick={() => setPayOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold"
                  style={{ color: "var(--cat-accent)" }}
                >
                  <Plus className="w-3 h-3" /> {t("recordPayment")}
                </button>
              </div>
              {payments.length === 0 ? (
                <p className="text-xs py-2" style={{ color: "var(--cat-text-muted)" }}>{t("noPayments")}</p>
              ) : (
                <div className="space-y-1.5">
                  {payments.map(p => (
                    <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg"
                      style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.25)" }}>
                      <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "#10b981" }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>
                          {formatMoney(p.amountCents, p.currency)} · {t(`method_${p.method}`)}
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                          {new Date(p.receivedAt).toLocaleDateString()} {p.reference ? `· ${p.reference}` : ""}
                        </div>
                      </div>
                      <button onClick={() => deletePayment(p.id)}
                        className="p-1 rounded hover:opacity-70" style={{ color: "#ef4444" }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="grid grid-cols-[1fr_auto] gap-2 px-2 pt-2 text-[12px]">
                    <span style={{ color: "var(--cat-text-muted)" }}>{t("totalPaid")}</span>
                    <span className="font-mono tabular-nums font-bold" style={{ color: "#10b981" }}>
                      {formatMoney(breakdown.paidCents, breakdown.currency)}
                    </span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-2 px-2 text-[12px]">
                    <span style={{ color: "var(--cat-text-muted)" }}>{t("outstanding")}</span>
                    <span className="font-mono tabular-nums font-bold"
                      style={{ color: breakdown.outstandingCents === 0 ? "#10b981" : "#f59e0b" }}>
                      {formatMoney(breakdown.outstandingCents, breakdown.currency)}
                    </span>
                  </div>
                </div>
              )}
            </section>

            {/* Danger */}
            <section className="pt-2 border-t" style={{ borderColor: "var(--cat-card-border)" }}>
              <button
                onClick={deleteDeal}
                className="text-xs font-semibold inline-flex items-center gap-1.5"
                style={{ color: "#ef4444" }}
              >
                <Trash2 className="w-3 h-3" /> {t("deleteDeal")}
              </button>
            </section>
          </div>
        )}

        {adjOpen && breakdown && (
          <AdjustmentDialog
            orgSlug={orgSlug}
            tournamentId={tournamentId}
            dealId={deal.id}
            currency={breakdown.currency}
            onClose={() => setAdjOpen(false)}
            onDone={() => { setAdjOpen(false); refresh(); }}
          />
        )}
        {payOpen && breakdown && (
          <PaymentDialog
            orgSlug={orgSlug}
            tournamentId={tournamentId}
            dealId={deal.id}
            outstandingCents={breakdown.outstandingCents}
            currency={breakdown.currency}
            onClose={() => setPayOpen(false)}
            onDone={() => { setPayOpen(false); refresh(); }}
          />
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.15)", pointerEvents: "none" }}>
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--cat-accent)" }} />
          </div>
        )}
      </aside>
    </div>
  );
}

// ─── Adjustment dialog ────────────────────────────────────

function AdjustmentDialog({
  orgSlug, tournamentId, dealId, currency, onClose, onDone,
}: {
  orgSlug: string;
  tournamentId: number;
  dealId: number;
  currency: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("offeringsAdmin");
  const [kind, setKind] = useState<"discount" | "surcharge">("discount");
  const [mode, setMode] = useState<"fixed_cents" | "percent_bps" | "per_player">("percent_bps");
  const [valueStr, setValueStr] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const v = Number(valueStr);
    if (!(v > 0)) { setError(t("valuePositive")); return; }
    if (!reason.trim()) { setError(t("reasonRequired")); return; }
    setSubmitting(true);
    try {
      const amountValue =
        mode === "percent_bps" ? Math.round(v * 100)
        : mode === "fixed_cents" ? Math.round(v * 100)
        : Math.round(v * 100); // per_player — also cents × players
      const res = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/deals/${dealId}/adjustments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, amountMode: mode, amountValue, reason: reason.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? t("saveError"));
        return;
      }
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: "rgba(0,0,0,0.65)" }} onClick={onClose}>
      <form
        className="w-full max-w-md rounded-2xl border p-5 space-y-4 shadow-2xl"
        style={{ background: "var(--cat-bg)", borderColor: "var(--cat-card-border)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold" style={{ color: "var(--cat-text)" }}>{t("addAdjustmentTitle")}</h3>

        <div className="grid grid-cols-2 gap-2">
          {(["discount", "surcharge"] as const).map(k => (
            <button key={k} type="button" onClick={() => setKind(k)}
              className="px-3 py-2 rounded-lg text-sm font-bold border"
              style={{
                background: kind === k ? "var(--cat-badge-open-bg)" : "var(--cat-card-bg)",
                borderColor: kind === k ? "var(--cat-accent)" : "var(--cat-card-border)",
                color: kind === k ? "var(--cat-accent)" : "var(--cat-text-secondary)",
              }}>
              {k === "discount" ? `− ${t("discount")}` : `+ ${t("surcharge")}`}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>{t("adjMode")}</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { v: "percent_bps" as const, label: "%" },
              { v: "fixed_cents" as const, label: currency },
              { v: "per_player" as const, label: "/player" },
            ]).map(({ v, label }) => (
              <button key={v} type="button" onClick={() => setMode(v)}
                className="px-2 py-1.5 rounded-lg text-xs font-bold border"
                style={{
                  background: mode === v ? "var(--cat-badge-open-bg)" : "var(--cat-card-bg)",
                  borderColor: mode === v ? "var(--cat-accent)" : "var(--cat-card-border)",
                  color: mode === v ? "var(--cat-accent)" : "var(--cat-text-muted)",
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>{t("adjValue")}</label>
          <input type="number" min={0} step="0.01" value={valueStr} onChange={(e) => setValueStr(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none font-mono"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
            placeholder={mode === "percent_bps" ? "14" : "100"} />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>{t("adjReason")}</label>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} required
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
            placeholder={t("adjReasonPlaceholder")} />
          <p className="text-[11px] mt-1" style={{ color: "var(--cat-text-muted)" }}>{t("adjReasonHint")}</p>
        </div>

        {error && <p className="text-xs" style={{ color: "#ef4444" }}>{error}</p>}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-bold border"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}>
            {t("cancel")}
          </button>
          <button type="submit" disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
            style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)", cursor: submitting ? "wait" : "pointer" }}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {t("apply")}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Payment dialog ───────────────────────────────────────

function PaymentDialog({
  orgSlug, tournamentId, dealId, outstandingCents, currency, onClose, onDone,
}: {
  orgSlug: string;
  tournamentId: number;
  dealId: number;
  outstandingCents: number;
  currency: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("offeringsAdmin");
  const [amountEur, setAmountEur] = useState((outstandingCents / 100).toString());
  const [method, setMethod] = useState<"bank_transfer" | "stripe" | "cash">("bank_transfer");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cents = Math.round(Number(amountEur) * 100);
    if (!(cents > 0)) { setError(t("amountPositive")); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/deals/${dealId}/payments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents: cents,
          currency,
          method,
          receivedAt: new Date(receivedAt).toISOString(),
          reference: reference.trim() || null,
          note: note.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? t("saveError"));
        return;
      }
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: "rgba(0,0,0,0.65)" }} onClick={onClose}>
      <form
        className="w-full max-w-md rounded-2xl border p-5 space-y-4 shadow-2xl"
        style={{ background: "var(--cat-bg)", borderColor: "var(--cat-card-border)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold" style={{ color: "var(--cat-text)" }}>{t("recordPaymentTitle")}</h3>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>
              {t("paymentAmount")}
            </label>
            <input type="number" min={0} step="0.01" value={amountEur} onChange={(e) => setAmountEur(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none font-mono"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>
              {t("paymentDate")}
            </label>
            <input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--cat-text-muted)" }}>{t("paymentMethod")}</label>
          <div className="grid grid-cols-3 gap-2">
            {(["bank_transfer", "stripe", "cash"] as const).map(m => (
              <button key={m} type="button" onClick={() => setMethod(m)}
                className="px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border"
                style={{
                  background: method === m ? "var(--cat-badge-open-bg)" : "var(--cat-card-bg)",
                  borderColor: method === m ? "var(--cat-accent)" : "var(--cat-card-border)",
                  color: method === m ? "var(--cat-accent)" : "var(--cat-text-muted)",
                }}>
                {t(`method_${m}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>{t("paymentReference")}</label>
          <input type="text" value={reference} onChange={(e) => setReference(e.target.value)}
            placeholder={t("paymentReferencePlaceholder")}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }} />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>{t("paymentNote")}</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }} />
        </div>

        {error && <p className="text-xs" style={{ color: "#ef4444" }}>{error}</p>}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-bold border"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}>
            {t("cancel")}
          </button>
          <button type="submit" disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
            style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)", cursor: submitting ? "wait" : "pointer" }}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {t("record")}
          </button>
        </div>
      </form>
    </div>
  );
}
