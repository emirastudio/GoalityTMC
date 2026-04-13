"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";

export function CancelDeleteButton({
  orgSlug,
  tournamentId,
  label,
}: {
  orgSlug: string;
  tournamentId: number;
  label: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const cancel = async () => {
    setLoading(true);
    try {
      await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/delete-request`, {
        method: "DELETE",
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={cancel}
      disabled={loading}
      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all hover:opacity-80 disabled:opacity-50"
      style={{ borderColor: "rgba(220,38,38,0.4)", color: "#DC2626", background: "rgba(220,38,38,0.05)" }}
    >
      {loading
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <RotateCcw className="w-3.5 h-3.5" />
      }
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
