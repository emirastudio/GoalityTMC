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
  teamId: number;
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

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  stripe: "Stripe",
};

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

export default function AdminPaymentsPage() {
  const t = useTranslations("admin");
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
          teamId: Number(formTeamId), amount: Number(formAmount),
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
    setEditTeamId(String(p.teamId));
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
          teamId: Number(editTeamId), amount: Number(editAmount),
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

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "received", label: "Received" },
    { key: "pending", label: "Pending" },
    { key: "refunded", label: "Refunded" },
  ];

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-text-secondary">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Payments</h1>
        <Button onClick={() => setShowModal(true)}>Add Payment</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <p className="text-sm text-text-secondary">Total Received</p>
          <p className="text-2xl font-bold text-emerald-600">{formatEuro(summary.received)}</p>
        </Card>
        <Card className="border-l-4 border-l-amber-400">
          <p className="text-sm text-text-secondary">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{formatEuro(summary.pending)}</p>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <p className="text-sm text-text-secondary">Refunded</p>
          <p className="text-2xl font-bold text-red-600">{formatEuro(summary.refunded)}</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              filter === tab.key
                ? "border-navy text-navy"
                : "border-transparent text-text-secondary hover:text-text-primary"
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
          <div className="py-12 text-center text-text-secondary">No payments found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Team</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Club</th>
                  <th className="text-right px-4 py-3 font-medium text-text-secondary">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Method</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Reference</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Notes</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-b-0 hover:bg-surface/30">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.receivedAt ? formatDate(p.receivedAt) : formatDate(p.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.teamName}</div>
                      <div className="text-xs text-text-secondary">{p.teamRegNumber}</div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{p.clubName ?? "-"}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {formatEuro(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {METHOD_LABELS[p.method] ?? p.method}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={p.status}
                        onChange={(e) => handleStatusChange(p.id, e.target.value)}
                        className="text-xs border border-border rounded-md px-2 py-1 bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-navy/20"
                      >
                        <option value="pending">Pending</option>
                        <option value="received">Received</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs max-w-[120px] truncate">
                      {p.reference ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs max-w-[140px] truncate">
                      {p.notes ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {confirmDeleteId === p.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-error font-medium">Delete?</span>
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={deleting}
                            className="text-xs bg-error text-white rounded px-2 py-0.5 hover:bg-error/90 disabled:opacity-50"
                          >
                            {deleting ? "..." : "Yes"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs text-text-secondary hover:text-text-primary"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-navy hover:bg-navy/5 transition-colors"
                            title="Edit payment"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(p.id)}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-error hover:bg-error/5 transition-colors"
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
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Edit Payment</CardTitle>
              <button onClick={() => setEditingPayment(null)} className="p-1 hover:bg-surface rounded-lg">
                <X className="w-4 h-4 text-text-secondary" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">Team</label>
                <input
                  type="text"
                  value={editTeamSearch}
                  onChange={(e) => setEditTeamSearch(e.target.value)}
                  placeholder="Search teams..."
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                />
                <select
                  value={editTeamId}
                  onChange={(e) => setEditTeamId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy appearance-none cursor-pointer"
                  size={Math.min(filteredTeams(editTeamSearch).length + 1, 6)}
                >
                  <option value="" disabled>Select a team</option>
                  {filteredTeams(editTeamSearch).map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} - {team.club?.name ?? "No club"} ({team.regNumber})
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Amount (EUR)"
                type="number" step="0.01" min="0"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                required placeholder="0.00"
              />

              <Select
                label="Method"
                value={editMethod}
                onChange={(e) => setEditMethod(e.target.value)}
                options={[
                  { value: "bank_transfer", label: "Bank Transfer" },
                  { value: "cash", label: "Cash" },
                  { value: "stripe", label: "Stripe" },
                ]}
              />

              <Select
                label="Status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                options={[
                  { value: "pending", label: "Pending" },
                  { value: "received", label: "Received" },
                  { value: "refunded", label: "Refunded" },
                ]}
              />

              <Input
                label="Reference (optional)"
                value={editReference}
                onChange={(e) => setEditReference(e.target.value)}
                placeholder="e.g. invoice number"
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">Notes (optional)</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy resize-y"
                  rows={3} placeholder="Additional notes..."
                />
              </div>

              <Input
                label="Date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" type="button" onClick={() => setEditingPayment(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editSubmitting}>
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Add Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowModal(false); resetForm(); }}>
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Add Payment</CardTitle>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1 hover:bg-surface rounded-lg">
                <X className="w-4 h-4 text-text-secondary" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">Team</label>
                <input
                  type="text"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Search teams..."
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                />
                <select
                  value={formTeamId}
                  onChange={(e) => setFormTeamId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy appearance-none cursor-pointer"
                  size={Math.min(filteredTeams(teamSearch).length + 1, 6)}
                >
                  <option value="" disabled>Select a team</option>
                  {filteredTeams(teamSearch).map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} - {team.club?.name ?? "No club"} ({team.regNumber})
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Amount (EUR)"
                type="number" step="0.01" min="0"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                required placeholder="0.00"
              />

              <Select
                label="Method"
                value={formMethod}
                onChange={(e) => setFormMethod(e.target.value)}
                options={[
                  { value: "bank_transfer", label: "Bank Transfer" },
                  { value: "cash", label: "Cash" },
                  { value: "stripe", label: "Stripe" },
                ]}
              />

              <Select
                label="Status"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
                options={[
                  { value: "pending", label: "Pending" },
                  { value: "received", label: "Received" },
                ]}
              />

              <Input
                label="Reference (optional)"
                value={formReference}
                onChange={(e) => setFormReference(e.target.value)}
                placeholder="e.g. invoice number"
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">Notes (optional)</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy resize-y"
                  rows={3} placeholder="Additional notes..."
                />
              </div>

              <Input
                label="Date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" type="button" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Adding..." : "Add Payment"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
