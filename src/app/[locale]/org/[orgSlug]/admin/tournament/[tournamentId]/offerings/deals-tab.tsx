"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Users, CheckCircle, Clock, AlertCircle, Plus } from "lucide-react";
import { formatMoney, type DealListItem } from "@/lib/offerings/types";
import { DealDrawer } from "./deal-drawer";
import { AssignDealDialog } from "./assign-deal-dialog";

export function OfferingsDealsTab({
  orgSlug, tournamentId, refreshKey, onChange,
}: {
  orgSlug: string;
  tournamentId: number;
  refreshKey: number;
  onChange: () => void;
}) {
  const t = useTranslations("offeringsAdmin");
  const [deals, setDeals] = useState<DealListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [localRefresh, setLocalRefresh] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/deals`, { credentials: "include" });
      if (!res.ok) { setDeals([]); return; }
      const d = await res.json();
      setDeals(d.deals);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, tournamentId]);

  useEffect(() => { load(); }, [load, refreshKey, localRefresh]);

  const refresh = () => { setLocalRefresh(r => r + 1); onChange(); };

  if (loading || !deals) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--cat-text-muted)" }} />
      </div>
    );
  }

  const selectedDeal = deals.find(d => d.id === selectedDealId) ?? null;

  return (
    <>
      <div className="space-y-3 max-w-4xl">
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
            {t("dealsCount", { n: deals.length })}
          </p>
          <button
            onClick={() => setAssignOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold"
            style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}
          >
            <Plus className="w-3.5 h-3.5" /> {t("assignDeal")}
          </button>
        </div>

        {deals.length === 0 ? (
          <div className="rounded-2xl p-10 border text-center"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" style={{ color: "var(--cat-accent)" }} />
            <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{t("emptyDeals")}</p>
          </div>
        ) : (
          <div className="rounded-2xl border overflow-hidden"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            {/* header */}
            <div className="grid grid-cols-[1fr_1fr_6rem_6rem_6rem_2rem] gap-3 px-4 py-2 border-b text-[10px] font-black uppercase tracking-wider"
              style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
              <div>{t("colTeam")}</div>
              <div>{t("colOffering")}</div>
              <div className="text-right">{t("colSubtotal")}</div>
              <div className="text-right">{t("colTotal")}</div>
              <div className="text-right">{t("colOutstanding")}</div>
              <div />
            </div>
            {deals.map((d, idx) => {
              const b = d.breakdown;
              const paid = b ? b.outstandingCents === 0 && b.totalCents > 0 : false;
              const partial = b ? b.paidCents > 0 && b.outstandingCents > 0 : false;
              const diff = b ? b.totalCents - b.subtotalCents : 0;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDealId(d.id)}
                  className="grid grid-cols-[1fr_1fr_6rem_6rem_6rem_2rem] gap-3 px-4 py-3 items-center border-b last:border-b-0 text-left hover:opacity-90"
                  style={{
                    borderColor: "var(--cat-card-border)",
                    background: idx % 2 === 0 ? "transparent" : "var(--cat-tag-bg)",
                    cursor: "pointer",
                  }}
                >
                  <div className="text-sm font-semibold truncate" style={{ color: "var(--cat-text)" }}>
                    {d.teamName}
                  </div>
                  <div className="text-sm truncate" style={{ color: "var(--cat-text-secondary)" }}>
                    {d.offeringTitle}
                    {d.offeringKind === "package" && (
                      <span className="ml-1.5 text-[10px] font-bold px-1 py-0.5 rounded"
                        style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1" }}>
                        PKG
                      </span>
                    )}
                  </div>
                  <div className="text-right text-sm font-mono tabular-nums" style={{ color: "var(--cat-text-muted)" }}>
                    {b ? formatMoney(b.subtotalCents, b.currency) : "—"}
                  </div>
                  <div className="text-right text-sm font-black tabular-nums" style={{ color: "var(--cat-text)" }}>
                    {b ? formatMoney(b.totalCents, b.currency) : "—"}
                    {diff !== 0 && (
                      <div className="text-[10px] font-normal" style={{ color: diff < 0 ? "#10b981" : "#f59e0b" }}>
                        {diff < 0 ? formatMoney(diff, b!.currency) : `+${formatMoney(diff, b!.currency)}`}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-sm font-bold tabular-nums flex items-center gap-1.5 justify-end"
                    style={{ color: paid ? "#10b981" : partial ? "#f59e0b" : "var(--cat-text-muted)" }}>
                    {paid ? <CheckCircle className="w-3.5 h-3.5" /> : partial ? <Clock className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {b ? (paid ? t("paid") : formatMoney(b.outstandingCents, b.currency)) : "—"}
                  </div>
                  <div className="text-right">
                    <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>→</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedDeal && (
        <DealDrawer
          orgSlug={orgSlug}
          tournamentId={tournamentId}
          deal={selectedDeal}
          onClose={() => setSelectedDealId(null)}
          onChange={refresh}
        />
      )}

      {assignOpen && (
        <AssignDealDialog
          orgSlug={orgSlug}
          tournamentId={tournamentId}
          onClose={() => setAssignOpen(false)}
          onAssigned={() => { setAssignOpen(false); refresh(); }}
        />
      )}
    </>
  );
}
