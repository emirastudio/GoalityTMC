"use client";

import { StripeModeToggle } from "@/components/admin/stripe-mode-toggle";
import { CreditCard } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>
          Platform Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--cat-text-muted)" }}>
          Super admin configuration
        </p>
      </div>

      <StripeModeToggle />
    </div>
  );
}
