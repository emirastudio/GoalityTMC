"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  LayoutGrid, GitBranch, CalendarDays, FileText, Users, ShoppingBag,
  CreditCard, MessageSquare, Settings, LayoutDashboard, Trophy, LogOut,
  ChevronDown, ChevronLeft, Radio, Lock, Zap, Receipt, Plus, Trash2,
  ClipboardList, Hotel, Utensils, Bus, BarChart3, MapPin,
  Crown, Rocket, Gift,
} from "lucide-react";
import { DivisionCreateModal } from "@/components/admin/division-create-modal";
import { PlanLimitModal } from "@/components/ui/plan-gate";
import { ExtrasCart } from "@/components/admin/extras-cart";
import type { TournamentPlan } from "@/lib/plan-gates";

// ── Цвета секций ─────────────────────────────────────────────────────────────

const CLR = {
  accent:       "var(--cat-accent)",     // #2BFEBA
  tournament:   "var(--cat-accent)",
  division:     "#3b82f6",               // синий — спорт
  participants: "#10b981",               // зелёный — участники
  finance:      "#f59e0b",               // янтарный — финансы
  messages:     "#8b5cf6",              // фиолетовый — сообщения
  organization: "#ec4899",              // розовый — организация
} as const;

const BG = {
  division:     "rgba(59,130,246,0.10)",
  participants: "rgba(16,185,129,0.10)",
  finance:      "rgba(245,158,11,0.10)",
  messages:     "rgba(139,92,246,0.10)",
  organization: "rgba(236,72,153,0.10)",
} as const;

// ── Типы ─────────────────────────────────────────────────────────────────────

type TournamentClass = {
  id: number;
  name: string;
  format: string | null;
  minBirthYear: number | null;
};

type TournamentModules = {
  hasMessaging:     boolean;
  hasFinance:       boolean;
  hasMatchHub:      boolean;
  hasAccommodation: boolean;
  hasMeals:         boolean;
  hasTransfer:      boolean;
  effectivePlan:    TournamentPlan;
  maxDivisions:     number;
  maxTeams:         number;
  needsPlanUpgrade: boolean;
  extrasOwed?: {
    divisions: number;
    teams: number;
    amountCents: number;
    teamsPendingCents?: number;
    displayAmountCents?: number;
    extraDivisionPriceCents: number;
    extraTeamPriceCents: number;
    paymentDue: string | null;
    blocked: boolean;
  };
};

type Props = {
  orgSlug: string;
  orgName: string;
  orgLogo?: string | null;
};

// ── Компонент-ссылка навигации ────────────────────────────────────────────────

function NavLink({
  href, icon: Icon, label, isActive, color, bg, indent = false,
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
        background:   isActive ? (bg ?? "var(--cat-tag-bg)") : "transparent",
        color:        isActive ? "var(--cat-text)" : "var(--cat-text-secondary)",
        fontWeight:   isActive ? 600 : 400,
        borderLeft:   `2px solid ${isActive ? color : "transparent"}`,
      }}
    >
      <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? color : "var(--cat-text-muted)" }} />
      <span>{label}</span>
    </Link>
  );
}

// ── Заблокированная ссылка (требует план) ────────────────────────────────────

function LockedLink({
  href, icon: Icon, label, plan,
}: {
  href: string; icon: React.ElementType; label: string; plan: string;
}) {
  return (
    <Link href={href}
      className="flex items-center gap-3 rounded-xl py-2 px-3 text-sm transition-all"
      style={{ color: "var(--cat-text-muted)", opacity: 0.55 }}>
      <Icon className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
      <span className="flex-1">{label}</span>
      <div className="flex items-center gap-1 shrink-0">
        <Lock className="w-3 h-3" />
        <span style={{ fontSize: "9px", fontWeight: 700 }}>{plan}</span>
      </div>
    </Link>
  );
}

// ── Заголовок секции ──────────────────────────────────────────────────────────

