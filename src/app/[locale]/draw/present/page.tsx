"use client";

/**
 * /draw/present — standalone presentation route.
 *
 * State is passed via the `?s=` query param (base64url of
 * ShareableDrawState). Decoding happens client-side so the URL is a
 * durable share-link: copy it, open on the projector, copy again,
 * resend — same show every time.
 *
 * On decode failure we show an invalid-link panel pointing back to the
 * wizard rather than rendering an empty stage.
 */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertCircle, Copy, Check, ArrowLeft, Loader2 } from "lucide-react";
import { decodeDrawState } from "@/lib/draw-show/encode-state";
import { isShortId } from "@/lib/draw-show/short-id";
import type {
  DrawConfig,
  DrawInputTeam,
  ShareableDrawState,
} from "@/lib/draw-show/types";
import { DrawStage } from "@/components/draw-show/DrawStage";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; state: ShareableDrawState }
  | { status: "invalid" };

export default function DrawPresentPage() {
  const params = useSearchParams();
  const sParam = params?.get("s") ?? "";
  const t = useTranslations("drawPresent");

  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [showShareToast, setShowShareToast] = useState(false);
  const [stageClosed, setStageClosed] = useState(false);

  // Resolve the `s` query param in one of two modes:
  //   • short id (6-char from our alphabet) → fetch from /api/draw/s/<id>
  //   • anything else                       → try to decode as base64
  // This keeps the legacy encoded links working while the short-URL
  // flow is the default for new draws.
  useEffect(() => {
    let cancelled = false;

    if (!sParam) {
      setLoadState({ status: "invalid" });
      return;
    }

    if (isShortId(sParam)) {
      fetch(`/api/draw/s/${sParam}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((data: { state: ShareableDrawState }) => {
          if (cancelled) return;
          setLoadState({ status: "ready", state: data.state });
        })
        .catch(() => {
          if (!cancelled) setLoadState({ status: "invalid" });
        });
      return () => {
        cancelled = true;
      };
    }

    const decoded = decodeDrawState(sParam);
    setLoadState(decoded ? { status: "ready", state: decoded } : { status: "invalid" });
    return () => {
      cancelled = true;
    };
  }, [sParam]);

  // Expose the full share URL for the "Copy link" button. Must run in
  // the browser because location is undefined during SSR.
  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(window.location.href);
    }
  }, []);

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowShareToast(true);
      window.setTimeout(() => setShowShareToast(false), 2000);
    } catch {
      // Clipboard may be blocked (e.g. non-HTTPS). Silent fail — the
      // user can still manually copy the address bar.
    }
  }

  if (loadState.status === "loading") {
    return <LoadingPanel />;
  }
  if (loadState.status === "invalid") {
    return <InvalidLinkPanel />;
  }

  const decoded = loadState.state;
  const teams: DrawInputTeam[] = decoded.teams.map((tm) => ({
    id: tm.id,
    name: tm.name,
    countryCode: tm.countryCode ?? null,
    logoUrl: tm.logoUrl ?? null,
    pot: tm.pot ?? null,
  }));
  const config: DrawConfig = {
    mode: decoded.config.mode,
    groupCount: decoded.config.groupCount,
    seedingMode: decoded.config.seedingMode,
    seed: decoded.config.seed,
  };

  // When the user closes the stage (ESC or X) we don't kick them off
  // the page — we show a "replay / copy link / back to wizard" panel.
  if (stageClosed) {
    return (
      <AfterStagePanel
        shareUrl={shareUrl}
        onCopy={copyShareLink}
        showShareToast={showShareToast}
        onReplay={() => setStageClosed(false)}
        t={t}
      />
    );
  }

  // Branding fallthrough: wizard-provided tournament name/division/logo
  // win, otherwise we show the default "Tournament Draw" title.
  const branding = decoded.branding;
  const stageTitle = branding?.tournamentName?.trim() || t("defaultTitle");
  const stageSubtitle = branding?.divisionName?.trim() || undefined;
  const stageLogo = branding?.logoUrl?.trim() || null;

  return (
    <>
      <DrawStage
        teams={teams}
        config={config}
        title={stageTitle}
        subtitle={stageSubtitle}
        logoUrl={stageLogo}
        totalTeamsCount={teams.length}
        onClose={() => setStageClosed(true)}
      />
    </>
  );
}

function LoadingPanel() {
  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--cat-bg)", color: "var(--cat-text-muted)" }}
    >
      <Loader2 className="w-6 h-6 animate-spin" />
    </main>
  );
}

// ─── Sub-views ────────────────────────────────────────────────────────

function InvalidLinkPanel() {
  const t = useTranslations("drawPresent");
  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--cat-bg)", color: "var(--cat-text)" }}
    >
      <div
        className="max-w-md w-full rounded-3xl p-8 text-center"
        style={{
          background: "var(--cat-card-bg)",
          border: "1px solid rgba(239,68,68,0.3)",
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(239,68,68,0.12)" }}
        >
          <AlertCircle className="w-7 h-7" style={{ color: "#ef4444" }} />
        </div>
        <h1 className="text-xl font-black mb-2">{t("invalidTitle")}</h1>
        <p
          className="text-sm mb-6"
          style={{ color: "var(--cat-text-muted)" }}
        >
          {t("invalidBody")}
        </p>
        <Link
          href="/draw"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
          style={{
            background: "var(--cat-accent)",
            color: "var(--cat-accent-text)",
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          {t("invalidCta")}
        </Link>
      </div>
    </main>
  );
}

function AfterStagePanel({
  shareUrl,
  onCopy,
  showShareToast,
  onReplay,
  t,
}: {
  shareUrl: string;
  onCopy: () => void;
  showShareToast: boolean;
  onReplay: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 py-10"
      style={{ background: "var(--cat-bg)", color: "var(--cat-text)" }}
    >
      <div
        className="max-w-md w-full rounded-3xl p-8"
        style={{
          background: "var(--cat-card-bg)",
          border: "1px solid var(--cat-card-border)",
        }}
      >
        <p
          className="text-xs font-bold uppercase tracking-widest mb-2"
          style={{ color: "var(--cat-accent)" }}
        >
          {t("afterEyebrow")}
        </p>
        <h1 className="text-2xl font-black mb-2">{t("afterTitle")}</h1>
        <p
          className="text-sm mb-6 leading-relaxed"
          style={{ color: "var(--cat-text-secondary)" }}
        >
          {t("afterBody")}
        </p>

        <div className="space-y-2 mb-6">
          <label
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--cat-text-muted)" }}
          >
            {t("shareLinkLabel")}
          </label>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 rounded-xl px-3 py-2 text-xs font-mono outline-none"
              style={{
                background: "var(--cat-input-bg, var(--cat-card-bg))",
                border: "1px solid var(--cat-card-border)",
                color: "var(--cat-text)",
              }}
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={onCopy}
              className="px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
              style={{
                background: "var(--cat-accent)",
                color: "var(--cat-accent-text)",
              }}
            >
              {showShareToast ? (
                <>
                  <Check className="w-3.5 h-3.5" /> {t("copied")}
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> {t("copy")}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={onReplay}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold"
            style={{
              background: "var(--cat-tag-bg)",
              color: "var(--cat-text)",
            }}
          >
            {t("replay")}
          </button>
          <Link
            href="/draw"
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-center"
            style={{
              background: "var(--cat-accent)",
              color: "var(--cat-accent-text)",
            }}
          >
            {t("newDraw")}
          </Link>
        </div>

        <div
          className="mt-6 pt-6 border-t text-center"
          style={{ borderColor: "var(--cat-card-border)" }}
        >
          <p
            className="text-xs mb-2"
            style={{ color: "var(--cat-text-muted)" }}
          >
            {t("upsellTitle")}
          </p>
          <Link
            href="/"
            className="text-xs font-bold inline-flex items-center gap-1 hover:opacity-80"
            style={{ color: "var(--cat-accent)" }}
          >
            {t("upsellCta")} →
          </Link>
        </div>
      </div>
    </main>
  );
}
