"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Bug, X, Loader2, Check, AlertCircle, Upload, Trash2 } from "lucide-react";

/**
 * Floating bug-reporter widget.
 *
 * Renders a bottom-right round button that opens a modal with:
 *   title, description, severity (4 pills), optional screenshot upload.
 *
 * Auto-captures: current URL+path, user-agent, viewport, locale, and
 * a rolling buffer of the last 10 console.error / window 'error' /
 * 'unhandledrejection' events that fired since the page loaded.
 *
 * Mount this inside the auth-gated app shell — the parent decides who
 * gets to see it (we just render an inert button if shouldShow=false).
 */

type Severity = "low" | "medium" | "high" | "critical";

const SEVERITIES: { key: Severity; emoji: string }[] = [
  { key: "low",      emoji: "🟢" },
  { key: "medium",   emoji: "🟡" },
  { key: "high",     emoji: "🟠" },
  { key: "critical", emoji: "🔴" },
];

// ─── Console buffer (module-level — install once per page) ────
type LogEntry = { t: number; level: "error" | "warn" | "unhandled"; msg: string };
const LOG_BUFFER: LogEntry[] = [];
const LOG_MAX = 10;
let installed = false;

function installConsoleCapture() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const origError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    push({ t: Date.now(), level: "error", msg: args.map(stringify).join(" ").slice(0, 500) });
    origError(...args);
  };

  window.addEventListener("error", (e) => {
    push({
      t: Date.now(),
      level: "error",
      msg: `${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`.slice(0, 500),
    });
  });
  window.addEventListener("unhandledrejection", (e) => {
    push({
      t: Date.now(),
      level: "unhandled",
      msg: stringify(e.reason).slice(0, 500),
    });
  });
}

function push(entry: LogEntry) {
  LOG_BUFFER.push(entry);
  while (LOG_BUFFER.length > LOG_MAX) LOG_BUFFER.shift();
}

function stringify(v: unknown): string {
  if (v instanceof Error) return `${v.name}: ${v.message}`;
  if (typeof v === "string") return v;
  try { return JSON.stringify(v); } catch { return String(v); }
}

