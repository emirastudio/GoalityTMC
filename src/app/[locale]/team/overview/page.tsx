"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTeam } from "@/lib/team-context";
import { Link } from "@/i18n/navigation";
import {
  Users, Shield, Plane, ShoppingCart, CheckCircle, AlertTriangle,
  Hotel, Bus, AlertCircle, MapPin, Utensils, Phone, Calendar, ExternalLink, ArrowRight,
} from "lucide-react";

type TournamentInfo = {
  venueName: string | null;
  venueAddress: string | null;
  venueMapUrl: string | null;
  mealTimes: string | null;
  mealLocation: string | null;
  mealNotes: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  scheduleUrl: string | null;
  scheduleDescription: string | null;
  additionalNotes: string | null;
};

type AssignedHotel = {
  name: string;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  notes: string | null;
};

type OverviewData = {
  counts: { players: number; staff: number; accompanying: number; hotel: number; transfer: number };
  finance: { totalOrdered: string; totalPaid: string; balance: string };
  checks: { hasPlayers: boolean; hasStaff: boolean; hasResponsible: boolean; hasTravel: boolean; hasOrders: boolean };
  completionPercent: number;
  allergies: { firstName: string; lastName: string; allergies: string; dietaryRequirements: string | null }[];
  tournamentInfo: TournamentInfo | null;
  assignedHotel: AssignedHotel | null;
  accomPlayers: number;
  accomStaff: number;
  accomAccompanying: number;
  accomCheckIn: string | null;
  accomCheckOut: string | null;
  accomNotes: string | null;
  accomDeclined: boolean;
  accomConfirmed: boolean;
};

