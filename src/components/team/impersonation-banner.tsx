"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export function ImpersonationBanner({ clubName }: { clubName: string }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function handleStop() {
    setLeaving(true);
    try {
      const res = await fetch("/api/admin/impersonate/stop", { method: "POST" });
      if (res.ok) {
        router.push("/en/admin/teams");
      }
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div className="w-full bg-amber-400 text-amber-950 flex items-center justify-between gap-3 px-4 py-2 text-sm font-medium z-50">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span>
          Admin view — you are logged in as <strong>{clubName}</strong>
        </span>
      </div>
      <button
        onClick={handleStop}
        disabled={leaving}
        className="flex items-center gap-1.5 rounded-lg bg-amber-950/15 hover:bg-amber-950/25 px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {leaving ? "Returning..." : "← Back to Admin"}
      </button>
    </div>
  );
}
