"use client";

import { useEffect } from "react";
import { CreditCard } from "lucide-react";

export function PlanUpgradeRedirect({ billingUrl }: { billingUrl: string }) {
  useEffect(() => {
    // Hard redirect — always reliable regardless of router transition state
    window.location.replace(billingUrl);
  }, [billingUrl]);

  // Show a minimal loading state while redirecting
  return (
    <div
      className="flex items-center justify-center py-24"
      style={{ minHeight: "60vh" }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(220,38,38,0.1)" }}
        >
          <CreditCard className="w-5 h-5" style={{ color: "#DC2626" }} />
        </div>
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
          Redirecting to billing…
        </p>
      </div>
    </div>
  );
}
