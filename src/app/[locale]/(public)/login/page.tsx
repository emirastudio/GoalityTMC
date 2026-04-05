"use client";

import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ArrowRight, Trophy, Users, CreditCard, ArrowLeft, Building2, Shield } from "lucide-react";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

type EmailHint = {
  clubId: number;
  clubName: string;
  clubBadge: string | null;
  teamName: string | null;
  className: string | null;
  isClubAdmin: boolean;
};

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"club" | "organizer">("club");
  const [email, setEmail] = useState("");
  const [emailHint, setEmailHint] = useState<EmailHint | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lookup club/team by email as user types
  useEffect(() => {
    if (mode !== "club") { setEmailHint(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const e = email.trim();
    if (!e.includes("@") || !e.includes(".")) { setEmailHint(null); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/public/clubs/by-email?email=${encodeURIComponent(e)}`);
      const data = await res.json();
      setEmailHint(data ?? null);
    }, 500);
  }, [email, mode]);

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
        if (data.organizationSlug) router.push(`/org/${data.organizationSlug}/admin`);
        else if (data.isSuper) router.push("/admin/dashboard");
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

          <div className="relative z-10 p-10">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                style={{ background: "rgba(255,255,255,0.08)", boxShadow: "0 4px 20px var(--cat-accent-glow)" }}>
                <img src="/playGrowWin1.png" alt="Goality" className="w-full h-full object-contain" />
              </div>
              <span className="font-black text-[18px] tracking-tight" style={{ color: "var(--cat-text)" }}>Goality TMC</span>
            </Link>
          </div>

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

          <div className="flex-1 flex items-center justify-center px-6 py-8 lg:px-16">
            <div className="w-full max-w-[400px]">

              <div className="mb-8">
                <h2 className="text-2xl font-black mb-1.5" style={{ color: "var(--cat-text)" }}>{t("loginTitle")}</h2>
                <p className="text-[14px]" style={{ color: "var(--cat-text-secondary)" }}>{t("loginSubtitle")}</p>
              </div>

              {/* Mode toggle */}
              <div className="flex mb-6 p-1 rounded-xl" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
                {(["club", "organizer"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setError(""); setEmailHint(null); }}
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

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--cat-text-secondary)" }}>
                    {t("email")}
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={mode === "organizer" ? "organizer@example.com" : "club@example.com"}
                    required
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all"
                    style={{ background: "var(--cat-input-bg)", border: "1px solid var(--cat-input-border)", color: "var(--cat-text)" }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--cat-accent)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--cat-input-border)"}
                  />

                  {/* Email hint — club/team context */}
                  {emailHint && (
                    <div
                      className="mt-2 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border"
                      style={{
                        background: "var(--cat-card-bg)",
                        borderColor: "var(--cat-accent)",
                        boxShadow: "0 0 0 2px var(--cat-accent-glow)",
                      }}
                    >
                      {/* Club badge */}
                      <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center overflow-hidden"
                        style={{ background: "var(--cat-badge-open-bg)" }}>
                        {emailHint.clubBadge ? (
                          <img src={emailHint.clubBadge} alt={emailHint.clubName} className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="w-4 h-4" style={{ color: "var(--cat-accent)" }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cat-text-muted)" }}>
                          {t("signingInAs")}
                        </p>
                        <p className="text-[13px] font-bold truncate" style={{ color: "var(--cat-text)" }}>
                          {emailHint.clubName}
                          {emailHint.teamName && (
                            <span className="font-normal" style={{ color: "var(--cat-text-secondary)" }}>
                              {" · "}{emailHint.teamName}
                              {emailHint.className && ` (${emailHint.className})`}
                            </span>
                          )}
                        </p>
                      </div>
                      {emailHint.isClubAdmin && (
                        <Shield className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-accent)" }} />
                      )}
                    </div>
                  )}
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

              {mode === "club" && (
                <>
                  {/* OAuth divider */}
                  <div className="relative flex items-center justify-center my-5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t" style={{ borderColor: "var(--cat-card-border)" }} />
                    </div>
                    <span className="relative px-3 text-[11px] font-medium uppercase tracking-wider"
                      style={{ background: "var(--cat-bg)", color: "var(--cat-text-muted)" }}>
                      {t("orContinueWith")}
                    </span>
                  </div>

                  {/* OAuth buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => signIn("google", { callbackUrl: "/api/auth/oauth-success" })}
                      className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-[13px] font-medium border transition-all hover:opacity-80 cursor-pointer"
                      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
                    >
                      <GoogleIcon /> Google
                    </button>
                    <button
                      type="button"
                      onClick={() => signIn("facebook", { callbackUrl: "/api/auth/oauth-success" })}
                      className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-[13px] font-medium border transition-all hover:opacity-80 cursor-pointer"
                      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
                    >
                      <FacebookIcon /> Facebook
                    </button>
                  </div>

                  <p className="mt-5 text-center text-[13px]" style={{ color: "var(--cat-text-muted)" }}>
                    {t("noAccount")}{" "}
                    <Link href="/club/register" className="font-semibold hover:opacity-80 transition-opacity"
                      style={{ color: "var(--cat-accent)" }}>
                      {t("registerNewClub")}
                    </Link>
                  </p>
                </>
              )}

              {mode === "organizer" && (
                <>
                  {/* OAuth divider */}
                  <div className="relative flex items-center justify-center my-5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t" style={{ borderColor: "var(--cat-card-border)" }} />
                    </div>
                    <span className="relative px-3 text-[11px] font-medium uppercase tracking-wider"
                      style={{ background: "var(--cat-bg)", color: "var(--cat-text-muted)" }}>
                      {t("orContinueWith")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => signIn("google", { callbackUrl: "/api/auth/oauth-success?mode=organizer" })}
                      className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-[13px] font-medium border transition-all hover:opacity-80 cursor-pointer"
                      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
                    >
                      <GoogleIcon /> Google
                    </button>
                    <button
                      type="button"
                      onClick={() => signIn("facebook", { callbackUrl: "/api/auth/oauth-success?mode=organizer" })}
                      className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-[13px] font-medium border transition-all hover:opacity-80 cursor-pointer"
                      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
                    >
                      <FacebookIcon /> Facebook
                    </button>
                  </div>
                  <p className="mt-5 text-center text-[13px]" style={{ color: "var(--cat-text-muted)" }}>
                    {t("noOrgAccount")}{" "}
                    <Link href="/onboarding" className="font-semibold hover:opacity-80 transition-opacity"
                      style={{ color: "var(--cat-accent)" }}>
                      {t("registerOrg")}
                    </Link>
                  </p>
                </>
              )}

              <div className="mt-8 text-center">
                <Link href="/" className="inline-flex items-center gap-1.5 text-[12px] hover:opacity-80 transition-opacity"
                  style={{ color: "var(--cat-text-muted)" }}>
                  <ArrowLeft className="w-3 h-3" /> {t("backToHome")}
                </Link>
              </div>

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
