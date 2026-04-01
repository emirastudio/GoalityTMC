"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ArrowLeft, Users, Check, Copy, MessageSquare, Plus, Trash2,
  AlertTriangle, Plane, Train, Bus, Car, Hotel, Utensils,
  Calendar, ExternalLink, ChevronDown, ChevronUp, Eye, EyeOff,
  Phone, Mail, MapPin, Clock, FileText, CreditCard, UserCheck, LogIn,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type TeamStatus = "draft" | "open" | "confirmed" | "cancelled";

interface TeamReport {
  team: {
    id: number; name: string; regNumber: number; status: TeamStatus; notes: string | null; hotelId: number | null;
    accomPlayers: number; accomStaff: number; accomAccompanying: number;
    accomCheckIn: string | null; accomCheckOut: string | null; accomNotes: string | null;
    accomDeclined: boolean; accomConfirmed: boolean;
  };
  club: {
    id: number; name: string; badgeUrl: string | null;
    contactName: string | null; contactEmail: string | null; contactPhone: string | null;
    country: string | null; city: string | null;
  } | null;
  class: { id: number; name: string; minBirthYear: number | null; maxBirthYear: number | null } | null;
  people: { all: Person[]; counts: { players: number; staff: number; accompanying: number; total: number } };
  package: { id: number; name: string; assignedAt: string; isPublished: boolean; accommodationOptionId: number | null; includeAccommodation: boolean; includeTransfer: boolean; includeRegistration: boolean; includeMeals: boolean; freePlayersCount: number; freeStaffCount: number; freeAccompanyingCount: number; mealsCountOverride: number | null } | null;
  bookings: Booking[];
  overrides: Override[];
  finance: { totalFromBookings: number; totalPaid: number; balance: number };
  payments: Payment[];
  travel: Travel | null;
  tournamentInfo: TournamentInfo | null;
  assignedHotel: AssignedHotel | null;
  availableHotels: { id: number; name: string; address: string | null }[];
  services: Services;
}

interface AssignedHotel {
  id: number;
  name: string;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
}

interface Person {
  id: number; personType: "player" | "staff" | "accompanying";
  firstName: string; lastName: string; dateOfBirth: string | null;
  position: string | null; isResponsible: boolean; role: string | null;
  allergies: string | null; dietaryRequirements: string | null; medicalNotes: string | null;
  needsHotel: boolean; needsTransfer: boolean; shirtNumber: number | null;
}

interface Booking {
  id: number; bookingType: string; serviceId: number;
  quantity: number; unitPrice: string; total: string; notes: string | null;
}

interface Override {
  id: number; serviceType: string; serviceId: number;
  customPrice: string | null; isDisabled: boolean; reason: string | null;
}

interface Payment {
  id: number; amount: string; currency: string; method: string;
  status: "pending" | "received" | "refunded";
  reference: string | null; notes: string | null;
  receivedAt: string | null; createdAt: string;
}

interface Travel {
  arrivalType: string | null; arrivalDate: string | null;
  arrivalTime: string | null; arrivalDetails: string | null;
  departureType: string | null; departureDate: string | null;
  departureTime: string | null; departureDetails: string | null;
}

interface TournamentInfo {
  scheduleUrl: string | null; hotelName: string | null; hotelAddress: string | null;
  hotelCheckIn: string | null; hotelCheckOut: string | null; hotelNotes: string | null;
  venueName: string | null; venueAddress: string | null; venueMapUrl: string | null;
  mealTimes: string | null; mealLocation: string | null; mealNotes: string | null;
  emergencyContact: string | null; emergencyPhone: string | null;
}

interface Services {
  accommodation: {
    id: number; name: string; checkIn: string | null; checkOut: string | null;
    pricePerPlayer: string; pricePerStaff: string; pricePerAccompanying: string;
    includedMeals: number; mealNote: string | null;
  }[];
  meals: { id: number; name: string; pricePerPerson: string; perDay: boolean; description: string | null }[];
  transfers: { id: number; name: string; pricePerPerson: string; description: string | null }[];
  registration: { id: number; name: string; price: string; isRequired: boolean }[];
}

interface ServicePackage { id: number; name: string; isDefault: boolean }

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<TeamStatus, string> = {
  draft: "bg-surface text-text-secondary border-border",
  open: "bg-emerald-50 text-emerald-700 border-emerald-200",
  confirmed: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

const PAYMENT_STATUS_BADGE: Record<string, "warning" | "success" | "error"> = {
  pending: "warning", received: "success", refunded: "error",
};

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer", cash: "Cash", stripe: "Stripe",
};

const TRANSPORT_ICONS: Record<string, React.ReactNode> = {
  airport: <Plane className="w-4 h-4" />,
  port: <Plane className="w-4 h-4" />,
  railway: <Train className="w-4 h-4" />,
  bus_station: <Bus className="w-4 h-4" />,
  own_bus: <Bus className="w-4 h-4" />,
};

const TRANSPORT_LABELS: Record<string, string> = {
  airport: "Airport", port: "Port", railway: "Railway station",
  bus_station: "Bus station", own_bus: "Own bus",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtEuro(v: number | string) {
  return `€${Number(v).toFixed(2)}`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function calcAge(dob: string | null) {
  if (!dob) return "—";
  const b = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return String(age);
}

function todayISO() { return new Date().toISOString().split("T")[0]; }

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatTile({ label, value, sub, detail, color = "default" }: {
  label: string; value: string | number; sub?: string; detail?: string;
  color?: "default" | "green" | "red" | "amber";
}) {
  const colors = {
    default: "border-border bg-surface/50",
    green: "border-emerald-200 bg-emerald-50",
    red: "border-red-200 bg-red-50",
    amber: "border-amber-200 bg-amber-50",
  };
  const textColors = {
    default: "text-text-primary",
    green: "text-emerald-700",
    red: "text-red-600",
    amber: "text-amber-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${textColors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-text-secondary mt-0.5">{sub}</p>}
      {detail && <p className="text-xs text-text-secondary/70 mt-1">{detail}</p>}
    </div>
  );
}

function SectionHeader({ label, count, open, onToggle }: {
  label: string; count: number; open: boolean; onToggle: () => void;
}) {
  return (
    <button onClick={onToggle}
      className="flex items-center gap-2 text-sm font-semibold text-text-primary hover:text-navy transition-colors cursor-pointer w-full text-left py-1">
      {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      {label}
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-surface border border-border text-xs font-medium text-text-secondary">
        {count}
      </span>
    </button>
  );
}

function InfoRow({ icon, label, value, href }: {
  icon: React.ReactNode; label: string; value: string | null | undefined; href?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="text-text-secondary mt-0.5 shrink-0">{icon}</span>
      <div>
        <span className="text-xs text-text-secondary block">{label}</span>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="text-navy hover:underline font-medium flex items-center gap-1">
            {value} <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-text-primary font-medium">{value}</span>
        )}
      </div>
    </div>
  );
}

