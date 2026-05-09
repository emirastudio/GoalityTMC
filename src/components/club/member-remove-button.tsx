"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

// Inline remove button for the managers list on /club/dashboard.
// Server enforces all the rules (last-admin, self-removal) — this is just UX.
export function MemberRemoveButton({
  clubId,
  memberId,
  label,
  removeLabel = "Remove",
  confirmLabel,
}: {
  clubId: number;
  memberId: number;
  label: string;
  removeLabel?: string;
  confirmLabel?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function remove() {
    const msg = confirmLabel ?? `Remove ${label} from the club?`;
    if (!confirm(msg)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${clubId}/members/${memberId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shrink-0 flex items-center gap-2">
      {error && (
        <span className="text-[10px]" style={{ color: "#ef4444" }}>
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        title={removeLabel}
        className="p-1.5 rounded-lg hover:opacity-70 transition-all cursor-pointer disabled:opacity-40"
        style={{ color: "#ef4444" }}
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
