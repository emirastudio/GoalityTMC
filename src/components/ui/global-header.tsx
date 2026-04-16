"use client";

import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/ui/theme-provider";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { DevNavWidget } from "@/components/ui/dev-nav-widget";
import { UserAvatarMenu } from "@/components/ui/user-avatar-menu";
import { ChevronDown } from "lucide-react";

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
  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-xl border-b shrink-0"
      style={{ background: "var(--cat-header-bg)", borderColor: "var(--cat-header-border)" }}
    >
      {/* Centered inner container — 90% width, max 1400px */}
      <div className="h-14 w-full px-4 md:w-[90%] md:px-0 max-w-[1400px] mx-auto grid grid-cols-[auto_1fr_auto] items-center gap-4 md:gap-6">

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
          {navLinks.map((link) => (
            <NavItem key={link.href} link={link} />
          ))}
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
            background: "var(--cat-card-bg)",
            border: "1px solid var(--cat-card-border)",
            boxShadow: "0 20px 60px -10px rgba(0,0,0,0.25)",
            backdropFilter: "blur(12px)",
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
