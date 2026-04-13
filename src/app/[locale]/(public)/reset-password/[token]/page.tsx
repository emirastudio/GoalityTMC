"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ThemeProvider } from "@/components/ui/theme-provider";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const params = useParams();
  const token = params.token as string;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [showCf, setShowCf]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError(t("passwordTooShort")); return; }
    if (password !== confirm) { setError(t("passwordMismatch")); return; }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);

    if (res.ok) {
      setDone(true);
    } else {
      const data = await res.json();
      setError(data.error ?? t("resetError"));
    }
  }

  return (
    <ThemeProvider defaultTheme="dark">
      <div
        className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
        style={{ background: "var(--cat-bg)" }}
      >
        {/* Glow orbs — same as forgot-password */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full opacity-[0.06]"
            style={{ background: "radial-gradient(circle, var(--cat-accent), transparent 70%)" }}
          />
          <div
            className="absolute bottom-[-15%] right-[10%] w-[400px] h-[400px] rounded-full opacity-[0.04]"
            style={{ background: "radial-gradient(circle, #8B5CF6, transparent 70%)" }}
          />
        </div>

        <div className="relative z-10 w-full max-w-[420px]">

          {/* Back link */}
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-[13px] mb-8 hover:opacity-80 transition-opacity"
            style={{ color: "var(--cat-text-muted)" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {t("backToLogin")}
          </Link>

          {/* Card */}
          <div
            className="rounded-2xl p-8 border"
            style={{
              background: "var(--cat-card-bg)",
              borderColor: "var(--cat-card-border)",
              boxShadow: "var(--cat-card-shadow)",
            }}
          >
            {/* Logo */}
            <div className="flex items-center gap-2.5 mb-8">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                style={{ boxShadow: "0 4px 14px var(--cat-accent-glow)" }}
              >
                <img src="/playGrowWin1.png" alt="Goality" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-[14px]" style={{ color: "var(--cat-text)" }}>
                Goality TMC
              </span>
            </div>

            {done ? (
              /* ── Success state ── */
              <div className="text-center py-4">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                  style={{
                    background: "var(--cat-badge-open-bg)",
                    boxShadow: "0 4px 20px var(--cat-accent-glow)",
                  }}
                >
                  <CheckCircle className="w-8 h-8" style={{ color: "var(--cat-accent)" }} />
                </div>
                <h2 className="text-xl font-black mb-3" style={{ color: "var(--cat-text)" }}>
                  {t("resetDone")}
                </h2>
                <p className="text-[13px] mb-6" style={{ color: "var(--cat-text-muted)" }}>
                  {t("resetDoneHint")}
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-semibold transition-opacity hover:opacity-90"
                  style={{
                    background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))",
                    color: "var(--cat-accent-text)",
                  }}
                >
                  {t("backToLogin")} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              /* ── Form ── */
              <>
                <div className="mb-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: "var(--cat-badge-open-bg)" }}
                  >
                    <span style={{ fontSize: 22 }}>🔑</span>
                  </div>
                  <h2 className="text-xl font-black mb-1.5" style={{ color: "var(--cat-text)" }}>
                    {t("resetTitle")}
                  </h2>
                  <p className="text-[14px]" style={{ color: "var(--cat-text-secondary)" }}>
                    {t("resetSubtitle")}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* New password */}
                  <div>
                    <label
                      className="block text-[12px] font-semibold mb-1.5"
                      style={{ color: "var(--cat-text-secondary)" }}
                    >
                      {t("newPassword")}
                    </label>
                    <div className="relative">
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all pr-11"
                        style={{
                          background: "var(--cat-input-bg)",
                          border: "1px solid var(--cat-input-border)",
                          color: "var(--cat-text)",
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--cat-accent)")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--cat-input-border)")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:opacity-70 transition-opacity"
                        style={{ color: "var(--cat-text-muted)" }}
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label
                      className="block text-[12px] font-semibold mb-1.5"
                      style={{ color: "var(--cat-text-secondary)" }}
                    >
                      {t("confirmPassword")}
                    </label>
                    <div className="relative">
                      <input
                        type={showCf ? "text" : "password"}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all pr-11"
                        style={{
                          background: "var(--cat-input-bg)",
                          border: `1px solid ${
                            confirm && confirm !== password
                              ? "rgba(239,68,68,0.6)"
                              : "var(--cat-input-border)"
                          }`,
                          color: "var(--cat-text)",
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--cat-accent)")}
                        onBlur={(e) => (e.currentTarget.style.borderColor =
                          confirm && confirm !== password
                            ? "rgba(239,68,68,0.6)"
                            : "var(--cat-input-border)"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCf((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:opacity-70 transition-opacity"
                        style={{ color: "var(--cat-text-muted)" }}
                      >
                        {showCf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div
                      className="px-4 py-3 rounded-xl text-[13px]"
                      style={{
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.2)",
                        color: "#EF4444",
                      }}
                    >
                      {error}
                    </div>
                  )}

                  {/* Submit */}
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
                      <>{t("resetSave")} <ArrowRight className="w-4 h-4" /></>
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
