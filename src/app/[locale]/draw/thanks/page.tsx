"use client";

/**
 * /draw/thanks?cs=<session_id> — Stripe's success_url lands here.
 *
 * Payment is confirmed by Stripe at this point, but the webhook that
 * actually creates the draw may arrive a second or two behind. We
 * poll /api/draw/thanks until it returns the draw id, then replace
 * the URL with /draw/created?s=<id>. A friendly spinner in between
 * so the user never sees a dead end.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

const POLL_INTERVAL_MS = 1200;
const MAX_ATTEMPTS = 40; // ~48 s — Stripe webhooks usually land in ≤ 5

export default function DrawThanksPage() {
  const params = useSearchParams();
  const sessionId = params?.get("cs") ?? "";
  const router = useRouter();
  const t = useTranslations("drawThanks");

  const [status, setStatus] = useState<
    "pending" | "ready" | "timeout" | "error"
  >("pending");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }
    let cancelled = false;
    let attemptCount = 0;

    async function poll() {
      if (cancelled) return;
      attemptCount++;
      setAttempts(attemptCount);
      try {
        const res = await fetch(
          `/api/draw/thanks?cs=${encodeURIComponent(sessionId)}`,
        );
        if (!res.ok) {
          setStatus("error");
          return;
        }
        const data = (await res.json()) as {
          id?: string;
          pending?: boolean;
        };
        if (data.id) {
          setStatus("ready");
          router.replace(`/draw/created?s=${data.id}`);
          return;
        }
        if (attemptCount >= MAX_ATTEMPTS) {
          setStatus("timeout");
          return;
        }
        window.setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (attemptCount >= MAX_ATTEMPTS) {
          setStatus("timeout");
          return;
        }
        window.setTimeout(poll, POLL_INTERVAL_MS);
      }
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--cat-bg)", color: "var(--cat-text)" }}
    >
      <div
        className="rounded-3xl p-8 max-w-md w-full text-center"
        style={{
          background: "var(--cat-card-bg)",
          border: "1px solid var(--cat-card-border)",
          boxShadow: "0 24px 60px -20px rgba(0,0,0,0.35)",
        }}
      >
        {status === "pending" || status === "ready" ? (
          <>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{
                background: "rgba(43,254,186,0.12)",
                color: "var(--cat-accent)",
              }}
            >
              {status === "ready" ? (
                <CheckCircle className="w-7 h-7" />
              ) : (
                <Loader2 className="w-7 h-7 animate-spin" />
              )}
            </div>
            <h1 className="text-xl font-black mb-2">
              {status === "ready" ? t("readyTitle") : t("pendingTitle")}
            </h1>
            <p
              className="text-sm"
              style={{ color: "var(--cat-text-secondary)" }}
            >
              {status === "ready" ? t("readyBody") : t("pendingBody")}
            </p>
            {status === "pending" && attempts > 4 && (
              <p
                className="text-[11px] mt-4"
                style={{ color: "var(--cat-text-muted)" }}
              >
                {t("pendingSlow", { seconds: attempts })}
              </p>
            )}
          </>
        ) : (
          <>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{
                background: "rgba(239,68,68,0.12)",
                color: "#ef4444",
              }}
            >
              <AlertCircle className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black mb-2">{t("errorTitle")}</h1>
            <p
              className="text-sm mb-4"
              style={{ color: "var(--cat-text-secondary)" }}
            >
              {status === "timeout" ? t("timeoutBody") : t("errorBody")}
            </p>
            <a
              href="/draw"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
              style={{
                background: "var(--cat-accent)",
                color: "var(--cat-accent-text)",
              }}
            >
              {t("backCta")}
            </a>
          </>
        )}
      </div>
    </main>
  );
}
