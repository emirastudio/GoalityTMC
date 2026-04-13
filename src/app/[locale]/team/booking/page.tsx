"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTeam } from "@/lib/team-context";
import { Clock, CheckCircle, ChevronRight } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type AccommodationOption = {
  id: number;
  name: string;
  nameRu: string | null;
  checkIn: string | null;
  checkOut: string | null;
  pricePerPlayer: string;
  pricePerStaff: string;
  pricePerAccompanying: string;
  includedMeals: number;
  mealNote: string | null;
  mealNoteRu: string | null;
  sortOrder: number;
};

type ExtraMealOption = {
  id: number;
  name: string;
  nameRu: string | null;
  description: string | null;
  descriptionRu: string | null;
  pricePerPerson: string;
  perDay: boolean;
  sortOrder: number;
};

type TransferOption = {
  id: number;
  name: string;
  nameRu: string | null;
  description: string | null;
  descriptionRu: string | null;
  pricePerPerson: string;
  sortOrder: number;
};

type RegistrationFee = {
  id: number;
  name: string;
  nameRu: string | null;
  price: string;
};

type ServiceOverride = {
  serviceType: "accommodation" | "meal" | "transfer" | "registration";
  serviceId: number;
  customPrice: string | null;
  isDisabled: boolean;
};

type BookingData = {
  available: false;
} | {
  available: true;
  accommodation: AccommodationOption[];
  meals: ExtraMealOption[];
  transfers: TransferOption[];
  registration: RegistrationFee | null;
  bookings: SavedBooking[];
  overrides: ServiceOverride[];
  freeSlots: { players: number; staff: number; accompanying: number; mealsOverride: number | null };
  questData: { players: number; staff: number; accompanying: number; checkIn: string | null; checkOut: string | null; confirmed: boolean };
};

type SavedBooking = {
  id: number;
  bookingType: string;
  serviceId: number;
  quantity: number;
  unitPrice: string;
  total: string;
  notes: string | null;
};

// ─── Booking State ───────────────────────────────────────────────────────────

type AccommodationBooking = {
  optionId: number | null;
  players: number;
  staff: number;
  accompanying: number;
};

type MealBooking = {
  optionId: number;
  persons: number;
  days: number;
};

