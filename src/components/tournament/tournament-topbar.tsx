"use client";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ThemeToggle } from "@/components/ui/theme-provider";
import { ArrowRight } from "lucide-react";

export function TournamentTopbar() {
  return (
    <header className="sticky top-0 z-50 h-12 flex items-center px-4 md:px-8 gap-4"
      style={{ background: "var(--cat-header-bg)", borderBottom: "1px solid var(--cat-header-border)", backdropFilter: "blur(12px)" }}>
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <img src="/logo.png" alt="Goality" className="w-7 h-7 rounded-xl object-contain" />
        <span className="font-black text-[14px] tracking-tight hidden sm:block" style={{ color: "var(--cat-text)" }}>Goality</span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full hidden sm:block" style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}>TMC</span>
      </Link>

      {/* Nav */}
      <nav className="flex items-center gap-1 ml-2">
        <Link href="/catalog" className="text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors hover:opacity-80" style={{ color: "var(--cat-text-secondary)" }}>
          Catalog
        </Link>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <LanguageSwitcher variant="light" />
        <Link href="/login"
          className="hidden sm:inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
          style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}>
          Sign in <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </header>
  );
}
