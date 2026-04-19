"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { PasswordStrengthInput, isPasswordValid } from "@/components/ui/password-strength-input";
import { ShieldCheck, Loader2, AlertTriangle } from "lucide-react";

interface InviteInfo {
  invitedEmail: string;
  invitedName: string | null;
  orgName: string;
  orgSlug: string;
  expiresAt: string;
  accountExists: boolean;
}

export default function AdminInviteAcceptPage() {
  const params = useParams<{ token: string; locale: string }>();
  const token = params.token;
  const router = useRouter();
  const t = useTranslations("adminInvite");

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordValid, setPasswordValid] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/invites/admin/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: InviteInfo) => {
        setInvite(d);
        setName(d.invitedName ?? "");
      })
      .catch(() => setError("invalid"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isPasswordValid(password)) {
      setError(t("passwordTooWeak"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/invites/admin/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t("genericError"));
        setSubmitting(false);
        return;
      }
      const locale = params.locale || "en";
      router.push(`/${locale}/org/${data.orgSlug}/admin`);
    } catch {
      setError(t("genericError"));
      setSubmitting(false);
    }
  }

  return (
    <ThemeProvider defaultTheme="light">
      <div style={{ background: "var(--cat-bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div
          style={{
            width: "100%",
            maxWidth: "440px",
            background: "var(--cat-card-bg)",
            border: "1px solid var(--cat-card-border)",
            borderRadius: "20px",
            padding: "28px",
          }}
        >
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "24px", color: "var(--cat-text-muted)" }}>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span style={{ fontSize: "14px" }}>{t("loading")}</span>
            </div>
          ) : error === "invalid" || !invite ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", borderRadius: "16px", background: "rgba(239,68,68,0.1)", marginBottom: "12px" }}>
                <AlertTriangle className="w-5 h-5" style={{ color: "#ef4444" }} />
              </div>
              <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--cat-text)", marginBottom: "6px" }}>
                {t("expiredTitle")}
              </h1>
              <p style={{ fontSize: "13px", color: "var(--cat-text-muted)" }}>
                {t("expiredBody")}
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", borderRadius: "16px", background: "rgba(99,102,241,0.1)" }}>
                  <ShieldCheck className="w-5 h-5" style={{ color: "#6366f1" }} />
                </div>
                <div>
                  <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--cat-text)", lineHeight: 1.2 }}>
                    {t("heading")}
                  </h1>
                  <p style={{ fontSize: "13px", color: "var(--cat-text-muted)", marginTop: "2px" }}>
                    {t("subheading", { org: invite.orgName })}
                  </p>
                </div>
              </div>

              <div style={{ background: "var(--cat-tag-bg)", borderRadius: "12px", padding: "12px 14px", marginBottom: "20px", fontSize: "13px" }}>
                <div style={{ color: "var(--cat-text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "2px" }}>
                  {t("invitedEmailLabel")}
                </div>
                <div style={{ color: "var(--cat-text)", fontWeight: 600 }}>{invite.invitedEmail}</div>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {invite.accountExists ? (
                  <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "10px", padding: "10px 12px", fontSize: "12px", color: "var(--cat-text-secondary)" }}>
                    {t("existingAccountHint")}
                  </div>
                ) : (
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--cat-text-secondary)", display: "block", marginBottom: "4px" }}>
                      {t("nameLabel")}
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "1px solid var(--cat-card-border)",
                        background: "var(--cat-bg)",
                        color: "var(--cat-text)",
                        fontSize: "14px",
                        outline: "none",
                      }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--cat-text-secondary)", display: "block", marginBottom: "4px" }}>
                    {invite.accountExists ? t("existingPasswordLabel") : t("newPasswordLabel")}
                  </label>
                  <PasswordStrengthInput
                    onChange={(v, valid) => {
                      setPassword(v);
                      setPasswordValid(valid);
                    }}
                    placeholder={invite.accountExists ? t("existingPasswordPlaceholder") : t("newPasswordPlaceholder")}
                  />
                </div>

                {error && (
                  <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "10px", padding: "10px 12px", fontSize: "12px", color: "#ef4444" }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || (!invite.accountExists && !passwordValid)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "12px",
                    border: "none",
                    background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))",
                    color: "var(--cat-accent-text)",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: submitting ? "wait" : "pointer",
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? t("accepting") : t("acceptButton")}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}
