"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Crown, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"club" | "admin">("club");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const endpoint = mode === "admin" ? "/api/auth/admin-login" : "/api/auth/club-login";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });

    if (res.ok) {
      router.push(mode === "admin" ? "/admin/dashboard" : "/team/overview");
    } else {
      setError(t("invalidCredentials"));
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          {mode === "admin" ? (
            <Shield className="w-10 h-10 text-navy mx-auto mb-3" />
          ) : (
            <Crown className="w-10 h-10 text-gold mx-auto mb-3" />
          )}
          <h1 className="text-xl font-bold text-navy">{t("loginTitle")}</h1>
          <p className="text-text-secondary text-sm mt-1">{t("loginSubtitle")}</p>
        </div>

        {/* Mode toggle */}
        <div className="flex mb-6 border border-border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => { setMode("club"); setError(""); }}
            className={`flex-1 py-2 text-sm font-medium transition-colors cursor-pointer ${
              mode === "club"
                ? "bg-navy text-white"
                : "bg-white text-text-secondary hover:bg-surface"
            }`}
          >
            Club
          </button>
          <button
            type="button"
            onClick={() => { setMode("admin"); setError(""); }}
            className={`flex-1 py-2 text-sm font-medium transition-colors cursor-pointer ${
              mode === "admin"
                ? "bg-navy text-white"
                : "bg-white text-text-secondary hover:bg-surface"
            }`}
          >
            Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            name="email"
            type="email"
            label={t("email")}
            placeholder={mode === "admin" ? "admin@kingscup.ee" : "club@example.com"}
            required
          />
          <Input
            id="password"
            name="password"
            type="password"
            label={t("password")}
            required
          />
          {error && <p className="text-sm text-error">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "..." : t("login")}
          </Button>
        </form>

        {mode === "club" && (
          <div className="mt-4 text-center space-y-2">
            <div>
              <Link href="/forgot-password" className="text-sm text-text-secondary hover:text-navy hover:underline">
                {t("forgotPassword")}
              </Link>
            </div>
            <div>
              <Link href="/club/register" className="text-sm text-navy hover:underline font-medium">
                {t("registerNewClub")}
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