export function BugReporter({ shouldShow }: { shouldShow: boolean }) {
  const t = useTranslations("bugReporter");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ id: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { installConsoleCapture(); }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const resetForm = () => {
    setTitle(""); setDescription(""); setSeverity("medium");
    setScreenshotUrl(null); setError(null); setDone(null);
  };
  const closeModal = useCallback(() => {
    setOpen(false);
    // Defer reset so the closing animation (if any later) doesn't flash empty
    setTimeout(resetForm, 200);
  }, []);

  const onUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Upload failed (${res.status})`);
      }
      const j = await res.json();
      setScreenshotUrl(j.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true); setError(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        severity,
        pageUrl: window.location.href,
        pagePath: window.location.pathname,
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        locale,
        consoleSnapshot: LOG_BUFFER.slice(),
        screenshotUrl,
      };
      const res = await fetch("/api/bug-reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${res.status})`);
      }
      const j = await res.json();
      setDone({ id: j.id });
      // Auto-close after success
      setTimeout(closeModal, 2200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!shouldShow) return null;

  return (
    <>
      {/* Floating button — small + muted at rest, accent on hover. z-1001 above cookie consent. */}
      {!open && (
        <div className="fixed bottom-4 right-4 md:bottom-5 md:right-5 z-[1001] flex items-center gap-2">
          {/* Tooltip — appears left of button on hover */}
          <span
            className="rounded-md px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-opacity duration-150 pointer-events-none"
            style={{
              opacity: hover ? 1 : 0,
              background: "rgba(15,23,42,0.92)",
              color: "#f8fafc",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
          >
            {t("buttonLabel")}
          </span>
          <button
            onClick={() => setOpen(true)}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            aria-label={t("buttonLabel")}
            className="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
            style={{
              background: hover ? "var(--cat-accent, #2BFEBA)" : "rgba(148,163,184,0.18)",
              color: hover ? "#0A0E14" : "var(--cat-text-muted, #94a3b8)",
              border: hover ? "1px solid transparent" : "1px solid rgba(148,163,184,0.25)",
              boxShadow: hover
                ? "0 8px 24px rgba(43,254,186,0.35), 0 2px 8px rgba(0,0,0,0.18)"
                : "0 2px 6px rgba(0,0,0,0.08)",
              backdropFilter: "blur(6px)",
            }}
          >
            <Bug className="w-[15px] h-[15px]" strokeWidth={2} />
          </button>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bug-reporter-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal panel */}
          <div
            className="relative w-full sm:max-w-[520px] rounded-t-3xl sm:rounded-3xl border shadow-2xl max-h-[92vh] overflow-y-auto"
            style={{
              background: "var(--cat-card-bg, #0f172a)",
              borderColor: "var(--cat-card-border, rgba(148,163,184,0.2))",
              color: "var(--cat-text, #f8fafc)",
            }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b" style={{ background: "var(--cat-card-bg, #0f172a)", borderColor: "var(--cat-card-border, rgba(148,163,184,0.18))" }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--cat-badge-open-bg, rgba(43,254,186,0.15))" }}
                >
                  <Bug className="w-4 h-4" style={{ color: "var(--cat-accent, #2BFEBA)" }} />
                </div>
                <div>
                  <p id="bug-reporter-title" className="text-[15px] font-bold leading-tight">{t("modalTitle")}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--cat-text-muted, #94a3b8)" }}>{t("modalSubtitle")}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                aria-label="Close"
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {done ? (
              <div className="px-5 py-10 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: "rgba(43,254,186,0.18)" }}>
                  <Check className="w-7 h-7" style={{ color: "var(--cat-accent, #2BFEBA)" }} />
                </div>
                <p className="font-bold text-[15px]">{t("thanks")}</p>
                <p className="text-[12px] mt-1" style={{ color: "var(--cat-text-muted, #94a3b8)" }}>
                  {t("thanksDetail", { id: done.id })}
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); submit(); }}
                className="px-5 py-4 space-y-4"
              >
                {/* Title */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--cat-text-muted, #94a3b8)" }}>
                    {t("titleLabel")}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    autoFocus
                    placeholder={t("titlePlaceholder")}
                    className="w-full px-3 py-2.5 rounded-xl text-[14px] outline-none transition border"
                    style={{
                      background: "var(--cat-tag-bg, rgba(148,163,184,0.08))",
                      borderColor: "var(--cat-card-border, rgba(148,163,184,0.2))",
                      color: "var(--cat-text)",
                    }}
                  />
                </div>

                {/* Severity pills */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--cat-text-muted, #94a3b8)" }}>
                    {t("severityLabel")}
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {SEVERITIES.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setSeverity(s.key)}
                        className="flex items-center justify-center gap-1 px-1 py-2 rounded-xl text-[11px] font-bold transition border"
                        style={{
                          background: severity === s.key ? "var(--cat-accent, #2BFEBA)" : "var(--cat-tag-bg, rgba(148,163,184,0.08))",
                          color: severity === s.key ? "#0A0E14" : "var(--cat-text)",
                          borderColor: severity === s.key ? "transparent" : "var(--cat-card-border, rgba(148,163,184,0.2))",
                        }}
                      >
                        <span>{s.emoji}</span>
                        <span className="uppercase">{t(`severity.${s.key}`)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--cat-text-muted, #94a3b8)" }}>
                    {t("descriptionLabel")}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={5000}
                    rows={5}
                    placeholder={t("descriptionPlaceholder")}
                    className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none resize-y min-h-[120px] border leading-relaxed"
                    style={{
                      background: "var(--cat-tag-bg, rgba(148,163,184,0.08))",
                      borderColor: "var(--cat-card-border, rgba(148,163,184,0.2))",
                      color: "var(--cat-text)",
                    }}
                  />
                  <p className="text-[10px] mt-1" style={{ color: "var(--cat-text-muted, #94a3b8)" }}>
                    {description.length}/5000
                  </p>
                </div>

                {/* Screenshot */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--cat-text-muted, #94a3b8)" }}>
                    {t("screenshotLabel")}
                  </label>
                  {screenshotUrl ? (
                    <div className="flex items-center gap-2 p-2 rounded-xl border" style={{ background: "var(--cat-tag-bg, rgba(148,163,184,0.08))", borderColor: "var(--cat-card-border, rgba(148,163,184,0.2))" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={screenshotUrl} alt="screenshot" className="w-14 h-14 rounded-lg object-cover" />
                      <span className="text-[12px] flex-1 truncate" style={{ color: "var(--cat-text-muted, #94a3b8)" }}>
                        {screenshotUrl.split("/").pop()}
                      </span>
                      <button
                        type="button"
                        onClick={() => setScreenshotUrl(null)}
                        aria-label="Remove screenshot"
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl border border-dashed text-[12px] font-medium hover:bg-white/[0.03] transition disabled:opacity-50"
                      style={{
                        borderColor: "var(--cat-card-border, rgba(148,163,184,0.3))",
                        color: "var(--cat-text-muted, #94a3b8)",
                      }}
                    >
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {uploading ? t("uploading") : t("screenshotHint")}
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onUpload(f);
                      e.target.value = "";
                    }}
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(248,113,113,0.12)", color: "#fca5a5" }}>
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="text-[12px]">{error}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2.5 rounded-xl text-[13px] font-medium transition border hover:opacity-80"
                    style={{
                      background: "var(--cat-tag-bg, rgba(148,163,184,0.08))",
                      borderColor: "var(--cat-card-border, rgba(148,163,184,0.2))",
                      color: "var(--cat-text)",
                    }}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !title.trim() || !description.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: "var(--cat-accent, #2BFEBA)", color: "#0A0E14" }}
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bug className="w-3.5 h-3.5" />}
                    {submitting ? t("sending") : t("submit")}
                  </button>
                </div>

                <p className="text-[10px] text-center pt-1" style={{ color: "var(--cat-text-muted, #94a3b8)" }}>
                  {t("autoFooter")}
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
