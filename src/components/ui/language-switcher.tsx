"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Globe } from "lucide-react";

const locales = [
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "et", label: "ET" },
] as const;

type Props = {
  variant?: "light" | "dark";
};

export function LanguageSwitcher({ variant = "dark" }: Props) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(newLocale: string) {
    router.replace(pathname, { locale: newLocale });
  }

  const baseStyle = variant === "light"
    ? "text-white/60 hover:text-white"
    : "text-text-secondary hover:text-text-primary";

  const activeStyle = variant === "light"
    ? "text-mint font-semibold"
    : "text-navy font-semibold";

  return (
    <div className="flex items-center gap-1">
      <Globe className={`w-4 h-4 ${variant === "light" ? "text-white/40" : "text-text-secondary"}`} />
      {locales.map(({ code, label }, i) => (
        <span key={code} className="flex items-center">
          {i > 0 && <span className={`mx-0.5 ${variant === "light" ? "text-white/20" : "text-border"}`}>/</span>}
          <button
            onClick={() => switchLocale(code)}
            className={`text-xs transition-colors cursor-pointer ${
              locale === code ? activeStyle : baseStyle
            }`}
          >
            {label}
          </button>
        </span>
      ))}
    </div>
  );
}
