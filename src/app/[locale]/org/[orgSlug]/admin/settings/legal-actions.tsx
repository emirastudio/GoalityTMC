"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Check, Download, Loader2, Trash2 } from "lucide-react";

/**
 * GDPR self-service actions for an organisation admin:
 *   - Art. 15 / 20: download a JSON export
 *   - Art. 17: request account deletion (email to privacy@goality.app)
 *
 * Destructive action uses a two-step typed confirmation — the admin
 * must type the organisation name exactly to enable the Confirm button.
 */
export function OrgLegalActions({
  orgSlug,
  orgName,
}: {
  orgSlug: string;
  orgName: string;
}) {
  const t = useTranslations("orgAdmin");

  const [exportLoading, setExportLoading] = useState(false);

  const [deletionExpanded, setDeletionExpanded] = useState(false);
  const [deletionConfirmText, setDeletionConfirmText] = useState("");
  const [deletionState, setDeletionState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [deletionError, setDeletionError] = useState<string | null>(null);

  async function handleExport() {
    setExportLoading(true);
    try {
      const res = await fetch(`/api/org/${orgSlug}/export`, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `goality-org-${orgSlug}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silent fail — download dialog is the only success signal
    } finally {
      setExportLoading(false);
    }
  }

  async function handleRequestDeletion() {
    if (deletionConfirmText.trim() !== orgName) {
      setDeletionError(t("dangerConfirmMismatch"));
      return;
    }
    setDeletionState("sending");
    setDeletionError(null);
    try {
      const res = await fetch("/api/auth/request-org-deletion", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setDeletionState("sent");
      } else {
        const data = await res.json().catch(() => ({}));
        setDeletionError(data.error ?? t("dangerGenericError"));
        setDeletionState("error");
      }
    } catch {
      setDeletionError(t("dangerGenericError"));
      setDeletionState("error");
    }
  }

  return (
    <div className="mt-10 space-y-6 max-w-xl">
      {/* Export */}
      <div
        className="rounded-2xl p-6 border"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(59,130,246,0.12)" }}
          >
            <Download className="w-4 h-4" style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--cat-text)" }}>
              {t("exportTitle")}
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--cat-text-muted)" }}>
              {t("exportDesc")}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exportLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
          style={{
            background: "rgba(59,130,246,0.1)",
            color: "#3B82F6",
            border: "1px solid rgba(59,130,246,0.3)",
          }}
        >
          {exportLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("exportPreparing")}
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              {t("exportButton")}
            </>
          )}
        </button>
      </div>

      {/* Danger zone */}
      <div
        className="rounded-2xl p-6 border"
        style={{ background: "var(--cat-card-bg)", borderColor: "rgba(239,68,68,0.3)" }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(239,68,68,0.12)" }}
          >
            <AlertTriangle className="w-4 h-4" style={{ color: "#ef4444" }} />
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--cat-text)" }}>
              {t("dangerZoneTitle")}
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--cat-text-muted)" }}>
              {t("dangerZoneDesc")}
            </p>
          </div>
        </div>

        {deletionState === "sent" ? (
          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.3)",
            }}
          >
            <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#10b981" }} />
            <div>
              <p className="text-sm font-bold" style={{ color: "#10b981" }}>
                {t("dangerSentTitle")}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--cat-text-secondary)" }}>
                {t("dangerSentBody")}
              </p>
            </div>
          </div>
        ) : !deletionExpanded ? (
          <button
            type="button"
            onClick={() => setDeletionExpanded(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90 cursor-pointer"
            style={{
              background: "rgba(239,68,68,0.1)",
              color: "#ef4444",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            <Trash2 className="w-4 h-4" />
            {t("dangerDeleteButton")}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>
              {t("dangerConfirmInstruction")}{" "}
              <strong style={{ color: "var(--cat-text)" }}>{orgName}</strong>
            </p>
            <input
              type="text"
              value={deletionConfirmText}
              onChange={(e) => {
                setDeletionConfirmText(e.target.value);
                setDeletionError(null);
              }}
              placeholder={orgName}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1"
              style={{
                background: "var(--cat-bg)",
                borderColor: "rgba(239,68,68,0.3)",
                color: "var(--cat-text)",
              }}
            />
            {deletionError && (
              <p className="text-xs" style={{ color: "#ef4444" }}>
                {deletionError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeletionExpanded(false);
                  setDeletionConfirmText("");
                  setDeletionError(null);
                }}
                disabled={deletionState === "sending"}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50 cursor-pointer"
                style={{
                  background: "var(--cat-tag-bg)",
                  color: "var(--cat-text)",
                  border: "1px solid var(--cat-card-border)",
                }}
              >
                {t("dangerCancel")}
              </button>
              <button
                type="button"
                onClick={handleRequestDeletion}
                disabled={
                  deletionState === "sending" ||
                  deletionConfirmText.trim() !== orgName
                }
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40 cursor-pointer"
                style={{ background: "#ef4444", color: "#fff", border: "none" }}
              >
                {deletionState === "sending" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("dangerSending")}
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    {t("dangerConfirmButton")}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
