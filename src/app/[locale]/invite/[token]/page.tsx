"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Crown } from "lucide-react";

type InviteInfo = {
  teamName: string | null;
  clubName: string;
  expiresAt: string;
};

export default function InvitePage() {
  const t = useTranslations("invite");
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then(async (r) => {
        if (r.ok) setInfo(await r.json());
        else {
          const d = await r.json();
          setError(r.status === 410 ? t("expired") : d.error || t("invalid"));
        }
      })
      .finally(() => setLoading(false));
  }, [token, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (password.length < 6) {
      setFormError(t("passwordTooShort"));
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/invites/${token}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    if (res.ok) {
      router.push(`/${locale}/team/overview`);
    } else {
      const d = await res.json();
      setFormError(d.error === "Invite expired" ? t("expired") : t("acceptError"));
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center">
            <Crown className="w-7 h-7 text-gold" />
          </div>
        </div>

        {loading ? (
          <p className="text-center text-text-secondary text-sm">{t("loading")}</p>
        ) : error ? (
          <div className="text-center">
            <p className="text-error font-semibold mb-2">{error}</p>
            <p className="text-sm text-text-secondary">{t("contactOrganizer")}</p>
          </div>
        ) : info ? (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>
              <p className="text-text-secondary text-sm mt-2">
                {t("subtitle", { club: info.clubName, team: info.teamName ?? "" })}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">{t("name")}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">{t("email")}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="coach@example.com"
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">{t("password")}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder={t("passwordPlaceholder")}
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
                />
              </div>

              {formError && (
                <p className="text-sm text-error bg-red-50 rounded-lg px-3 py-2">{formError}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-navy text-white font-semibold rounded-xl py-3 text-sm hover:bg-navy/90 transition-colors disabled:opacity-50 mt-2"
              >
                {submitting ? "..." : t("createAccount")}
              </button>
            </form>
          </>
        ) : null}
      </div>
    </div>
  );
}
