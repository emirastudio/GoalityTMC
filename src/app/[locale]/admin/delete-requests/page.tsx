"use client";

import { useEffect, useState } from "react";
import { Trash2, CheckCircle2, X, AlertCircle, Trophy, Calendar, ExternalLink, Loader2 } from "lucide-react";

type DeleteRequest = {
  id: number;
  name: string;
  slug: string;
  year: number;
  plan: string;
  registrationOpen: boolean;
  deleteRequestedAt: string;
  deleteRequestReason: string | null;
  deletedAt: string | null;
  orgId: number;
  orgName: string;
  orgSlug: string;
};

const PLAN_COLORS: Record<string, string> = {
  free: "#6B7280", starter: "#2563EB", pro: "#059669", elite: "#EA580C",
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function DeleteRequestsPage() {
  const [requests, setRequests] = useState<DeleteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/delete-requests")
      .then(r => r.json())
      .then(d => setRequests(d.requests ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const act = async (id: number, action: "approve" | "reject") => {
    setProcessing(id);
    await fetch(`/api/admin/delete-requests/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setProcessing(null);
    load();
  };

  const pending = requests.filter(r => !r.deletedAt);
  const done = requests.filter(r => r.deletedAt);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-red-100">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900">Delete Requests</h1>
          <p className="text-sm text-gray-500">Organizer requests to delete their tournaments</p>
        </div>
        <button onClick={load} className="ml-auto px-3 py-1.5 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : pending.length === 0 && done.length === 0 ? (
        <div className="text-center py-16 rounded-2xl bg-gray-50 border border-dashed border-gray-200">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-semibold text-gray-500">No pending delete requests</p>
        </div>
      ) : (
        <>
          {/* Pending */}
          {pending.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                Pending — {pending.length}
              </p>
              {pending.map(r => (
                <div key={r.id} className="rounded-2xl border-2 border-red-200 bg-red-50 p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                      <Trophy className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-black text-gray-900">{r.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                          style={{ background: `${PLAN_COLORS[r.plan] ?? "#6b7280"}18`, color: PLAN_COLORS[r.plan] ?? "#6b7280" }}>
                          {r.plan}
                        </span>
                        {r.registrationOpen && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            Registration OPEN
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-1">
                        {r.orgName} · {r.year} ·{" "}
                        <a href={`/admin/delete-requests`} className="text-blue-600 hover:underline">
                          /org/{r.orgSlug}
                        </a>
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Requested: {fmtDate(r.deleteRequestedAt)}
                      </p>
                      {r.deleteRequestReason && (
                        <p className="mt-2 text-sm text-gray-700 bg-white rounded-xl px-3 py-2 border border-red-200">
                          "{r.deleteRequestReason}"
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => act(r.id, "approve")}
                        disabled={processing === r.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-all">
                        {processing === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        Delete
                      </button>
                      <button
                        onClick={() => act(r.id, "reject")}
                        disabled={processing === r.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-60 transition-all">
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Done */}
          {done.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 mt-6">
                Deleted — {done.length}
              </p>
              {done.map(r => (
                <div key={r.id} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center gap-3">
                  <Trash2 className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-500 flex-1">{r.name} <span className="text-gray-400">· {r.orgName} · {r.year}</span></span>
                  <span className="text-xs text-gray-400">{fmtDate(r.deletedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
