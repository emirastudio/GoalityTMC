"use client";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ThemeToggle } from "@/components/ui/theme-provider";
import { ArrowRight } from "lucide-react";

export function TournamentTopbar() {
  return (
    <header className="sticky top-0 z-50 h-12 flex items-center px-4 md:px-8 gap-4 bg-white border-b border-gray-200">
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <img src="/logo.png" alt="Goality" className="w-6 h-6 object-contain" />
        <span className="font-bold text-sm text-gray-900 hidden sm:block">Goality TMC</span>
      </Link>

      <nav className="flex items-center gap-1 ml-2">
        <Link href="/catalog" className="text-xs font-medium px-3 py-1.5 rounded text-gray-600 hover:text-gray-900">
          Catalog
        </Link>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <LanguageSwitcher variant="light" />
        <Link href="/login"
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-gray-900 text-white hover:bg-gray-800">
          Sign in <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </header>
  );
}
