"use client";

import { useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import {
  LayoutGrid,
  GitBranch,
  CalendarDays,
  SlidersHorizontal,
  FileText,
  Users,
  ShoppingBag,
  CreditCard,
  MessageSquare,
  Settings,
  LayoutDashboard,
  Trophy,
  LogOut,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// ─── Palette ──────────────────────────────────────────────────────────────────

const COLOR = {
  sport:        "#3b82f6",
  participants: "#10b981",
  finance:      "#f59e0b",
  other:        "#8b5cf6",
  class:        "#3b82f6",
} as const;

const BG = {
  sport:        "rgba(59,130,246,0.10)",
  participants: "rgba(16,185,129,0.10)",
  finance:      "rgba(245,158,11,0.10)",
  other:        "rgba(139,92,246,0.10)",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type TournamentClass = {
  id: number;
  name: string;
  format: string | null;
  minBirthYear: number | null;
};

type Props = {
  orgSlug: string;
  orgName: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function NavLink({
  href,
  icon: Icon,
  label,
  isActive,
  color,
  bg,
  indent = false,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  color: string;
  bg?: string;
  indent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl py-2 text-sm transition-all ${indent ? "pl-8 pr-3" : "px-3"}`}
      style={{
        background: isActive ? (bg ?? "var(--cat-tag-bg)") : "transparent",
        color: isActive ? "var(--cat-text)" : "var(--cat-text-secondary)",
        fontWeight: isActive ? 600 : 400,
        borderLeft: `2px solid ${isActive ? color : "transparent"}`,
      }}
    >
      <Icon
        className="w-4 h-4 shrink-0"
        style={{ color: isActive ? color : "var(--cat-text-muted)" }}
      />
      <span>{label}</span>
    </Link>
  );
}

function SectionLabel({
  color,
  label,
  collapsible = true,
  open,
  onToggle,
}: {
  color: string;
  label: string;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  return (
    <button
      onClick={collapsible ? onToggle : undefined}
      className="flex items-center gap-2 w-full px-3 pt-3 pb-1 group"
      style={{ cursor: collapsible ? "pointer" : "default" }}
    >
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      <span
        className="text-[10px] font-black uppercase tracking-widest flex-1 text-left"
        style={{ color, opacity: 0.85 }}
      >
        {label}
      </span>
      {collapsible && (
        <ChevronDown
          className="w-3 h-3 transition-transform duration-200"
          style={{
            color,
            opacity: 0.6,
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
          }}
        />
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OrgAdminSidebar({ orgSlug, orgName }: Props) {
  const t = useTranslations("nav");
  const tAdmin = useTranslations("orgAdmin");
  const pathname = usePathname();

  const basePath = `/org/${orgSlug}/admin`;
  const tournamentMatch = pathname.match(/\/tournament\/(\d+)/);
  const tournamentId = tournamentMatch ? parseInt(tournamentMatch[1]) : null;

  // Data
  const [tournamentName, setTournamentName] = useState<string | null>(null);
  const [classes, setClasses] = useState<TournamentClass[]>([]);

  // Accordion state
  const [openClasses, setOpenClasses] = useState<Set<number>>(new Set());
  const [openFinance, setOpenFinance] = useState(true);
  const [openOther, setOpenOther] = useState(true);

  // Detect active classId from URL query
  const searchParams = useSearchParams();
  const activeClassId = searchParams ? Number(searchParams.get("classId")) || null : null;

  useEffect(() => {
    if (!tournamentId) { setTournamentName(null); setClasses([]); return; }

    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/name`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.name ? setTournamentName(d.name) : null)
      .catch(() => null);

    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/classes`)
      .then(r => r.ok ? r.json() : [])
      .then((list: TournamentClass[]) => {
        setClasses(list);
        // Auto-open the active class
        if (activeClassId) {
          setOpenClasses(prev => new Set([...prev, activeClassId]));
        } else if (list.length > 0) {
          setOpenClasses(new Set([list[0].id]));
        }
      })
      .catch(() => null);
  }, [tournamentId, orgSlug]);

  // Sync active class accordion when URL changes
  useEffect(() => {
    if (activeClassId) {
      setOpenClasses(prev => new Set([...prev, activeClassId]));
    }
  }, [activeClassId]);

  const base = `${basePath}/tournament/${tournamentId}`;

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  function isClassNavActive(section: string, classId: number) {
    return pathname.startsWith(`${base}/${section}`) && activeClassId === classId;
  }

  function classHref(section: string, classId: number) {
    return `${base}/${section}?classId=${classId}`;
  }

  function toggleClass(id: number) {
    setOpenClasses(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const orgNav = [
    { key: "dashboard",   icon: LayoutDashboard, href: basePath, exact: true },
    { key: "tournaments", icon: Trophy,           href: `${basePath}/tournaments` },
    { key: "settings",    icon: Settings,         href: `${basePath}/settings` },
  ];

  return (
    <aside
      className="w-64 shrink-0 flex flex-col border-r overflow-hidden"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
    >
      {/* ── Org header ── */}
      <div className="px-4 py-4 border-b flex items-center gap-3 shrink-0" style={{ borderColor: "var(--cat-card-border)" }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-black"
          style={{
            background: "linear-gradient(135deg, var(--cat-accent), var(--cat-accent)cc)",
            color: "#000",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          {orgName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate leading-tight" style={{ color: "var(--cat-text)" }}>
            {orgName}
          </p>
          <p className="text-[11px] leading-tight mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            {tAdmin("adminPanel")}
          </p>
        </div>
      </div>

      {/* ── Org nav ── */}
      <nav className="px-2 pt-3 space-y-0.5 shrink-0">
        {orgNav.map(({ key, icon: Icon, href, exact }) => {
          const active = exact
            ? pathname === href
            : pathname.startsWith(href) && !tournamentId;
          return (
            <Link
              key={key}
              href={href}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all"
              style={{
                background: active ? "var(--cat-tag-bg)" : "transparent",
                color: active ? "var(--cat-text)" : "var(--cat-text-secondary)",
                fontWeight: active ? 600 : 400,
                borderLeft: `2px solid ${active ? "var(--cat-accent)" : "transparent"}`,
              }}
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color: active ? "var(--cat-accent)" : "var(--cat-text-muted)" }} />
              <span>{t(key)}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Tournament section ── */}
      {tournamentId && (
        <div className="flex-1 overflow-y-auto min-h-0 pb-4">
          {/* Accent divider */}
          <div className="mx-3 my-3" style={{
            height: "1px",
            background: "linear-gradient(90deg, transparent, var(--cat-accent), transparent)",
            opacity: 0.4,
          }} />

          {/* Tournament name */}
          <div className="px-3 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "var(--cat-text-muted)", opacity: 0.5 }}>
              {t("tournaments")}
            </p>
            <p className="text-sm font-bold truncate" style={{ color: "var(--cat-accent)" }}>
              {tournamentName ?? "..."}
            </p>
          </div>

          {/* Overview */}
          <nav className="px-2 mb-1">
            <NavLink
              href={base}
              icon={LayoutGrid}
              label={t("overview")}
              isActive={pathname === base}
              color="var(--cat-accent)"
            />
          </nav>

          {/* ── Classes / Divisions ── */}
          {classes.length > 0 && (
            <div className="mt-1">
              <div className="px-3 mb-1">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: COLOR.sport, opacity: 0.7 }}>
                  {tAdmin("groupSport")}
                </p>
              </div>

              <div className="px-2 space-y-0.5">
                {classes.map((cls) => {
                  const isOpen = openClasses.has(cls.id);
                  const isThisClassActive = activeClassId === cls.id;

                  return (
                    <div key={cls.id}>
                      {/* Class header — clickable accordion */}
                      <button
                        onClick={() => toggleClass(cls.id)}
                        className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2.5 text-sm transition-all text-left"
                        style={{
                          background: isThisClassActive
                            ? BG.sport
                            : isOpen
                            ? "rgba(59,130,246,0.05)"
                            : "transparent",
                          borderLeft: `2px solid ${isThisClassActive ? COLOR.sport : "transparent"}`,
                          color: isThisClassActive ? "var(--cat-text)" : "var(--cat-text-secondary)",
                          fontWeight: isThisClassActive || isOpen ? 600 : 400,
                        }}
                      >
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black"
                          style={{
                            background: isThisClassActive ? COLOR.sport : "var(--cat-tag-bg)",
                            color: isThisClassActive ? "#fff" : "var(--cat-text-muted)",
                          }}
                        >
                          {cls.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{cls.name}</p>
                          {cls.format && (
                            <p className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                              {cls.format}
                              {cls.minBirthYear ? ` · ${cls.minBirthYear}+` : ""}
                            </p>
                          )}
                        </div>
                        <ChevronDown
                          className="w-3.5 h-3.5 shrink-0 transition-transform duration-200"
                          style={{
                            color: COLOR.sport,
                            opacity: 0.6,
                            transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                          }}
                        />
                      </button>

                      {/* Class sub-navigation */}
                      {isOpen && (
                        <div className="ml-3 pl-3 border-l mb-1 mt-0.5 space-y-0.5"
                          style={{ borderColor: `${COLOR.sport}30` }}>
                          <NavLink
                            href={classHref("format", cls.id)}
                            icon={GitBranch}
                            label={t("format")}
                            isActive={isClassNavActive("format", cls.id)}
                            color={COLOR.sport}
                            bg={BG.sport}
                          />
                          <NavLink
                            href={classHref("schedule", cls.id)}
                            icon={CalendarDays}
                            label={t("schedule")}
                            isActive={isClassNavActive("schedule", cls.id)}
                            color={COLOR.sport}
                            bg={BG.sport}
                          />
                          <NavLink
                            href={classHref("teams", cls.id)}
                            icon={Users}
                            label={t("teams")}
                            isActive={isClassNavActive("teams", cls.id)}
                            color={COLOR.sport}
                            bg={BG.sport}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No classes yet — show flat sport nav */}
          {classes.length === 0 && (
            <div className="px-2 mb-1">
              <SectionLabel color={COLOR.sport} label={tAdmin("groupSport")} collapsible={false} />
              <nav className="space-y-0.5 px-0">
                <NavLink href={`${base}/format`}   icon={GitBranch}        label={t("format")}   isActive={isActive(`${base}/format`)}   color={COLOR.sport} bg={BG.sport} />
                <NavLink href={`${base}/schedule`} icon={CalendarDays}     label={t("schedule")} isActive={isActive(`${base}/schedule`)} color={COLOR.sport} bg={BG.sport} />
                <NavLink href={`${base}/setup`}    icon={SlidersHorizontal} label={t("setup")}   isActive={isActive(`${base}/setup`)}   color={COLOR.sport} bg={BG.sport} />
              </nav>
            </div>
          )}

          {/* ── Participants ── */}
          <div className="px-2">
            <SectionLabel
              color={COLOR.participants}
              label={tAdmin("groupParticipants")}
              collapsible={false}
            />
            <nav className="space-y-0.5">
              <NavLink href={`${base}/registrations`} icon={FileText} label={t("registrations")} isActive={isActive(`${base}/registrations`)} color={COLOR.participants} bg="rgba(16,185,129,0.10)" />
              <NavLink href={`${base}/teams`}         icon={Users}    label={t("teams")}         isActive={isActive(`${base}/teams`) && !activeClassId}       color={COLOR.participants} bg="rgba(16,185,129,0.10)" />
            </nav>
          </div>

          {/* ── Finance ── */}
          <div className="px-2">
            <SectionLabel
              color={COLOR.finance}
              label={tAdmin("groupFinance")}
              open={openFinance}
              onToggle={() => setOpenFinance(v => !v)}
            />
            {openFinance && (
              <nav className="space-y-0.5">
                <NavLink href={`${base}/services-packages`} icon={ShoppingBag} label={t("servicesPackages")} isActive={isActive(`${base}/services-packages`)} color={COLOR.finance} bg={BG.finance} />
                <NavLink href={`${base}/payments`}          icon={CreditCard}  label={t("payments")}         isActive={isActive(`${base}/payments`)}          color={COLOR.finance} bg={BG.finance} />
              </nav>
            )}
          </div>

          {/* ── Other ── */}
          <div className="px-2">
            <SectionLabel
              color={COLOR.other}
              label={tAdmin("groupOther")}
              open={openOther}
              onToggle={() => setOpenOther(v => !v)}
            />
            {openOther && (
              <nav className="space-y-0.5">
                <NavLink href={`${base}/messages`} icon={MessageSquare}   label={t("messages")} isActive={isActive(`${base}/messages`)} color={COLOR.other} bg={BG.other} />
                <NavLink href={`${base}/setup`}    icon={SlidersHorizontal} label={t("setup")} isActive={isActive(`${base}/setup`)}   color={COLOR.other} bg={BG.other} />
                <NavLink href={`${base}/settings`} icon={Settings}        label={t("settings")} isActive={isActive(`${base}/settings`) && pathname.endsWith("/settings")} color={COLOR.other} bg={BG.other} />
              </nav>
            )}
          </div>
        </div>
      )}

      {/* ── Log out ── */}
      <div className="mt-auto px-3 py-3 border-t shrink-0" style={{ borderColor: "var(--cat-card-border)" }}>
        <Link
          href="/logout"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all hover:opacity-70"
          style={{ color: "var(--cat-text-muted)", borderLeft: "2px solid transparent" }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>{tAdmin("logOut")}</span>
        </Link>
      </div>
    </aside>
  );
}