type TransferBooking = {
  optionId: number | null;
  persons: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtPrice(price: string | number): string {
  const n = typeof price === "string" ? parseFloat(price) : price;
  return `€${n.toFixed(2)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getLocalName(
  item: { name: string; nameRu: string | null },
  locale: string
): string {
  if (locale === "ru" && item.nameRu) return item.nameRu;
  return item.name;
}

function getLocalDesc(
  item: { description?: string | null; descriptionRu?: string | null },
  locale: string
): string | null {
  if (locale === "ru" && item.descriptionRu) return item.descriptionRu;
  return item.description ?? null;
}

function getLocalMealNote(
  item: { mealNote: string | null; mealNoteRu: string | null },
  locale: string
): string | null {
  if (locale === "ru" && item.mealNoteRu) return item.mealNoteRu;
  return item.mealNote;
}

function effectivePrice(
  serviceType: "accommodation" | "meal" | "transfer" | "registration",
  serviceId: number,
  basePrice: string,
  overrides: ServiceOverride[]
): string {
  const override = overrides.find(
    (o) => o.serviceType === serviceType && o.serviceId === serviceId
  );
  if (override?.customPrice) return override.customPrice;
  return basePrice;
}

function isDisabled(
  serviceType: "accommodation" | "meal" | "transfer" | "registration",
  serviceId: number,
  overrides: ServiceOverride[]
): boolean {
  return overrides.some(
    (o) => o.serviceType === serviceType && o.serviceId === serviceId && o.isDisabled
  );
}

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({
  stepNum,
  label,
  active,
  done,
}: {
  stepNum: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 py-3 px-4 rounded-lg transition-colors ${active ? "bg-navy/5" : ""}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors ${
          done
            ? "bg-success text-white"
            : active
            ? "bg-navy text-white"
            : "th-bg th-text-2 border th-border"
        }`}
      >
        {done ? <CheckCircle className="w-4 h-4" /> : stepNum}
      </div>
      <span
        className={`text-sm font-medium ${
          active ? "text-navy" : done ? "text-success" : "th-text-2"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Quantity Input ──────────────────────────────────────────────────────────

function QtyInput({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm th-text-2">{label}</label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-lg border th-border th-bg th-text-2 hover:bg-navy hover:text-white hover:border-navy transition-colors flex items-center justify-center text-lg leading-none"
        >
          −
        </button>
        <input
          type="number"
          min={min}
          value={value}
          onChange={(e) => onChange(Math.max(min, parseInt(e.target.value) || 0))}
          className="w-16 text-center rounded-lg border th-border th-card px-2 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-navy/20"
        />
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded-lg border th-border th-bg th-text-2 hover:bg-navy hover:text-white hover:border-navy transition-colors flex items-center justify-center text-lg leading-none"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function BookingPage() {
  const t = useTranslations("booking");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { teamId } = useTeam();

  const [data, setData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Booking state
  const [accommodation, setAccommodation] = useState<AccommodationBooking>({
    optionId: null,
    players: 0,
    staff: 0,
    accompanying: 0,
  });
  const [meals, setMeals] = useState<Map<number, MealBooking>>(new Map());
  const [transfer, setTransfer] = useState<TransferBooking>({
    optionId: null,
    persons: 0,
  });

  // Load data
  useEffect(() => {
    if (!teamId) return;
    setData(null);
    setLoading(true);
    fetch(`/api/teams/${teamId}/bookings`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json: BookingData | null) => {
        if (!json) return;
        setData(json);

        if (json.available && json.bookings.length > 0) {
          // Restore existing bookings
          // Accommodation: multiple rows per option (players, staff, accompanying)
          // Notes: "players", "staff", "accompanying" (paid) or "players_free", "staff_free", "accompanying_free" (complimentary)
          const accRows = json.bookings.filter((b) => b.bookingType === "accommodation");
          if (accRows.length > 0) {
            const optId = accRows[0].serviceId;
            const findQty = (key: string) =>
              (accRows.find((r) => r.notes === key)?.quantity ?? 0) +
              (accRows.find((r) => r.notes === `${key}_free`)?.quantity ?? 0);
            setAccommodation({
              optionId: optId,
              players: findQty("players"),
              staff: findQty("staff"),
              accompanying: findQty("accompanying"),
            });
          }

          // Meals
          const mealRows = json.bookings.filter((b) => b.bookingType === "meal");
          const mealMap = new Map<number, MealBooking>();
          for (const row of mealRows) {
            const [persons, days] = row.notes?.split(":").map(Number) ?? [row.quantity, 1];
            mealMap.set(row.serviceId, {
              optionId: row.serviceId,
              persons: persons || row.quantity,
              days: days || 1,
            });
          }
          setMeals(mealMap);

          // Transfer
          const xferRow = json.bookings.find((b) => b.bookingType === "transfer");
          if (xferRow) {
            setTransfer({ optionId: xferRow.serviceId, persons: xferRow.quantity || 1 });
          }
        } else if (json.available) {
          // Бронирований ещё нет — автозаполнить из данных квеста проживания
          const q = json.questData;
          if (q.confirmed && (q.players > 0 || q.staff > 0 || q.accompanying > 0)) {
            // Найти вариант проживания по датам из квеста (если есть)
            let matchedOptionId: number | null = null;
            if (q.checkIn && q.checkOut) {
              const match = json.accommodation.find(
                (a) =>
                  a.checkIn?.startsWith(q.checkIn!) &&
                  a.checkOut?.startsWith(q.checkOut!)
              );
              matchedOptionId = match?.id ?? json.accommodation[0]?.id ?? null;
            } else if (json.accommodation.length === 1) {
              matchedOptionId = json.accommodation[0].id;
            }
            setAccommodation({
              optionId: matchedOptionId,
              players: q.players,
              staff: q.staff,
              accompanying: q.accompanying,
            });
          }
        }
      })
      .finally(() => setLoading(false));
  }, [teamId]);

  // ─── Computed totals ──────────────────────────────────────────────────────

  const computeAccommodationTotal = useCallback((): number => {
    if (!data?.available || accommodation.optionId === null) return 0;
    const opt = data.accommodation.find((a) => a.id === accommodation.optionId);
    if (!opt) return 0;
    const playerPrice = parseFloat(
      effectivePrice("accommodation", opt.id, opt.pricePerPlayer, data.overrides)
    );
    const staffPrice = parseFloat(
      effectivePrice("accommodation", opt.id, opt.pricePerStaff, data.overrides)
    );
    const accompPrice = parseFloat(
      effectivePrice("accommodation", opt.id, opt.pricePerAccompanying, data.overrides)
    );
    // Deduct complimentary (free) slots
    const chargedPlayers = Math.max(0, accommodation.players - data.freeSlots.players);
    const chargedStaff = Math.max(0, accommodation.staff - data.freeSlots.staff);
    const chargedAccom = Math.max(0, accommodation.accompanying - data.freeSlots.accompanying);
    return (
      playerPrice * chargedPlayers +
      staffPrice * chargedStaff +
      accompPrice * chargedAccom
    );
  }, [data, accommodation]);

  const computeMealTotal = useCallback((): number => {
    if (!data?.available) return 0;
    let total = 0;
    for (const [id, booking] of meals) {
      const opt = data.meals.find((m) => m.id === id);
      if (!opt) continue;
      const price = parseFloat(
        effectivePrice("meal", opt.id, opt.pricePerPerson, data.overrides)
      );
      total += price * booking.persons * (opt.perDay ? booking.days : 1);
    }
    return total;
  }, [data, meals]);

  const computeTransferTotal = useCallback((): number => {
    if (!data?.available || transfer.optionId === null) return 0;
    const opt = data.transfers.find((tr) => tr.id === transfer.optionId);
    if (!opt) return 0;
    const price = parseFloat(
      effectivePrice("transfer", opt.id, opt.pricePerPerson, data.overrides)
    );
    return price; // flat per-team price
  }, [data, transfer]);

  const registrationTotal = useCallback((): number => {
    if (!data?.available || !data.registration) return 0;
    return parseFloat(
      effectivePrice("registration", data.registration.id, data.registration.price, data.overrides)
    );
  }, [data]);

  const grandTotal =
    registrationTotal() +
    computeAccommodationTotal() +
    computeMealTotal() +
    computeTransferTotal();

  // ─── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!teamId || !data?.available) return;
    setSaving(true);
    setSaved(false);

    const bookings: {
      bookingType: "accommodation" | "meal" | "transfer" | "registration";
      serviceId: number;
      quantity: number;
      unitPrice: string;
      notes?: string;
    }[] = [];

    // Registration (always 1)
    if (data.registration) {
      bookings.push({
        bookingType: "registration",
        serviceId: data.registration.id,
        quantity: 1,
        unitPrice: effectivePrice(
          "registration",
          data.registration.id,
          data.registration.price,
          data.overrides
        ),
      });
    }

    // Accommodation — store as separate rows per person type for clarity
    // Free-slot rows are stored with notes like "players_free" at €0.00
    if (accommodation.optionId !== null) {
      const opt = data.accommodation.find((a) => a.id === accommodation.optionId);
      if (opt) {
        const accomRows: Array<{ key: "players" | "staff" | "accompanying"; basePrice: string; qty: number; freeQty: number }> = [
          { key: "players", basePrice: opt.pricePerPlayer, qty: accommodation.players, freeQty: data.freeSlots.players },
          { key: "staff", basePrice: opt.pricePerStaff, qty: accommodation.staff, freeQty: data.freeSlots.staff },
          { key: "accompanying", basePrice: opt.pricePerAccompanying, qty: accommodation.accompanying, freeQty: data.freeSlots.accompanying },
        ];
        for (const row of accomRows) {
          const usedFree = Math.min(row.qty, row.freeQty);
          const paidQty = Math.max(0, row.qty - usedFree);
          if (paidQty > 0) {
            bookings.push({
              bookingType: "accommodation",
              serviceId: opt.id,
              quantity: paidQty,
              unitPrice: effectivePrice("accommodation", opt.id, row.basePrice, data.overrides),
              notes: row.key,
            });
          }
          if (usedFree > 0) {
            bookings.push({
              bookingType: "accommodation",
              serviceId: opt.id,
              quantity: usedFree,
              unitPrice: "0.00",
              notes: `${row.key}_free`,
            });
          }
        }
      }
    }

    // Meals
    for (const [id, booking] of meals) {
      const opt = data.meals.find((m) => m.id === id);
      if (!opt || booking.persons <= 0) continue;
      const effectiveDays = opt.perDay ? booking.days : 1;
      bookings.push({
        bookingType: "meal",
        serviceId: id,
        quantity: booking.persons * effectiveDays,
        unitPrice: effectivePrice("meal", opt.id, opt.pricePerPerson, data.overrides),
        notes: `${booking.persons}:${effectiveDays}`,
      });
    }

    // Transfer — flat per-team price
    if (transfer.optionId !== null) {
      const opt = data.transfers.find((tr) => tr.id === transfer.optionId);
      if (opt) {
        bookings.push({
          bookingType: "transfer",
          serviceId: opt.id,
          quantity: 1,
          unitPrice: effectivePrice("transfer", opt.id, opt.pricePerPerson, data.overrides),
        });
      }
    }

    const res = await fetch(`/api/teams/${teamId}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookings }),
    });

    if (res.ok) setSaved(true);
    setSaving(false);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 th-text-2 text-sm">
        {tc("loading")}
      </div>
    );
  }

  if (!data) return null;

  if (!data.available) {
    return (
      <div className="max-w-2xl">
        <Card>
          <div className="flex flex-col items-center text-center py-8 gap-4">
            <div className="w-14 h-14 rounded-full th-bg flex items-center justify-center">
              <Clock className="w-7 h-7 th-text-2" />
            </div>
            <div>
              <h3 className="text-lg font-semibold th-text mb-1">
                {t("pricingNotAssigned")}
              </h3>
              <p className="text-sm th-text-2 max-w-sm">{t("pricingNotAssignedDesc")}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const steps = [
    t("registrationFee"),
    t("selectAccommodation"),
    t("extraMeals"),
    t("selectTransfer"),
    t("summary"),
  ];

  const accomTotal = computeAccommodationTotal();
  const mealTotal = computeMealTotal();
  const xferTotal = computeTransferTotal();
  const regTotal = registrationTotal();

  return (
    <div className="max-w-4xl space-y-6">
      {/* Step sidebar + content layout */}
      <div className="flex gap-6 items-start">
        {/* Vertical step indicator — hidden on mobile */}
        <div className="hidden lg:flex flex-col gap-1 w-52 shrink-0 sticky top-6">
          <Card padding={false}>
            <div className="p-3">
              {steps.map((label, i) => (
                <StepIndicator
                  key={i}
                  stepNum={i + 1}
                  label={label}
                  active={false}
                  done={false}
                />
              ))}
            </div>
          </Card>
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-4">
          {/* ─── Step 1: Registration ──────────────────────────────────── */}
          <StepCard stepNum={1} title={t("registrationFee")} subtotal={regTotal}>
            {data.registration ? (
              <div className="flex items-center justify-between rounded-xl border border-navy/20 bg-navy/5 px-5 py-4">
                <div>
                  <p className="font-semibold th-text">
                    {getLocalName(data.registration, locale)}
                  </p>
                  <p className="text-xs th-text-2 mt-0.5">{t("included")}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-navy">
                    {fmtPrice(
                      effectivePrice(
                        "registration",
                        data.registration.id,
                        data.registration.price,
                        data.overrides
                      )
                    )}
                  </p>
                  <p className="text-xs th-text-2">× 1</p>
                </div>
              </div>
            ) : (
              <p className="text-sm th-text-2">{t("noOrders")}</p>
            )}
          </StepCard>

          {/* ─── Step 2: Accommodation ────────────────────────────────── */}
          <StepCard stepNum={2} title={t("selectAccommodation")} subtotal={accomTotal}>
            {/* Free slots banner */}
            {(data.freeSlots.players > 0 || data.freeSlots.staff > 0 || data.freeSlots.accompanying > 0) && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-2">
                <span className="text-emerald-600 text-base shrink-0">🎁</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Complimentary places included</p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {[
                      data.freeSlots.players > 0 ? `${data.freeSlots.players} free player${data.freeSlots.players > 1 ? "s" : ""}` : null,
                      data.freeSlots.staff > 0 ? `${data.freeSlots.staff} free staff` : null,
                      data.freeSlots.accompanying > 0 ? `${data.freeSlots.accompanying} free accompanying` : null,
                    ].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
            )}
            {data.accommodation.length === 0 ? (
              <p className="text-sm th-text-2">{t("noAccommodationOptions")}</p>
            ) : (
              <div className="space-y-3">
                {data.accommodation
                  .filter((a) => !isDisabled("accommodation", a.id, data.overrides))
                  .map((opt) => {
                    const selected = accommodation.optionId === opt.id;
                    const playerPrice = effectivePrice(
                      "accommodation",
                      opt.id,
                      opt.pricePerPlayer,
                      data.overrides
                    );
                    const staffPrice = effectivePrice(
                      "accommodation",
                      opt.id,
                      opt.pricePerStaff,
                      data.overrides
                    );
                    const accompPrice = effectivePrice(
                      "accommodation",
                      opt.id,
                      opt.pricePerAccompanying,
                      data.overrides
                    );
                    const hasAccomp = parseFloat(accompPrice) > 0;
                    const mealNote = getLocalMealNote(opt, locale);

                    return (
                      <div
                        key={opt.id}
                        onClick={() =>
                          setAccommodation((prev) => ({
                            ...prev,
                            optionId: prev.optionId === opt.id ? null : opt.id,
                          }))
                        }
                        className={`rounded-xl border-2 cursor-pointer transition-all ${
                          selected
                            ? "border-navy bg-navy/5 shadow-sm"
                            : "th-border th-card hover:border-navy/40"
                        }`}
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div
                                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                  selected ? "border-navy bg-navy" : "th-border"
                                }`}
                              >
                                {selected && (
                                  <div className="w-2 h-2 rounded-full bg-white" />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold th-text">
                                  {getLocalName(opt, locale)}
                                </p>
                                {(opt.checkIn || opt.checkOut) && (
                                  <p className="text-xs th-text-2 mt-0.5">
                                    {t("checkIn")}: {formatDate(opt.checkIn)} — {t("checkOut")}:{" "}
                                    {formatDate(opt.checkOut)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs th-text-2">
                                {fmtPrice(playerPrice)} / {t("players").toLowerCase()}
                              </p>
                              <p className="text-xs th-text-2">
                                {fmtPrice(staffPrice)} / {t("staff").toLowerCase()}
                              </p>
                              {hasAccomp && (
                                <p className="text-xs th-text-2">
                                  {fmtPrice(accompPrice)} / {t("accompanying").toLowerCase()}
                                </p>
                              )}
                            </div>
                          </div>

                          {(() => {
                            const effectiveMeals = data.freeSlots.mealsOverride ?? opt.includedMeals;
                            return (effectiveMeals > 0 || mealNote) ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {effectiveMeals > 0 ? (
                                  <Badge variant="success">
                                    {effectiveMeals} {t("mealsIncluded")}
                                  </Badge>
                                ) : null}
                                {mealNote && (
                                  <span className="text-xs th-text-2">{mealNote}</span>
                                )}
                              </div>
                            ) : null;
                          })()}
                        </div>

                        {/* Quantity inputs shown when selected */}
                        {selected && (
                          <div
                            className="border-t border-navy/10 p-4 space-y-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <QtyInput
                              label={t("players")}
                              value={accommodation.players}
                              onChange={(v) =>
                                setAccommodation((prev) => ({ ...prev, players: v }))
                              }
                            />
                            <QtyInput
                              label={t("staff")}
                              value={accommodation.staff}
                              onChange={(v) =>
                                setAccommodation((prev) => ({ ...prev, staff: v }))
                              }
                            />
                            {hasAccomp && (
                              <QtyInput
                                label={t("accompanying")}
                                value={accommodation.accompanying}
                                onChange={(v) =>
                                  setAccommodation((prev) => ({ ...prev, accompanying: v }))
                                }
                              />
                            )}
                            {accomTotal > 0 && (
                              <div className="pt-2 border-t th-border flex justify-between text-sm font-medium">
                                <span className="th-text-2">{t("subtotal")}</span>
                                <span className="text-navy">{fmtPrice(accomTotal)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </StepCard>

          {/* ─── Step 3: Extra Meals ──────────────────────────────────── */}
          <StepCard stepNum={3} title={t("extraMeals")} subtotal={mealTotal}>
            {data.meals.length === 0 ? (
              <p className="text-sm th-text-2">{t("noOrders")}</p>
            ) : (
              <div className="space-y-3">
                {data.meals
                  .filter((m) => !isDisabled("meal", m.id, data.overrides))
                  .map((opt) => {
                    const checked = meals.has(opt.id);
                    const booking = meals.get(opt.id);
                    const price = effectivePrice("meal", opt.id, opt.pricePerPerson, data.overrides);
                    const desc = getLocalDesc(opt, locale);

                    function toggleMeal() {
                      setMeals((prev) => {
                        const next = new Map(prev);
                        if (next.has(opt.id)) {
                          next.delete(opt.id);
                        } else {
                          next.set(opt.id, { optionId: opt.id, persons: 1, days: 1 });
                        }
                        return next;
                      });
                    }

                    function updateMeal(field: "persons" | "days", value: number) {
                      setMeals((prev) => {
                        const next = new Map(prev);
                        const current = next.get(opt.id) ?? {
                          optionId: opt.id,
                          persons: 1,
                          days: 1,
                        };
                        next.set(opt.id, { ...current, [field]: value });
                        return next;
                      });
                    }

                    const mealSubtotal =
                      checked && booking
                        ? parseFloat(price) *
                          booking.persons *
                          (opt.perDay ? booking.days : 1)
                        : 0;

                    return (
                      <div
                        key={opt.id}
                        className={`rounded-xl border-2 transition-all ${
                          checked
                            ? "border-navy bg-navy/5"
                            : "th-border th-card hover:border-navy/30"
                        }`}
                      >
                        <div
                          className="p-4 cursor-pointer"
                          onClick={toggleMeal}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-colors ${
                                checked ? "border-navy bg-navy" : "th-border"
                              }`}
                            >
                              {checked && (
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={3}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold th-text">
                                  {getLocalName(opt, locale)}
                                </p>
                                {opt.perDay && (
                                  <Badge variant="info">{t("perDay")}</Badge>
                                )}
                              </div>
                              {desc && (
                                <p className="text-xs th-text-2 mt-0.5">{desc}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold text-navy">
                                {fmtPrice(price)}
                              </p>
                              <p className="text-xs th-text-2">
                                {opt.perDay ? t("perPersonPerDay") : t("perPerson")}
                              </p>
                            </div>
                          </div>
                        </div>

                        {checked && booking && (
                          <div
                            className="border-t border-navy/10 p-4 space-y-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <QtyInput
                              label={t("persons")}
                              value={booking.persons}
                              min={1}
                              onChange={(v) => updateMeal("persons", v)}
                            />
                            {opt.perDay && (
                              <QtyInput
                                label={t("days")}
                                value={booking.days}
                                min={1}
                                onChange={(v) => updateMeal("days", v)}
                              />
                            )}
                            {mealSubtotal > 0 && (
                              <div className="pt-2 border-t th-border flex justify-between text-sm font-medium">
                                <span className="th-text-2">{t("subtotal")}</span>
                                <span className="text-navy">{fmtPrice(mealSubtotal)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </StepCard>

          {/* ─── Step 4: Transfer ─────────────────────────────────────── */}
          <StepCard stepNum={4} title={t("selectTransfer")} subtotal={xferTotal}>
            {data.transfers.length === 0 ? (
              <p className="text-sm th-text-2">{t("noTransferOptions")}</p>
            ) : (
              <div className="space-y-3">
                {data.transfers
                  .filter((tr) => !isDisabled("transfer", tr.id, data.overrides))
                  .map((opt) => {
                    const selected = transfer.optionId === opt.id;
                    const price = effectivePrice(
                      "transfer",
                      opt.id,
                      opt.pricePerPerson,
                      data.overrides
                    );
                    const isFree = parseFloat(price) === 0;
                    const desc = getLocalDesc(opt, locale);

                    return (
                      <div
                        key={opt.id}
                        onClick={() =>
                          setTransfer((prev) => ({
                            optionId: prev.optionId === opt.id ? null : opt.id,
                            persons: prev.optionId === opt.id ? 0 : (prev.persons > 0 ? prev.persons : 1),
                          }))
                        }
                        className={`rounded-xl border-2 cursor-pointer transition-all ${
                          selected
                            ? "border-navy bg-navy/5 shadow-sm"
                            : "th-border th-card hover:border-navy/40"
                        }`}
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                selected ? "border-navy bg-navy" : "th-border"
                              }`}
                            >
                              {selected && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold th-text">
                                  {getLocalName(opt, locale)}
                                </p>
                                {isFree && (
                                  <Badge variant="success">{t("free")}</Badge>
                                )}
                              </div>
                              {desc && (
                                <p className="text-xs th-text-2 mt-0.5">{desc}</p>
                              )}
                            </div>
                            {!isFree && (
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold text-navy">
                                  {fmtPrice(price)}
                                </p>
                                <p className="text-xs th-text-2">{t("perTeam")}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </StepCard>

          {/* ─── Step 5: Summary & Save ───────────────────────────────── */}
          <StepCard stepNum={5} title={t("summary")} subtotal={0} hideBadge>
            <SummaryTable
              data={data}
              accommodation={accommodation}
              meals={meals}
              transfer={transfer}
              regTotal={regTotal}
              accomTotal={accomTotal}
              mealTotal={mealTotal}
              xferTotal={xferTotal}
              grandTotal={grandTotal}
              t={t}
              locale={locale}
            />

            <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
              {saved && (
                <div className="flex items-center gap-2 text-success text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  {t("bookingSaved")}
                </div>
              )}
              {!saved && <div />}
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "..." : t("saveBooking")}
              </Button>
            </div>
          </StepCard>
        </div>
      </div>
    </div>
  );
}

// ─── Step Card Wrapper ────────────────────────────────────────────────────────

function StepCard({
  stepNum,
  title,
  subtotal,
  hideBadge = false,
  children,
}: {
  stepNum: number;
  title: string;
  subtotal: number;
  hideBadge?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border-2 th-border th-card shadow-sm overflow-hidden">
      {/* Step header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b th-border bg-surface/50">
        <div className="w-7 h-7 rounded-full bg-navy text-white flex items-center justify-center text-xs font-bold shrink-0">
          {stepNum}
        </div>
        <h3 className="font-semibold th-text flex-1">{title}</h3>
        {!hideBadge && subtotal > 0 && (
          <Badge variant="info">
            €{subtotal.toFixed(2)}
          </Badge>
        )}
        <ChevronRight className="w-4 h-4 th-text-2" />
      </div>

      {/* Content */}
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Summary Table ────────────────────────────────────────────────────────────

function SummaryTable({
  data,
  accommodation,
  meals,
  transfer,
  regTotal,
  accomTotal,
  mealTotal,
  xferTotal,
  grandTotal,
  t,
  locale,
}: {
  data: Extract<BookingData, { available: true }>;
  accommodation: AccommodationBooking;
  meals: Map<number, MealBooking>;
  transfer: TransferBooking;
  regTotal: number;
  accomTotal: number;
  mealTotal: number;
  xferTotal: number;
  grandTotal: number;
  t: ReturnType<typeof useTranslations<"booking">>;
  locale: string;
}) {
  type SummaryRow = {
    label: string;
    qty: string;
    unitPrice: string;
    total: number;
  };

  const rows: SummaryRow[] = [];

  // Registration
  if (data.registration && regTotal > 0) {
    rows.push({
      label: getLocalName(data.registration, locale),
      qty: "1",
      unitPrice: fmtPrice(regTotal),
      total: regTotal,
    });
  }

  // Accommodation
  if (accommodation.optionId !== null) {
    const opt = data.accommodation.find((a) => a.id === accommodation.optionId);
    if (opt) {
      const optName = getLocalName(opt, locale);
      const playerPrice = parseFloat(effectivePrice("accommodation", opt.id, opt.pricePerPlayer, data.overrides));
      const staffPrice = parseFloat(effectivePrice("accommodation", opt.id, opt.pricePerStaff, data.overrides));
      const accompPrice = parseFloat(effectivePrice("accommodation", opt.id, opt.pricePerAccompanying, data.overrides));

      const freeP = Math.min(accommodation.players, data.freeSlots.players);
      const freeS = Math.min(accommodation.staff, data.freeSlots.staff);
      const freeA = Math.min(accommodation.accompanying, data.freeSlots.accompanying);
      const paidP = Math.max(0, accommodation.players - freeP);
      const paidS = Math.max(0, accommodation.staff - freeS);
      const paidA = Math.max(0, accommodation.accompanying - freeA);

      // Paid rows
      if (paidP > 0) rows.push({ label: `${optName} — ${t("players")}`, qty: `${paidP}`, unitPrice: fmtPrice(playerPrice), total: playerPrice * paidP });
      if (paidS > 0) rows.push({ label: `${optName} — ${t("staff")}`, qty: `${paidS}`, unitPrice: fmtPrice(staffPrice), total: staffPrice * paidS });
      if (paidA > 0) rows.push({ label: `${optName} — ${t("accompanying")}`, qty: `${paidA}`, unitPrice: fmtPrice(accompPrice), total: accompPrice * paidA });

      // Complimentary rows
      if (freeP > 0) rows.push({ label: `${optName} — ${t("players")} 🎁`, qty: `${freeP}`, unitPrice: "€0.00", total: 0 });
      if (freeS > 0) rows.push({ label: `${optName} — ${t("staff")} 🎁`, qty: `${freeS}`, unitPrice: "€0.00", total: 0 });
      if (freeA > 0) rows.push({ label: `${optName} — ${t("accompanying")} 🎁`, qty: `${freeA}`, unitPrice: "€0.00", total: 0 });

    }
  }

  // Meals
  for (const [id, booking] of meals) {
    const opt = data.meals.find((m) => m.id === id);
    if (!opt || booking.persons <= 0) continue;
    const price = parseFloat(
      effectivePrice("meal", opt.id, opt.pricePerPerson, data.overrides)
    );
    const effectiveDays = opt.perDay ? booking.days : 1;
    const qty = booking.persons * effectiveDays;
    rows.push({
      label: getLocalName(opt, locale),
      qty: opt.perDay
        ? `${booking.persons} × ${booking.days}d`
        : `${booking.persons}`,
      unitPrice: fmtPrice(price),
      total: price * qty,
    });
  }

  // Transfer — flat per team
  if (transfer.optionId !== null) {
    const opt = data.transfers.find((tr) => tr.id === transfer.optionId);
    if (opt) {
      const price = parseFloat(
        effectivePrice("transfer", opt.id, opt.pricePerPerson, data.overrides)
      );
      const isFreeTransfer = price === 0;
      rows.push({
        label: isFreeTransfer ? `${getLocalName(opt, locale)} 🎁` : getLocalName(opt, locale),
        qty: "1",
        unitPrice: isFreeTransfer ? "€0.00" : fmtPrice(price),
        total: price,
      });
    }
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm th-text-2 text-center py-4">{t("noOrders")}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b th-border">
            <th className="pb-3 text-left text-xs font-medium th-text-2 uppercase tracking-wide">
              {t("item")}
            </th>
            <th className="pb-3 text-center text-xs font-medium th-text-2 uppercase tracking-wide">
              {t("quantity")}
            </th>
            <th className="pb-3 text-right text-xs font-medium th-text-2 uppercase tracking-wide">
              {t("unitPrice")}
            </th>
            <th className="pb-3 text-right text-xs font-medium th-text-2 uppercase tracking-wide">
              {t("total")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b th-border last:border-0">
              <td className="py-3 font-medium th-text pr-4">{row.label}</td>
              <td className="py-3 text-center th-text-2">{row.qty}</td>
              <td className="py-3 text-right th-text-2">{row.unitPrice}</td>
              <td className="py-3 text-right font-semibold th-text">
                {fmtPrice(row.total)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-navy">
            <td colSpan={3} className="pt-4 text-right font-bold th-text pr-4">
              {t("grandTotal")}
            </td>
            <td className="pt-4 text-right text-xl font-bold text-navy">
              {fmtPrice(grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
