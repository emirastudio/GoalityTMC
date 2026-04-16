"use client";

/**
 * /draw/created?s=<id> — success / preview screen the wizard lands on
 * right after a draw is persisted. Bundles together everything the
 * creator needs to do next: see the show, copy the share link, post
 * to socials, embed on their own site.
 *
 * Visitors who arrive here via the share link bypass this screen and
 * go straight to /draw/present — only the immediate post-create flow
 * routes through here.
 */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  CheckCircle,
  Copy,
  Check,
  Code2,
  Mail,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-provider";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export default function DrawCreatedPage() {
  const params = useSearchParams();
  const id = params?.get("s") ?? "";
  const t = useTranslations("drawCreated");

  const [origin, setOrigin] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const localePart = useMemo(() => {
    if (typeof window === "undefined") return "en";
    const m = window.location.pathname.match(/^\/(en|ru|et)\b/);
    return m?.[1] ?? "en";
  }, []);

  const presentUrl = origin
    ? `${origin}/${localePart}/draw/present?s=${id}`
    : "";
  const embedSrc = origin
    ? `${origin}/${localePart}/draw/present?s=${id}&embed=1`
    : "";
  const embedCode = embedSrc
    ? `<iframe src="${embedSrc}" width="100%" height="640" frameborder="0" allow="fullscreen" style="border-radius:24px;border:1px solid #1f2937;"></iframe>`
    : "";

  if (!id) {
    return (
      <main
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: "var(--cat-bg)", color: "var(--cat-text)" }}
      >
        <div className="text-center">
          <p
            className="text-sm mb-4"
            style={{ color: "var(--cat-text-muted)" }}
          >
            {t("missingId")}
          </p>
          <Link
            href="/draw"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
            style={{
              background: "var(--cat-accent)",
              color: "var(--cat-accent-text)",
            }}
          >
            {t("backToWizard")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen relative overflow-hidden"
      style={{ background: "var(--cat-bg)", color: "var(--cat-text)" }}
    >
      {/* Ambient glow echoes the landing's hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% -10%, rgba(43,254,186,0.14) 0%, transparent 50%)",
        }}
      />

      {/* Lean header — locale + theme controls only, no marketing nav */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5">
        <Link
          href="/draw"
          className="flex items-center gap-2.5"
          style={{ color: "var(--cat-text)" }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "var(--cat-accent)",
              color: "var(--cat-accent-text)",
            }}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-sm font-black">Draw Show</span>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <section className="relative z-[1] max-w-3xl mx-auto px-6 md:px-10 pt-8 pb-16 space-y-8">
        {/* Big "✓ created" hero */}
        <div className="text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-5"
            style={{
              background: "rgba(43,254,186,0.12)",
              color: "var(--cat-accent)",
              border: "1px solid rgba(43,254,186,0.3)",
            }}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {t("eyebrow")}
          </div>
          <h1
            className="text-3xl md:text-4xl font-black mb-3 tracking-tight"
            style={{ color: "var(--cat-text)" }}
          >
            {t("title")}
          </h1>
          <p
            className="text-base"
            style={{ color: "var(--cat-text-secondary)" }}
          >
            {t.rich("emailSent", {
              chip: (chunks) => (
                <span
                  className="inline-flex items-center gap-1 font-semibold"
                  style={{ color: "var(--cat-accent)" }}
                >
                  <Mail className="w-3.5 h-3.5" />
                  {chunks}
                </span>
              ),
            })}
          </p>
        </div>

        {/* Primary CTA: open the show */}
        <a
          href={presentUrl}
          className="block rounded-3xl p-6 md:p-8 text-center transition-transform hover:scale-[1.005]"
          style={{
            background:
              "linear-gradient(135deg, rgba(43,254,186,0.16), rgba(43,254,186,0.04))",
            border: "1px solid rgba(43,254,186,0.4)",
            boxShadow:
              "0 16px 40px -10px rgba(43,254,186,0.25)",
          }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color: "var(--cat-accent)" }}
          >
            {t("watchEyebrow")}
          </p>
          <p
            className="text-2xl md:text-3xl font-black mb-1"
            style={{ color: "var(--cat-text)" }}
          >
            {t("watchTitle")}
          </p>
          <p
            className="text-sm mb-5"
            style={{ color: "var(--cat-text-secondary)" }}
          >
            {t("watchSubtitle")}
          </p>
          <span
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold"
            style={{
              background: "var(--cat-accent)",
              color: "var(--cat-accent-text)",
              boxShadow: "0 12px 30px -8px rgba(43,254,186,0.4)",
            }}
          >
            {t("watchCta")}
            <ArrowRight className="w-4 h-4" />
          </span>
        </a>

        {/* Share link with copy */}
        <CopyBlock
          label={t("shareLinkLabel")}
          value={presentUrl}
          copyLabel={t("copy")}
          copiedLabel={t("copied")}
        />

        {/* Social share buttons */}
        <SocialBlock url={presentUrl} title={t("shareLabel")} />

        {/* Embed code */}
        <CopyBlock
          icon={<Code2 className="w-3.5 h-3.5" />}
          label={t("embedLabel")}
          hint={t("embedHint")}
          value={embedCode}
          copyLabel={t("copy")}
          copiedLabel={t("copied")}
          multiline
        />

        {/* Footer "new draw" link */}
        <div className="text-center pt-4">
          <Link
            href="/draw"
            className="inline-flex items-center gap-1.5 text-sm font-semibold"
            style={{ color: "var(--cat-text-muted)" }}
          >
            {t("newDraw")}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>
    </main>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────