// ─── Accommodation Quest Card ─────────────────────────────────────────────────
// Экспортируется — переиспользуется на /team/booking когда клуб ещё не
// заявил проживание (иначе booking-страница показывает «Pricing has not been
// assigned yet» без возможности что-то ввести).
// eslint-disable-next-line react-refresh/only-export-components
export function AccommodationQuestCard({
  teamId,
  accomConfirmed,
  accomDeclined,
  accomPlayers,
  accomStaff,
  accomAccompanying,
  accomCheckIn,
  accomCheckOut,
  accomNotes,
  onUpdate,
}: {
  teamId: string;
  accomConfirmed: boolean;
  accomDeclined: boolean;
  accomPlayers: number;
  accomStaff: number;
  accomAccompanying: number;
  accomCheckIn: string | null;
  accomCheckOut: string | null;
  accomNotes: string | null;
  onUpdate: () => void;
}) {
  const ta = useTranslations("overview.accom");

  // Локальный UI-стейт: открыта ли форма редактирования
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [saving, setSaving] = useState(false);

  // Accommodation demand — club-declared counts + dates + notes.
  // Счётчики редактируются именно здесь (быстрый ввод «13 / 2 / 0»); галки
  // «в отель» на вкладках ростера сохраняются параллельно для справки, но
  // не являются source-of-truth для pricing'а (см. 0020).
  const [players, setPlayers] = useState(String(accomPlayers ?? 0));
  const [staff, setStaff] = useState(String(accomStaff ?? 0));
  const [accompanying, setAccompanying] = useState(String(accomAccompanying ?? 0));
  const [checkIn, setCheckIn] = useState(accomCheckIn ?? "");
  const [checkOut, setCheckOut] = useState(accomCheckOut ?? "");
  const [notes, setNotes] = useState(accomNotes ?? "");

  // При смене команды — сбросить UI-стейт и поля формы
  useEffect(() => {
    setFormOpen(false);
    setConfirmDecline(false);
    setPlayers(String(accomPlayers ?? 0));
    setStaff(String(accomStaff ?? 0));
    setAccompanying(String(accomAccompanying ?? 0));
    setCheckIn(accomCheckIn ?? "");
    setCheckOut(accomCheckOut ?? "");
    setNotes(accomNotes ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  // Состояние выводится из пропсов — никогда не рассинхронизируется с базой
  const displayState = formOpen
    ? "form"
    : accomConfirmed
    ? "confirmed"
    : accomDeclined
    ? "declined"
    : "unanswered";

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    try {
      await fetch(`/api/teams/${teamId}/accommodation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      onUpdate();
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm() {
    const pNum = parseInt(players) || 0;
    const sNum = parseInt(staff) || 0;
    const aNum = parseInt(accompanying) || 0;
    await patch({
      accomPlayers: pNum,
      accomStaff: sNum,
      accomAccompanying: aNum,
      accomCheckIn: checkIn || null,
      accomCheckOut: checkOut || null,
      accomNotes: notes || null,
      accomDeclined: false,
      accomConfirmed: true,
    });
    setFormOpen(false);
  }

  async function handleDecline() {
    await patch({ accomDeclined: true, accomConfirmed: false });
    setConfirmDecline(false);
  }

  function handleResetToUnanswered() {
    patch({ accomDeclined: false, accomConfirmed: false });
  }

  // ── State 4: Declined ────────────────────────────────────────────────────────
  if (displayState === "declined") {
    return (
      <div className="rounded-xl border-2 th-border th-bg p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Hotel className="w-5 h-5 th-text-2 shrink-0" />
          <div>
            <p className="text-sm font-semibold th-text">{ta("declinedTitle")}</p>
            <p className="text-xs th-text-2">{ta("declinedSubtitle")}</p>
          </div>
        </div>
        <button
          onClick={handleResetToUnanswered}
          className="text-xs text-navy hover:underline shrink-0 cursor-pointer"
        >
          {ta("editBtn")}
        </button>
      </div>
    );
  }

  // ── State 3: Confirmed ───────────────────────────────────────────────────────
  if (displayState === "confirmed") {
    return (
      <div className="rounded-xl border-2 p-5" style={{ borderColor: "var(--badge-success-border)", background: "var(--badge-success-bg)" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 shrink-0 mt-0.5" style={{ color: "var(--badge-success-color)" }} />
            <div>
              <p className="text-base font-bold th-text mb-1">{ta("confirmedTitle")}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm th-text-2">
                {accomPlayers > 0 && <span>{accomPlayers} {ta("players").toLowerCase()}</span>}
                {accomStaff > 0 && <span>{accomStaff} {ta("staff").toLowerCase()}</span>}
                {accomAccompanying > 0 && <span>{accomAccompanying} {ta("accompanying").toLowerCase()}</span>}
              </div>
              {(accomCheckIn || accomCheckOut) && (
                <div className="mt-1.5 text-sm th-text-2">
                  {accomCheckIn && <span>{ta("arrivalLabel")}: {accomCheckIn}</span>}
                  {accomCheckIn && accomCheckOut && <span> · </span>}
                  {accomCheckOut && <span>{ta("departureLabel")}: {accomCheckOut}</span>}
                </div>
              )}
              {accomNotes && (
                <p className="mt-1.5 text-xs th-text-2 italic">{accomNotes}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setFormOpen(true)}
            className="text-xs th-text-2 border th-border rounded-lg px-3 py-1.5 hover:opacity-80 transition-colors shrink-0 cursor-pointer th-card"
          >
            {ta("editBtn")}
          </button>
        </div>
      </div>
    );
  }

  // ── State 2: Form expanded ───────────────────────────────────────────────────
  if (displayState === "form") {
    return (
      <div className="rounded-xl border-2 p-5 space-y-5" style={{ borderColor: "var(--badge-warning-border)", background: "var(--badge-warning-bg)" }}>
        <div className="flex items-center gap-3">
          <Hotel className="w-6 h-6 shrink-0" style={{ color: "var(--badge-warning-color)" }} />
          <div>
            <p className="text-base font-bold th-text">{ta("formTitle")}</p>
            <p className="text-sm th-text-2">{ta("formSubtitle")}</p>
          </div>
        </div>

        {/* Counts row — editable declared demand. Stored on
            tournament_registrations.accom_players/staff/accompanying and used
            downstream by the v3 pricing calculator when accomConfirmed=true. */}
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { label: ta("players"), val: players, set: setPlayers },
              { label: ta("staff"), val: staff, set: setStaff },
              { label: ta("accompanying"), val: accompanying, set: setAccompanying },
            ] as { label: string; val: string; set: (v: string) => void }[]
          ).map(({ label, val, set }) => (
            <div key={label}>
              <label className="block text-xs font-semibold th-text-2 mb-1">{label}</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={val}
                onFocus={(e) => { if (e.target.value === "0") set(""); }}
                onBlur={(e) => { if (e.target.value === "") set("0"); }}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  set(raw === "" ? "" : String(parseInt(raw, 10)));
                }}
                className="w-full rounded-lg th-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/20 focus:border-[var(--cat-accent)]"
              />
            </div>
          ))}
        </div>

        {/* Dates row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold th-text-2 mb-1">{ta("checkIn")}</label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full rounded-lg th-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/20 focus:border-[var(--cat-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold th-text-2 mb-1">{ta("checkOut")}</label>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full rounded-lg th-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/20 focus:border-[var(--cat-accent)]"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold th-text-2 mb-1">{ta("notes")}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={ta("notesPlaceholder")}
            className="w-full rounded-lg th-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/20 focus:border-[var(--cat-accent)] resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 font-semibold rounded-xl py-3 text-sm hover:opacity-90 transition-colors disabled:opacity-50 cursor-pointer"
            style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}
          >
            {saving ? ta("saving") : ta("confirmBtn")}
          </button>
          <button
            onClick={() => setFormOpen(false)}
            className="text-sm th-text-2 hover:opacity-70 cursor-pointer"
          >
            {ta("cancel")}
          </button>
        </div>
      </div>
    );
  }

  // ── State 1: Unanswered ──────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border-2 p-5" style={{ borderColor: "var(--badge-warning-border)", background: "var(--badge-warning-bg)" }}>
      <div className="flex items-start gap-3 mb-4">
        <Hotel className="w-6 h-6 shrink-0 mt-0.5" style={{ color: "var(--badge-warning-color)" }} />
        <div>
          <p className="text-base font-bold th-text">{ta("questTitle")}</p>
          <p className="text-sm th-text-2 mt-0.5">{ta("questSubtitle")}</p>
        </div>
      </div>

      {confirmDecline ? (
        <div className="rounded-lg th-card border th-border p-4 space-y-3">
          <p className="text-sm font-medium th-text">{ta("confirmDeclineQuestion")}</p>
          <div className="flex gap-2">
            <button
              onClick={handleDecline}
              disabled={saving}
              className="flex-1 font-semibold rounded-lg py-2 text-sm hover:opacity-90 transition-colors disabled:opacity-50 cursor-pointer"
              style={{ background: "var(--badge-warning-color)", color: "#ffffff" }}
            >
              {saving ? "..." : ta("confirmDeclineYes")}
            </button>
            <button
              onClick={() => setConfirmDecline(false)}
              className="flex-1 border th-border th-text-2 font-semibold rounded-lg py-2 text-sm hover:opacity-80 th-card cursor-pointer"
            >
              {ta("confirmDeclineBack")}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setFormOpen(true)}
            className="flex-1 font-semibold rounded-xl py-3 text-sm hover:opacity-90 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_14px_var(--cat-accent-glow)]"
            style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}
          >
            <CheckCircle className="w-4 h-4" /> {ta("yesBtn")}
          </button>
          <button
            onClick={() => setConfirmDecline(true)}
            className="flex-1 border-2 th-text-2 font-semibold rounded-xl py-3 text-sm hover:opacity-80 transition-colors cursor-pointer th-card"
            style={{ borderColor: "var(--badge-warning-border)" }}
          >
            {ta("noBtn")}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TeamOverviewPage() {
  const t = useTranslations("overview");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const { teamId } = useTeam();
  const [data, setData] = useState<OverviewData | null>(null);
  const activeTeamIdRef = useRef(teamId);

  useEffect(() => {
    if (!teamId) return;
    activeTeamIdRef.current = teamId;
    let cancelled = false;
    setData(null);
    fetch(`/api/teams/${teamId}/overview`).then(async (r) => {
      if (!cancelled && r.ok) setData(await r.json());
    });
    return () => { cancelled = true; };
  }, [teamId]);

  function fetchData() {
    if (!teamId) return;
    const tid = teamId;
    fetch(`/api/teams/${tid}/overview`).then(async (r) => {
      // Игнорировать ответ если команда уже изменилась
      if (r.ok && activeTeamIdRef.current === tid) setData(await r.json());
    });
  }

  if (!data) return null;

  const { counts, finance, checks, completionPercent, allergies, tournamentInfo: tInfo, assignedHotel } = data;

  type CheckKey = "hasPlayers" | "hasStaff" | "hasResponsible" | "hasTravel" | "hasOrders";

  const checklist: {
    key: CheckKey;
    label: string;
    done: boolean;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { key: "hasPlayers",    label: tn("players"),          done: checks.hasPlayers,    href: "/team/players", icon: Users },
    { key: "hasStaff",      label: tn("staff"),            done: checks.hasStaff,      href: "/team/staff",   icon: Shield },
    { key: "hasResponsible",label: t("responsiblePerson"), done: checks.hasResponsible,href: "/team/staff",   icon: Shield },
    { key: "hasTravel",     label: tn("travel"),           done: checks.hasTravel,     href: "/team/travel",  icon: Plane },
    { key: "hasOrders",     label: tn("booking"),          done: data.accomConfirmed || data.accomDeclined, href: "/team/overview", icon: ShoppingCart },
  ];

  const balanceNum = parseFloat(finance.balance);
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Page header (Bidibet style) ── */}
      <div className="mb-2">
        <p className="text-[11px] font-semibold th-text-2 uppercase tracking-widest mb-1.5">
          {today}
        </p>
        <h1 className="text-2xl font-bold th-text">{t("registrationProgress")}</h1>
        <p className="text-sm th-text-2 mt-1">{t("checklist.hasPlayers.hint")}</p>
      </div>

      {/* ── Stats grid (Bidibet style) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users,  value: counts.players,  label: tn("players"),        color: "bg-blue-500/10 text-blue-600" },
          { icon: Shield, value: counts.staff,     label: tn("staff"),          color: "bg-violet-500/10 text-violet-600" },
          { icon: Hotel,  value: counts.hotel,     label: t("hotelRooms"),      color: "bg-amber-500/10 text-amber-600" },
          { icon: Bus,    value: counts.transfer,  label: t("transferBooked"),  color: "bg-emerald-500/10 text-emerald-600" },
        ].map(({ icon: Icon, value, label, color }) => (
          <div key={label} className="th-card rounded-2xl p-5 border th-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-semibold th-text-2 uppercase tracking-wider">{label}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold th-text leading-none">{value}</p>
            <p className="text-[11px] th-text-2 mt-2">{t("done")}</p>
          </div>
        ))}
      </div>

      {/* ── Finance summary (Bidibet card style) ── */}
      <div className="th-card rounded-2xl border th-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b th-border">
          <p className="text-sm font-semibold th-text">{t("financeSummary")}</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-[var(--cat-card-border)]">
          {[
            { label: t("totalOrdered"), value: parseFloat(finance.totalOrdered).toFixed(0), color: "th-text", prefix: "€" },
            { label: t("totalPaid"), value: parseFloat(finance.totalPaid).toFixed(0), color: "text-success", prefix: "€" },
            { label: t("balanceLabel"), value: (balanceNum < 0 ? "" : "+") + parseFloat(finance.balance).toFixed(0), color: balanceNum < 0 ? "text-error" : "text-success", prefix: "€" },
          ].map(({ label, value, color, prefix }) => (
            <div key={label} className="px-5 py-4">
              <p className="text-[11px] font-semibold th-text-2 uppercase tracking-wider mb-2">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{prefix}{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Accommodation Quest Card ── */}
      {teamId && (
        <AccommodationQuestCard
          teamId={String(teamId)}
          accomConfirmed={data.accomConfirmed}
          accomDeclined={data.accomDeclined}
          accomPlayers={data.accomPlayers}
          accomStaff={data.accomStaff}
          accomAccompanying={data.accomAccompanying}
          accomCheckIn={data.accomCheckIn}
          accomCheckOut={data.accomCheckOut}
          accomNotes={data.accomNotes}
          onUpdate={fetchData}
        />
      )}

      {/* ── Progress + checklist ── */}
      <div className="th-card rounded-2xl border th-border shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold th-text">{t("registrationProgress")}</p>
          <span className="text-2xl font-bold text-navy">{completionPercent}%</span>
        </div>
        <div className="w-full h-2 th-bg rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-navy to-mint rounded-full transition-all duration-700"
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        <div className="mt-5 space-y-2">
          {checklist.map(({ key, label, done, href, icon: Icon }) => (
            done ? (
              <div key={key} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-success/5">
                <CheckCircle className="w-4 h-4 text-success shrink-0" />
                <Icon className="w-4 h-4 text-success/50 shrink-0" />
                <span className="text-sm flex-1 th-text">{label}</span>
                <span className="text-[11px] font-semibold text-success uppercase tracking-wide">{t("done")}</span>
              </div>
            ) : (
              <div key={key} className="rounded-xl border border-warning/30 bg-warning/4 overflow-hidden">
                <div className="flex items-center gap-3 px-3 pt-3 pb-1">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                  <Icon className="w-4 h-4 text-warning/60 shrink-0" />
                  <span className="text-sm font-semibold th-text flex-1">{label}</span>
                  <Badge variant="warning">{t("solve")}</Badge>
                </div>
                <div className="flex items-end justify-between gap-3 px-3 pb-3 pt-1">
                  <p className="text-xs th-text-2 leading-relaxed flex-1">
                    {t(`checklist.${key}.hint`)}
                  </p>
                  <Link
                    href={href}
                    className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-white bg-navy rounded-lg px-3 py-1.5 hover:bg-navy-light transition-colors whitespace-nowrap"
                  >
                    {t(`checklist.${key}.action`)}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Tournament Info */}
      {(assignedHotel || (tInfo && (tInfo.venueName || tInfo.mealTimes || tInfo.scheduleUrl || tInfo.emergencyContact))) && (
        <div className="th-card rounded-2xl border th-border shadow-sm p-5">
          <p className="text-sm font-semibold th-text mb-4">🏆 {t("tournamentInfoTitle")}</p>
          <div className="mt-4 space-y-4">

            {/* Assigned hotel (team-specific only) */}
            {assignedHotel && (
              <div className="flex gap-3">
                <Hotel className="w-5 h-5 text-navy shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold th-text">{assignedHotel.name}</p>
                  {assignedHotel.address && <p className="text-sm th-text-2">{assignedHotel.address}</p>}
                  {assignedHotel.contactName && <p className="text-xs th-text-2 mt-0.5">{t("contact")}: {assignedHotel.contactName}</p>}
                  {assignedHotel.contactPhone && (
                    <a href={`tel:${assignedHotel.contactPhone}`} className="text-xs text-navy hover:underline block mt-0.5">{assignedHotel.contactPhone}</a>
                  )}
                  {assignedHotel.notes && <p className="text-xs th-text-2 italic mt-0.5">{assignedHotel.notes}</p>}
                </div>
              </div>
            )}

            {/* Venue */}
            {tInfo?.venueName && (
              <div className="flex gap-3">
                <MapPin className="w-5 h-5 text-navy shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold th-text">{tInfo.venueName}</p>
                  {tInfo.venueAddress && <p className="text-sm th-text-2">{tInfo.venueAddress}</p>}
                  {tInfo.venueMapUrl && (
                    <a
                      href={tInfo.venueMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-navy hover:underline mt-0.5"
                    >
                      <ExternalLink className="w-3 h-3" /> {t("onMap")}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Meals */}
            {tInfo?.mealTimes && (
              <div className="flex gap-3">
                <Utensils className="w-5 h-5 text-navy shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold th-text">{t("meals")}</p>
                  <p className="text-sm th-text-2">{tInfo.mealTimes}</p>
                  {tInfo.mealLocation && <p className="text-xs th-text-2">{tInfo.mealLocation}</p>}
                  {tInfo.mealNotes && <p className="text-xs th-text-2 italic">{tInfo.mealNotes}</p>}
                </div>
              </div>
            )}

            {/* Schedule */}
            {tInfo?.scheduleUrl && (
              <div className="flex gap-3">
                <Calendar className="w-5 h-5 text-navy shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold th-text">{t("schedule")}</p>
                  {tInfo.scheduleDescription && <p className="text-sm th-text-2">{tInfo.scheduleDescription}</p>}
                  <a
                    href={tInfo.scheduleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-navy hover:underline mt-0.5"
                  >
                    <ExternalLink className="w-3 h-3" /> {t("openSchedule")}
                  </a>
                </div>
              </div>
            )}

            {/* Emergency */}
            {tInfo?.emergencyContact && (
              <div className="flex gap-3 rounded-lg p-3 -mx-1" style={{ background: "var(--badge-error-bg)", borderLeft: "3px solid var(--badge-error-border)" }}>
                <Phone className="w-5 h-5 text-error shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-error">{t("emergencyContact")}</p>
                  <p className="text-sm th-text">{tInfo.emergencyContact}</p>
                  {tInfo.emergencyPhone && (
                    <a href={`tel:${tInfo.emergencyPhone}`} className="text-sm font-medium text-error hover:underline">
                      {tInfo.emergencyPhone}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Additional notes */}
            {tInfo?.additionalNotes && (
              <div className="th-bg rounded-lg p-3 text-sm th-text-2">
                {tInfo.additionalNotes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Allergies */}
      {allergies.length > 0 && (
        <div className="th-card rounded-2xl border th-border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-warning" />
            <p className="text-sm font-semibold th-text">{t("allergiesTitle")}</p>
          </div>
          <div className="space-y-2">
            {allergies.map((a, i) => (
              <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-warning/6 border border-warning/15">
                <span className="text-sm font-medium th-text">{a.firstName} {a.lastName}</span>
                {a.allergies && (
                  <span className="text-sm th-text-2">— {a.allergies}</span>
                )}
                {a.dietaryRequirements && (
                  <Badge variant="warning">{a.dietaryRequirements}</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
