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

export function LanguageSwitcher({ variant: _variant }: Props) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(newLocale: string) {
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <div className="flex items-center gap-1">
      <Globe className="w-4 h-4" style={{ color: "var(--cat-text-muted)" }} />
      {locales.map(({ code, label }, i) => (
        <span key={code} className="flex items-center">
          {i > 0 && <span className="mx-0.5" style={{ color: "var(--cat-text-faint)" }}>/</span>}
          <button
            onClick={() => switchLocale(code)}
            className="text-xs transition-colors cursor-pointer hover:opacity-80"
            style={{
              color: locale === code ? "var(--cat-accent)" : "var(--cat-text-muted)",
              fontWeight: locale === code ? 700 : 500,
            }}
          >
            {label}
          </button>
        </span>
      ))}
    </div>
  );
}
