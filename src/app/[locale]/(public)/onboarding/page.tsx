"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Building2 } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-navy flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-gold" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>
          <p className="text-text-secondary mt-2">{t("subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-border p-6 space-y-4">
          {error && (
            <div className="bg-error/10 text-error text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              {t("orgName")}
            </label>
            <input
              type="text"
              name="orgName"
              required
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
              placeholder={t("orgNamePlaceholder")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                {t("country")}
              </label>
              <input
                type="text"
                name="country"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                placeholder={t("countryPlaceholder")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                {t("city")}
              </label>
              <input
                type="text"
                name="city"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                placeholder={t("cityPlaceholder")}
              />
            </div>
          </div>

          <hr className="border-border" />

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              {t("yourName")}
            </label>
            <input
              type="text"
              name="name"
              required
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
              placeholder={t("yourNamePlaceholder")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              {t("email")}
            </label>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              {t("password")}
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
              placeholder={t("passwordPlaceholder")}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-light transition-colors disabled:opacity-50"
          >
            {loading ? t("creating") : t("create")}
          </button>
        </form>
      </div>
    </div>
  );
}