function CopyBlock({
  label,
  hint,
  value,
  copyLabel,
  copiedLabel,
  icon,
  multiline,
}: {
  label: string;
  hint?: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
  icon?: React.ReactNode;
  multiline?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore — user can manually select */
    }
  }
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "var(--cat-card-bg)",
        border: "1px solid var(--cat-card-border)",
      }}
    >
      <div className="flex items-center justify-between mb-2 gap-2">
        <p
          className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5"
          style={{ color: "var(--cat-text-muted)" }}
        >
          {icon ?? null}
          {label}
        </p>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
          style={{
            background: "var(--cat-accent)",
            color: "var(--cat-accent-text)",
          }}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" /> {copiedLabel}
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" /> {copyLabel}
            </>
          )}
        </button>
      </div>
      {multiline ? (
        <textarea
          readOnly
          value={value}
          rows={3}
          className="w-full rounded-xl px-3 py-2 text-xs font-mono outline-none resize-none"
          style={{
            background: "var(--cat-input-bg, var(--cat-card-bg))",
            border: "1px solid var(--cat-card-border)",
            color: "var(--cat-text)",
          }}
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
        />
      ) : (
        <input
          readOnly
          value={value}
          className="w-full rounded-xl px-3 py-2 text-xs font-mono outline-none"
          style={{
            background: "var(--cat-input-bg, var(--cat-card-bg))",
            border: "1px solid var(--cat-card-border)",
            color: "var(--cat-text)",
          }}
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
      )}
      {hint && (
        <p
          className="text-[11px] mt-2"
          style={{ color: "var(--cat-text-muted)" }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

function SocialBlock({ url, title }: { url: string; title: string }) {
  // Encode once for use across all share endpoints. The default text
  // is locale-agnostic and short enough for Twitter/X.
  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent("Check out this tournament draw 🎬");
  const buttons: { label: string; href: string; bg: string }[] = [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${text}%20${encoded}`,
      bg: "#25D366",
    },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${encoded}&text=${text}`,
      bg: "#26A5E4",
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
      bg: "#1877F2",
    },
    {
      label: "X / Twitter",
      href: `https://twitter.com/intent/tweet?url=${encoded}&text=${text}`,
      bg: "#0f1419",
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
      bg: "#0A66C2",
    },
  ];
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "var(--cat-card-bg)",
        border: "1px solid var(--cat-card-border)",
      }}
    >
      <p
        className="text-xs font-bold uppercase tracking-widest mb-3"
        style={{ color: "var(--cat-text-muted)" }}
      >
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {buttons.map((b) => (
          <a
            key={b.label}
            href={b.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: b.bg }}
          >
            {b.label}
            <ExternalLink className="w-3 h-3 opacity-80" />
          </a>
        ))}
      </div>
    </div>
  );
}
