"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Cookie, Settings, Check, X } from "lucide-react";

/**
 * GDPR cookie consent banner.
 *
 * Stores a single cookie `goality_cookie_consent` with a JSON payload:
 *   { v: 1, essential: true, analytics: bool, marketing: bool, decidedAt: iso }
 *
 * Rules:
 *  - Essential cookies (auth/JWT) are always on — GDPR allows strictly
 *    necessary cookies without consent.
 *  - Non-essential categories default to FALSE until the user actively
 *    opts in (opt-in, not opt-out — required by GDPR / ePrivacy).
 *  - Choice persists for 365 days. After that, banner shows again.
 *  - A global event `cookie-consent-updated` is fired on every decision
 *    so analytics scripts can subscribe and lazily attach.
 *  - A global helper `window.__goalityOpenCookieSettings()` reopens the
 *    banner (linked from footer / privacy page).
 */

const COOKIE_NAME = "goality_cookie_consent";
const COOKIE_VERSION = 1;
const COOKIE_MAX_AGE_DAYS = 365;

export type CookieConsent = {
  v: number;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
};

function readConsent(): CookieConsent | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  try {
    const raw = decodeURIComponent(match.split("=")[1]);
    const parsed = JSON.parse(raw) as CookieConsent;
    if (parsed.v !== COOKIE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(choice: Omit<CookieConsent, "v" | "essential" | "decidedAt">) {
  const payload: CookieConsent = {
    v: COOKIE_VERSION,
    essential: true,
    analytics: choice.analytics,
    marketing: choice.marketing,
    decidedAt: new Date().toISOString(),
  };
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie =
    `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(payload))}; ` +
    `path=/; max-age=${maxAge}; samesite=lax` +
    (typeof window !== "undefined" && window.location.protocol === "https:" ? "; secure" : "");
  try {
    window.dispatchEvent(new CustomEvent("cookie-consent-updated", { detail: payload }));
  } catch {}
}

export function CookieConsent() {
  const t = useTranslations("cookies");
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const open = useCallback(() => {
    const existing = readConsent();
    if (existing) {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
    }
    setExpanded(true);
    setVisible(true);
  }, []);

  useEffect(() => {
    // First-visit detection.
    const existing = readConsent();
    if (!existing) setVisible(true);
    // Expose a reopen handle for footer / privacy page links.
    type WithHandle = Window & { __goalityOpenCookieSettings?: () => void };
    (window as unknown as WithHandle).__goalityOpenCookieSettings = open;
    return () => {
      (window as unknown as WithHandle).__goalityOpenCookieSettings = undefined;
    };
  }, [open]);

  if (!visible) return null;

  const acceptAll = () => {
    writeConsent({ analytics: true, marketing: true });
    setVisible(false);
  };
  const rejectAll = () => {
    writeConsent({ analytics: false, marketing: false });
    setVisible(false);
  };
  const saveChoices = () => {
    writeConsent({ analytics, marketing });
    setVisible(false);
  };

  return (
    <div
      className="fixed bottom-3 left-3 right-3 md:left-auto md:right-4 md:bottom-4 md:max-w-[440px] z-[1000] rounded-2xl border shadow-2xl"
      style={{
        background: "var(--cat-card-bg, #0f172a)",
        borderColor: "var(--cat-card-border, rgba(148,163,184,0.2))",
        color: "var(--cat-text, #f8fafc)",
        boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
      }}
      role="dialog"
      aria-live="polite"
      aria-label={t("title")}
    >
      <div className="p-4 md:p-5">
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--cat-badge-open-bg, rgba(43,254,186,0.15))" }}
          >
            <Cookie className="w-4 h-4" style={{ color: "var(--cat-accent, #2BFEBA)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
              {t("title")}
            </p>
            <p
              className="text-[12px] mt-1 leading-relaxed"
              style={{ color: "var(--cat-text-muted, #94a3b8)" }}
            >
              {t("body")}{" "}
              <Link
                href="/privacy"
                className="underline font-medium"
                style={{ color: "var(--cat-accent, #2BFEBA)" }}
              >
                {t("learnMore")}
              </Link>
            </p>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-2">
            <CategoryRow
              title={t("essentialTitle")}
              desc={t("essentialDesc")}
              checked={true}
              disabled
              onChange={() => {}}
            />
            <CategoryRow
              title={t("analyticsTitle")}
              desc={t("analyticsDesc")}
              checked={analytics}
              onChange={setAnalytics}
            />
            <CategoryRow
              title={t("marketingTitle")}
              desc={t("marketingDesc")}
              checked={marketing}
              onChange={setMarketing}
            />
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {expanded ? (
            <button
              onClick={saveChoices}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-bold transition-all hover:opacity-90"
              style={{ background: "var(--cat-accent, #2BFEBA)", color: "#0A0E14" }}
            >
              <Check className="w-3.5 h-3.5" />
              {t("saveChoices")}
            </button>
          ) : (
            <>
              <button
                onClick={acceptAll}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-bold transition-all hover:opacity-90"
                style={{ background: "var(--cat-accent, #2BFEBA)", color: "#0A0E14" }}
              >
                <Check className="w-3.5 h-3.5" />
                {t("acceptAll")}
              </button>
              <button
                onClick={rejectAll}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-bold transition-all hover:opacity-80"
                style={{
                  background: "var(--cat-tag-bg, rgba(148,163,184,0.08))",
                  color: "var(--cat-text, #f8fafc)",
                  border: "1px solid var(--cat-card-border, rgba(148,163,184,0.2))",
                }}
              >
                <X className="w-3.5 h-3.5" />
                {t("rejectAll")}
              </button>
            </>
          )}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all hover:opacity-80"
            style={{ color: "var(--cat-text-muted, #94a3b8)" }}
          >
            <Settings className="w-3.5 h-3.5" />
            {expanded ? t("hideSettings") : t("customize")}
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({
  title,
  desc,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-xl border"
      style={{
        background: "var(--cat-tag-bg, rgba(148,163,184,0.06))",
        borderColor: "var(--cat-card-border, rgba(148,163,184,0.2))",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className="relative shrink-0 w-9 h-5 rounded-full transition-all mt-0.5"
        style={{
          background: checked ? "var(--cat-accent, #2BFEBA)" : "var(--cat-card-border, rgba(148,163,184,0.35))",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
          style={{
            background: "#fff",
            left: checked ? "18px" : "2px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold" style={{ color: "var(--cat-text)" }}>
          {title}
        </p>
        <p className="text-[11px] leading-relaxed mt-0.5" style={{ color: "var(--cat-text-muted, #94a3b8)" }}>
          {desc}
        </p>
      </div>
    </div>
  );
}

/**
 * Hook to read the current consent choice.
 * Returns null until the user has decided.
 */
export function useCookieConsent(): CookieConsent | null {
  const [state, setState] = useState<CookieConsent | null>(null);
  useEffect(() => {
    setState(readConsent());
    const handler = (e: Event) => setState((e as CustomEvent<CookieConsent>).detail);
    window.addEventListener("cookie-consent-updated", handler);
    return () => window.removeEventListener("cookie-consent-updated", handler);
  }, []);
  return state;
}
