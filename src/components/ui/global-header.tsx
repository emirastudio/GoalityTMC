"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/ui/theme-provider";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { DevNavWidget } from "@/components/ui/dev-nav-widget";
import { UserAvatarMenu } from "@/components/ui/user-avatar-menu";
import { ChevronDown, Menu, X } from "lucide-react";

export type NavLink = {
  label: string;
  href: string;
  anchor?: boolean;
  /**
   * Optional submenu. When present, the top-level label is still a
   * link (for keyboard and search engine users) but hovering reveals
   * a floating list of sub-items. Each sub-item can have its own
   * description rendered underneath the label.
   */
  children?: NavLinkChild[];
};

export type NavLinkChild = {
  label: string;
  href: string;
  description?: string;
  /** Optional short badge next to the label — e.g. "New". */
  badge?: string;
  external?: boolean;
};

type Props = {
  navLinks?: NavLink[];
  rightContent?: React.ReactNode;
};

export function GlobalHeader({ navLinks = [], rightContent }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close the mobile panel on outside click / Escape / route change.
  useEffect(() => {
    if (!mobileOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setMobileOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header
      ref={panelRef}
      className="gh-root sticky top-0 z-50 backdrop-blur-xl border-b shrink-0"
      style={{ background: "var(--cat-header-bg)", borderColor: "var(--cat-header-border)" }}
    >
      {/* Centered inner container — 90% width, max 1400px */}
      <div className="h-14 w-full px-4 md:w-[90%] md:px-0 max-w-[1400px] mx-auto grid grid-cols-[auto_1fr_auto] items-center gap-4 md:gap-6">

        {/* ── Left: Logo ── */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0" onClick={closeMobile}>
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

        {/* ── Center: Nav links (desktop only) ── */}
        <nav className="hidden md:flex items-center justify-center gap-1">
          {navLinks.map((link) => (
            <NavItem key={link.href} link={link} />
          ))}
        </nav>

        {/* ── Right: Controls + custom content (desktop) / hamburger (mobile) ──
            Both live in the same grid cell — only one is ever visible — so
            the 3-column track never has to reflow a 4th item onto a new row. */}
        <div className="flex items-center">
          <div className="hidden md:flex items-center gap-4">
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

          <button
            type="button"
            className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center border transition-colors"
            style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="w-4.5 h-4.5" style={{ color: "var(--cat-text-secondary)" }} />
            ) : (
              <Menu className="w-4.5 h-4.5" style={{ color: "var(--cat-text-secondary)" }} />
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile panel ── */}
      {mobileOpen && (
        <div
          className="md:hidden absolute inset-x-0 top-full border-b overflow-y-auto"
          style={{
            background: "var(--cat-dropdown-bg)",
            borderColor: "var(--cat-header-border)",
            maxHeight: "calc(100vh - 56px)",
          }}
        >
          <div className="px-4 py-3 flex flex-col">
            {navLinks.length > 0 && (
              <nav className="flex flex-col gap-0.5 pb-2 mb-2 border-b" style={{ borderColor: "var(--cat-card-border)" }}>
                {navLinks.map((link) => (
                  <MobileNavItem key={link.href} link={link} onNavigate={closeMobile} />
                ))}
              </nav>
            )}

            <div className="flex items-center justify-between gap-3 py-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>

            {rightContent && (
              <div
                className="pt-3 mt-1 border-t flex flex-col items-stretch gap-2"
                style={{ borderColor: "var(--cat-card-border)" }}
                onClick={closeMobile}
              >
                {rightContent}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

/**
 * Single nav item — plain link when there's no `children`, or a
 * hover-revealed dropdown panel when there is. The dropdown uses
 * pure CSS (focus-within + hover via Tailwind's group-hover) so
 * there's no mount/unmount flicker on quick cursor passes, and it
 * stays reachable via keyboard tab.
 */
function NavItem({ link }: { link: NavLink }) {
  const hasDropdown = !!link.children && link.children.length > 0;
  const commonClass =
    "px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors inline-flex items-center gap-1";
  const commonStyle = { color: "var(--cat-text-secondary)" };

  const trigger = link.anchor ? (
    <a href={link.href} className={commonClass} style={commonStyle}>
      {link.label}
      {hasDropdown && <ChevronDown className="w-3 h-3 opacity-60" />}
    </a>
  ) : (
    <Link href={link.href} className={commonClass} style={commonStyle}>
      {link.label}
      {hasDropdown && <ChevronDown className="w-3 h-3 opacity-60" />}
    </Link>
  );

  if (!hasDropdown) return trigger;

  return (
    <div className="relative group">
      {trigger}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible focus-within:opacity-100 focus-within:visible transition-opacity"
        style={{ zIndex: 60 }}
      >
        <div
          className="rounded-2xl p-2 min-w-[280px] flex flex-col gap-0.5"
          style={{
            // Use dropdown-specific opaque token so the panel doesn't
            // bleed into the page content behind it (the card token is
            // intentionally semi-transparent for card grids).
            background: "var(--cat-dropdown-bg)",
            border: "1px solid var(--cat-card-border)",
            boxShadow: "0 20px 60px -10px rgba(0,0,0,0.55)",
          }}
        >
          {link.children!.map((child) => (
            <DropdownItem key={child.href} child={child} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DropdownItem({ child }: { child: NavLinkChild }) {
  const body = (
    <div className="flex flex-col gap-0.5 px-3 py-2.5 rounded-xl transition-colors hover:bg-[var(--cat-tag-bg)]">
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-semibold" style={{ color: "var(--cat-text)" }}>
          {child.label}
        </span>
        {child.badge && (
          <span
            className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
            style={{
              background: "rgba(43,254,186,0.15)",
              color: "var(--cat-accent)",
            }}
          >
            {child.badge}
          </span>
        )}
      </div>
      {child.description && (
        <span className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
          {child.description}
        </span>
      )}
    </div>
  );
  return child.external ? (
    <a href={child.href} target="_blank" rel="noopener noreferrer">
      {body}
    </a>
  ) : (
    <Link href={child.href}>{body}</Link>
  );
}

/**
 * Mobile nav item — flat, always-expanded (no hover, touch has no
 * hover state). Top-level label is a link; children (if any) render
 * indented right below it instead of in a floating panel.
 */
function MobileNavItem({ link, onNavigate }: { link: NavLink; onNavigate: () => void }) {
  const hasDropdown = !!link.children && link.children.length > 0;
  const linkClass = "block px-2 py-2.5 rounded-lg text-[14px] font-semibold transition-colors";
  const linkStyle = { color: "var(--cat-text)" };

  return (
    <div>
      {link.anchor ? (
        <a href={link.href} onClick={onNavigate} className={linkClass} style={linkStyle}>
          {link.label}
        </a>
      ) : (
        <Link href={link.href} onClick={onNavigate} className={linkClass} style={linkStyle}>
          {link.label}
        </Link>
      )}
      {hasDropdown && (
        <div className="pl-3 flex flex-col gap-0.5 pb-1.5">
          {link.children!.map((child) =>
            child.external ? (
              <a
                key={child.href}
                href={child.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onNavigate}
                className="px-2 py-2 rounded-lg text-[13px]"
                style={{ color: "var(--cat-text-secondary)" }}
              >
                {child.label}
              </a>
            ) : (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className="px-2 py-2 rounded-lg text-[13px]"
                style={{ color: "var(--cat-text-secondary)" }}
              >
                {child.label}
              </Link>
            )
          )}
        </div>
      )}
    </div>
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
    <UserAvatarMenu signInLabel={signInLabel} getStartedLabel={getStartedLabel} />
  );
}

/**
 * Reusable logout button for admin pages.
 * Pass as `rightContent` to GlobalHeader.
 */
export function AdminHeaderActions({
  // logoutLabel kept for prop-compat (callers still pass it) — the
  // user dropdown owns the actual sign-out copy now.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      {/* From the per-tournament team area we surface a one-click way
          back to the club-level pages (other tournaments, profile). */}
      {currentArea === "team" && (
        <a
          href="/club/dashboard"
          className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-opacity hover:opacity-70 cursor-pointer"
          style={{ color: "var(--cat-text-muted)" }}
        >
          Кабинет клуба
        </a>
      )}
      {isSuper && <DevNavWidget currentArea={currentArea} />}
      {/* Always visible — identifies who's logged in, links to their
          cabinet, and owns the sign-out action. Replaces the bare
          "Log out" link the admin pages used to render. */}
      <UserAvatarMenu />
    </div>
  );
}
