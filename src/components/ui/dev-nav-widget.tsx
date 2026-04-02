"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Users, Building2, ChevronDown } from "lucide-react";

type Area = "super" | "org" | "team";

const ORGS = [
  { slug: "kingscup", name: "Kings Cup" },
  { slug: "baltic-league", name: "Baltic League" },
  { slug: "emira-cup", name: "Emira Cup" },
  { slug: "gsg", name: "GSG" },
];

export function DevNavWidget({ currentArea }: { currentArea: Area }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function goToTeam() {
    setLoading(true);
    setOpen(false);
    const res = await fetch("/api/dev/enter-team", { method: "POST" });
    if (res.ok) router.push("/en/team/overview");
    else setLoading(false);
  }

  async function goToAdmin(href: string) {
    setLoading(true);
    setOpen(false);
    if (currentArea === "team") {
      const res = await fetch("/api/dev/exit-team", { method: "POST" });
      if (res.ok) router.push(href);
      else setLoading(false);
    } else {
      router.push(href);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-bold transition-all disabled:opacity-50"
        style={{
          background: "linear-gradient(90deg, #7C3AED, #4F46E5)",
          color: "#fff",
          boxShadow: "0 2px 10px rgba(124,58,237,0.4)",
        }}
      >
        {loading ? (
          <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <span>DEV</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-2 z-50 rounded-xl border shadow-2xl overflow-hidden min-w-[200px]"
            style={{
              background: "var(--cat-dropdown-bg)",
              borderColor: "var(--cat-card-border)",
            }}
          >
            {/* Супер-админ */}
            <button
              onClick={() => goToAdmin("/en/admin/dashboard")}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium transition-opacity hover:opacity-70 text-left"
              style={{
                color: currentArea === "super" ? "var(--cat-accent)" : "var(--cat-text)",
                borderBottom: "1px solid var(--cat-card-border)",
              }}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              Super Admin
              {currentArea === "super" && <span className="ml-auto text-[10px] font-bold" style={{ color: "var(--cat-accent)" }}>●</span>}
            </button>

            {/* Орг-администрации */}
            <div style={{ borderBottom: "1px solid var(--cat-card-border)" }}>
              <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--cat-text-muted)" }}>
                Org Admin
              </p>
              {ORGS.map((org) => (
                <button
                  key={org.slug}
                  onClick={() => goToAdmin(`/en/org/${org.slug}/admin`)}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] font-medium transition-opacity hover:opacity-70 text-left"
                  style={{ color: currentArea === "org" ? "var(--cat-text-secondary)" : "var(--cat-text-secondary)" }}
                >
                  <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
                  {org.name}
                </button>
              ))}
            </div>

            {/* Команда */}
            <button
              onClick={goToTeam}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium transition-opacity hover:opacity-70 text-left"
              style={{ color: currentArea === "team" ? "var(--cat-accent)" : "var(--cat-text)" }}
            >
              <Users className="w-4 h-4 shrink-0" />
              Team (FC Infonet)
              {currentArea === "team" && <span className="ml-auto text-[10px] font-bold" style={{ color: "var(--cat-accent)" }}>●</span>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
