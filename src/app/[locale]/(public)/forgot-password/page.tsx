"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ArrowLeft, ArrowRight, Mail, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);

    if (res.ok) {
      setSent(true);
    } else {
      const data = await res.json();
      setError(data.error ?? t("forgotError"));
    }
  }

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
        style={{ background: "var(--cat-bg)" }}>

        {/* Glow orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full opacity-[0.06]"
            style={{ background: "radial-gradient(circle, var(--cat-accent), transparent 70%)" }} />
          <div className="absolute bottom-[-15%] right-[10%] w-[400px] h-[400px] rounded-full opacity-[0.04]"
            style={{ background: "radial-gradient(circle, #8B5CF6, transparent 70%)" }} />
        </div>

        <div className="relative z-10 w-full max-w-[420px]">

          {/* Back link */}
          <Link href="/login" className="inline-flex items-center gap-1.5 text-[13px] mb-8 hover:opacity-80 transition-opacity"
            style={{ color: "var(--cat-text-muted)" }}>
            <ArrowLeft className="w-3.5 h-3.5" /> {t("backToLogin")}
          </Link>

          {/* Card */}
          <div className="rounded-2xl p-8 border" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", boxShadow: "var(--cat-card-shadow)" }}>

            {/* Logo */}
            <div className="flex items-center gap-2.5 mb-8">
              <img src="/logo.png" alt="Goality" className="w-8 h-8 rounded-xl object-contain"
                style={{ boxShadow: "0 4px 14px var(--cat-accent-glow)" }} />
              <span className="font-bold text-[14px]" style={{ color: "var(--cat-text)" }}>Goality TMC</span>
            </div>

            {sent ? (
              /* Success state */
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                  style={{ background: "var(--cat-badge-open-bg)", boxShadow: "0 4px 20px var(--cat-accent-glow)" }}>
                  <CheckCircle className="w-8 h-8" style={{ color: "var(--cat-accent)" }} />
                </div>
                <h2 className="text-xl font-black mb-3" style={{ color: "var(--cat-text)" }}>Check your inbox</h2>
                <p className="text-[14px] mb-2" style={{ color: "var(--cat-text-secondary)" }}>{t("forgotSent")}</p>
                <p className="text-[12px] mb-6" style={{ color: "var(--cat-text-muted)" }}>{t("forgotSentHint")}</p>
                <Link href="/login"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-semibold transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))", color: "var(--cat-accent-text)" }}>
                  {t("backToLogin")} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              /* Form */
              <>
                <div className="mb-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: "var(--cat-badge-open-bg)" }}>
                    <Mail className="w-5 h-5" style={{ color: "var(--cat-accent)" }} />
                  </div>
                  <h2 className="text-xl font-black mb-1.5" style={{ color: "var(--cat-text)" }}>{t("forgotTitle")}</h2>
                  <p className="text-[14px]" style={{ color: "var(--cat-text-secondary)" }}>{t("forgotSubtitle")}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--cat-text-secondary)" }}>
                      {t("email")}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="club@example.com"
                      required
                      className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all"
                      style={{
                        background: "var(--cat-input-bg)",
                        border: "1px solid var(--cat-input-border)",
                        color: "var(--cat-text)",
                      }}
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
                      <>{t("forgotSendLink")} <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
