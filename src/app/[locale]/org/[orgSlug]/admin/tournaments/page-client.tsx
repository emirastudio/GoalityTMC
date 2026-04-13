"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Sparkles, AlertCircle } from "lucide-react";
import { TournamentCreateModal } from "@/components/admin/tournament-create-modal";

const ACCENT = "#2BFEBA";

export function TournamentsPageClient({
  orgSlug,
  locale,
  existingCount,
}: {
  orgSlug: string;
  locale: string;
  existingCount: number;
}) {
  const t = useTranslations("orgAdmin");
  const [open, setOpen] = useState(false);
  const requiresPlan = existingCount >= 1;

  return (
    <>
      {/* Free tournament used notice */}
      {requiresPlan && (
        <div className="rounded-2xl border px-4 py-3 flex items-start gap-3"
          style={{ background: "rgba(220,38,38,0.05)", borderColor: "rgba(220,38,38,0.2)" }}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#DC2626" }} />
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>{t("freeTournamentUsed")}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
              {t("freeTournamentUsedDesc")}
            </p>
          </div>
        </div>
      )}

      {/* New Tournament CTA card */}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all group hover:scale-[1.01] hover:opacity-90 relative overflow-hidden"
        style={{
          borderColor: requiresPlan ? "rgba(37,99,235,0.4)" : `${ACCENT}40`,
          background: requiresPlan ? "rgba(37,99,235,0.04)" : `rgba(43,254,186,0.04)`,
          boxShadow: requiresPlan ? "0 0 32px rgba(37,99,235,0.06)" : `0 0 32px rgba(43,254,186,0.06)`,
        }}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: requiresPlan ? "radial-gradient(ellipse at 0% 50%, rgba(37,99,235,0.08), transparent 60%)" : "radial-gradient(ellipse at 0% 50%, rgba(43,254,186,0.08), transparent 60%)" }} />

        <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: requiresPlan ? "rgba(37,99,235,0.12)" : "rgba(43,254,186,0.12)", boxShadow: requiresPlan ? "0 0 20px rgba(37,99,235,0.25)" : `0 0 20px rgba(43,254,186,0.25)` }}>
          <Plus className="w-6 h-6" style={{ color: requiresPlan ? "#2563EB" : ACCENT }} />
        </div>
        <div className="relative flex-1">
          <p className="text-sm font-black" style={{ color: "var(--cat-text)" }}>{t("newTournament")}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            {requiresPlan ? t("choosePlanForTournament") : t("newTournamentHint")}
          </p>
        </div>
        <div className="relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black transition-all"
          style={{
            background: requiresPlan ? "#2563EB" : ACCENT,
            color: requiresPlan ? "#fff" : "#000",
            boxShadow: requiresPlan ? "0 0 16px rgba(37,99,235,0.4)" : `0 0 16px rgba(43,254,186,0.4)`,
          }}>
          <Sparkles className="w-3.5 h-3.5" />
          {requiresPlan ? "Starter / Pro / Elite" : t("create")}
        </div>
      </button>

      {open && (
        <TournamentCreateModal
          orgSlug={orgSlug}
          locale={locale}
          onClose={() => setOpen(false)}
          requiresPlan={requiresPlan}
        />
      )}
    </>
  );
}
