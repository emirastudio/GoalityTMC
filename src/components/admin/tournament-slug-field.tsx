"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Pencil, X } from "lucide-react";

// Inline editor for the tournament's URL slug. Loads the current slug
// from /settings, lets the admin edit it, live-checks availability via
// /api/admin/check-slug, and saves back via /settings PATCH. Ships
// behind an "Edit" toggle so it stays out of the way for everyone who
// just leaves the auto-generated slug.
export function TournamentSlugField({
  orgSlug,
  tournamentId,
}: {
  orgSlug: string;
  tournamentId: number;
}) {
  const t = useTranslations("orgAdmin");
  const [currentSlug, setCurrentSlug] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [check, setCheck] = useState<{ status: "idle" | "checking" | "ok" | "taken" | "invalid"; reason?: string }>({ status: "idle" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load current slug.
  useEffect(() => {
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/settings`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.slug) setCurrentSlug(d.slug); })
      .catch(() => {});
  }, [orgSlug, tournamentId]);

  // Live-check the draft slug 350ms after the user stops typing.
  useEffect(() => {
    if (!editing) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!draft || draft === currentSlug) {
      setCheck({ status: "idle" });
      return;
    }
    setCheck({ status: "checking" });
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/admin/check-slug?slug=${encodeURIComponent(draft)}&excludeId=${tournamentId}`);
        const d = await r.json();
        if (d.available) setCheck({ status: "ok" });
        else if (d.reason) setCheck({ status: "invalid", reason: d.reason });
        else setCheck({ status: "taken" });
      } catch {
        setCheck({ status: "invalid", reason: t("slugNetworkError") });
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [draft, editing, currentSlug, tournamentId]);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const r = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: draft }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error ?? t("slugSaveFailed"));
        return;
      }
      setCurrentSlug(draft);
      setEditing(false);
      setCheck({ status: "idle" });
    } finally {
      setSaving(false);
    }
  }

  const previewBase = typeof window !== "undefined" ? window.location.origin : "https://goalityfootball.com";
  const liveUrl = `${previewBase}/t/${currentSlug}`;
  const draftUrl = `${previewBase}/t/${draft || currentSlug}`;

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>
        {t("tournamentUrlLabel")}
      </p>

      {!editing ? (
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 rounded-xl text-xs truncate"
            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)", border: "1px solid var(--cat-card-border)" }}>
            {liveUrl}
          </code>
          <button
            type="button"
            onClick={() => { setDraft(currentSlug); setEditing(true); }}
            className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all hover:opacity-80"
            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }}
          >
            <Pencil className="w-3.5 h-3.5" /> {t("slugEdit")}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs shrink-0" style={{ color: "var(--cat-text-muted)" }}>{previewBase}/t/</span>
            <input
              type="text"
              value={draft}
              onChange={e => setDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80))}
              placeholder="kings-cup-2027"
              className="flex-1 rounded-xl px-3 py-2 text-sm border outline-none font-mono"
              style={{ background: "var(--cat-input-bg)", borderColor: "var(--cat-input-border)", color: "var(--cat-text)" }}
              autoFocus
            />
          </div>

          {/* Status line */}
          <div className="flex items-center gap-2 text-[11px] min-h-[16px]">
            {check.status === "checking" && (
              <span style={{ color: "var(--cat-text-muted)" }}>
                <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> {t("slugChecking")}
              </span>
            )}
            {check.status === "ok" && (
              <span style={{ color: "#10b981" }}>
                <Check className="w-3 h-3 inline mr-1" /> {t("slugAvailable", { url: draftUrl })}
              </span>
            )}
            {check.status === "taken" && (
              <span style={{ color: "#ef4444" }}>
                <X className="w-3 h-3 inline mr-1" /> {t("slugTaken")}
              </span>
            )}
            {check.status === "invalid" && (
              <span style={{ color: "#ef4444" }}>
                <X className="w-3 h-3 inline mr-1" /> {check.reason ?? t("slugInvalid")}
              </span>
            )}
          </div>

          {error && (
            <p className="text-[11px]" style={{ color: "#ef4444" }}>{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving || check.status !== "ok"}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: "var(--cat-accent)", color: "#000" }}
            >
              {saving ? t("saving") : t("save")}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setDraft(""); setCheck({ status: "idle" }); setError(null); }}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }}
            >
              {t("cancel")}
            </button>
          </div>

          <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
            {t("slugHint")}
          </p>
        </div>
      )}
    </div>
  );
}
