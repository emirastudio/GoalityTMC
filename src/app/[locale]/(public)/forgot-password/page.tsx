"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Crown, ArrowLeft, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

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
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <Crown className="w-10 h-10 text-gold mx-auto mb-3" />
          <h1 className="text-xl font-bold text-navy">{t("forgotTitle")}</h1>
          <p className="text-text-secondary text-sm mt-1">{t("forgotSubtitle")}</p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <Mail className="w-7 h-7 text-green-600" />
              </div>
            </div>
            <p className="text-text-secondary text-sm">{t("forgotSent")}</p>
            <p className="text-text-secondary text-xs">{t("forgotSentHint")}</p>
            <Link href="/login" className="inline-block mt-2 text-sm text-navy hover:underline font-medium">
              {t("backToLogin")}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              name="email"
              type="email"
              label={t("email")}
              placeholder="club@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className="text-sm text-error">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : t("forgotSendLink")}
            </Button>
            <div className="text-center">
              <Link href="/login" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-navy">
                <ArrowLeft className="w-3.5 h-3.5" />
                {t("backToLogin")}
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
