"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ArrowRight, Trophy, Users, CreditCard, ArrowLeft } from "lucide-react";

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const data = {
      orgName: form.get("orgName") as string,
      name: form.get("name") as string,
      email: form.get("email") as string,
      password: form.get("password") as string,
      country: form.get("country") as string,
      city: form.get("city") as string,
    };

    // Client validation
    if (!data.orgName) { setError(t("errors.orgNameRequired")); setLoading(false); return; }
    if (!data.name) { setError(t("errors.nameRequired")); setLoading(false); return; }
    if (!data.email) { setError(t("errors.emailRequired")); setLoading(false); return; }
    if (data.password.length < 6) { setError(t("errors.passwordTooShort")); setLoading(false); return; }

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Something went wrong");
        setLoading(false);
        return;
      }

      // Redirect to org admin dashboard
      router.push(`/org/${result.orgSlug}/admin`);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  const heroLines = t("heroTitle").split("\n");

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen flex" style={{ background: "var(--cat-bg)" }}>

        {/* ── Left panel ──────────────────────────── */}
        <div className="hidden lg:flex flex-col w-[52%] relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, var(--cat-banner-from), var(--cat-banner-via), var(--cat-banner-to))" }}>

          {/* Glow orbs */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.08]"
              style={{ background: "radial-gradient(circle, var(--cat-accent), transparent 70%)" }} />
            <div className="absolute bottom-[-20%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.05]"
              style={{ background: "radial-gradient(circle, #8B5CF6, transparent 70%)" }} />
          </div>

          {/* Logo */}
          <div className="relative z-10 p-10">
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo.png" alt="Goality" className="w-10 h-10 rounded-xl object-contain"
                style={{ boxShadow: "0 4px 20px var(--cat-accent-glow)" }} />
              <div>
                <span className="font-black text-[18px] tracking-tight" style={{ color: "var(--cat-text)" }}>Goality</span>
                <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-widest"
                  style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}>TMC</span>
              </div>
            </Link>
          </div>

          {/* Center content */}
          <div className="relative z-10 flex-1 flex flex-col justify-center px-14 pb-10">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6 border"
                style={{ background: "var(--cat-badge-open-bg)", borderColor: "var(--cat-badge-open-border)" }}>
                <Trophy className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
                <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--cat-accent)" }}>
                  For Organizers
                </span>
              </div>
              <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-[1.1] mb-5"
                style={{ color: "var(--cat-text)" }}>
                {heroLines[0]}<br />
                <span style={{ color: "var(--cat-accent)" }}>{heroLines[1]}</span>
              </h1>
              <p className="text-[15px] leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>
                {t("heroSubtitle")}
              </p>
            </div>

            {/* Value bullets */}
            <ul className="space-y-3.5">
              {[
                { icon: Trophy, text: t("heroBullet1") },
                { icon: Users, text: t("heroBullet2") },
                { icon: CreditCard, text: t("heroBullet3") },
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

          {/* Bottom quote */}
          <div className="relative z-10 mx-10 mb-10 p-5 rounded-2xl border"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            <p className="text-[13px] italic mb-2" style={{ color: "var(--cat-text-secondary)" }}>
              "{t("heroQuote")}"
            </p>
            <p className="text-[11px] font-semibold" style={{ color: "var(--cat-text-muted)" }}>
              {t("heroQuoteAuthor")}
            </p>
          </div>
        </div>

        {/* ── Right panel (form) ─────────────────── */}
        <div className="flex-1 flex flex-col">

          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4 lg:px-10">
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <img src="/logo.png" alt="Goality" className="w-8 h-8 rounded-xl object-contain" />
              <span className="font-bold text-[15px]" style={{ color: "var(--cat-text)" }}>Goality TMC</span>
            </Link>
            <div className="ml-auto flex items-center gap-3">
              <LanguageSwitcher variant="light" />
              <Link href="/login"
                className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg border transition-colors"
                style={{ color: "var(--cat-text-secondary)", borderColor: "var(--cat-card-border)" }}>
                {t("signIn")} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Form area */}
          <div className="flex-1 flex items-center justify-center px-6 py-8 lg:px-16">
            <div className="w-full max-w-[440px]">

              {/* Heading */}
              <div className="mb-8">
                <h2 className="text-2xl font-black mb-1.5" style={{ color: "var(--cat-text)" }}>{t("title")}</h2>
                <p className="text-[14px]" style={{ color: "var(--cat-text-secondary)" }}>{t("subtitle")}</p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Organization name */}
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--cat-text-secondary)" }}>
                    {t("orgName")}
                  </label>
                  <input
                    name="orgName"
                    type="text"
                    placeholder={t("orgNamePlaceholder")}
                    required
                    className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all"
                    style={{ background: "var(--cat-input-bg)", border: "1px solid var(--cat-input-border)", color: "var(--cat-text)" }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--cat-accent)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--cat-input-border)"}
                  />
                </div>

                {/* Country + City */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--cat-text-secondary)" }}>
                      {t("country")}
                    </label>
                    <input
                      name="country"
                      type="text"
                      placeholder={t("countryPlaceholder")}
                      className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all"
                      style={{ background: "var(--cat-input-bg)", border: "1px solid var(--cat-input-border)", color: "var(--cat-text)" }}
                      onFocus={e => e.currentTarget.style.borderColor = "var(--cat-accent)"}
                      onBlur={e => e.currentTarget.style.borderColor = "var(--cat-input-border)"}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--cat-text-secondary)" }}>
                      {t("city")}
                    </label>
                    <input
                      name="city"
                      type="text"
                      placeholder={t("cityPlaceholder")}
                      className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all"
                      style={{ background: "var(--cat-input-bg)", border: "1px solid var(--cat-input-border)", color: "var(--cat-text)" }}
                      onFocus={e => e.currentTarget.style.borderColor = "var(--cat-accent)"}
                      onBlur={e => e.currentTarget.style.borderColor = "var(--cat-input-border)"}
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" style={{ borderColor: "var(--cat-card-border)" }} />
                  </div>
                </div>

                {/* Your Name */}
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--cat-text-secondary)" }}>
                    {t("yourName")}
                  </label>
                  <input
                    name="name"
                    type="text"
                    placeholder={t("yourNamePlaceholder")}
                    required
                    className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all"
                    style={{ background: "var(--cat-input-bg)", border: "1px solid var(--cat-input-border)", color: "var(--cat-text)" }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--cat-accent)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--cat-input-border)"}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--cat-text-secondary)" }}>
                    {t("email")}
                  </label>
                  <input
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    required
                    className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all"
                    style={{ background: "var(--cat-input-bg)", border: "1px solid var(--cat-input-border)", color: "var(--cat-text)" }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--cat-accent)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--cat-input-border)"}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--cat-text-secondary)" }}>
                    {t("password")}
                  </label>
                  <input
                    name="password"
                    type="password"
                    placeholder={t("passwordPlaceholder")}
                    required
                    minLength={6}
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
                    <>{t("create")} <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>

              {/* Already have account link */}
              <p className="mt-6 text-center text-[13px]" style={{ color: "var(--cat-text-muted)" }}>
                {t("alreadyHaveAccount")}{" "}
                <Link href="/login" className="font-semibold hover:opacity-80 transition-opacity"
                  style={{ color: "var(--cat-accent)" }}>
                  {t("signIn")}
                </Link>
              </p>

              {/* Back to home */}
              <div className="mt-8 text-center">
                <Link href="/" className="inline-flex items-center gap-1.5 text-[12px] hover:opacity-80 transition-opacity"
                  style={{ color: "var(--cat-text-muted)" }}>
                  <ArrowLeft className="w-3 h-3" /> Back to home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
