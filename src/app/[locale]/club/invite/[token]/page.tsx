"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Building2, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";

interface InviteInfo {
  clubId: number;
  clubName: string;
  badgeUrl: string | null;
  expiresAt: string;
}

export default function ClubInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/invites/club/${token}`)
      .then((r) => {
        if (r.status === 404) throw new Error("Invite not found or already used");
        if (r.status === 410) throw new Error("This invite link has expired");
        if (!r.ok) throw new Error("Failed to load invite");
        return r.json();
      })
      .then(setInvite)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/invites/club/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/club/dashboard"), 1500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cat-bg, #0a0f1a)" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--cat-accent, #c8ff00)" }} />
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--cat-bg, #0a0f1a)" }}>
        <div
          className="max-w-md w-full rounded-2xl p-8 text-center border"
          style={{ background: "var(--cat-card-bg, #111827)", borderColor: "var(--cat-card-border, #1f2937)" }}
        >
          <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: "#ef4444" }} />
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--cat-text, #f9fafb)" }}>
            Invalid Invite
          </h1>
          <p className="text-sm" style={{ color: "var(--cat-text-muted, #9ca3af)" }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--cat-bg, #0a0f1a)" }}>
        <div
          className="max-w-md w-full rounded-2xl p-8 text-center border"
          style={{ background: "var(--cat-card-bg, #111827)", borderColor: "var(--cat-card-border, #1f2937)" }}
        >
          <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: "#10b981" }} />
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--cat-text, #f9fafb)" }}>
            Welcome to {invite?.clubName}!
          </h1>
          <p className="text-sm" style={{ color: "var(--cat-text-muted, #9ca3af)" }}>
            Taking you to the dashboard…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--cat-bg, #0a0f1a)" }}>
      <div
        className="max-w-md w-full rounded-2xl overflow-hidden border"
        style={{ background: "var(--cat-card-bg, #111827)", borderColor: "var(--cat-card-border, #1f2937)" }}
      >
        {/* Header */}
        <div
          className="px-8 py-6 text-center"
          style={{ background: "linear-gradient(135deg, #0f2044 0%, #1a3a6e 100%)" }}
        >
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center overflow-hidden"
            style={{ background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.15)" }}
          >
            {invite?.badgeUrl ? (
              <img src={invite.badgeUrl} alt={invite.clubName} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-lg font-bold text-white mb-1">Join {invite?.clubName}</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
            Create your manager account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          {error && (
            <div
              className="flex items-center gap-2 p-3 rounded-xl text-sm"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--cat-text-secondary, #d1d5db)" }}>
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border"
              style={{
                background: "var(--cat-input-bg, #1f2937)",
                borderColor: "var(--cat-card-border, #374151)",
                color: "var(--cat-text, #f9fafb)",
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--cat-text-secondary, #d1d5db)" }}>
              Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border"
              style={{
                background: "var(--cat-input-bg, #1f2937)",
                borderColor: "var(--cat-card-border, #374151)",
                color: "var(--cat-text, #f9fafb)",
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--cat-text-secondary, #d1d5db)" }}>
              Password * <span style={{ color: "var(--cat-text-muted, #6b7280)" }}>(min 6 characters)</span>
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm outline-none transition-all border"
                style={{
                  background: "var(--cat-input-bg, #1f2937)",
                  borderColor: "var(--cat-card-border, #374151)",
                  color: "var(--cat-text, #f9fafb)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
              >
                {showPass ? <EyeOff className="w-4 h-4" style={{ color: "var(--cat-text, #f9fafb)" }} /> : <Eye className="w-4 h-4" style={{ color: "var(--cat-text, #f9fafb)" }} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: "var(--cat-accent, #c8ff00)", color: "#000" }}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Creating account…" : "Create Account & Join Club"}
          </button>

          <p className="text-center text-xs" style={{ color: "var(--cat-text-muted, #6b7280)" }}>
            By creating an account you agree to the Goality Terms of Service.
          </p>
        </form>
      </div>
    </div>
  );
}
