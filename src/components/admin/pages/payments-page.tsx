"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useAdminFetch } from "@/lib/tournament-context";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Pencil, Trash2, X } from "lucide-react";

type Payment = {
  id: number;
  registrationId: number;
  teamId: number | null;
  amount: string;
  currency: string;
  method: string;
  status: "pending" | "received" | "refunded";
  reference: string | null;
  notes: string | null;
  receivedAt: string | null;
  createdAt: string;
  teamName: string;
  teamRegNumber: string;
  clubName: string | null;
};

type Team = {
  id: number;
  registrationId: number;
  name: string;
  regNumber: string;
  club: { name: string | null };
};

type FilterTab = "all" | "received" | "pending" | "refunded";

const STATUS_BADGE: Record<string, "warning" | "success" | "error"> = {
  pending: "warning",
  received: "success",
  refunded: "error",
};

// METHOD_LABELS built from translations below in component

function formatEuro(val: string | number): string {
  return `\u20AC${Number(val).toFixed(2)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function toDateInput(iso: string | null): string {
  if (!iso) return todayISO();
  return iso.split("T")[0];
}

export function PaymentsPageContent() {
  const t = useTranslations("orgAdmin.payments");
  const adminFetch = useAdminFetch();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");

  // Add modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit modal
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Add form state
  const [formTeamId, setFormTeamId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formMethod, setFormMethod] = useState("bank_transfer");
  const [formStatus, setFormStatus] = useState("pending");
  const [formReference, setFormReference] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formDate, setFormDate] = useState(todayISO());
  const [teamSearch, setTeamSearch] = useState("");

  // Edit form state (mirrors add form)
  const [editTeamId, setEditTeamId] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editMethod, setEditMethod] = useState("bank_transfer");
  const [editStatus, setEditStatus] = useState("pending");
  const [editReference, setEditReference] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDate, setEditDate] = useState(todayISO());
  const [editTeamSearch, setEditTeamSearch] = useState("");

  const fetchPayments = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/payments");
      if (res.ok) setPayments(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/teams");
      if (res.ok) setTeams(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchPayments();
    fetchTeams();
  }, [fetchPayments, fetchTeams]);

  const filteredPayments = payments.filter(
    (p) => filter === "all" || p.status === filter
  );

  const summary = {
    received: payments.filter((p) => p.status === "received").reduce((s, p) => s + Number(p.amount), 0),
    pending:  payments.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0),
    refunded: payments.filter((p) => p.status === "refunded").reduce((s, p) => s + Number(p.amount), 0),
  };

  function resetForm() {
    setFormTeamId(""); setFormAmount(""); setFormMethod("bank_transfer");
    setFormStatus("pending"); setFormReference(""); setFormNotes("");
    setFormDate(todayISO()); setTeamSearch("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formTeamId || !formAmount) return;
    setSubmitting(true);
    try {
      const res = await adminFetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: Number(formTeamId), amount: Number(formAmount),
          method: formMethod, status: formStatus,
          reference: formReference || null, notes: formNotes || null,
          receivedAt: formDate || null,
        }),
      });
      if (res.ok) { setShowModal(false); resetForm(); await fetchPayments(); }
    } finally { setSubmitting(false); }
  }

  function openEdit(p: Payment) {
    setEditingPayment(p);
    setEditTeamId(String(p.registrationId));
    setEditAmount(p.amount);
    setEditMethod(p.method);
    setEditStatus(p.status);
    setEditReference(p.reference ?? "");
    setEditNotes(p.notes ?? "");
    setEditDate(toDateInput(p.receivedAt));
    setEditTeamSearch("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPayment || !editTeamId || !editAmount) return;
    setEditSubmitting(true);
    try {
      const res = await adminFetch("/api/admin/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPayment.id,
          registrationId: Number(editTeamId), amount: Number(editAmount),
          method: editMethod, status: editStatus,
          reference: editReference || null, notes: editNotes || null,
          receivedAt: editDate || null,
        }),
      });
      if (res.ok) { setEditingPayment(null); await fetchPayments(); }
    } finally { setEditSubmitting(false); }
  }

  async function handleDelete(id: number) {
    setDeleting(true);
    try {
      const res = await adminFetch(`/api/admin/payments?id=${id}`, { method: "DELETE" });
      if (res.ok) { setConfirmDeleteId(null); await fetchPayments(); }
    } finally { setDeleting(false); }
  }

  async function handleStatusChange(paymentId: number, newStatus: string) {
    await adminFetch("/api/admin/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: paymentId, status: newStatus }),
    });
    await fetchPayments();
  }

  const filteredTeams = (search: string) => teams.filter((team) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return team.name.toLowerCase().includes(q) || (team.club?.name ?? "").toLowerCase().includes(q) || team.regNumber.toLowerCase().includes(q);
  });

  const methodLabels: Record<string, string> = {
    bank_transfer: t("methodBank"),
    cash: t("methodCash"),
    stripe: t("methodStripe"),
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all",      label: t("filterAll") },
    { key: "received", label: t("filterReceived") },
    { key: "pending",  label: t("filterPending") },
    { key: "refunded", label: t("filterRefunded") },
  ];

  if (loading) {
    return <div className="flex items-center justify-center py-20 th-text-2">{t("loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold th-text">{t("title")}</h1>
        <Button onClick={() => setShowModal(true)}>{t("addPayment")}</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <p className="text-sm th-text-2">{t("totalReceived")}</p>
          <p className="text-2xl font-bold text-emerald-600">{formatEuro(summary.received)}</p>
        </Card>
        <Card className="border-l-4 border-l-amber-400">
          <p className="text-sm th-text-2">{t("pending")}</p>
          <p className="text-2xl font-bold text-amber-600">{formatEuro(summary.pending)}</p>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <p className="text-sm th-text-2">{t("refunded")}</p>
          <p className="text-2xl font-bold text-red-600">{formatEuro(summary.refunded)}</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b th-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              filter === tab.key
                ? "border-[var(--cat-accent)] text-[var(--cat-accent)]"
                : "border-transparent th-text-2 hover:th-text"
            }`}
          >
            {tab.label}
            {tab.key !== "all" && (
              <span className="ml-1.5 text-xs opacity-60">
                ({payments.filter((p) => p.status === tab.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card padding={false}>
        {filteredPayments.length === 0 ? (
          <div className="py-12 text-center th-text-2">{t("noPayments")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b th-border th-bg/50">
                  <th className="text-left px-4 py-3 font-medium th-text-2">{t("colDate")}</th>
                  <th className="text-left px-4 py-3 font-medium th-text-2">{t("colTeam")}</th>
                  <th className="text-left px-4 py-3 font-medium th-text-2">{t("colClub")}</th>
                  <th className="text-right px-4 py-3 font-medium th-text-2">{t("colAmount")}</th>
                  <th className="text-left px-4 py-3 font-medium th-text-2">{t("colMethod")}</th>
                  <th className="text-left px-4 py-3 font-medium th-text-2">{t("colStatus")}</th>
                  <th className="text-left px-4 py-3 font-medium th-text-2">{t("colRef")}</th>
                  <th className="text-left px-4 py-3 font-medium th-text-2">{t("colNotes")}</th>
                  <th className="text-left px-4 py-3 font-medium th-text-2">{t("colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="border-b th-border last:border-b-0 hover:th-bg/30">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.receivedAt ? formatDate(p.receivedAt) : formatDate(p.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.teamName}</div>
                      <div className="text-xs th-text-2">{p.teamRegNumber}</div>
                    </td>
                    <td className="px-4 py-3 th-text-2">{p.clubName ?? "-"}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {formatEuro(p.amount)}
                    </td>
                    <td className="px-4 py-3 th-text-2">
                      {methodLabels[p.method] ?? p.method}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={p.status}
                        onChange={(e) => handleStatusChange(p.id, e.target.value)}
                        className="text-xs border th-border rounded-md px-2 py-1 th-card cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--cat-accent)]/15"
                      >
                        <option value="pending">{t("statusPending")}</option>
                        <option value="received">{t("statusReceived")}</option>
                        <option value="refunded">{t("statusRefunded")}</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 th-text-2 text-xs max-w-[120px] truncate">
                      {p.reference ?? "-"}
                    </td>
                    <td className="px-4 py-3 th-text-2 text-xs max-w-[140px] truncate">
                      {p.notes ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {confirmDeleteId === p.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-error font-medium">{t("deleteConfirm")}</span>
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={deleting}
                            className="text-xs bg-error text-white rounded px-2 py-0.5 hover:bg-error/90 disabled:opacity-50"
                          >
                            {deleting ? "..." : t("yes")}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs th-text-2 hover:th-text"
                          >
                            {t("no")}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded-lg th-text-2 hover:opacity-80 hover:opacity-80 transition-colors"
                            title="Edit payment"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(p.id)}
                            className="p-1.5 rounded-lg th-text-2 hover:text-error hover:bg-error/5 transition-colors"
                            title="Delete payment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingPayment(null)}>
          <Card className="popup-bg w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>{t("editPayment")}</CardTitle>
              <button onClick={() => setEditingPayment(null)} className="p-1 hover:th-bg rounded-lg">
                <X className="w-4 h-4 th-text-2" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium th-text">{t("teamLabel")}</label>
                <input
                  type="text"
                  value={editTeamSearch}
                  onChange={(e) => setEditTeamSearch(e.target.value)}
                  placeholder={t("searchTeams")}
                  className="w-full rounded-lg border th-border th-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/15 focus:border-[var(--cat-accent)]"
                />
                <select
                  value={editTeamId}
                  onChange={(e) => setEditTeamId(e.target.value)}
                  required
                  className="w-full rounded-lg border th-border th-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/15 focus:border-[var(--cat-accent)] appearance-none cursor-pointer"
                  size={Math.min(filteredTeams(editTeamSearch).length + 1, 6)}
                >
                  <option value="" disabled>{t("selectTeam")}</option>
                  {filteredTeams(editTeamSearch).map((team) => (
                    <option key={team.id} value={team.registrationId}>
                      {team.name} - {team.club?.name ?? t("noClub")} ({team.regNumber})
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label={t("amountLabel")}
                type="number" step="0.01" min="0"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                required placeholder="0.00"
              />

              <Select
                label={t("methodLabel")}
                value={editMethod}
                onChange={(e) => setEditMethod(e.target.value)}
                options={[
                  { value: "bank_transfer", label: t("methodBank") },
                  { value: "cash", label: t("methodCash") },
                  { value: "stripe", label: t("methodStripe") },
                ]}
              />

              <Select
                label={t("statusLabel")}
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                options={[
                  { value: "pending", label: t("statusPending") },
                  { value: "received", label: t("statusReceived") },
                  { value: "refunded", label: t("statusRefunded") },
                ]}
              />

              <Input
                label={t("referenceLabel")}
                value={editReference}
                onChange={(e) => setEditReference(e.target.value)}
                placeholder="e.g. invoice number"
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium th-text">{t("notesLabel")}</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full rounded-lg border th-border th-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/15 focus:border-[var(--cat-accent)] resize-y"
                  rows={3} placeholder={t("additionalNotes")}
                />
              </div>

              <Input
                label={t("dateLabel")}
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" type="button" onClick={() => setEditingPayment(null)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={editSubmitting}>
                  {editSubmitting ? t("saving") : t("saveChanges")}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Add Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowModal(false); resetForm(); }}>
          <Card className="popup-bg w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>{t("addPayment")}</CardTitle>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1 hover:th-bg rounded-lg">
                <X className="w-4 h-4 th-text-2" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium th-text">{t("teamLabel")}</label>
                <input
                  type="text"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder={t("searchTeams")}
                  className="w-full rounded-lg border th-border th-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/15 focus:border-[var(--cat-accent)]"
                />
                <select
                  value={formTeamId}
                  onChange={(e) => setFormTeamId(e.target.value)}
                  required
                  className="w-full rounded-lg border th-border th-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/15 focus:border-[var(--cat-accent)] appearance-none cursor-pointer"
                  size={Math.min(filteredTeams(teamSearch).length + 1, 6)}
                >
                  <option value="" disabled>{t("selectTeam")}</option>
                  {filteredTeams(teamSearch).map((team) => (
                    <option key={team.id} value={team.registrationId}>
                      {team.name} - {team.club?.name ?? t("noClub")} ({team.regNumber})
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label={t("amountLabel")}
                type="number" step="0.01" min="0"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                required placeholder="0.00"
              />

              <Select
                label={t("methodLabel")}
                value={formMethod}
                onChange={(e) => setFormMethod(e.target.value)}
                options={[
                  { value: "bank_transfer", label: t("methodBank") },
                  { value: "cash", label: t("methodCash") },
                  { value: "stripe", label: t("methodStripe") },
                ]}
              />

              <Select
                label={t("statusLabel")}
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
                options={[
                  { value: "pending", label: t("statusPending") },
                  { value: "received", label: t("statusReceived") },
                ]}
              />

              <Input
                label={t("referenceLabel")}
                value={formReference}
                onChange={(e) => setFormReference(e.target.value)}
                placeholder="e.g. invoice number"
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium th-text">{t("notesLabel")}</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full rounded-lg border th-border th-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/15 focus:border-[var(--cat-accent)] resize-y"
                  rows={3} placeholder={t("additionalNotes")}
                />
              </div>

              <Input
                label={t("dateLabel")}
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" type="button" onClick={() => { setShowModal(false); resetForm(); }}>
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? t("adding") : t("addPayment")}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
