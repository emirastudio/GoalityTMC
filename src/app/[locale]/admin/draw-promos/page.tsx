"use client";

/**
 * Superadmin promo-code CRUD for the standalone /draw product.
 *
 * Top-level layout: summary cards (active count, total uses), a
 * "create code" form, then the table of existing codes with inline
 * edit (toggle disabled, change notes). Hard delete is one click +
 * native confirm.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Tag,
  Plus,
  Loader2,
  Trash2,
  Power,
  Check,
  X,
  Copy,
  Calendar,
  Sparkles,
} from "lucide-react";

type PromoRow = {
  id: number;
  code: string;
  discountType: "free" | "percent" | "flat" | string;
  discountValue: number;
  maxUses: number | null;
  currentUses: number;
  validFrom: string | null;
  validTo: string | null;
  disabled: boolean;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse = {
  promos: PromoRow[];
  summary: { activeCount: number; totalUses: number };
};

const TYPE_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  free:    { color: "#059669", bg: "rgba(5,150,105,0.12)",  label: "FREE" },
  percent: { color: "#2563EB", bg: "rgba(37,99,235,0.12)",  label: "%" },
  flat:    { color: "#EA580C", bg: "rgba(234,88,12,0.12)",  label: "€" },
};

export default function DrawPromosPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    fetch("/api/admin/draw-promos")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: ApiResponse) => setData(d))
      .catch((e) => setError(typeof e === "number" ? `HTTP ${e}` : "fetch failed"))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* ── Header ── */}
      <div>
        <h1
          className="text-2xl font-black mb-1 flex items-center gap-2"
          style={{ color: "var(--cat-text)" }}
        >
          <Tag className="w-6 h-6" style={{ color: "#2BFEBA" }} />
          Draw Show promo codes
        </h1>
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
          Coupons for the standalone /draw product. Free codes also let users skip the (future) €11 paywall — usage is tracked in the Draw Show events log.
        </p>
      </div>

      {/* ── Summary ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          icon={<Sparkles className="w-4 h-4" />}
          label="Active codes"
          value={data?.summary.activeCount ?? "—"}
          color="#2BFEBA"
        />
        <SummaryCard
          icon={<Check className="w-4 h-4" />}
          label="Total uses"
          value={data?.summary.totalUses ?? "—"}
          color="#059669"
        />
      </div>

      {/* ── Create form ── */}
      <CreatePromoCard onCreated={load} />

      {/* ── List ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "var(--cat-card-bg)",
          border: "1px solid var(--cat-card-border)",
        }}
      >
        {error && (
          <div className="px-4 py-3 text-sm font-semibold" style={{ color: "#ef4444" }}>
            {error}
          </div>
        )}
        {loading && !data && (
          <div className="px-4 py-12 flex items-center justify-center"
            style={{ color: "var(--cat-text-muted)" }}>
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        {data && data.promos.length === 0 && !loading && (
          <div className="px-4 py-12 text-center text-sm"
            style={{ color: "var(--cat-text-muted)" }}>
            No promo codes yet. Create one above.
          </div>
        )}
        {data && data.promos.length > 0 && (
          <table className="w-full text-sm">
            <thead style={{ background: "var(--cat-tag-bg)" }}>
              <tr style={{ color: "var(--cat-text-muted)" }}>
                <Th>Code</Th>
                <Th>Discount</Th>
                <Th>Uses</Th>
                <Th>Valid</Th>
                <Th>Notes</Th>
                <Th>Created</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {data.promos.map((p) => (
                <PromoRowItem key={p.id} promo={p} onChange={load} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function CreatePromoCard({ onCreated }: { onCreated: () => void }) {
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"free" | "percent" | "flat">("free");
  const [discountValue, setDiscountValue] = useState(0);
  const [maxUses, setMaxUses] = useState<string>("");
  const [validTo, setValidTo] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/draw-promos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          discountType,
          discountValue:
            discountType === "free"
              ? 0
              : discountType === "flat"
                ? Math.round(discountValue * 100)
                : discountValue,
          maxUses: maxUses ? parseInt(maxUses) : null,
          validTo: validTo || null,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setCode("");
      setDiscountValue(0);
      setMaxUses("");
      setValidTo("");
      setNotes("");
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: "var(--cat-card-bg)",
        border: "1px solid var(--cat-card-border)",
      }}
    >
      <p className="text-xs font-bold uppercase tracking-widest"
        style={{ color: "var(--cat-text-muted)" }}>
        Create new promo code
      </p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="LAUNCH20"
          required
          minLength={3}
          maxLength={32}
          className="rounded-xl px-3 py-2 text-sm font-mono uppercase outline-none"
          style={{
            background: "var(--cat-input-bg, var(--cat-card-bg))",
            border: "1px solid var(--cat-card-border)",
            color: "var(--cat-text)",
            letterSpacing: "0.05em",
          }}
        />
        <select
          value={discountType}
          onChange={(e) => setDiscountType(e.target.value as "free" | "percent" | "flat")}
          className="rounded-xl px-3 py-2 text-sm outline-none"
          style={{
            background: "var(--cat-input-bg, var(--cat-card-bg))",
            border: "1px solid var(--cat-card-border)",
            color: "var(--cat-text)",
          }}
        >
          <option value="free">Free (100%)</option>
          <option value="percent">Percent off</option>
          <option value="flat">Flat € off</option>
        </select>
        {discountType !== "free" && (
          <input
            type="number"
            value={discountValue}
            onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
            min={0}
            max={discountType === "percent" ? 100 : 11}
            step={discountType === "percent" ? 1 : 0.5}
            placeholder={discountType === "percent" ? "50" : "5.00"}
            className="rounded-xl px-3 py-2 text-sm outline-none"
            style={{
              background: "var(--cat-input-bg, var(--cat-card-bg))",
              border: "1px solid var(--cat-card-border)",
              color: "var(--cat-text)",
            }}
          />
        )}
        <input
          type="number"
          value={maxUses}
          onChange={(e) => setMaxUses(e.target.value)}
          placeholder="Max uses (∞)"
          min={1}
          className="rounded-xl px-3 py-2 text-sm outline-none"
          style={{
            background: "var(--cat-input-bg, var(--cat-card-bg))",
            border: "1px solid var(--cat-card-border)",
            color: "var(--cat-text)",
          }}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="datetime-local"
          value={validTo}
          onChange={(e) => setValidTo(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm outline-none"
          style={{
            background: "var(--cat-input-bg, var(--cat-card-bg))",
            border: "1px solid var(--cat-card-border)",
            color: "var(--cat-text)",
          }}
        />
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (e.g. Telegram launch promo)"
          className="rounded-xl px-3 py-2 text-sm outline-none"
          style={{
            background: "var(--cat-input-bg, var(--cat-card-bg))",
            border: "1px solid var(--cat-card-border)",
            color: "var(--cat-text)",
          }}
        />
      </div>
      {error && (
        <p className="text-xs font-semibold" style={{ color: "#ef4444" }}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting || !code.trim()}
        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
        style={{
          background: "var(--cat-accent)",
          color: "var(--cat-accent-text)",
        }}
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
        Create promo
      </button>
    </form>
  );
}

function PromoRowItem({
  promo,
  onChange,
}: {
  promo: PromoRow;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function toggleDisabled() {
    setBusy(true);
    try {
      await fetch(`/api/admin/draw-promos/${promo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: !promo.disabled }),
      });
      onChange();
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!confirm(`Delete promo "${promo.code}"? This is permanent.`)) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/draw-promos/${promo.id}`, { method: "DELETE" });
      onChange();
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    await navigator.clipboard.writeText(promo.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const ts = TYPE_STYLE[promo.discountType] ?? {
    color: "#6B7280",
    bg: "rgba(107,114,128,0.12)",
    label: promo.discountType,
  };

  return (
    <tr
      style={{
        borderTop: "1px solid var(--cat-card-border)",
        opacity: promo.disabled ? 0.5 : 1,
      }}
    >
      <Td>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 font-mono font-bold text-sm hover:opacity-70"
          style={{ color: "var(--cat-text)" }}
        >
          {promo.code}
          {copied ? (
            <Check className="w-3.5 h-3.5" style={{ color: "#2BFEBA" }} />
          ) : (
            <Copy className="w-3 h-3 opacity-40" />
          )}
        </button>
      </Td>
      <Td>
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md"
          style={{ background: ts.bg, color: ts.color }}
        >
          {ts.label}
        </span>{" "}
        <span className="text-xs" style={{ color: "var(--cat-text-secondary)" }}>
          {promo.discountType === "free"
            ? "100%"
            : promo.discountType === "percent"
              ? `${promo.discountValue}%`
              : `€${(promo.discountValue / 100).toFixed(2)}`}
        </span>
      </Td>
      <Td muted>
        {promo.currentUses}
        {promo.maxUses != null ? ` / ${promo.maxUses}` : ""}
      </Td>
      <Td muted>
        {promo.validTo ? (
          <span className="inline-flex items-center gap-1 text-xs">
            <Calendar className="w-3 h-3" />
            {new Date(promo.validTo).toLocaleDateString()}
          </span>
        ) : (
          "∞"
        )}
      </Td>
      <Td muted>{promo.notes ?? "—"}</Td>
      <Td muted>{new Date(promo.createdAt).toLocaleDateString()}</Td>
      <Td>
        <div className="inline-flex items-center gap-1.5">
          <button
            onClick={toggleDisabled}
            disabled={busy}
            title={promo.disabled ? "Enable" : "Disable"}
            className="w-7 h-7 rounded-md flex items-center justify-center hover:opacity-70"
            style={{
              background: promo.disabled
                ? "rgba(43,254,186,0.12)"
                : "var(--cat-tag-bg)",
              color: promo.disabled ? "#2BFEBA" : "var(--cat-text-muted)",
            }}
          >
            {promo.disabled ? <Power className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={remove}
            disabled={busy}
            title="Delete"
            className="w-7 h-7 rounded-md flex items-center justify-center hover:opacity-70"
            style={{
              background: "rgba(239,68,68,0.08)",
              color: "#ef4444",
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </Td>
    </tr>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "var(--cat-card-bg)",
        border: "1px solid var(--cat-card-border)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--cat-text-muted)" }}>
          {label}
        </span>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${color}1f`, color }}>
          {icon}
        </span>
      </div>
      <p className="text-2xl font-black tabular-nums"
        style={{ color: "var(--cat-text)" }}>
        {value}
      </p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-[10px] font-bold uppercase tracking-widest px-3 py-2">
      {children}
    </th>
  );
}
function Td({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <td
      className="px-3 py-2 align-middle"
      style={{ color: muted ? "var(--cat-text-muted)" : "var(--cat-text)" }}
    >
      {children}
    </td>
  );
}