function MedicalBadge({ allergies, dietary, medical }: {
  allergies: string | null; dietary: string | null; medical: string | null;
}) {
  if (!allergies && !dietary && !medical) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {allergies && (
        <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
          ⚠ {allergies}
        </span>
      )}
      {dietary && (
        <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
          🥗 {dietary}
        </span>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

// ─── PackagePricingCard ───────────────────────────────────────────────────────

interface PackagePricingCardProps {
  pkg: TeamReport["package"];
  packages: ServicePackage[];
  services: Services;
  overrides: Override[];
  selectedPackageId: string;
  assigningPackage: boolean;
  togglingPublish: boolean;
  teamId: string;
  onAssign: () => void;
  onRemove: () => void;
  onTogglePublish: () => void;
  onSelectPackage: (id: string) => void;
  onRefresh: () => void;
}

function PackagePricingCard({
  pkg, packages, services, overrides,
  selectedPackageId, assigningPackage, togglingPublish,
  teamId, onAssign, onRemove, onTogglePublish, onSelectPackage, onRefresh,
}: PackagePricingCardProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Free slots
  const [freePlayers, setFreePlayers] = useState(String(pkg?.freePlayersCount ?? 0));
  const [freeStaff, setFreeStaff] = useState(String(pkg?.freeStaffCount ?? 0));
  const [freeAccom, setFreeAccom] = useState(String(pkg?.freeAccompanyingCount ?? 0));
  const [mealsOverride, setMealsOverride] = useState<string>(
    pkg?.mealsCountOverride != null ? String(pkg.mealsCountOverride) : ""
  );
  const [savingFree, setSavingFree] = useState(false);
  const [savedFree, setSavedFree] = useState(false);

  async function saveFreeSlots() {
    setSavingFree(true);
    setSavedFree(false);
    try {
      await fetch(`/api/admin/teams/${teamId}/assign-package`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freePlayersCount: parseInt(freePlayers) || 0,
          freeStaffCount: parseInt(freeStaff) || 0,
          freeAccompanyingCount: parseInt(freeAccom) || 0,
          mealsCountOverride: mealsOverride === "" ? null : (parseInt(mealsOverride) || null),
        }),
      });
      await onRefresh();
      setSavedFree(true);
      setTimeout(() => setSavedFree(false), 2000);
    } finally {
      setSavingFree(false);
    }
  }
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingKey && inputRef.current) inputRef.current.focus();
  }, [editingKey]);

  function startEdit(key: string, currentPrice: string) {
    setEditingKey(key);
    setEditValue(currentPrice.replace("€", ""));
  }

  async function commitEdit(
    serviceType: "accommodation" | "meal" | "transfer" | "registration",
    serviceId: number,
    basePrice: number,
  ) {
    const existing = overrides.find(
      (o) => o.serviceType === serviceType && o.serviceId === serviceId
    );
    const newVal = parseFloat(editValue);
    setEditingKey(null);

    if (isNaN(newVal)) return;

    const key = `${serviceType}-${serviceId}`;
    setSavingKey(key);

    try {
      // If same as base → remove override (restore default)
      if (Math.abs(newVal - basePrice) < 0.001) {
        if (existing) {
          await fetch(`/api/admin/teams/${teamId}/overrides?id=${existing.id}`, { method: "DELETE" });
        }
      } else {
        // Delete old override first (if exists)
        if (existing) {
          await fetch(`/api/admin/teams/${teamId}/overrides?id=${existing.id}`, { method: "DELETE" });
        }
        // Create new override
        await fetch(`/api/admin/teams/${teamId}/overrides`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceType, serviceId, customPrice: newVal }),
        });
      }
      await onRefresh();
    } finally {
      setSavingKey(null);
    }
  }

  function handleKeyDown(
    e: React.KeyboardEvent,
    serviceType: "accommodation" | "meal" | "transfer" | "registration",
    serviceId: number,
    basePrice: number,
  ) {
    if (e.key === "Enter") commitEdit(serviceType, serviceId, basePrice);
    if (e.key === "Escape") setEditingKey(null);
  }

  function getOverride(serviceType: string, serviceId: number): Override | null {
    return overrides.find((o) => o.serviceType === serviceType && o.serviceId === serviceId) ?? null;
  }

  async function giftTransfer(serviceId: number) {
    const existing = overrides.find((o) => o.serviceType === "transfer" && o.serviceId === serviceId);
    const isAlreadyFree = existing && (parseFloat(existing.customPrice ?? "1") === 0);
    const key = `transfer-${serviceId}`;
    setSavingKey(key);
    try {
      if (existing) {
        await fetch(`/api/admin/teams/${teamId}/overrides?id=${existing.id}`, { method: "DELETE" });
      }
      if (!isAlreadyFree) {
        await fetch(`/api/admin/teams/${teamId}/overrides`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceType: "transfer", serviceId, customPrice: 0 }),
        });
      }
      await onRefresh();
    } finally {
      setSavingKey(null);
    }
  }

  function effectivePrice(serviceType: string, serviceId: number, basePrice: number): number {
    const ov = getOverride(serviceType, serviceId);
    if (ov?.customPrice) return parseFloat(ov.customPrice);
    return basePrice;
  }

  function PriceCell({
    rowKey, serviceType, serviceId, basePrice, unitLabel,
  }: {
    rowKey: string;
    serviceType: "accommodation" | "meal" | "transfer" | "registration";
    serviceId: number;
    basePrice: number;
    unitLabel?: string;
  }) {
    const ov = getOverride(serviceType, serviceId);
    const effPrice = effectivePrice(serviceType, serviceId, basePrice);
    const isEditing = editingKey === rowKey;
    const isSaving = savingKey === rowKey;
    const isCustom = !!ov?.customPrice;

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <span className="text-text-secondary text-sm">€</span>
          <input
            ref={inputRef}
            type="number"
            step="0.01"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => commitEdit(serviceType, serviceId, basePrice)}
            onKeyDown={(e) => handleKeyDown(e, serviceType, serviceId, basePrice)}
            className="w-24 rounded-lg border-2 border-navy px-2 py-1 text-sm font-semibold text-navy focus:outline-none tabular-nums"
          />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 group">
        <button
          onClick={() => startEdit(rowKey, fmtEuro(effPrice))}
          disabled={isSaving}
          className={`text-sm font-semibold tabular-nums rounded-lg px-2.5 py-1 border transition-all cursor-pointer ${
            isCustom
              ? "bg-navy/5 text-navy border-navy/30 hover:bg-navy/10"
              : "bg-transparent text-text-primary border-transparent hover:bg-surface hover:border-border"
          } disabled:opacity-50`}
        >
          {isSaving ? "…" : fmtEuro(effPrice)}
        </button>
        {isCustom && (
          <span className="text-xs text-text-secondary line-through opacity-60 hidden group-hover:inline">
            {fmtEuro(basePrice)}
          </span>
        )}
        {unitLabel && !isEditing && (
          <span className="text-xs text-text-secondary hidden group-hover:inline">{unitLabel}</span>
        )}
      </div>
    );
  }

  // Build which accommodation to show (package-linked or all, if included)
  const accomList = !pkg?.includeAccommodation
    ? []
    : pkg?.accommodationOptionId
    ? services.accommodation.filter((a) => a.id === pkg.accommodationOptionId)
    : services.accommodation;

  function fmtDateShort(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]}`;
  }

  return (
    <Card>
      {/* Header */}
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle>Package & Pricing</CardTitle>
          {pkg && (
            <div className="flex items-center gap-2">
              <button
                onClick={onTogglePublish}
                disabled={togglingPublish}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors cursor-pointer disabled:opacity-50 ${
                  pkg.isPublished
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                    : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                }`}
              >
                {pkg.isPublished
                  ? <><Eye className="w-3.5 h-3.5" />Published</>
                  : <><EyeOff className="w-3.5 h-3.5" />Hidden</>}
              </button>
              <Button variant="danger" size="sm" onClick={onRemove} disabled={assigningPackage}>Remove</Button>
            </div>
          )}
        </div>
      </CardHeader>

      {/* Assign selector */}
      <div className="flex gap-2 mb-5">
        <select
          value={selectedPackageId}
          onChange={(e) => onSelectPackage(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy appearance-none cursor-pointer"
        >
          <option value="">{pkg ? "Change package..." : "Assign package..."}</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>{p.name}{p.isDefault ? " (default)" : ""}</option>
          ))}
        </select>
        <Button onClick={onAssign} disabled={!selectedPackageId || assigningPackage} size="sm">
          {assigningPackage ? "..." : pkg ? "Change" : "Assign"}
        </Button>
      </div>

      {!pkg ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-sm text-text-secondary">No package assigned — team cannot open booking page</p>
        </div>
      ) : (
        <>
          {/* Pricing table */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left pb-2 text-xs font-medium text-text-secondary uppercase tracking-wide">Service</th>
                <th className="text-left pb-2 text-xs font-medium text-text-secondary uppercase tracking-wide">Conditions</th>
                <th className="text-right pb-2 text-xs font-medium text-text-secondary uppercase tracking-wide pr-1">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">

              {/* Registration */}
              {pkg.includeRegistration && services.registration.map((r) => {
                const ov = getOverride("registration", r.id);
                return (
                  <tr key={`reg-${r.id}`} className={`${ov?.isDisabled ? "opacity-40" : ""}`}>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-text-secondary shrink-0" />
                        <span className="text-sm font-medium text-text-primary">{r.name}</span>
                        {r.isRequired && <span className="text-xs text-text-secondary bg-surface border border-border rounded px-1.5">req.</span>}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-text-secondary">1 × per team</td>
                    <td className="py-2.5 text-right">
                      {PriceCell({ rowKey: `registration-${r.id}`, serviceType: "registration", serviceId: r.id, basePrice: parseFloat(r.price) })}
                    </td>
                  </tr>
                );
              })}

              {/* Accommodation */}
              {accomList.map((a) => {
                const ov = getOverride("accommodation", a.id);
                const dateRange = (a.checkIn && a.checkOut)
                  ? `${fmtDateShort(a.checkIn)} – ${fmtDateShort(a.checkOut)}`
                  : "";
                return (
                  <tr key={`accom-${a.id}`} className={`${ov?.isDisabled ? "opacity-40" : ""}`}>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <Hotel className="w-3.5 h-3.5 text-text-secondary shrink-0" />
                        <span className="text-sm font-medium text-text-primary">{a.name}</span>
                        {a.includedMeals > 0 && (
                          <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5">{a.includedMeals} meals</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="text-xs text-text-secondary space-y-0.5">
                        {dateRange && <div>{dateRange}</div>}
                        <div>
                          Players {fmtEuro(parseFloat(a.pricePerPlayer))}
                          {" · "}Staff {fmtEuro(parseFloat(a.pricePerStaff))}
                          {parseFloat(a.pricePerAccompanying) > 0 && ` · Accomp. ${fmtEuro(parseFloat(a.pricePerAccompanying))}`}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 text-right">
                      {PriceCell({ rowKey: `accommodation-${a.id}`, serviceType: "accommodation", serviceId: a.id, basePrice: parseFloat(a.pricePerPlayer), unitLabel: "per person" })}
                      {ov?.customPrice && (
                        <div className="text-xs text-text-secondary text-right mt-0.5">all types</div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Transfers */}
              {pkg.includeTransfer && services.transfers.map((t) => {
                const ov = getOverride("transfer", t.id);
                return (
                  <tr key={`tr-${t.id}`} className={`${ov?.isDisabled ? "opacity-40" : ""}`}>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <Car className="w-3.5 h-3.5 text-text-secondary shrink-0" />
                        <span className="text-sm font-medium text-text-primary">{t.name}</span>
                      </div>
                      {t.description && <div className="text-xs text-text-secondary mt-0.5 ml-5">{t.description}</div>}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-text-secondary">Per team</td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {PriceCell({ rowKey: `transfer-${t.id}`, serviceType: "transfer", serviceId: t.id, basePrice: parseFloat(t.pricePerPerson) })}
                        <button
                          onClick={() => giftTransfer(t.id)}
                          title={effectivePrice("transfer", t.id, parseFloat(t.pricePerPerson)) === 0 ? "Remove gift — restore price" : "Gift this transfer (set to free)"}
                          className={`text-xs px-2 py-1 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                            effectivePrice("transfer", t.id, parseFloat(t.pricePerPerson)) === 0
                              ? "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                              : "bg-surface border-border text-text-secondary hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"
                          }`}
                        >
                          🎁
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Extra meals */}
              {pkg.includeMeals && services.meals.map((m) => {
                const ov = getOverride("meal", m.id);
                return (
                  <tr key={`meal-${m.id}`} className={`${ov?.isDisabled ? "opacity-40" : ""}`}>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <Utensils className="w-3.5 h-3.5 text-text-secondary shrink-0" />
                        <span className="text-sm font-medium text-text-primary">{m.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-text-secondary">
                      {m.perDay ? "Per person / day" : "Per person"}
                    </td>
                    <td className="py-2.5 text-right">
                      {PriceCell({ rowKey: `meal-${m.id}`, serviceType: "meal", serviceId: m.id, basePrice: parseFloat(m.pricePerPerson) })}
                    </td>
                  </tr>
                );
              })}

            </tbody>
          </table>

          <p className="text-xs text-text-secondary mt-3 italic">
            Click any price to edit. Press Enter to save, Esc to cancel. Base price restores on clear.
          </p>

          {/* ── Free Slots ── */}
          <div className="mt-5 pt-5 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">Free slots</p>
                <p className="text-xs text-text-secondary">Complimentary places (visible to the team)</p>
              </div>
              <button
                onClick={saveFreeSlots}
                disabled={savingFree}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-navy text-white hover:bg-navy/90 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {savingFree ? "Saving…" : savedFree ? "✓ Saved" : "Save"}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Players", value: freePlayers, set: setFreePlayers, placeholder: undefined, isText: false },
                { label: "Staff / Coaches", value: freeStaff, set: setFreeStaff, placeholder: undefined, isText: false },
                { label: "Accompanying", value: freeAccom, set: setFreeAccom, placeholder: undefined, isText: false },
                { label: "Meals in package", value: mealsOverride, set: setMealsOverride, placeholder: "default", isText: true },
              ].map(({ label, value, set, placeholder, isText }) => (
                <div key={label}>
                  <label className="block text-xs text-text-secondary mb-1">{label}</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={value}
                      placeholder={placeholder}
                      onChange={(e) => {
                        if (isText) {
                          setMealsOverride(e.target.value);
                        } else {
                          set(String(parseInt(e.target.value) || 0));
                        }
                      }}
                      className="w-16 rounded-lg border border-border px-2 py-1.5 text-sm font-semibold text-center focus:outline-none focus:border-navy"
                    />
                    {!isText && <span className="text-xs text-text-secondary">free</span>}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-text-secondary mt-1">Leave meals empty to use default (from accommodation option)</p>
            {(parseInt(freePlayers) > 0 || parseInt(freeStaff) > 0 || parseInt(freeAccom) > 0) && (
              <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
                The team will see: {[
                  parseInt(freePlayers) > 0 ? `${freePlayers} free player${parseInt(freePlayers) > 1 ? "s" : ""}` : null,
                  parseInt(freeStaff) > 0 ? `${freeStaff} free staff` : null,
                  parseInt(freeAccom) > 0 ? `${freeAccom} free accompanying` : null,
                ].filter(Boolean).join(", ")}
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminTeamDetailPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const router = useRouter();
  const locale = useLocale();

  const [report, setReport] = useState<TeamReport | null>(null);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Notes
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Status
  const [savingStatus, setSavingStatus] = useState(false);

  // Package
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [assigningPackage, setAssigningPackage] = useState(false);
  const [togglingPublish, setTogglingPublish] = useState(false);


  // Section toggles
  const [showPlayers, setShowPlayers] = useState(true);
  const [showStaff, setShowStaff] = useState(true);
  const [showAccompanying, setShowAccompanying] = useState(false);
  const [showPayments, setShowPayments] = useState(true);

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentStatus, setPaymentStatus] = useState("received");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const [copied, setCopied] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ─── Fetch ───────────────────────────────────────────────────────────────

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/report`);
      if (!res.ok) { setError("Team not found"); return; }
      const data: TeamReport = await res.json();
      setReport(data);
      setNotes(data.team.notes ?? "");
    } catch {
      setError("Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  const fetchPackages = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/packages");
      if (res.ok) { const d = await res.json(); setPackages(Array.isArray(d) ? d : []); }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchReport(); fetchPackages(); }, [fetchReport, fetchPackages]);
  useEffect(() => { if (report?.package) setSelectedPackageId(String(report.package.id)); }, [report?.package]);

  // ─── Mutations ───────────────────────────────────────────────────────────

  async function handleStatusChange(newStatus: TeamStatus) {
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) await fetchReport();
    } finally { setSavingStatus(false); }
  }

  function handleNotesBlur() {
    if (!report || notes === (report.team.notes ?? "")) return;
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(async () => {
      setSavingNotes(true);
      try {
        await fetch(`/api/admin/teams/${teamId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        });
        await fetchReport();
      } finally { setSavingNotes(false); }
    }, 300);
  }

  async function handleAssignPackage() {
    if (!selectedPackageId) return;
    setAssigningPackage(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/assign-package`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: Number(selectedPackageId) }),
      });
      if (res.ok) await fetchReport();
    } finally { setAssigningPackage(false); }
  }

  async function handleRemovePackage() {
    setAssigningPackage(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/assign-package`, { method: "DELETE" });
      if (res.ok) { setSelectedPackageId(""); await fetchReport(); }
    } finally { setAssigningPackage(false); }
  }

  async function handleTogglePublish() {
    if (!report?.package) return;
    setTogglingPublish(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/assign-package`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !report.package.isPublished }),
      });
      if (res.ok) await fetchReport();
    } finally { setTogglingPublish(false); }
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentAmount) return;
    setSubmittingPayment(true);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: Number(teamId), amount: Number(paymentAmount),
          method: paymentMethod, status: paymentStatus,
          reference: paymentReference || null, notes: paymentNotes || null,
          receivedAt: paymentDate || null,
        }),
      });
      if (res.ok) { setShowPaymentModal(false); resetPaymentForm(); await fetchReport(); }
    } finally { setSubmittingPayment(false); }
  }

  function resetPaymentForm() {
    setPaymentAmount(""); setPaymentMethod("bank_transfer"); setPaymentStatus("received");
    setPaymentReference(""); setPaymentNotes(""); setPaymentDate(todayISO());
  }

  async function handleCopyInvite() {
    if (!report?.club) return;
    try {
      const res = await fetch("/api/admin/generate-invite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: report.club.id }),
      });
      const data = await res.json();
      if (data.inviteUrl) {
        await navigator.clipboard.writeText(data.inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch { /* silent */ }
  }

  async function handleLoginAs() {
    if (!report?.club) return;
    setLoggingIn(true);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: report.club.id }),
      });
      if (res.ok) {
        router.push(`/${locale}/team/overview`);
      }
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleDeleteTeam() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, { method: "DELETE" });
      if (res.ok) {
        router.push(`/${locale}/admin/teams`);
      }
    } catch { /* silent */ } finally {
      setDeleting(false);
    }
  }

  // ─── Loading / Error ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-40 bg-surface rounded" />
        <div className="h-32 bg-surface rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-surface rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48 bg-surface rounded-xl" />
          <div className="h-48 bg-surface rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.push(`/${locale}/admin/teams`)}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-navy cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back to Teams
        </button>
        <Alert variant="error">{error ?? "Team not found"}</Alert>
      </div>
    );
  }

  const { team, club, class: teamClass, people, finance, payments, travel, tournamentInfo: tInfo, assignedHotel, availableHotels, services, overrides } = report;
  const players = people.all.filter((p) => p.personType === "player");
  const staff = people.all.filter((p) => p.personType === "staff");
  const accompanying = people.all.filter((p) => p.personType === "accompanying");

  const hasMedical = people.all.some((p) => p.allergies || p.dietaryRequirements || p.medicalNotes);
  const medicalPeople = people.all.filter((p) => p.allergies || p.dietaryRequirements || p.medicalNotes);
  const allStatuses: TeamStatus[] = ["draft", "open", "confirmed", "cancelled"];

  // Booking summary helpers
  function resolveServiceName(type: string, id: number): string {
    if (!services) return `#${id}`;
    if (type === "accommodation") return services.accommodation.find((a) => a.id === id)?.name ?? `#${id}`;
    if (type === "meal") return services.meals.find((m) => m.id === id)?.name ?? `#${id}`;
    if (type === "transfer") return services.transfers.find((t) => t.id === id)?.name ?? `#${id}`;
    if (type === "registration") return services.registration.find((r) => r.id === id)?.name ?? "Registration";
    return `#${id}`;
  }

  // Services options for override form
  function getServiceOptions(type: string) {
    if (!services) return [];
    if (type === "accommodation") return services.accommodation;
    if (type === "meal") return services.meals;
    if (type === "transfer") return services.transfers;
    if (type === "registration") return services.registration;
    return [];
  }

  const balanceColor = finance.balance <= 0 ? "green" : "red";

  return (
    <div className="space-y-5">

      {/* ── Back nav ── */}
      <button onClick={() => router.push(`/${locale}/admin/teams`)}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-navy transition-colors cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> All Teams
      </button>

      {/* ══════════════════════════════════════════════════════════════════
          CARD 1 — Team Identity
      ══════════════════════════════════════════════════════════════════ */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Left: badge + info */}
          <div className="flex items-start gap-4">
            {club?.badgeUrl ? (
              <img src={club.badgeUrl} alt={club.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-border shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center border-2 border-border shrink-0">
                <Users className="w-7 h-7 text-text-secondary" />
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-text-primary">{team.name}</h1>
                <span className="text-lg font-semibold text-text-secondary">#{team.regNumber}</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[team.status]}`}>
                  {team.status.charAt(0).toUpperCase() + team.status.slice(1)}
                </span>
              </div>
              {club && (
                <p className="text-sm text-text-secondary">
                  {club.name}
                  {club.city ? ` · ${club.city}` : ""}
                  {club.country ? `, ${club.country}` : ""}
                </p>
              )}
              {teamClass && (
                <p className="text-xs text-text-secondary mt-0.5">
                  Class: <span className="font-semibold text-text-primary">{teamClass.name}</span>
                  {(teamClass.minBirthYear || teamClass.maxBirthYear) &&
                    ` (${teamClass.minBirthYear ?? ""}–${teamClass.maxBirthYear ?? ""})`}
                </p>
              )}
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status dropdown */}
            <select value={team.status} onChange={(e) => handleStatusChange(e.target.value as TeamStatus)}
              disabled={savingStatus}
              className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy appearance-none cursor-pointer disabled:opacity-50">
              {allStatuses.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>

            {/* Copy login link */}
            <Button variant="secondary" size="sm" onClick={handleCopyInvite} disabled={!club}>
              {copied ? <><Check className="w-4 h-4 text-success" /><span className="text-success">Copied!</span></>
                : <><Copy className="w-4 h-4" />Login link</>}
            </Button>

            {/* Login as club */}
            <Button
              size="sm"
              onClick={handleLoginAs}
              disabled={!club || loggingIn}
              className="bg-amber-500 hover:bg-amber-600 text-white border-0"
            >
              <LogIn className="w-4 h-4" />
              {loggingIn ? "..." : "Login as"}
            </Button>

            {/* Send message */}
            <Button variant="secondary" size="sm" onClick={() => router.push(`/${locale}/admin/messages`)}>
              <MessageSquare className="w-4 h-4" /> Message
            </Button>

            {/* Schedule link */}
            {tInfo?.scheduleUrl && (
              <a href={tInfo.scheduleUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="sm">
                  <Calendar className="w-4 h-4" /> Schedule
                </Button>
              </a>
            )}

            {/* Delete team */}
            {confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-error font-medium">Delete team?</span>
                <button
                  onClick={handleDeleteTeam}
                  disabled={deleting}
                  className="text-xs font-semibold text-error border border-error/40 bg-red-50 hover:bg-red-100 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Yes, delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-text-secondary hover:text-text-primary cursor-pointer px-1.5 py-1.5"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-error border border-border hover:border-error/40 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>
        </div>

        {/* Contact info */}
        {club && (club.contactName || club.contactEmail || club.contactPhone) && (
          <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-x-6 gap-y-2">
            {club.contactName && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <UserCheck className="w-4 h-4" />
                <span className="font-medium text-text-primary">{club.contactName}</span>
              </div>
            )}
            {club.contactEmail && (
              <a href={`mailto:${club.contactEmail}`}
                className="flex items-center gap-2 text-sm text-navy hover:underline">
                <Mail className="w-4 h-4" />
                {club.contactEmail}
              </a>
            )}
            {club.contactPhone && (
              <a href={`tel:${club.contactPhone}`}
                className="flex items-center gap-2 text-sm text-text-secondary hover:text-navy">
                <Phone className="w-4 h-4" />
                {club.contactPhone}
              </a>
            )}
          </div>
        )}
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
          STATS ROW
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Players" value={people.counts.players} sub={`+ ${people.counts.staff} staff`} />
        <StatTile
          label="Accommodation"
          value={(() => {
            const t = team;
            if (t.accomDeclined) return "No hotel";
            if (t.accomConfirmed) {
              const total = (t.accomPlayers ?? 0) + (t.accomStaff ?? 0) + (t.accomAccompanying ?? 0);
              return `${total} place${total !== 1 ? "s" : ""}`;
            }
            return "—";
          })()}
          sub={(() => {
            const t = team;
            if (t.accomDeclined) return "declined";
            if (t.accomConfirmed) {
              const parts = [];
              if (t.accomCheckIn) parts.push(t.accomCheckIn);
              if (t.accomCheckOut) parts.push(t.accomCheckOut);
              return parts.length ? parts.join(" → ") : "confirmed";
            }
            return "not answered";
          })()}
          detail={(() => {
            const t = team;
            if (!t.accomConfirmed) return undefined;
            const parts: string[] = [];
            if (t.accomPlayers) parts.push(`${t.accomPlayers} players`);
            if (t.accomStaff) parts.push(`${t.accomStaff} staff`);
            if (t.accomAccompanying) parts.push(`${t.accomAccompanying} accompanying`);
            return parts.length ? parts.join(" + ") : undefined;
          })()}
          color={team.accomConfirmed ? "green" : team.accomDeclined ? "default" : "default"}
        />
        <StatTile
          label="Package"
          value={report.package ? report.package.name : "—"}
          sub={report.package?.isPublished ? "✓ Published" : report.package ? "⚠ Not published" : "Not assigned"}
          color={report.package?.isPublished ? "green" : report.package ? "amber" : "default"}
        />
        <StatTile
          label="Balance"
          value={fmtEuro(Math.abs(finance.balance))}
          sub={finance.balance <= 0 ? "Paid in full" : `${fmtEuro(finance.balance)} outstanding`}
          color={balanceColor}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ROW 2: Bookings + Finance summary
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Booking Summary */}
        <Card>
          <CardHeader><CardTitle>Booking Summary</CardTitle></CardHeader>
          {report.bookings.length === 0 ? (
            <p className="text-sm text-text-secondary italic">No bookings saved yet.</p>
          ) : (
            <div className="space-y-2">
              {(() => {
                // Group accommodation bookings
                const accRows = report.bookings.filter((b) => b.bookingType === "accommodation");
                const otherRows = report.bookings.filter((b) => b.bookingType !== "accommodation");
                const accTotal = accRows.reduce((s, b) => s + Number(b.total), 0);

                return (
                  <>
                    {accRows.length > 0 && (
                      <div className="rounded-lg border border-border overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2.5 bg-surface/50">
                          <div className="flex items-center gap-2">
                            <Hotel className="w-4 h-4 text-text-secondary" />
                            <span className="text-sm font-medium text-text-primary">
                              {resolveServiceName("accommodation", accRows[0].serviceId)}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-navy">{fmtEuro(accTotal)}</span>
                        </div>
                        <div className="px-3 py-2 space-y-1">
                          {accRows.map((b) => (
                            <div key={b.id} className="flex justify-between text-xs text-text-secondary">
                              <span className="capitalize">{b.notes ?? "persons"} × {fmtEuro(b.unitPrice)}</span>
                              <span>{b.quantity} ppl → {fmtEuro(b.total)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {otherRows.map((b) => {
                      const icons: Record<string, React.ReactNode> = {
                        transfer: <Car className="w-4 h-4 text-text-secondary" />,
                        meal: <Utensils className="w-4 h-4 text-text-secondary" />,
                        registration: <FileText className="w-4 h-4 text-text-secondary" />,
                      };
                      return (
                        <div key={b.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            {icons[b.bookingType] ?? <FileText className="w-4 h-4 text-text-secondary" />}
                            <div>
                              <span className="text-sm font-medium text-text-primary">
                                {resolveServiceName(b.bookingType, b.serviceId)}
                              </span>
                              {b.quantity > 1 && (
                                <span className="text-xs text-text-secondary ml-2">× {b.quantity}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-navy">{fmtEuro(b.total)}</span>
                        </div>
                      );
                    })}

                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <span className="text-sm font-semibold text-text-primary">Grand Total</span>
                      <span className="text-lg font-bold text-navy">{fmtEuro(finance.totalFromBookings)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </Card>

        {/* Finance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Finance</CardTitle>
              <Button size="sm" onClick={() => setShowPaymentModal(true)}>
                <Plus className="w-4 h-4" /> Add Payment
              </Button>
            </div>
          </CardHeader>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg border border-border bg-surface/50 p-3 text-center">
              <p className="text-xs text-text-secondary">Ordered</p>
              <p className="text-lg font-bold text-text-primary">{fmtEuro(finance.totalFromBookings)}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
              <p className="text-xs text-text-secondary">Paid</p>
              <p className="text-lg font-bold text-emerald-700">{fmtEuro(finance.totalPaid)}</p>
            </div>
            <div className={`rounded-lg border p-3 text-center ${
              finance.balance <= 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
            }`}>
              <p className="text-xs text-text-secondary">Balance</p>
              <p className={`text-lg font-bold ${finance.balance <= 0 ? "text-emerald-700" : "text-red-600"}`}>
                {finance.balance > 0 ? "-" : ""}{fmtEuro(Math.abs(finance.balance))}
              </p>
            </div>
          </div>

          {/* Payment history (compact) */}
          {payments.length > 0 && (
            <div>
              <button onClick={() => setShowPayments(!showPayments)}
                className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-navy cursor-pointer mb-2">
                {showPayments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Payment history ({payments.length})
              </button>
              {showPayments && (
                <div className="space-y-1.5">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={PAYMENT_STATUS_BADGE[p.status] ?? "default"}>
                          {p.status}
                        </Badge>
                        <span className="text-text-secondary text-xs">{fmtDate(p.receivedAt ?? p.createdAt)}</span>
                        <span className="text-text-secondary text-xs">{METHOD_LABELS[p.method] ?? p.method}</span>
                      </div>
                      <span className="font-semibold tabular-nums text-text-primary">{fmtEuro(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {payments.length === 0 && (
            <p className="text-xs text-text-secondary italic">No payments recorded yet.</p>
          )}
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ACCOMMODATION PRE-BOOKING
      ══════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>🏨 Accommodation Pre-Booking</CardTitle>
            {team.accomConfirmed ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-300">
                ✅ Confirmed
              </span>
            ) : team.accomDeclined ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border bg-surface text-text-secondary border-border">
                Declined
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-300">
                ⏳ Pending
              </span>
            )}
          </div>
        </CardHeader>
        {team.accomConfirmed ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-surface/50 p-3">
              <p className="text-xs text-text-secondary">Players</p>
              <p className="text-xl font-bold text-text-primary">{team.accomPlayers}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface/50 p-3">
              <p className="text-xs text-text-secondary">Staff</p>
              <p className="text-xl font-bold text-text-primary">{team.accomStaff}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface/50 p-3">
              <p className="text-xs text-text-secondary">Accompanying</p>
              <p className="text-xl font-bold text-text-primary">{team.accomAccompanying}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface/50 p-3">
              <p className="text-xs text-text-secondary">Total beds</p>
              <p className="text-xl font-bold text-navy">{team.accomPlayers + team.accomStaff + team.accomAccompanying}</p>
            </div>
          </div>
        ) : team.accomDeclined ? (
          <p className="text-sm text-text-secondary italic">Команда отказалась от проживания в отеле.</p>
        ) : (
          <p className="text-sm text-text-secondary italic">Команда ещё не ответила на вопрос о проживании.</p>
        )}
        {team.accomConfirmed && (team.accomCheckIn || team.accomCheckOut) && (
          <div className="mt-3 flex gap-6 text-sm">
            {team.accomCheckIn && (
              <div>
                <span className="text-xs text-text-secondary block">Check-in</span>
                <span className="font-semibold text-text-primary">{team.accomCheckIn}</span>
              </div>
            )}
            {team.accomCheckOut && (
              <div>
                <span className="text-xs text-text-secondary block">Check-out</span>
                <span className="font-semibold text-text-primary">{team.accomCheckOut}</span>
              </div>
            )}
          </div>
        )}
        {team.accomConfirmed && team.accomNotes && (
          <div className="mt-3 rounded-lg bg-surface border border-border p-3 text-sm text-text-secondary">
            <span className="text-xs font-semibold text-text-secondary block mb-1">Special requests</span>
            {team.accomNotes}
          </div>
        )}
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
          ROW 3: Package & Pricing + Hotel & Logistics
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Package & Pricing */}
        <PackagePricingCard
          pkg={report.package}
          packages={packages}
          services={services}
          overrides={overrides}
          selectedPackageId={selectedPackageId}
          assigningPackage={assigningPackage}
          togglingPublish={togglingPublish}
          teamId={teamId}
          onAssign={handleAssignPackage}
          onRemove={handleRemovePackage}
          onTogglePublish={handleTogglePublish}
          onSelectPackage={setSelectedPackageId}
          onRefresh={fetchReport}
        />

        {/* Hotel & Logistics */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Hotel & Logistics</CardTitle>
              {tInfo?.scheduleUrl && (
                <a href={tInfo.scheduleUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="sm">
                    <ExternalLink className="w-3.5 h-3.5" /> Match Schedule
                  </Button>
                </a>
              )}
            </div>
          </CardHeader>

          <div className="space-y-5">
              {/* Hotel assignment */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-3 flex items-center gap-1.5">
                  <Hotel className="w-3.5 h-3.5" /> Отель команды
                </h4>
                {availableHotels.length === 0 ? (
                  <p className="text-sm text-text-secondary italic">
                    Отели не добавлены.{" "}
                    <button onClick={() => router.push(`/${locale}/admin/tournaments`)}
                      className="text-navy hover:underline cursor-pointer">Добавить в турнире</button>
                  </p>
                ) : (
                  <div className="space-y-3">
                    <select
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-white focus:outline-none focus:border-navy"
                      value={team.hotelId ?? ""}
                      onChange={async (e) => {
                        const val = e.target.value;
                        await fetch(`/api/admin/teams/${teamId}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ hotelId: val ? Number(val) : null }),
                        });
                        fetchReport();
                      }}
                    >
                      <option value="">— Не назначен —</option>
                      {availableHotels.map((h) => (
                        <option key={h.id} value={h.id}>{h.name}{h.address ? ` · ${h.address}` : ""}</option>
                      ))}
                    </select>
                    {assignedHotel && (
                      <div className="rounded-lg bg-navy/5 border border-navy/15 p-3 space-y-1.5">
                        <p className="text-sm font-semibold text-navy">{assignedHotel.name}</p>
                        {assignedHotel.address && <p className="text-xs text-text-secondary">{assignedHotel.address}</p>}
                        {assignedHotel.contactName && <p className="text-xs text-text-secondary">Контакт: {assignedHotel.contactName}</p>}
                        {assignedHotel.contactPhone && <a href={`tel:${assignedHotel.contactPhone}`} className="text-xs text-navy hover:underline block">{assignedHotel.contactPhone}</a>}
                        {assignedHotel.contactEmail && <p className="text-xs text-text-secondary">{assignedHotel.contactEmail}</p>}
                        {assignedHotel.notes && <p className="text-xs text-text-secondary italic">{assignedHotel.notes}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {tInfo && <>

              {/* Meals */}
              {(tInfo.mealTimes || tInfo.mealLocation || tInfo.mealNotes) && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-3 flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5" /> Meals
                  </h4>
                  <div className="space-y-2">
                    <InfoRow icon={<Clock className="w-4 h-4" />} label="Meal times" value={tInfo.mealTimes} />
                    <InfoRow icon={<MapPin className="w-4 h-4" />} label="Location" value={tInfo.mealLocation} />
                    {tInfo.mealNotes && (
                      <div className="rounded-lg bg-surface border border-border p-2.5 text-xs text-text-secondary">
                        {tInfo.mealNotes}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Venue */}
              {(tInfo.venueName || tInfo.venueAddress) && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-3 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Venue
                  </h4>
                  <div className="space-y-2">
                    <InfoRow icon={<MapPin className="w-4 h-4" />} label="Venue" value={tInfo.venueName} />
                    <InfoRow icon={<MapPin className="w-4 h-4" />} label="Address" value={tInfo.venueAddress}
                      href={tInfo.venueMapUrl ?? undefined} />
                  </div>
                </div>
              )}

              {/* Emergency */}
              {(tInfo.emergencyContact || tInfo.emergencyPhone) && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-3 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Emergency Contact
                  </h4>
                  <div className="space-y-2">
                    <InfoRow icon={<UserCheck className="w-4 h-4" />} label="Name" value={tInfo.emergencyContact} />
                    <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={tInfo.emergencyPhone}
                      href={tInfo.emergencyPhone ? `tel:${tInfo.emergencyPhone}` : undefined} />
                  </div>
                </div>
              )}

              </>}
            </div>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ROW 4: Travel
      ══════════════════════════════════════════════════════════════════ */}
      {travel && (travel.arrivalType || travel.departureType) && (
        <Card>
          <CardHeader><CardTitle>Travel</CardTitle></CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Arrival */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-3">Arrival</h4>
              {travel.arrivalType ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    {TRANSPORT_ICONS[travel.arrivalType] ?? <Plane className="w-4 h-4" />}
                    <span>{TRANSPORT_LABELS[travel.arrivalType] ?? travel.arrivalType}</span>
                  </div>
                  {travel.arrivalDate && (
                    <p className="text-sm text-text-secondary">
                      {fmtDate(travel.arrivalDate)}{travel.arrivalTime && ` at ${travel.arrivalTime}`}
                    </p>
                  )}
                  {travel.arrivalDetails && (
                    <p className="text-sm font-medium text-text-primary">{travel.arrivalDetails}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-text-secondary italic">Not specified</p>
              )}
            </div>

            {/* Departure */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-3">Departure</h4>
              {travel.departureType ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    {TRANSPORT_ICONS[travel.departureType] ?? <Plane className="w-4 h-4" />}
                    <span>{TRANSPORT_LABELS[travel.departureType] ?? travel.departureType}</span>
                  </div>
                  {travel.departureDate && (
                    <p className="text-sm text-text-secondary">
                      {fmtDate(travel.departureDate)}{travel.departureTime && ` at ${travel.departureTime}`}
                    </p>
                  )}
                  {travel.departureDetails && (
                    <p className="text-sm font-medium text-text-primary">{travel.departureDetails}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-text-secondary italic">Not specified</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PEOPLE
      ══════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>People</CardTitle>
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <span>{people.counts.players} players</span>
              <span>·</span>
              <span>{people.counts.staff} staff</span>
              {people.counts.accompanying > 0 && (
                <><span>·</span><span>{people.counts.accompanying} accompanying</span></>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Medical alert */}
        {hasMedical && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4" /> Medical / Dietary ({medicalPeople.length} persons)
            </p>
            <div className="space-y-1">
              {medicalPeople.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-medium text-amber-900">{p.firstName} {p.lastName}</span>
                  {p.allergies && <span className="bg-white border border-amber-200 rounded-full px-2 py-0.5 text-amber-700">⚠ {p.allergies}</span>}
                  {p.dietaryRequirements && <span className="bg-white border border-blue-200 rounded-full px-2 py-0.5 text-blue-700">🥗 {p.dietaryRequirements}</span>}
                  {p.medicalNotes && <span className="bg-white border border-red-200 rounded-full px-2 py-0.5 text-red-600">💊 {p.medicalNotes}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-5">
          {/* Players */}
          {players.length > 0 && (
            <div>
              <SectionHeader label="Players" count={players.length} open={showPlayers} onToggle={() => setShowPlayers(!showPlayers)} />
              {showPlayers && (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["#", "Name", "DOB / Age", "Pos", "Hotel", "Transfer"].map((h, i) => (
                          <th key={i} className="text-left pb-2 pr-3 text-xs font-medium text-text-secondary whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((p, i) => (
                        <tr key={p.id} className={`border-b border-border last:border-0 ${(p.allergies || p.dietaryRequirements) ? "bg-amber-50/60" : ""}`}>
                          <td className="py-2.5 pr-3 text-text-secondary tabular-nums">{p.shirtNumber ?? i + 1}</td>
                          <td className="py-2.5 pr-3 font-medium text-text-primary whitespace-nowrap">
                            {p.firstName} {p.lastName}
                            {(p.allergies || p.dietaryRequirements) && (
                              <AlertTriangle className="inline w-3.5 h-3.5 text-amber-500 ml-1" />
                            )}
                          </td>
                          <td className="py-2.5 pr-3 text-text-secondary text-xs whitespace-nowrap">
                            {p.dateOfBirth ? (
                              <>{fmtDate(p.dateOfBirth)} <span className="opacity-60">({calcAge(p.dateOfBirth)}y)</span></>
                            ) : "—"}
                          </td>
                          <td className="py-2.5 pr-3 text-text-secondary text-xs">{p.position ?? "—"}</td>
                          <td className="py-2.5 pr-3 text-xs">
                            {p.needsHotel ? <span className="text-emerald-600 font-medium">✓</span> : <span className="text-text-secondary">—</span>}
                          </td>
                          <td className="py-2.5 text-xs">
                            {p.needsTransfer ? <span className="text-emerald-600 font-medium">✓</span> : <span className="text-text-secondary">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Staff */}
          {staff.length > 0 && (
            <div>
              <SectionHeader label="Staff" count={staff.length} open={showStaff} onToggle={() => setShowStaff(!showStaff)} />
              {showStaff && (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Name", "Role", "Hotel", "Transfer"].map((h, i) => (
                          <th key={i} className="text-left pb-2 pr-3 text-xs font-medium text-text-secondary">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((p) => (
                        <tr key={p.id} className="border-b border-border last:border-0">
                          <td className="py-2.5 pr-3 font-medium text-text-primary whitespace-nowrap">
                            {p.firstName} {p.lastName}
                            {p.isResponsible && <Badge variant="info" className="ml-2">Responsible</Badge>}
                          </td>
                          <td className="py-2.5 pr-3 text-text-secondary text-xs">{p.role ?? p.position ?? "—"}</td>
                          <td className="py-2.5 pr-3 text-xs">
                            {p.needsHotel ? <span className="text-emerald-600 font-medium">✓</span> : <span className="text-text-secondary">—</span>}
                          </td>
                          <td className="py-2.5 text-xs">
                            {p.needsTransfer ? <span className="text-emerald-600 font-medium">✓</span> : <span className="text-text-secondary">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Accompanying */}
          {accompanying.length > 0 && (
            <div>
              <SectionHeader label="Accompanying" count={accompanying.length} open={showAccompanying} onToggle={() => setShowAccompanying(!showAccompanying)} />
              {showAccompanying && (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Name", "Hotel", "Transfer"].map((h, i) => (
                          <th key={i} className="text-left pb-2 pr-3 text-xs font-medium text-text-secondary">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {accompanying.map((p) => (
                        <tr key={p.id} className="border-b border-border last:border-0">
                          <td className="py-2.5 pr-3 font-medium text-text-primary">{p.firstName} {p.lastName}</td>
                          <td className="py-2.5 pr-3 text-xs">
                            {p.needsHotel ? <span className="text-emerald-600 font-medium">✓</span> : <span className="text-text-secondary">—</span>}
                          </td>
                          <td className="py-2.5 text-xs">
                            {p.needsTransfer ? <span className="text-emerald-600 font-medium">✓</span> : <span className="text-text-secondary">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {people.counts.total === 0 && (
            <p className="text-sm text-text-secondary italic">No people registered yet.</p>
          )}
        </div>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
          Admin Notes
      ══════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Admin Notes</CardTitle>
            {savingNotes && <span className="text-xs text-text-secondary">Saving...</span>}
          </div>
        </CardHeader>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          rows={3}
          placeholder="Internal notes visible only to admins..."
          className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy resize-y"
        />
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
          ADD PAYMENT MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle><CreditCard className="w-5 h-5 inline mr-2" />Add Payment</CardTitle>
                <button onClick={() => { setShowPaymentModal(false); resetPaymentForm(); }}
                  className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer text-xl leading-none">×</button>
              </div>
            </CardHeader>
            <form onSubmit={handleAddPayment} className="space-y-4">
              <Input label="Amount (EUR)" type="number" step="0.01" min="0.01"
                value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required placeholder="0.00" />
              <Select label="Method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                options={[
                  { value: "bank_transfer", label: "Bank Transfer" },
                  { value: "cash", label: "Cash" },
                  { value: "stripe", label: "Stripe" },
                ]} />
              <Select label="Status" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}
                options={[
                  { value: "received", label: "Received" },
                  { value: "pending", label: "Pending" },
                ]} />
              <Input label="Date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              <Input label="Reference (optional)" value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)} placeholder="Invoice number, etc." />
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Notes (optional)</label>
                <textarea value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} rows={2}
                  placeholder="Additional notes..."
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="secondary" type="button" onClick={() => { setShowPaymentModal(false); resetPaymentForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingPayment}>
                  {submittingPayment ? "Saving..." : "Save Payment"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
