"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { User, LayoutDashboard, LogOut, ChevronDown } from "lucide-react";

type MeResponse =
  | { authenticated: false }
  | { authenticated: true; role: string; isSuper: boolean; cabinetUrl: string };

export function UserAvatarMenu({
  signInLabel = "Sign in",
  getStartedLabel = "Get started",
}: {
  signInLabel?: string;
  getStartedLabel?: string;
}) {
  const t = useTranslations("userMenu");
  const locale = useLocale();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe({ authenticated: false }));
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Still loading — show nothing to avoid flash
  if (me === null) return null;

  // Not authenticated — show Sign in + Get started
  if (!me.authenticated) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--cat-text-secondary)" }}
        >
          {signInLabel}
        </Link>
        <Link
          href="/onboarding"
          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-opacity hover:opacity-90"
          style={{
            background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))",
            color: "var(--cat-accent-text)",
          }}
        >
          {getStartedLabel}
        </Link>
      </div>
    );
  }

  // Authenticated — show avatar + dropdown
  const cabinetHref = `/${locale}${me.cabinetUrl}`;
  const label = me.isSuper ? t("superAdmin") : me.role === "admin" ? t("organizer") : t("myCabinet");

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 10px",
          borderRadius: "10px",
          border: "1px solid var(--cat-card-border)",
          background: "var(--cat-card-bg)",
          cursor: "pointer",
          color: "var(--cat-text)",
          fontSize: "13px",
          fontWeight: 600,
          transition: "opacity 0.15s",
        }}
      >
        <div style={{
          width: "26px", height: "26px", borderRadius: "50%",
          background: "linear-gradient(135deg, var(--cat-accent), var(--cat-accent-dark))",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <User style={{ width: "14px", height: "14px", color: "var(--cat-accent-text)" }} />
        </div>
        <span className="hidden sm:inline">{label}</span>
        <ChevronDown style={{ width: "12px", height: "12px", color: "var(--cat-text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute",
          right: 0,
          top: "calc(100% + 8px)",
          minWidth: "190px",
          background: "var(--cat-card-bg)",
          border: "1px solid var(--cat-card-border)",
          borderRadius: "12px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          zIndex: 100,
          overflow: "hidden",
        }}>
          <a
            href={cabinetHref}
            onClick={() => setOpen(false)}
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "12px 16px", fontSize: "13px", fontWeight: 600,
              color: "var(--cat-text)", textDecoration: "none",
              borderBottom: "1px solid var(--cat-card-border)",
              transition: "background 0.1s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--cat-tag-bg)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <LayoutDashboard style={{ width: "15px", height: "15px", color: "var(--cat-accent)" }} />
            {label}
          </a>

          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                width: "100%", padding: "12px 16px", fontSize: "13px",
                fontWeight: 500, color: "var(--cat-text-muted)",
                background: "transparent", border: "none", cursor: "pointer",
                textAlign: "left", transition: "background 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--cat-tag-bg)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <LogOut style={{ width: "15px", height: "15px" }} />
              {t("signOut")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