function SectionHeader({
  color, label, action,
}: {
  color: string;
  label: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 px-3 pt-4 pb-1">
      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-[10px] font-black uppercase tracking-widest flex-1" style={{ color, opacity: 0.8 }}>
        {label}
      </span>
      {action}
    </div>
  );
}

// ── Основной компонент ────────────────────────────────────────────────────────

export function OrgAdminSidebar({ orgSlug, orgName, orgLogo }: Props) {
  const t      = useTranslations("nav");
  const tAdmin = useTranslations("orgAdmin");
  const pathname = usePathname();
  const locale = useLocale();

  const basePath      = `/org/${orgSlug}/admin`;
  const tournamentMatch = pathname.match(/\/tournament\/(\d+)/);
  const tournamentId  = tournamentMatch ? parseInt(tournamentMatch[1]) : null;
  const base          = `${basePath}/tournament/${tournamentId}`;

  // Данные турнира
  const [tournamentName, setTournamentName] = useState<string | null>(null);
  const [tournamentLogo, setTournamentLogo] = useState<string | null>(null);
  const [classes, setClasses]               = useState<TournamentClass[]>([]);
  const [modules, setModules]               = useState<TournamentModules | null>(null);

  // Состояние аккордеона дивизионов
  const [openClasses, setOpenClasses] = useState<Set<number>>(new Set());

  // Состояние модала создания дивизиона
  const [showDivisionModal, setShowDivisionModal] = useState(false);
  // Состояние модала лимита плана
  const [showDivLimitModal, setShowDivLimitModal] = useState(false);

  // Состояние удаления дивизиона
  const [deletingClassId, setDeletingClassId] = useState<number | null>(null);

  // Активный classId из URL
  const searchParams  = useSearchParams();
  const activeClassId = searchParams ? Number(searchParams.get("classId")) || null : null;

  // Удалить дивизион с подтверждением
  const deleteClass = useCallback(async (classId: number, className: string) => {
    if (!tournamentId) return;
    if (!window.confirm(tAdmin("confirmDeleteDivision", { name: className }))) return;
    setDeletingClassId(classId);
    try {
      const res = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/classes/${classId}`, { method: "DELETE" });
      if (res.ok) {
        setClasses(prev => prev.filter(c => c.id !== classId));
        setOpenClasses(prev => { const s = new Set(prev); s.delete(classId); return s; });
        // Notify Format Builder if it's open for this division
        window.dispatchEvent(new CustomEvent("division:deleted", { detail: { classId } }));
      }
    } catch { /* ignore */ } finally {
      setDeletingClassId(null);
    }
  }, [tournamentId, orgSlug]);

  // Перезагрузить список дивизионов (вызывается после создания нового)
  const reloadClasses = useCallback(() => {
    if (!tournamentId) return;
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/classes`)
      .then(r => r.ok ? r.json() : [])
      .then((list: TournamentClass[]) => {
        setClasses(list);
        if (list.length === 1) setOpenClasses(new Set([list[0].id]));
      })
      .catch(() => null);
  }, [tournamentId, orgSlug]);

  // Загрузка данных при переходе в контекст турнира
  useEffect(() => {
    if (!tournamentId) {
      setTournamentName(null);
      setClasses([]);
      setModules(null);
      return;
    }

    // Название и логотип
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/name`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.name) {
          setTournamentName(d.name);
          setTournamentLogo(d.logoUrl ?? null);
        }
      })
      .catch(() => null);

    // Дивизионы
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/classes`)
      .then(r => r.ok ? r.json() : [])
      .then((list: TournamentClass[]) => {
        setClasses(list);
        // Авто-открываем активный дивизион
        if (activeClassId) {
          setOpenClasses(prev => new Set([...prev, activeClassId]));
        } else if (list.length === 1) {
          setOpenClasses(new Set([list[0].id]));
        }
      })
      .catch(() => null);

    // Модули и план
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/billing-info`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setModules({
          hasMessaging:     d.features?.hasMessaging     ?? false,
          hasFinance:       d.features?.hasFinance       ?? false,
          hasMatchHub:      d.features?.hasMatchHub      ?? false,
          hasAccommodation: d.tournament?.hasAccommodation ?? false,
          hasMeals:         d.tournament?.hasMeals         ?? false,
          hasTransfer:      d.tournament?.hasTransfer       ?? false,
          effectivePlan:    (d.effectivePlan ?? "free") as TournamentPlan,
          maxDivisions:     d.features?.maxDivisions ?? 1,
          maxTeams:         d.features?.maxTeams ?? 12,
          needsPlanUpgrade: d.needsPlanUpgrade ?? false,
          extrasOwed:       d.extrasOwed ?? undefined,
        });
      })
      .catch(() => null);
  }, [tournamentId, orgSlug, pathname]);

  // Открыть/закрыть дивизион при изменении URL
  useEffect(() => {
    if (activeClassId) {
      setOpenClasses(prev => new Set([...prev, activeClassId]));
    }
  }, [activeClassId]);

  // Re-fetch billing when format-builder updates division maxTeams (live cart refresh)
  useEffect(() => {
    if (!tournamentId || !orgSlug) return;
    function onBillingRefresh() {
      fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/billing-info`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d) setModules(prev => prev ? { ...prev, extrasOwed: d.extrasOwed ?? undefined } : prev);
        })
        .catch(() => null);
    }
    window.addEventListener("billing:refresh", onBillingRefresh);
    return () => window.removeEventListener("billing:refresh", onBillingRefresh);
  }, [tournamentId, orgSlug]);

  function isActive(href: string, exact = false) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  function toggleClass(id: number) {
    setOpenClasses(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Ссылка на страницу дивизиона с параметрами
  function divHref(section: string, cls: TournamentClass) {
    const p = new URLSearchParams({ classId: String(cls.id), className: cls.name });
    return `${base}/${section}?${p.toString()}`;
  }

  function isDivActive(section: string, classId: number) {
    return pathname.startsWith(`${base}/${section}`) && activeClassId === classId;
  }

  // Показывать финансы если есть хотя бы один модуль или план позволяет
  const showFinance = modules?.hasFinance ||
    modules?.hasAccommodation ||
    modules?.hasMeals ||
    modules?.hasTransfer;

  // Навигация организации (не в контексте турнира)
  const orgNav = [
    { key: "dashboard",   icon: LayoutDashboard, href: basePath,                  exact: true },
    { key: "tournaments", icon: Trophy,           href: `${basePath}/tournaments`, exact: false },
    { key: "billing",     icon: Receipt,          href: `${basePath}/billing`,     exact: false },
    { key: "settings",    icon: Settings,         href: `${basePath}/settings`,    exact: false },
  ];

  return (
    <>
    <aside
      className="w-64 shrink-0 flex flex-col border-r overflow-hidden"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
    >

      {/* ── Шапка организации (кликабельная → дашборд) ── */}
      <Link
        href={basePath}
        className="px-4 py-4 border-b flex items-center gap-3 shrink-0 transition-opacity hover:opacity-80"
        style={{ borderColor: "var(--cat-card-border)", textDecoration: "none" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-black overflow-hidden"
          style={{
            background: orgLogo
              ? "var(--cat-tag-bg)"
              : "linear-gradient(135deg, var(--cat-accent), var(--cat-accent)cc)",
            color: "#000",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            border: orgLogo ? "1.5px solid var(--cat-card-border)" : "none",
          }}
        >
          {orgLogo
            ? <img src={orgLogo} alt={orgName} className="w-full h-full object-cover" />
            : orgName.charAt(0).toUpperCase()
          }
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate leading-tight" style={{ color: "var(--cat-text)" }}>
            {orgName}
          </p>
          <p className="text-[11px] leading-tight mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            {tAdmin("adminPanel")}
          </p>
        </div>
      </Link>

      {/* ── Навигация организации (вне турнира) ── */}
      {!tournamentId && (
        <nav className="px-2 pt-3 space-y-0.5 shrink-0">
          {orgNav.map(({ key, icon: Icon, href, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={key} href={href}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all"
                style={{
                  background:  active ? "var(--cat-tag-bg)" : "transparent",
                  color:       active ? "var(--cat-text)" : "var(--cat-text-secondary)",
                  fontWeight:  active ? 600 : 400,
                  borderLeft:  `2px solid ${active ? "var(--cat-accent)" : "transparent"}`,
                }}
              >
                <Icon className="w-4 h-4 shrink-0"
                  style={{ color: active ? "var(--cat-accent)" : "var(--cat-text-muted)" }} />
                <span>{t(key)}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* ── Кнопка «назад в организацию» (в контексте турнира) ── */}
      {tournamentId && (
        <div className="px-2 pt-2 shrink-0">
          <Link href={basePath}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition-all hover:opacity-80"
            style={{ color: "var(--cat-text-muted)" }}>
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{orgName}</span>
          </Link>
        </div>
      )}

      {/* ── Содержимое турнира ── */}
      {tournamentId && (
        <div className="flex-1 overflow-y-auto min-h-0 pb-4">

          {/* Разделитель-акцент */}
          <div className="mx-3 my-2" style={{
            height: "1px",
            background: "linear-gradient(90deg, transparent, var(--cat-accent), transparent)",
            opacity: 0.35,
          }} />

          {/* Название турнира + план */}
          <div className="px-3 mb-1 flex items-center gap-2.5">
            {tournamentLogo && (
              <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border"
                style={{ borderColor: "var(--cat-card-border)" }}>
                <img src={tournamentLogo} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40"
                style={{ color: "var(--cat-text-muted)" }}>
                {t("tournaments")}
              </p>
              <p className="text-sm font-black truncate" style={{ color: "var(--cat-accent)" }}>
                {tournamentName ?? "..."}
              </p>
            </div>
            {modules && tournamentId && (
              <a href={`/org/${orgSlug}/admin/tournament/${tournamentId}/billing`}
                className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none transition-all hover:opacity-80"
                style={{
                  background: modules.effectivePlan === "elite" ? "rgba(234,88,12,0.15)"
                    : modules.effectivePlan === "pro" ? "rgba(5,150,105,0.15)"
                    : modules.effectivePlan === "starter" ? "rgba(37,99,235,0.15)"
                    : "rgba(107,114,128,0.15)",
                  color: modules.effectivePlan === "elite" ? "#EA580C"
                    : modules.effectivePlan === "pro" ? "#059669"
                    : modules.effectivePlan === "starter" ? "#2563EB"
                    : "#6B7280",
                  textDecoration: "none",
                }}>
                {modules.effectivePlan === "elite" ? <Crown className="w-3 h-3 inline" />
                  : modules.effectivePlan === "pro" ? <Zap className="w-3 h-3 inline" />
                  : modules.effectivePlan === "starter" ? <Rocket className="w-3 h-3 inline" />
                  : <Gift className="w-3 h-3 inline" />}{" "}
                {modules.effectivePlan.charAt(0).toUpperCase() + modules.effectivePlan.slice(1)}
              </a>
            )}
          </div>

          {/* ── EXTRAS CART: доплатить за доп. дивизионы/команды ── */}
          {tournamentId && modules && !modules.needsPlanUpgrade && modules.extrasOwed &&
            ((modules.extrasOwed.displayAmountCents ?? modules.extrasOwed.amountCents) > 0) && (
            <ExtrasCart
              tournamentId={tournamentId}
              extrasOwed={modules.extrasOwed}
              locale={locale}
              orgSlug={orgSlug}
            />
          )}

          {/* ── LOCKED: требуется план ── */}
          {modules?.needsPlanUpgrade && (
            <div className="mx-3 mt-3 mb-1 rounded-xl p-4"
              style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.25)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4" style={{ color: "#DC2626" }} />
                <span className="text-sm font-black" style={{ color: "#DC2626" }}>
                  {tAdmin("planRequiredShort")}
                </span>
              </div>
              <p className="text-xs mb-3" style={{ color: "var(--cat-text-muted)", lineHeight: 1.5 }}>
                {tAdmin("planRequiredSidebarDesc")}
              </p>
              <a
                href={`/${locale}/org/${orgSlug}/admin/tournament/${tournamentId}/billing?reason=plan_required`}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-black"
                style={{ background: "#DC2626", color: "#fff", textDecoration: "none" }}
              >
                <CreditCard className="w-4 h-4" />
                {tAdmin("viewPlans")}
              </a>
            </div>
          )}

          {/* ── ТУРНИР: основная навигация ── */}
          {!modules?.needsPlanUpgrade && (
          <><SectionHeader color={CLR.tournament} label={tAdmin("sectionTournament")} />
          <nav className="px-2 mb-1 space-y-0.5">
            <NavLink
              href={base}
              icon={LayoutGrid}
              label={t("overview")}
              isActive={pathname === base}
              color={CLR.accent}
            />
            {modules && !modules.hasMatchHub ? (
              <LockedLink href={`${base}/hub`} icon={Radio} label={tAdmin("matchHub")} plan="Pro" />
            ) : (
              <NavLink
                href={`${base}/hub`}
                icon={Radio}
                label={tAdmin("matchHub")}
                isActive={isActive(`${base}/hub`)}
                color="#ef4444"
                bg="rgba(239,68,68,0.10)"
              />
            )}
            <NavLink
              href={`${base}/planner`}
              icon={CalendarDays}
              label={tAdmin("planner")}
              isActive={isActive(`${base}/planner`)}
              color="#06b6d4"
              bg="rgba(6,182,212,0.10)"
            />
            <NavLink
              href={`${base}/settings`}
              icon={Settings}
              label={tAdmin("settings")}
              isActive={isActive(`${base}/settings`) && pathname.endsWith("/settings")}
              color="var(--cat-text-muted)"
            />
          </nav>

          {/* ── ДИВИЗИОНЫ ── */}
          <SectionHeader
            color={CLR.division}
            label={`${tAdmin("sectionDivisions")}${modules ? ` ${classes.length}/${modules.maxDivisions === 9999 ? "∞" : modules.maxDivisions}` : ""}`}
            action={
              <button
                type="button"
                onClick={() => {
                  const maxDiv = modules?.maxDivisions ?? 1;
                  if (modules && classes.length >= maxDiv && maxDiv !== 9999) {
                    setShowDivLimitModal(true);
                  } else {
                    setShowDivisionModal(true);
                  }
                }}
                className="w-5 h-5 rounded-md flex items-center justify-center transition-all hover:opacity-70 shrink-0"
                style={{ background: `${CLR.division}18`, color: CLR.division }}
                title={tAdmin("addDivision")}
              >
                <Plus className="w-3 h-3" />
              </button>
            }
          />

          {/* Список дивизионов */}
          <div className="px-2 space-y-0.5">
            {classes.length === 0 ? (
              /* Подсказка если нет дивизионов */
              <button
                type="button"
                onClick={() => setShowDivisionModal(true)}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs transition-all border-2 border-dashed hover:opacity-80 w-full"
                style={{ borderColor: `${CLR.division}30`, color: CLR.division }}>
                <Plus className="w-3.5 h-3.5" />
                <span>{tAdmin("addFirstDivision")}</span>
              </button>
            ) : (
              classes.map((cls) => {
                const isOpen  = openClasses.has(cls.id);
                const isThisActive = activeClassId === cls.id;

                return (
                  <div key={cls.id} className="relative">
                    {/* Заголовок дивизиона */}
                    <button
                      onClick={() => toggleClass(cls.id)}
                      className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2.5 text-sm transition-all text-left"
                      style={{
                        background:  isThisActive ? BG.division : isOpen ? `${CLR.division}05` : "transparent",
                        borderLeft:  `2px solid ${isThisActive ? CLR.division : "transparent"}`,
                        color:       isThisActive ? "var(--cat-text)" : "var(--cat-text-secondary)",
                        fontWeight:  isThisActive || isOpen ? 600 : 400,
                      }}
                    >
                      {/* Аватар дивизиона */}
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black"
                        style={{
                          background: isThisActive ? CLR.division : "var(--cat-tag-bg)",
                          color:      isThisActive ? "#fff" : "var(--cat-text-muted)",
                        }}
                      >
                        {cls.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{cls.name}</p>
                        {cls.minBirthYear && (
                          <p className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                            {cls.format ?? "—"} · {cls.minBirthYear}+
                          </p>
                        )}
                      </div>
                      <ChevronDown
                        className="w-3.5 h-3.5 shrink-0 transition-transform duration-200"
                        style={{
                          color:     CLR.division,
                          opacity:   0.6,
                          transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                        }}
                      />
                    </button>

                    {/* Кнопка удаления — видна при открытом аккордеоне */}
                    {isOpen && (
                      <button
                        type="button"
                        title={tAdmin("deleteDivision")}
                        onClick={e => { e.stopPropagation(); deleteClass(cls.id, cls.name); }}
                        disabled={deletingClassId === cls.id}
                        className="absolute right-1 top-1 w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                        style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", opacity: deletingClassId === cls.id ? 0.4 : undefined }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}

                    {/* Подменю дивизиона */}
                    {isOpen && (
                      <div className="ml-3 pl-3 border-l mb-1 mt-0.5 space-y-0.5"
                        style={{ borderColor: `${CLR.division}30` }}>
                        <NavLink
                          href={divHref("format", cls)}
                          icon={GitBranch}
                          label={tAdmin("divFormat")}
                          isActive={isDivActive("format", cls.id)}
                          color={CLR.division}
                          bg={BG.division}
                        />
                        <NavLink
                          href={divHref("schedule", cls)}
                          icon={CalendarDays}
                          label={tAdmin("divSchedule")}
                          isActive={isDivActive("schedule", cls.id)}
                          color={CLR.division}
                          bg={BG.division}
                        />
                        <NavLink
                          href={divHref("results", cls)}
                          icon={BarChart3}
                          label={tAdmin("divStandings")}
                          isActive={isDivActive("results", cls.id)}
                          color={CLR.division}
                          bg={BG.division}
                        />
                        <NavLink
                          href={divHref("protocols", cls)}
                          icon={ClipboardList}
                          label={tAdmin("divProtocols")}
                          isActive={isDivActive("protocols", cls.id)}
                          color={CLR.division}
                          bg={BG.division}
                        />
                        <NavLink
                          href={divHref("teams", cls)}
                          icon={Users}
                          label={tAdmin("divTeams")}
                          isActive={isDivActive("teams", cls.id)}
                          color={CLR.division}
                          bg={BG.division}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ── УЧАСТНИКИ ── */}
          <SectionHeader color={CLR.participants} label={tAdmin("sectionParticipants")} />
          <nav className="px-2 mb-1 space-y-0.5">
            <NavLink
              href={`${base}/registrations`}
              icon={FileText}
              label={t("registrations")}
              isActive={isActive(`${base}/registrations`)}
              color={CLR.participants}
              bg={BG.participants}
            />
            <NavLink
              href={`${base}/teams`}
              icon={Users}
              label={t("teams")}
              isActive={isActive(`${base}/teams`) && !activeClassId}
              color={CLR.participants}
              bg={BG.participants}
            />
          </nav>

          {/* ── ФИНАНСЫ — только платежи. «Сборы и услуги» переехали в
                 «Организацию» (там ближе к стадионам/отелям). ── */}
          {showFinance && (
            <>
              <SectionHeader color={CLR.finance} label={tAdmin("sectionFinance")} />
              <nav className="px-2 mb-1 space-y-0.5">
                {modules && !modules.hasFinance ? (
                  <LockedLink href={`${base}/payments`} icon={CreditCard} label={t("payments")} plan="Pro" />
                ) : (
                  <NavLink
                    href={`${base}/payments`}
                    icon={CreditCard}
                    label={t("payments")}
                    isActive={isActive(`${base}/payments`)}
                    color={CLR.finance}
                    bg={BG.finance}
                  />
                )}
              </nav>
            </>
          )}

          {!showFinance && (
            <>
              <SectionHeader color={CLR.finance} label={tAdmin("sectionFinance")} />
              <nav className="px-2 mb-1 space-y-0.5">
                <LockedLink href={`${base}/payments`} icon={CreditCard} label={t("payments")} plan="Pro" />
              </nav>
            </>
          )}

          {/* ── ОРГАНИЗАЦИЯ ── */}
          <SectionHeader color={CLR.organization} label={tAdmin("sectionOrganization")} />
          <nav className="px-2 mb-1 space-y-0.5">
            <NavLink
              href={`${base}/offerings`}
              icon={ShoppingBag}
              label={tAdmin("feesServices")}
              isActive={isActive(`${base}/offerings`)}
              color={CLR.organization}
              bg={BG.organization}
            />
            <NavLink
              href={`${base}/stadiums`}
              icon={MapPin}
              label={tAdmin("stadiums")}
              isActive={isActive(`${base}/stadiums`)}
              color={CLR.organization}
              bg={BG.organization}
            />
            <NavLink
              href={`${base}/hotels`}
              icon={Hotel}
              label={tAdmin("hotels")}
              isActive={isActive(`${base}/hotels`)}
              color={CLR.organization}
              bg={BG.organization}
            />
          </nav>
          </>)}

        </div>
      )}

      {/* ── Закреплённый низ: сообщения + апгрейд + выход ── */}
      {tournamentId && !modules?.needsPlanUpgrade && (
        <div className="px-2 pt-2 border-t space-y-0.5 shrink-0"
          style={{ borderColor: "var(--cat-card-border)" }}>
          {modules && !modules.hasMessaging ? (
            <LockedLink href={`${base}/messages`} icon={MessageSquare} label={t("messagesLabel")} plan="Pro" />
          ) : (
            <NavLink
              href={`${base}/messages`}
              icon={MessageSquare}
              label={t("messagesLabel")}
              isActive={isActive(`${base}/messages`)}
              color={CLR.messages}
              bg={BG.messages}
            />
          )}
        </div>
      )}

      {/* Подсказка апгрейда (бесплатный план) */}
      {tournamentId && modules?.effectivePlan === "free" && !modules?.needsPlanUpgrade && (
        <div className="px-2 pb-1 shrink-0">
          <a href={`${base}/billing`}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all hover:opacity-80"
            style={{
              background: "linear-gradient(135deg, #7C3AED15, #6D28D910)",
              border: "1px dashed #7C3AED50",
              color: "#7C3AED",
            }}>
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span>{tAdmin("upgradeToUnlock")}</span>
          </a>
        </div>
      )}

      {/* ── Выход ── */}
      <div className="px-3 py-3 border-t shrink-0" style={{ borderColor: "var(--cat-card-border)" }}>
        <Link href="/logout"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all hover:opacity-70"
          style={{ color: "var(--cat-text-muted)", borderLeft: "2px solid transparent" }}>
          <LogOut className="w-4 h-4 shrink-0" />
          <span>{tAdmin("logOut")}</span>
        </Link>
      </div>
    </aside>

    {/* ── Модал создания дивизиона ── */}
    {showDivisionModal && tournamentId && (
      <DivisionCreateModal
        orgSlug={orgSlug}
        tournamentId={tournamentId}
        effectivePlan={modules?.effectivePlan ?? "free"}
        onClose={() => setShowDivisionModal(false)}
        onCreated={(classId, _className) => {
          reloadClasses();
          setOpenClasses(prev => new Set([...prev, classId]));
          setShowDivisionModal(false);
        }}
      />
    )}

    {/* ── Модал лимита дивизионов ── */}
    {showDivLimitModal && tournamentId && modules && (
      <PlanLimitModal
        feature="maxDivisions"
        current={classes.length}
        limit={modules.maxDivisions}
        currentPlan={modules.effectivePlan}
        orgSlug={orgSlug}
        tournamentId={tournamentId}
        onClose={() => setShowDivLimitModal(false)}
      />
    )}
    </>
  );
}
