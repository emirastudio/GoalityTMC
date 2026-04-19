"use client";

import { useEffect, useState } from "react";
import { CreditCard, FlaskConical, Globe, Loader2, CheckCircle } from "lucide-react";

type Mode = "live" | "test";

export function StripeModeToggle({ onChange }: { onChange?: () => void } = {}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/stripe-mode", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setMode(d.mode ?? "live"))
      .catch(() => setMode("live"))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(next: Mode) {
    if (saving || next === mode) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/stripe-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mode: next }),
      });
      if (res.ok) {
        setMode(next);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        onChange?.();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(99,102,241,0.1)" }}
        >
          <CreditCard className="w-5 h-5" style={{ color: "#6366F1" }} />
        </div>
        <div>
          <h2 className="text-base font-black" style={{ color: "var(--cat-text)" }}>
            Stripe Mode
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            Switch between live payments and test sandbox
          </p>
        </div>
        {saved && (
          <div className="ml-auto flex items-center gap-1.5 text-xs font-bold" style={{ color: "#059669" }}>
            <CheckCircle className="w-4 h-4" />
            Saved
          </div>
        )}
        {saving && (
          <Loader2 className="ml-auto w-4 h-4 animate-spin" style={{ color: "var(--cat-text-muted)" }} />
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4" style={{ color: "var(--cat-text-muted)" }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : (
        <>
          {/* Toggle buttons */}
          <div className="grid grid-cols-2 gap-3">
            {/* LIVE */}
            <button
              onClick={() => toggle("live")}
              disabled={saving}
              className="relative flex flex-col items-center gap-3 rounded-2xl p-5 transition-all"
              style={{
                border: mode === "live" ? "2px solid #059669" : "2px solid var(--cat-card-border)",
                background: mode === "live" ? "rgba(5,150,105,0.06)" : "var(--cat-tag-bg)",
                cursor: saving ? "wait" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {mode === "live" && (
                <div
                  className="absolute top-3 right-3 w-2 h-2 rounded-full"
                  style={{ background: "#059669", boxShadow: "0 0 6px #059669" }}
                />
              )}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: mode === "live" ? "rgba(5,150,105,0.12)" : "rgba(107,114,128,0.1)" }}
              >
                <Globe className="w-6 h-6" style={{ color: mode === "live" ? "#059669" : "#6B7280" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-black" style={{ color: mode === "live" ? "#059669" : "var(--cat-text-muted)" }}>
                  LIVE
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                  Real payments
                </p>
              </div>
              {mode === "live" && (
                <div
                  className="text-[10px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: "#059669", color: "#fff" }}
                >
                  ACTIVE
                </div>
              )}
            </button>

            {/* TEST */}
            <button
              onClick={() => toggle("test")}
              disabled={saving}
              className="relative flex flex-col items-center gap-3 rounded-2xl p-5 transition-all"
              style={{
                border: mode === "test" ? "2px solid #6366F1" : "2px solid var(--cat-card-border)",
                background: mode === "test" ? "rgba(99,102,241,0.06)" : "var(--cat-tag-bg)",
                cursor: saving ? "wait" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {mode === "test" && (
                <div
                  className="absolute top-3 right-3 w-2 h-2 rounded-full"
                  style={{ background: "#6366F1", boxShadow: "0 0 6px #6366F1" }}
                />
              )}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: mode === "test" ? "rgba(99,102,241,0.12)" : "rgba(107,114,128,0.1)" }}
              >
                <FlaskConical className="w-6 h-6" style={{ color: mode === "test" ? "#6366F1" : "#6B7280" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-black" style={{ color: mode === "test" ? "#6366F1" : "var(--cat-text-muted)" }}>
                  TEST
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                  Sandbox / no real money
                </p>
              </div>
              {mode === "test" && (
                <div
                  className="text-[10px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: "#6366F1", color: "#fff" }}
                >
                  ACTIVE
                </div>
              )}
            </button>
          </div>

          {/* Info */}
          <div
            className="mt-4 rounded-xl px-4 py-3 text-xs"
            style={{ background: mode === "test" ? "rgba(99,102,241,0.08)" : "rgba(5,150,105,0.08)", color: "var(--cat-text-muted)", lineHeight: 1.6 }}
          >
            {mode === "test" ? (
              <>
                🧪 <strong>Test mode active.</strong> Use Stripe test card:{" "}
                <code className="font-mono font-bold" style={{ color: "#6366F1" }}>4242 4242 4242 4242</code>
                {" "}· any future date · any CVC. No real charges.
              </>
            ) : (
              <>
                ✅ <strong>Live mode active.</strong> Real payments are processed.
                Switch to Test before testing new billing flows.
              </>
            )}
          </div>

          {/* Env vars status */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { label: "STRIPE_SECRET_KEY_LIVE", ok: true },
              { label: "STRIPE_SECRET_KEY_TEST", ok: true },
              { label: "STRIPE_WEBHOOK_SECRET_LIVE", ok: true },
              { label: "STRIPE_WEBHOOK_SECRET_TEST", ok: true },
            ].map(({ label, ok }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg"
                style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: ok ? "#059669" : "#DC2626" }}
                />
                <span className="font-mono truncate">{label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
