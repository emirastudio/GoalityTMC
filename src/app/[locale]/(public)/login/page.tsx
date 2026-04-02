"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import {
  ArrowRight, Trophy, Users, CreditCard, ArrowLeft,
  Search, Building2, MapPin, X, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Club search ──────────────────────────────────────────────────────────────

type ClubResult = {
  id: number;
  name: string;
  country: string | null;
  city: string | null;
  badgeUrl: string | null;
  tournamentId: number;
  teamCount: number;
};

function ClubSearchStep({
  t,
  onSelect,
  onSkip,
}: {
  t: ReturnType<typeof useTranslations>;
  onSelect: (club: ClubResult) => void;
  onSkip: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClubResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/clubs/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [query]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-black mb-1" style={{ color: "var(--cat-text)" }}>
          {t("findYourClub")}
        </h2>
        <p className="text-[14px]" style={{ color: "var(--cat-text-secondary)" }}>
          {t("findYourClubSubtitle")}
        </p>
      </div>

      {/* Search input */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all"
        style={{
          background: "var(--cat-input-bg)",
          borderColor: "var(--cat-accent)",
          boxShadow: "0 0 0 3px var(--cat-accent-glow)",
        }}
      >
        <Search className="w-4 h-4 shrink-0" style={{ color: "var(--cat-accent)" }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("findYourClub") + "..."}
          className="flex-1 text-[14px] bg-transparent outline-none"
          style={{ color: "var(--cat-text)" }}
          autoFocus
        />
        {query && (
          <button type="button" onClick={() => { setQuery(""); setResults([]); setSearched(false); }}
            className="opacity-40 hover:opacity-70 transition-opacity">
            <X className="w-4 h-4" style={{ color: "var(--cat-text)" }} />
          </button>
        )}
        {loading && (
          <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin shrink-0"
            style={{ borderColor: "var(--cat-accent)", borderTopColor: "transparent" }} />
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((club) => (
            <button
              key={club.id}
              type="button"
              onClick={() => onSelect(club)}
              className="w-full text-left rounded-xl border p-3.5 transition-all group"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--cat-accent)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 2px var(--cat-accent-glow)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--cat-card-border)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ background: "var(--cat-badge-open-bg)" }}>
                  {club.badgeUrl ? (
                    <img src={club.badgeUrl} alt={club.name} className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-5 h-5" style={{ color: "var(--cat-text-muted)" }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[14px] truncate" style={{ color: "var(--cat-text)" }}>
                    {club.name}
                  </p>
                  {(club.city || club.country) && (
                    <p className="flex items-center gap-1 text-xs mt-0.5" style={{ color: "var(--cat-text-secondary)" }}>
                      <MapPin className="w-3 h-3" />
                      {[club.city, club.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--cat-accent)" }} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {searched && results.length === 0 && !loading && (
        <div className="text-center py-5 rounded-xl border"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <p className="text-sm" style={{ color: "var(--cat-text-secondary)" }}>
            No clubs found for «{query}»
          </p>
          <Link href="/club/register"
            className="inline-block mt-2 text-[13px] font-semibold hover:opacity-80"
            style={{ color: "var(--cat-accent)" }}>
            {t("registerNow")} →
          </Link>
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "var(--cat-card-border)" }} />
        <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>or</span>
        <div className="flex-1 h-px" style={{ background: "var(--cat-card-border)" }} />
      </div>

      {/* Skip to login */}
      <button
        type="button"
        onClick={onSkip}
        className="w-full py-2.5 rounded-xl text-[13px] font-medium border transition-all hover:opacity-80"
        style={{ color: "var(--cat-text-secondary)", borderColor: "var(--cat-card-border)" }}
      >
        {t("skipToLogin")}
      </button>

      {/* Register link */}
      <p className="text-center text-[12px]" style={{ color: "var(--cat-text-muted)" }}>
        {t("clubNotRegistered")}{" "}
        <Link href="/club/register" className="font-semibold hover:opacity-80" style={{ color: "var(--cat-accent)" }}>
          {t("registerNow")}
        </Link>
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"club" | "organizer">("club");

  // Club-mode phases: search → login
  const [clubPhase, setClubPhase] = useState<"search" | "login">("search");
  const [selectedClub, setSelectedClub] = useState<ClubResult | null>(null);

  // Reset to search when switching back to club mode
  function switchMode(m: "club" | "organizer") {
    setMode(m);
    setError("");
    if (m === "club") {
      setClubPhase("search");
      setSelectedClub(null);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const endpoint = mode === "organizer" ? "/api/auth/admin-login" : "/api/auth/club-login";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (mode === "organizer") {
        if (data.isSuper) router.push("/admin/dashboard");
        else if (data.organizationSlug) router.push(`/org/${data.organizationSlug}/admin`);
        else router.push("/admin/dashboard");
      } else {
        router.push("/team/overview");
      }
    } else {
      setError(t("invalidCredentials"));
    }
    setLoading(false);
  }

  const heroLines = t("loginHeroTitle").split("\n");
  const showSearch = mode === "club" && clubPhase === "search";

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen flex" style={{ background: "var(--cat-bg)" }}>

        {/* ── Left panel ──────────────────────────── */}
        <div className="hidden lg:flex flex-col w-[52%] relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, var(--cat-banner-from), var(--cat-banner-via), var(--cat-banner-to))" }}>

          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.08]"
              style={{ background: "radial-gradient(circle, var(--cat-accent), transparent 70%)" }} />
            <div className="absolute bottom-[-20%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.05]"
              style={{ background: "radial-gradient(circle, #8B5CF6, transparent 70%)" }} />
          </div>

          {/* Logo */}
          <div className="relative z-10 p-10">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                style={{ background: "rgba(255,255,255,0.08)", boxShadow: "0 4px 20px var(--cat-accent-glow)" }}>
                <img src="/playGrowWin1.png" alt="Goality" className="w-full h-full object-contain" />
              </div>
              <span className="font-black text-[18px] tracking-tight" style={{ color: "var(--cat-text)" }}>Goality TMC</span>
            </Link>
          </div>

          {/* Center */}
          <div className="relative z-10 flex-1 flex flex-col justify-center px-14 pb-10">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6 border"
                style={{ background: "var(--cat-badge-open-bg)", borderColor: "var(--cat-badge-open-border)" }}>
                <Trophy className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
                <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--cat-accent)" }}>
                  Tournament Management Core
                </span>
              </div>
              <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-[1.1] mb-5"
                style={{ color: "var(--cat-text)" }}>
                {heroLines[0]}<br />
                <span style={{ color: "var(--cat-accent)" }}>{heroLines[1]}</span>
              </h1>
              <p className="text-[15px] leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>
                {t("loginHeroSubtitle")}
              </p>
            </div>

            <ul className="space-y-3.5">
              {[
                { icon: Trophy, text: t("loginHeroBullet1") },
                { icon: Users, text: t("loginHeroBullet2") },
                { icon: CreditCard, text: t("loginHeroBullet3") },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "var(--cat-badge-open-bg)" }}>
                    <Icon className="w-4 h-4" style={{ color: "var(--cat-accent)" }} />
                  </div>
                  <span className="text-[13px]" style={{ color: "var(--cat-text-secondary)" }}>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 mx-10 mb-10 p-5 rounded-2xl border"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            <p className="text-[13px] italic mb-2" style={{ color: "var(--cat-text-secondary)" }}>
              "{t("loginHeroQuote")}"
            </p>
            <p className="text-[11px] font-semibold" style={{ color: "var(--cat-text-muted)" }}>
              {t("loginHeroQuoteAuthor")}
            </p>
          </div>
        </div>

        {/* ── Right panel ─────────────────────────── */}
        <div className="flex-1 flex flex-col">

          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4 lg:px-10">
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                style={{ background: "rgba(255,255,255,0.08)" }}>
                <img src="/playGrowWin1.png" alt="Goality" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-[15px]" style={{ color: "var(--cat-text)" }}>Goality TMC</span>
            </Link>
            <div className="ml-auto flex items-center gap-3">
              <LanguageSwitcher variant="light" />
              <Link href="/club/register"
                className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg border transition-colors"
                style={{ color: "var(--cat-text-secondary)", borderColor: "var(--cat-card-border)" }}>
                {t("registerNewClub")} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Form area */}
          <div className="flex-1 flex items-center justify-center px-6 py-8 lg:px-16">
            <div className="w-full max-w-[420px]">

              {/* Mode toggle — always visible */}
              <div className="flex mb-6 p-1 rounded-xl" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
                {(["club", "organizer"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchMode(m)}
                    className="flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all cursor-pointer"
                    style={mode === m
                      ? { background: "var(--cat-accent)", color: "var(--cat-accent-text)", boxShadow: "0 2px 8px var(--cat-accent-glow)" }
                      : { color: "var(--cat-text-secondary)" }
                    }
                  >
                    {m === "club" ? t("modeClub") : t("modeOrganizer")}
                  </button>
                ))}
              </div>

              {/* ── CLUB MODE: search phase ── */}
              {showSearch && (
                <ClubSearchStep
                  t={t}
                  onSelect={(club) => { setSelectedClub(club); setClubPhase("login"); }}
                  onSkip={() => { setSelectedClub(null); setClubPhase("login"); }}
                />
              )}

              {/* ── LOGIN FORM (club login-phase OR organizer mode) ── */}
              {!showSearch && (
                <>
                  {/* Selected club banner */}
                  {mode === "club" && selectedClub && (
                    <div
                      className="flex items-center gap-3 mb-5 px-3.5 py-3 rounded-xl border"
                      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-accent)", boxShadow: "0 0 0 2px var(--cat-accent-glow)" }}
                    >
                      <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center overflow-hidden"
                        style={{ background: "var(--cat-badge-open-bg)" }}>
                        {selectedClub.badgeUrl ? (
                          <img src={selectedClub.badgeUrl} alt={selectedClub.name} className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="w-4 h-4" style={{ color: "var(--cat-accent)" }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cat-text-muted)" }}>
                          {t("signingInAs")}
                        </p>
                        <p className="font-bold text-[14px] truncate" style={{ color: "var(--cat-text)" }}>
                          {selectedClub.name}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setSelectedClub(null); setClubPhase("search"); }}
                        className="text-[12px] font-medium hover:opacity-70 transition-opacity shrink-0"
                        style={{ color: "var(--cat-accent)" }}
                      >
                        {t("changeClub")}
                      </button>
                    </div>
                  )}

                  {/* Back to search — when no club selected (skipped) */}
                  {mode === "club" && !selectedClub && (
                    <button
                      type="button"
                      onClick={() => setClubPhase("search")}
                      className="flex items-center gap-1.5 mb-5 text-[13px] hover:opacity-70 transition-opacity"
                      style={{ color: "var(--cat-text-muted)" }}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> {t("findYourClub")}
                    </button>
                  )}

                  {/* Heading */}
                  <div className="mb-6">
                    <h2 className="text-2xl font-black mb-1" style={{ color: "var(--cat-text)" }}>{t("loginTitle")}</h2>
                    <p className="text-[14px]" style={{ color: "var(--cat-text-secondary)" }}>{t("loginSubtitle")}</p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--cat-text-secondary)" }}>
                        {t("email")}
                      </label>
                      <input
                        name="email"
                        type="email"
                        placeholder={mode === "organizer" ? "organizer@example.com" : "club@example.com"}
                        required
                        autoFocus
                        className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all"
                        style={{ background: "var(--cat-input-bg)", border: "1px solid var(--cat-input-border)", color: "var(--cat-text)" }}
                        onFocus={e => e.currentTarget.style.borderColor = "var(--cat-accent)"}
                        onBlur={e => e.currentTarget.style.borderColor = "var(--cat-input-border)"}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[12px] font-semibold" style={{ color: "var(--cat-text-secondary)" }}>
                          {t("password")}
                        </label>
                        <Link href="/forgot-password" className="text-[11px] font-medium hover:opacity-80 transition-opacity"
                          style={{ color: "var(--cat-accent)" }}>
                          {t("forgotPassword")}
                        </Link>
                      </div>
                      <input
                        name="password"
                        type="password"
                        required
                        className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all"
                        style={{ background: "var(--cat-input-bg)", border: "1px solid var(--cat-input-border)", color: "var(--cat-text)" }}
                        onFocus={e => e.currentTarget.style.borderColor = "var(--cat-accent)"}
                        onBlur={e => e.currentTarget.style.borderColor = "var(--cat-input-border)"}
                      />
                    </div>

                    {error && (
                      <div className="px-4 py-3 rounded-xl text-[13px]"
                        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="cat-cta-glow w-full py-3.5 rounded-xl text-[14px] font-bold transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                      style={{
                        background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))",
                        color: "var(--cat-accent-text)",
                        boxShadow: "0 4px 20px var(--cat-accent-glow)",
                      }}
                    >
                      {loading ? (
                        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>{t("login")} <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>
                  </form>

                  {/* Register link */}
                  {mode === "club" && (
                    <p className="mt-6 text-center text-[13px]" style={{ color: "var(--cat-text-muted)" }}>
                      {t("noAccount")}{" "}
                      <Link href="/club/register" className="font-semibold hover:opacity-80 transition-opacity"
                        style={{ color: "var(--cat-accent)" }}>
                        {t("registerNewClub")}
                      </Link>
                    </p>
                  )}

                  {mode === "organizer" && (
                    <p className="mt-6 text-center text-[13px]" style={{ color: "var(--cat-text-muted)" }}>
                      {t("noOrgAccount")}{" "}
                      <Link href="/onboarding" className="font-semibold hover:opacity-80 transition-opacity"
                        style={{ color: "var(--cat-accent)" }}>
                        {t("registerOrg")}
                      </Link>
                    </p>
                  )}
                </>
              )}

              {/* Back to home */}
              <div className="mt-8 text-center">
                <Link href="/" className="inline-flex items-center gap-1.5 text-[12px] hover:opacity-80 transition-opacity"
                  style={{ color: "var(--cat-text-muted)" }}>
                  <ArrowLeft className="w-3 h-3" /> {t("backToHome")}
                </Link>
              </div>

              {/* Hidden super admin link */}
              <div className="mt-4 text-center">
                <Link href="/admin/dashboard"
                  className="text-[10px] opacity-20 hover:opacity-50 transition-opacity"
                  style={{ color: "var(--cat-text-muted)" }}>
                  {t("superAdminLink")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
