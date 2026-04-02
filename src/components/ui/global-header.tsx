"use client";

import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/ui/theme-provider";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ArrowRight } from "lucide-react";
import { DevNavWidget } from "@/components/ui/dev-nav-widget";

export type NavLink = { label: string; href: string; anchor?: boolean };

type Props = {
  navLinks?: NavLink[];
  rightContent?: React.ReactNode;
};

export function GlobalHeader({ navLinks = [], rightContent }: Props) {
  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-xl border-b shrink-0"
      style={{ background: "var(--cat-header-bg)", borderColor: "var(--cat-header-border)" }}
    >
      {/* Centered inner container — 90% width, max 1400px */}
      <div className="h-14 w-[90%] max-w-[1400px] mx-auto grid grid-cols-[auto_1fr_auto] items-center gap-6">

        {/* ── Left: Logo ── */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.08)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.10), 0 4px 14px var(--cat-accent-glow)",
            }}
          >
            <img src="/playGrowWin1.png" alt="Goality" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-[15px] tracking-tight" style={{ color: "var(--cat-text)" }}>
            Goality TMC
          </span>
        </Link>

        {/* ── Center: Nav links ── */}
        <nav className="hidden md:flex items-center justify-center gap-1">
          {navLinks.map(({ label, href, anchor }) =>
            anchor ? (
              <a
                key={href}
                href={href}
                className="px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                style={{ color: "var(--cat-text-secondary)" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "var(--cat-text)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--cat-text-secondary)")}
              >
                {label}
              </a>
            ) : (
              <Link
                key={href}
                href={href}
                className="px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                style={{ color: "var(--cat-text-secondary)" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "var(--cat-text)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--cat-text-secondary)")}
              >
                {label}
              </Link>
            )
          )}
        </nav>

        {/* ── Right: Controls + custom content ── */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <LanguageSwitcher />
          {rightContent && (
            <>
              {/* Thin separator */}
              <div className="w-px h-4 shrink-0" style={{ background: "var(--cat-card-border)" }} />
              {rightContent}
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/**
 * Reusable right-side buttons for public pages (Sign in + Get started).
 * Pass as `rightContent` to GlobalHeader.
 */
export function PublicHeaderActions({
  signInLabel = "Sign in",
  getStartedLabel = "Get started",
}: {
  signInLabel?: string;
  getStartedLabel?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/login"
        className="hidden sm:block px-3 py-1.5 rounded-lg text-[13px] font-medium transition-opacity hover:opacity-70"
        style={{ color: "var(--cat-text-secondary)" }}
      >
        {signInLabel}
      </Link>
      <Link
        href="/onboarding"
        className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-opacity hover:opacity-90"
        style={{
          background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))",
          color: "var(--cat-accent-text)",
        }}
      >
        {getStartedLabel} <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

/**
 * Reusable logout button for admin pages.
 * Pass as `rightContent` to GlobalHeader.
 */
export function AdminHeaderActions({
  logoutLabel = "Log out",
  isSuper = false,
  currentArea = "super" as "super" | "org" | "team",
}: {
  logoutLabel?: string;
  isSuper?: boolean;
  currentArea?: "super" | "org" | "team";
}) {
  return (
    <div className="flex items-center gap-3">
      {isSuper && <DevNavWidget currentArea={currentArea} />}
      <form action="/api/auth/logout" method="POST">
        <button
          type="submit"
          className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-opacity hover:opacity-70 cursor-pointer"
          style={{ color: "var(--cat-text-muted)" }}
        >
          {logoutLabel}
        </button>
      </form>
    </div>
  );
}
