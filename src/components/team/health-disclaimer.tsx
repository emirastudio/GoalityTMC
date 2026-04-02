"use client";

import { useTranslations } from "next-intl";
import { ShieldAlert } from "lucide-react";

export function HealthDisclaimer() {
  const t = useTranslations("booking");

  return (
    <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 flex gap-3">
      <ShieldAlert className="w-5 h-5 text-gold-dark shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-gold-dark">{t("healthDisclaimerTitle")}</p>
        <p className="text-xs th-text-2 mt-1 leading-relaxed">{t("healthDisclaimer")}</p>
      </div>
    </div>
  );
}
