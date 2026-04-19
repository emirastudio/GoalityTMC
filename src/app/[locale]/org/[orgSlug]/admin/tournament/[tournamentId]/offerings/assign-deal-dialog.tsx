"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X, Loader2, Check } from "lucide-react";
import type { OfferingDTO } from "@/lib/offerings/types";

interface RegistrationOption {
  id: number;
  regNumber: number;
  teamName: string;
  className: string | null;
}

/**
 * "Assign offering to teams" dialog. Organiser picks one offering from the
 * tournament catalog and one or many registrations to give it to. Server
 * deduplicates via a unique index on (reg, offering), so re-running this
 * is safe.
 */
export function AssignDealDialog({
  orgSlug,
  tournamentId,
  onClose,
  onAssigned,
}: {
  orgSlug: string;
  tournamentId: number;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const t = useTranslations("offeringsAdmin");

  const [offerings, setOfferings] = useState<OfferingDTO[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedOffering, setSelectedOffering] = useState<number | null>(null);
  const [selectedRegs, setSelectedRegs] = useState<Set<number>>(new Set());
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/offerings`, { credentials: "include" }).then(r => r.json()),
      // Reuse the registrations listing the admin dashboard already has.
      fetch(`/api/admin/registrations?tournamentId=${tournamentId}`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
    ])
      .then(([offRes, regRes]) => {
        setOfferings((offRes.offerings as OfferingDTO[]).filter(o => !o.isArchived));
        const regs: RegistrationOption[] = Array.isArray(regRes)
          ? regRes.map((r: Record<string, unknown>) => ({
              id: Number(r.id ?? r.registrationId ?? 0),
              regNumber: Number(r.regNumber ?? 0),
              teamName: String(r.displayName ?? r.teamName ?? r.team ?? `#${r.regNumber ?? r.id}`),
              className: (r.className ?? null) as string | null,
            })).filter((r) => r.id > 0)
          : [];
        setRegistrations(regs);
      })
      .catch(() => setError("load"))
      .finally(() => setLoading(false));
  }, [orgSlug, tournamentId]);

  function toggleReg(id: number) {
    setSelectedRegs(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOffering || selectedRegs.size === 0) {
      setError(t("assignMissing"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/deals`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offeringId: selectedOffering,
          registrationIds: Array.from(selectedRegs),
          dueDate: dueDate || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? t("saveError"));
        return;
      }
      onAssigned();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: "rgba(0,0,0,0.65)" }} onClick={onClose}>
      <form
        className="w-full max-w-lg rounded-2xl border overflow-hidden shadow-2xl"
        style={{
          background: "var(--cat-bg)",
          borderColor: "var(--cat-card-border)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--cat-card-border)" }}>
          <h3 className="text-base font-bold" style={{ color: "var(--cat-text)" }}>{t("assignTitle")}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: "var(--cat-text-muted)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto" style={{ flex: 1 }}>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--cat-text-muted)" }} />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--cat-text-muted)" }}>{t("assignOffering")}</label>
                <select
                  value={selectedOffering ?? ""}
                  onChange={(e) => setSelectedOffering(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
                >
                  <option value="">— {t("selectOffering")} —</option>
                  {offerings.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                      {o.kind === "package" ? ` (${t("packageBadge")})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium" style={{ color: "var(--cat-text-muted)" }}>
                    {t("assignTeams")} ({selectedRegs.size})
                  </label>
                  <button type="button"
                    onClick={() => setSelectedRegs(s =>
                      s.size === registrations.length ? new Set() : new Set(registrations.map(r => r.id))
                    )}
                    className="text-[11px] font-bold" style={{ color: "var(--cat-accent)" }}>
                    {selectedRegs.size === registrations.length ? t("selectNone") : t("selectAll")}
                  </button>
                </div>
                <div className="rounded-lg border max-h-64 overflow-y-auto"
                  style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}>
                  {registrations.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-center" style={{ color: "var(--cat-text-muted)" }}>
                      {t("noRegistrations")}
                    </p>
                  ) : (
                    registrations.map(r => {
                      const checked = selectedRegs.has(r.id);
                      return (
                        <label key={r.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer border-b last:border-b-0"
                          style={{ borderColor: "var(--cat-card-border)", background: checked ? "var(--cat-badge-open-bg)" : "transparent" }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleReg(r.id)}
                            style={{ accentColor: "var(--cat-accent)" }} />
                          <span className="text-sm flex-1 truncate" style={{ color: "var(--cat-text)" }}>
                            {r.teamName}
                          </span>
                          {r.className && (
                            <span className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                              {r.className}
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--cat-text-muted)" }}>
                  {t("assignDueDate")}
                </label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }} />
                <p className="text-[11px] mt-1" style={{ color: "var(--cat-text-muted)" }}>{t("assignDueDateHint")}</p>
              </div>

              {error && <p className="text-xs" style={{ color: "#ef4444" }}>{error}</p>}
            </>
          )}
        </div>

        <div className="flex gap-2 px-5 py-3 border-t" style={{ borderColor: "var(--cat-card-border)" }}>
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-bold border"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}>
            {t("cancel")}
          </button>
          <button type="submit" disabled={submitting || loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
            style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)", cursor: submitting ? "wait" : "pointer" }}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {t("assign")}
          </button>
        </div>
      </form>
    </div>
  );
}
