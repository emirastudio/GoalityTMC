"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Crown, ArrowLeft, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const params = useParams();
  const token = params.token as string;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }

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
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <Crown className="w-10 h-10 text-gold mx-auto mb-3" />
          <h1 className="text-xl font-bold text-navy">{t("resetTitle")}</h1>
          <p className="text-text-secondary text-sm mt-1">{t("resetSubtitle")}</p>
        </div>

        {done ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
            </div>
            <p className="text-text-secondary text-sm font-medium">{t("resetDone")}</p>
            <p className="text-text-secondary text-xs">{t("resetDoneHint")}</p>
            <Link href="/login" className="inline-block mt-2 text-sm text-navy hover:underline font-medium">
              {t("login")}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="password"
              name="password"
              type="password"
              label={t("newPassword")}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Input
              id="confirm"
              name="confirm"
              type="password"
              label={t("confirmPassword")}
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            {error && <p className="text-sm text-error">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : t("resetSave")}
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
