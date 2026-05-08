"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Rocket, Pause, AlertCircle, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Prominent call-to-action on the tournament admin Overview page that lets
 * super-admins / org admins open or pause registration in one click — without
 * having to dig into the long Setup form.
 *
 * Two visual states:
 *   1. registrationOpen=false → big green button "Open registration" + brief
 *      explanation. Disabled iff `notReadyHref` is provided (= setup checklist
 *      incomplete) — in that case shows a "Complete setup first" link instead.
 *   2. registrationOpen=true → emerald success card with the public registration
 *      URL, plus a small "Pause registration" secondary action.
 *
 * Calls PATCH /api/admin/tournaments which already enforces server-side gates
 * (free-plan tournament limit, unpaid extras). Surface those errors as alerts.
 */
export function RegistrationCTACard({
  tournamentId,
  initialRegistrationOpen,
  registerUrl,
  notReadyHref,
}: {
  tournamentId: number;
  initialRegistrationOpen: boolean;
  registerUrl: string;
  /** When set, registration is not ready to open — link to Settings instead. */
  notReadyHref?: string | null;
}) {
  const t = useTranslations("orgAdmin");
  const router = useRouter();
  const [open, setOpen] = useState(initialRegistrationOpen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(target: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tournaments?tournamentId=${tournamentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationOpen: target }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.message ?? d.error ?? "Failed to update");
        return;
      }
      setOpen(target);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  // ── State 1: closed → big "Open" CTA ────────────────────────────────────────
  if (!open) {
    if (notReadyHref) {
      return (
        <div
          className="rounded-2xl border p-5 flex items-center gap-4"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(245,158,11,0.12)" }}>
            <AlertCircle className="w-5 h-5" style={{ color: "#f59e0b" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold th-text">{t("regCtaCompleteSetupTitle")}</p>
            <p className="text-sm th-text-2 mt-0.5">{t("regCtaCompleteSetupDesc")}</p>
          </div>
          <Link
            href={notReadyHref}
            className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
            style={{ background: "var(--cat-accent)", color: "#fff" }}
          >
            {t("regCtaCompleteSetupBtn")} →
          </Link>
        </div>
      );
    }

    return (
      <div
        className="rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.04))",
          border: "1px solid rgba(16,185,129,0.25)",
        }}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-black th-text">{t("regCtaReadyTitle")}</p>
            <p className="text-sm th-text-2 mt-0.5">{t("regCtaReadyDesc")}</p>
          </div>
          <button
            type="button"
            onClick={() => toggle(true)}
            disabled={busy}
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-white transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}
          >
            <Rocket className="w-4 h-4" />
            {busy ? t("regCtaWorking") : t("regCtaOpenBtn")}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-sm font-medium" style={{ color: "#dc2626" }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  // ── State 2: open → success card with link + pause action ───────────────────
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "linear-gradient(135deg, rgba(16,185,129,0.10), rgba(5,150,105,0.05))",
        border: "1px solid rgba(16,185,129,0.35)",
      }}
    >
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(16,185,129,0.18)" }}>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-black th-text">{t("regCtaLiveTitle")}</p>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: "rgba(16,185,129,0.2)", color: "#059669" }}>
              LIVE
            </span>
          </div>
          <a
            href={registerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm th-text-2 mt-0.5 inline-flex items-center gap-1.5 hover:underline truncate max-w-full"
          >
            <span className="truncate">{registerUrl.replace(/^https?:\/\//, "")}</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        </div>
        <button
          type="button"
          onClick={() => toggle(false)}
          disabled={busy}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)", border: "1px solid var(--cat-card-border)" }}
        >
          <Pause className="w-3.5 h-3.5" />
          {busy ? t("regCtaWorking") : t("regCtaPauseBtn")}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-sm font-medium" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
    </div>
  );
}
