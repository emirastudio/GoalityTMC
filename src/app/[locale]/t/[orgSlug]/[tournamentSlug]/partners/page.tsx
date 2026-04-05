"use client";
import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";

export default function PartnersPage() {
  const { org } = useTournamentPublic();
  const t = useTranslations("tournament");
  const brand = org.brandColor;

  return (
    <div className="rounded-2xl p-8 flex flex-col items-center gap-4 text-center"
      style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: brand + "15" }}>
        <Star className="w-7 h-7" style={{ color: brand }} />
      </div>
      <div>
        <p className="text-base font-bold" style={{ color: "var(--cat-text)" }}>{t("partnersTitle")}</p>
        <p className="text-sm mt-1" style={{ color: "var(--cat-text-muted)" }}>
          {t("partnersEmpty")}
        </p>
      </div>
    </div>
  );
}
