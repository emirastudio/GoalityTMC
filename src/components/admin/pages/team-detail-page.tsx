"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useAdminFetch } from "@/lib/tournament-context";
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
  Loader2,
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

const STATUS_STYLES: Record<TeamStatus, { background: string; color: string; borderColor: string }> = {
  draft: { background: "var(--cat-card-bg)", color: "var(--cat-text-secondary)", borderColor: "var(--cat-card-border)" },
  open: { background: "var(--badge-success-bg)", color: "var(--badge-success-color)", borderColor: "var(--badge-success-border)" },
  confirmed: { background: "var(--badge-warning-bg)", color: "var(--badge-warning-color)", borderColor: "var(--badge-warning-border)" },
  cancelled: { background: "var(--badge-error-bg)", color: "var(--badge-error-color)", borderColor: "var(--badge-error-border)" },
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
  const styles = {
    default: { borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)", color: "var(--cat-text)" },
    green:   { borderColor: "var(--badge-success-border)", background: "var(--badge-success-bg)", color: "var(--badge-success-color)" },
    red:     { borderColor: "var(--badge-error-border)", background: "var(--badge-error-bg)", color: "var(--badge-error-color)" },
    amber:   { borderColor: "var(--badge-warning-border)", background: "var(--badge-warning-bg)", color: "var(--badge-warning-color)" },
  };
  const s = styles[color];
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: s.borderColor, background: s.background }}>
      <p className="text-xs font-medium th-text-2 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{value}</p>
      {sub && <p className="text-xs th-text-2 mt-0.5">{sub}</p>}
      {detail && <p className="text-xs th-text-2 mt-1">{detail}</p>}
    </div>
  );
}

function SectionHeader({ label, count, open, onToggle }: {
  label: string; count: number; open: boolean; onToggle: () => void;
}) {
  return (
    <button onClick={onToggle}
      className="flex items-center gap-2 text-sm font-semibold th-text hover:opacity-80 transition-colors cursor-pointer w-full text-left py-1">
      {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      {label}
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full th-bg border th-border text-xs font-medium th-text-2">
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
      <span className="th-text-2 mt-0.5 shrink-0">{icon}</span>
      <div>
        <span className="text-xs th-text-2 block">{label}</span>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="text-[var(--cat-accent)] hover:underline font-medium flex items-center gap-1">
            {value} <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="th-text font-medium">{value}</span>
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
        <span className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border"
          style={{ background: "var(--badge-warning-bg)", color: "var(--badge-warning-color)", borderColor: "var(--badge-warning-border)" }}>
          ⚠ {allergies}
        </span>
      )}
      {dietary && (
        <span className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border"
          style={{ background: "var(--badge-info-bg)", color: "var(--badge-info-color)", borderColor: "var(--badge-info-border)" }}>
          🥗 {dietary}
        </span>
      )}
    </div>
  );
}

// ─── PackageItemOverridesCard ────────────────────────────────────────────────

interface PkgItem {
  id: number;
  serviceId: number;
  serviceName: string | null;
  serviceIcon: string | null;
  details: string | null;
  pricingMode: string;
  price: string;
  days: number | null;
  quantity: number | null;
  imageUrl: string | null;
  note: string | null;
}

interface PkgItemOverride {
  id: number;
  packageItemId: number;
  customPrice: string | null;
  customQuantity: number | null;
  isDisabled: boolean;
  reason: string | null;
  serviceName: string | null;
  serviceIcon: string | null;
  itemDetails: string | null;
  itemPricingMode: string | null;
  itemPrice: string | null;
}

const ICON_MAP: Record<string, React.ElementType> = {
  BedDouble: Hotel, Utensils: Utensils, Bus: Bus, Car: Car,
  Plane: Plane, Shirt: Users, Trophy: Users, Camera: Users,
  Music: Users, Dumbbell: Users, Heart: Users, Star: Users,
  ShoppingBag: Users, Wifi: Users, Coffee: Users, MapPin: MapPin,
  Package: Users,
};

function resolveItemIcon(name: string | null | undefined): React.ElementType {
  if (!name) return FileText;
  return ICON_MAP[name] ?? FileText;
}

function PackageItemOverridesCard({
  teamId,
  packageId,
}: {
  teamId: string;
  packageId: number;
}) {
  const adminFetch = useAdminFetch();
  const [items, setItems] = useState<PkgItem[]>([]);
  const [overrides, setOverrides] = useState<PkgItemOverride[]>([]);
  const [loading, setLoading] = useState(true);

  // per-item edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editDisabled, setEditDisabled] = useState(false);
  const [editReason, setEditReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, ovRes] = await Promise.all([
        adminFetch(`/api/admin/packages2/${packageId}/items`),
        adminFetch(`/api/admin/teams/${teamId}/package-overrides`),
      ]);
      if (itemsRes.ok) setItems(await itemsRes.json());
      if (ovRes.ok) setOverrides(await ovRes.json());
    } finally {
      setLoading(false);
    }
  }, [adminFetch, packageId, teamId]);

  useEffect(() => { load(); }, [load]);

  function getOverride(itemId: number) {
    return overrides.find((o) => o.packageItemId === itemId) ?? null;
  }

  function startEdit(item: PkgItem) {
    const ov = getOverride(item.id);
    setEditingId(item.id);
    setEditPrice(ov?.customPrice ?? item.price);
    setEditDisabled(ov?.isDisabled ?? false);
    setEditReason(ov?.reason ?? "");
  }

  async function saveOverride(item: PkgItem) {
    setSaving(true);
    try {
      const existing = getOverride(item.id);
      const payload = {
        packageItemId: item.id,
        customPrice: editPrice !== item.price ? editPrice : null,
        isDisabled: editDisabled,
        reason: editReason || null,
      };

      if (existing) {
        // If everything is default → delete override
        if (!editDisabled && editPrice === item.price && !editReason) {
          await adminFetch(`/api/admin/teams/${teamId}/package-overrides?id=${existing.id}`, { method: "DELETE" });
        } else {
          await adminFetch(`/api/admin/teams/${teamId}/package-overrides`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: existing.id, ...payload }),
          });
        }
      } else if (editDisabled || editPrice !== item.price || editReason) {
        await adminFetch(`/api/admin/teams/${teamId}/package-overrides`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setEditingId(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function removeOverride(ovId: number) {
    await adminFetch(`/api/admin/teams/${teamId}/package-overrides?id=${ovId}`, { method: "DELETE" });
    await load();
  }

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Package Item Overrides</CardTitle></CardHeader>
        <div className="flex items-center gap-2 py-4 th-text-2">
          <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading...</span>
        </div>
      </Card>
    );
  }

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Package Item Overrides</CardTitle>
        <p className="text-xs th-text-2 mt-0.5">
          Override pricing or disable specific services for this team only
        </p>
      </CardHeader>

      <div className="space-y-2">
        {items.map((item) => {
          const ov = getOverride(item.id);
          const Icon = resolveItemIcon(item.serviceIcon);
          const isEditing = editingId === item.id;

          return (
            <div
              key={item.id}
              className="rounded-xl border px-4 py-3 transition-colors th-border th-card"
              style={
                ov?.isDisabled
                  ? { borderColor: "var(--badge-error-border)", background: "var(--badge-error-bg)" }
                  : ov
                  ? { borderColor: "var(--badge-warning-border)", background: "var(--badge-warning-bg)" }
                  : {}
              }
            >
              {/* Item header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[var(--cat-accent)]/8 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[var(--cat-accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-[var(--cat-accent)]">
                        {item.serviceName ?? "—"}
                      </span>
                      {item.details && (
                        <span className="text-xs th-text-2">{item.details}</span>
                      )}
                      {ov?.isDisabled && (
                        <span className="text-xs font-semibold rounded px-1.5 py-0.5 border"
                          style={{ background: "var(--badge-error-bg)", color: "var(--badge-error-color)", borderColor: "var(--badge-error-border)" }}>
                          Disabled for this team
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs th-text-2">{item.pricingMode.replace(/_/g, " ")}</span>
                      {ov?.customPrice && ov.customPrice !== item.price ? (
                        <>
                          <span className="text-xs th-text-2 line-through">€{item.price}</span>
                          <span className="text-xs font-semibold" style={{ color: "var(--badge-warning-color)" }}>€{ov.customPrice}</span>
                        </>
                      ) : (
                        <span className="text-xs font-semibold th-text">€{item.price}</span>
                      )}
                      {ov?.reason && (
                        <span className="text-xs th-text-2 italic">"{ov.reason}"</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {ov && !isEditing && (
                    <button
                      type="button"
                      onClick={() => removeOverride(ov.id)}
                      className="text-xs th-text-2 hover:text-error transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => isEditing ? setEditingId(null) : startEdit(item)}
                    className="text-xs font-medium text-[var(--cat-accent)] hover:opacity-80 transition-colors cursor-pointer"
                  >
                    {isEditing ? "Cancel" : ov ? "Edit" : "Override"}
                  </button>
                </div>
              </div>

              {/* Edit form */}
              {isEditing && (
                <div className="mt-3 pt-3 border-t th-border space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs th-text-2 mb-1 block">Custom price (€)</label>
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        placeholder={item.price}
                        className="w-full rounded-md border th-border th-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/15"
                      />
                    </div>
                    <div>
                      <label className="text-xs th-text-2 mb-1 block">Reason (optional)</label>
                      <input
                        type="text"
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        placeholder="e.g. Early bird, VIP, Sponsor"
                        className="w-full rounded-md border th-border th-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/15"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editDisabled}
                      onChange={(e) => setEditDisabled(e.target.checked)}
                      className="rounded th-border w-4 h-4"
                    />
                    <span className="text-sm text-red-600 font-medium">Disable this service for team</span>
                  </label>

                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveOverride(item)} disabled={saving}>
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Save
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
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
  const adminFetch = useAdminFetch();
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
      await adminFetch(`/api/admin/teams/${teamId}/assign-package`, {
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
          await adminFetch(`/api/admin/teams/${teamId}/overrides?id=${existing.id}`, { method: "DELETE" });
        }
      } else {
        // Delete old override first (if exists)
        if (existing) {
          await adminFetch(`/api/admin/teams/${teamId}/overrides?id=${existing.id}`, { method: "DELETE" });
        }
        // Create new override
        await adminFetch(`/api/admin/teams/${teamId}/overrides`, {
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
        await adminFetch(`/api/admin/teams/${teamId}/overrides?id=${existing.id}`, { method: "DELETE" });
      }
      if (!isAlreadyFree) {
        await adminFetch(`/api/admin/teams/${teamId}/overrides`, {
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
          <span className="th-text-2 text-sm">€</span>
          <input
            ref={inputRef}
            type="number"
            step="0.01"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => commitEdit(serviceType, serviceId, basePrice)}
            onKeyDown={(e) => handleKeyDown(e, serviceType, serviceId, basePrice)}
            className="w-24 rounded-lg border-2 border-[var(--cat-accent)] px-2 py-1 text-sm font-semibold text-[var(--cat-accent)] focus:outline-none tabular-nums"
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
              ? "bg-[var(--cat-accent)]/5 text-[var(--cat-accent)] border-[var(--cat-accent)]/20 hover:opacity-80"
              : "bg-transparent th-text border-transparent hover:th-bg hover:th-border"
          } disabled:opacity-50`}
        >
          {isSaving ? "…" : fmtEuro(effPrice)}
        </button>
        {isCustom && (
          <span className="text-xs th-text-2 line-through opacity-60 hidden group-hover:inline">
            {fmtEuro(basePrice)}
          </span>
        )}
        {unitLabel && !isEditing && (
          <span className="text-xs th-text-2 hidden group-hover:inline">{unitLabel}</span>
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
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors cursor-pointer disabled:opacity-50 hover:opacity-80"
                style={pkg.isPublished
                  ? { background: "var(--badge-success-bg)", color: "var(--badge-success-color)", borderColor: "var(--badge-success-border)" }
                  : { background: "var(--badge-warning-bg)", color: "var(--badge-warning-color)", borderColor: "var(--badge-warning-border)" }
                }
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
          className="flex-1 rounded-lg border th-border th-card px-3 py-2 text-sm th-text focus:outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/15 focus:border-[var(--cat-accent)] appearance-none cursor-pointer"
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
        <div className="rounded-lg border border-dashed th-border p-4 text-center">
          <p className="text-sm th-text-2">No package assigned — team cannot open booking page</p>
        </div>
      ) : (
        <>
          {/* Pricing table */}
          <table className="w-full">
            <thead>
              <tr className="border-b th-border">
                <th className="text-left pb-2 text-xs font-medium th-text-2 uppercase tracking-wide">Service</th>
                <th className="text-left pb-2 text-xs font-medium th-text-2 uppercase tracking-wide">Conditions</th>
                <th className="text-right pb-2 text-xs font-medium th-text-2 uppercase tracking-wide pr-1">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--cat-card-border)]">

              {/* Registration */}
              {pkg.includeRegistration && services.registration.map((r) => {
                const ov = getOverride("registration", r.id);
                return (
                  <tr key={`reg-${r.id}`} className={`${ov?.isDisabled ? "opacity-40" : ""}`}>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 th-text-2 shrink-0" />
                        <span className="text-sm font-medium th-text">{r.name}</span>
                        {r.isRequired && <span className="text-xs th-text-2 th-bg border th-border rounded px-1.5">req.</span>}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-xs th-text-2">1 × per team</td>
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
                        <Hotel className="w-3.5 h-3.5 th-text-2 shrink-0" />
                        <span className="text-sm font-medium th-text">{a.name}</span>
                        {a.includedMeals > 0 && (
                          <span className="text-xs rounded px-1.5 border"
                            style={{ background: "var(--badge-success-bg)", color: "var(--badge-success-color)", borderColor: "var(--badge-success-border)" }}>{a.includedMeals} meals</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="text-xs th-text-2 space-y-0.5">
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
                        <div className="text-xs th-text-2 text-right mt-0.5">all types</div>
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
                        <Car className="w-3.5 h-3.5 th-text-2 shrink-0" />
                        <span className="text-sm font-medium th-text">{t.name}</span>
                      </div>
                      {t.description && <div className="text-xs th-text-2 mt-0.5 ml-5">{t.description}</div>}
                    </td>
                    <td className="py-2.5 pr-3 text-xs th-text-2">Per team</td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {PriceCell({ rowKey: `transfer-${t.id}`, serviceType: "transfer", serviceId: t.id, basePrice: parseFloat(t.pricePerPerson) })}
                        <button
                          onClick={() => giftTransfer(t.id)}
                          title={effectivePrice("transfer", t.id, parseFloat(t.pricePerPerson)) === 0 ? "Remove gift — restore price" : "Gift this transfer (set to free)"}
                          className="text-xs px-2 py-1 rounded-lg border transition-colors cursor-pointer shrink-0 hover:opacity-80"
                          style={effectivePrice("transfer", t.id, parseFloat(t.pricePerPerson)) === 0
                            ? { background: "var(--badge-success-bg)", borderColor: "var(--badge-success-border)", color: "var(--badge-success-color)" }
                            : { background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)" }
                          }
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
                        <Utensils className="w-3.5 h-3.5 th-text-2 shrink-0" />
                        <span className="text-sm font-medium th-text">{m.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-xs th-text-2">
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

          <p className="text-xs th-text-2 mt-3 italic">
            Click any price to edit. Press Enter to save, Esc to cancel. Base price restores on clear.
          </p>

          {/* ── Free Slots ── */}
          <div className="mt-5 pt-5 border-t th-border">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold th-text">Free slots</p>
                <p className="text-xs th-text-2">Complimentary places (visible to the team)</p>
              </div>
              <button
                onClick={saveFreeSlots}
                disabled={savingFree}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--cat-accent)] text-[var(--cat-accent-text)] hover:opacity-80 disabled:opacity-50 transition-colors cursor-pointer"
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
                  <label className="block text-xs th-text-2 mb-1">{label}</label>
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
                      className="w-16 rounded-lg border th-border px-2 py-1.5 text-sm font-semibold text-center focus:outline-none focus:border-[var(--cat-accent)]"
                    />
                    {!isText && <span className="text-xs th-text-2">free</span>}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs th-text-2 mt-1">Leave meals empty to use default (from accommodation option)</p>
            {(parseInt(freePlayers) > 0 || parseInt(freeStaff) > 0 || parseInt(freeAccom) > 0) && (
              <div className="mt-3 rounded-lg border px-3 py-2 text-xs"
                style={{ background: "var(--badge-success-bg)", borderColor: "var(--badge-success-border)", color: "var(--badge-success-color)" }}>
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

export function TeamDetailPageContent({ teamId }: { teamId: string }) {
  const router = useRouter();
  const locale = useLocale();
  const adminFetch = useAdminFetch();

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
      const res = await adminFetch(`/api/admin/teams/${teamId}/report`);
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
      const res = await adminFetch("/api/admin/packages");
      if (res.ok) { const d = await res.json(); setPackages(Array.isArray(d) ? d : []); }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchReport(); fetchPackages(); }, [fetchReport, fetchPackages]);
  useEffect(() => { if (report?.package) setSelectedPackageId(String(report.package.id)); }, [report?.package]);

  // ─── Mutations ───────────────────────────────────────────────────────────

  async function handleStatusChange(newStatus: TeamStatus) {
    setSavingStatus(true);
    try {
      const res = await adminFetch(`/api/admin/teams/${teamId}`, {
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
        await adminFetch(`/api/admin/teams/${teamId}`, {
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
      const res = await adminFetch(`/api/admin/teams/${teamId}/assign-package`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: Number(selectedPackageId) }),
      });
      if (res.ok) await fetchReport();
    } finally { setAssigningPackage(false); }
  }

  async function handleRemovePackage() {
    setAssigningPackage(true);
    try {
      const res = await adminFetch(`/api/admin/teams/${teamId}/assign-package`, { method: "DELETE" });
      if (res.ok) { setSelectedPackageId(""); await fetchReport(); }
    } finally { setAssigningPackage(false); }
  }

  async function handleTogglePublish() {
    if (!report?.package) return;
    setTogglingPublish(true);
    try {
      const res = await adminFetch(`/api/admin/teams/${teamId}/assign-package`, {
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
      const res = await adminFetch("/api/admin/payments", {
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
      const res = await adminFetch("/api/admin/generate-invite", {
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
      const res = await adminFetch("/api/admin/impersonate", {
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
      const res = await adminFetch(`/api/admin/teams/${teamId}`, { method: "DELETE" });
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
        <div className="h-6 w-40 th-bg rounded" />
        <div className="h-32 th-bg rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 th-bg rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48 th-bg rounded-xl" />
          <div className="h-48 th-bg rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.push(`/${locale}/admin/teams`)}
          className="flex items-center gap-2 text-sm th-text-2 hover:opacity-80 cursor-pointer">
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
        className="flex items-center gap-2 text-sm th-text-2 hover:opacity-80 transition-colors cursor-pointer">
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
                className="w-14 h-14 rounded-full object-cover border-2 th-border shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-full th-bg flex items-center justify-center border-2 th-border shrink-0">
                <Users className="w-7 h-7 th-text-2" />
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold th-text">{team.name}</h1>
                <span className="text-lg font-semibold th-text-2">#{team.regNumber}</span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full border" style={STATUS_STYLES[team.status]}>
                  {team.status.charAt(0).toUpperCase() + team.status.slice(1)}
                </span>
              </div>
              {club && (
                <p className="text-sm th-text-2">
                  {club.name}
                  {club.city ? ` · ${club.city}` : ""}
                  {club.country ? `, ${club.country}` : ""}
                </p>
              )}
              {teamClass && (
                <p className="text-xs th-text-2 mt-0.5">
                  Class: <span className="font-semibold th-text">{teamClass.name}</span>
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
              className="rounded-lg border th-border th-card px-3 py-1.5 text-sm font-medium th-text focus:outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/15 focus:border-[var(--cat-accent)] appearance-none cursor-pointer disabled:opacity-50">
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
              className="hover:opacity-80 text-white border-0"
              style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
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
                  className="text-xs th-text-2 hover:th-text cursor-pointer px-1.5 py-1.5"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-xs font-medium th-text-2 hover:text-error border th-border hover:border-error/40 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>
        </div>

        {/* Contact info */}
        {club && (club.contactName || club.contactEmail || club.contactPhone) && (
          <div className="mt-4 pt-4 border-t th-border flex flex-wrap gap-x-6 gap-y-2">
            {club.contactName && (
              <div className="flex items-center gap-2 text-sm th-text-2">
                <UserCheck className="w-4 h-4" />
                <span className="font-medium th-text">{club.contactName}</span>
              </div>
            )}
            {club.contactEmail && (
              <a href={`mailto:${club.contactEmail}`}
                className="flex items-center gap-2 text-sm text-[var(--cat-accent)] hover:underline">
                <Mail className="w-4 h-4" />
                {club.contactEmail}
              </a>
            )}
            {club.contactPhone && (
              <a href={`tel:${club.contactPhone}`}
                className="flex items-center gap-2 text-sm th-text-2 hover:opacity-80">
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
            <p className="text-sm th-text-2 italic">No bookings saved yet.</p>
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
                      <div className="rounded-lg border th-border overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2.5 th-bg/50">
                          <div className="flex items-center gap-2">
                            <Hotel className="w-4 h-4 th-text-2" />
                            <span className="text-sm font-medium th-text">
                              {resolveServiceName("accommodation", accRows[0].serviceId)}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-[var(--cat-accent)]">{fmtEuro(accTotal)}</span>
                        </div>
                        <div className="px-3 py-2 space-y-1">
                          {accRows.map((b) => (
                            <div key={b.id} className="flex justify-between text-xs th-text-2">
                              <span className="capitalize">{b.notes ?? "persons"} × {fmtEuro(b.unitPrice)}</span>
                              <span>{b.quantity} ppl → {fmtEuro(b.total)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {otherRows.map((b) => {
                      const icons: Record<string, React.ReactNode> = {
                        transfer: <Car className="w-4 h-4 th-text-2" />,
                        meal: <Utensils className="w-4 h-4 th-text-2" />,
                        registration: <FileText className="w-4 h-4 th-text-2" />,
                      };
                      return (
                        <div key={b.id} className="flex items-center justify-between rounded-lg border th-border px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            {icons[b.bookingType] ?? <FileText className="w-4 h-4 th-text-2" />}
                            <div>
                              <span className="text-sm font-medium th-text">
                                {resolveServiceName(b.bookingType, b.serviceId)}
                              </span>
                              {b.quantity > 1 && (
                                <span className="text-xs th-text-2 ml-2">× {b.quantity}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-[var(--cat-accent)]">{fmtEuro(b.total)}</span>
                        </div>
                      );
                    })}

                    <div className="flex justify-between items-center pt-2 border-t th-border">
                      <span className="text-sm font-semibold th-text">Grand Total</span>
                      <span className="text-lg font-bold text-[var(--cat-accent)]">{fmtEuro(finance.totalFromBookings)}</span>
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
            <div className="rounded-lg border th-border th-bg/50 p-3 text-center">
              <p className="text-xs th-text-2">Ordered</p>
              <p className="text-lg font-bold th-text">{fmtEuro(finance.totalFromBookings)}</p>
            </div>
            <div className="rounded-lg border p-3 text-center"
              style={{ borderColor: "var(--badge-success-border)", background: "var(--badge-success-bg)" }}>
              <p className="text-xs th-text-2">Paid</p>
              <p className="text-lg font-bold" style={{ color: "var(--badge-success-color)" }}>{fmtEuro(finance.totalPaid)}</p>
            </div>
            <div className="rounded-lg border p-3 text-center"
              style={finance.balance <= 0
                ? { borderColor: "var(--badge-success-border)", background: "var(--badge-success-bg)" }
                : { borderColor: "var(--badge-error-border)", background: "var(--badge-error-bg)" }
              }>
              <p className="text-xs th-text-2">Balance</p>
              <p className="text-lg font-bold"
                style={{ color: finance.balance <= 0 ? "var(--badge-success-color)" : "var(--badge-error-color)" }}>
                {finance.balance > 0 ? "-" : ""}{fmtEuro(Math.abs(finance.balance))}
              </p>
            </div>
          </div>

          {/* Payment history (compact) */}
          {payments.length > 0 && (
            <div>
              <button onClick={() => setShowPayments(!showPayments)}
                className="flex items-center gap-1 text-xs font-medium th-text-2 hover:opacity-80 cursor-pointer mb-2">
                {showPayments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Payment history ({payments.length})
              </button>
              {showPayments && (
                <div className="space-y-1.5">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b th-border last:border-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={PAYMENT_STATUS_BADGE[p.status] ?? "default"}>
                          {p.status}
                        </Badge>
                        <span className="th-text-2 text-xs">{fmtDate(p.receivedAt ?? p.createdAt)}</span>
                        <span className="th-text-2 text-xs">{METHOD_LABELS[p.method] ?? p.method}</span>
                      </div>
                      <span className="font-semibold tabular-nums th-text">{fmtEuro(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {payments.length === 0 && (
            <p className="text-xs th-text-2 italic">No payments recorded yet.</p>
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
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border"
                style={{ background: "var(--badge-success-bg)", color: "var(--badge-success-color)", borderColor: "var(--badge-success-border)" }}>
                ✅ Confirmed
              </span>
            ) : team.accomDeclined ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border th-bg th-text-2 th-border">
                Declined
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border"
                style={{ background: "var(--badge-warning-bg)", color: "var(--badge-warning-color)", borderColor: "var(--badge-warning-border)" }}>
                ⏳ Pending
              </span>
            )}
          </div>
        </CardHeader>
        {team.accomConfirmed ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border th-border th-bg/50 p-3">
              <p className="text-xs th-text-2">Players</p>
              <p className="text-xl font-bold th-text">{team.accomPlayers}</p>
            </div>
            <div className="rounded-lg border th-border th-bg/50 p-3">
              <p className="text-xs th-text-2">Staff</p>
              <p className="text-xl font-bold th-text">{team.accomStaff}</p>
            </div>
            <div className="rounded-lg border th-border th-bg/50 p-3">
              <p className="text-xs th-text-2">Accompanying</p>
              <p className="text-xl font-bold th-text">{team.accomAccompanying}</p>
            </div>
            <div className="rounded-lg border th-border th-bg/50 p-3">
              <p className="text-xs th-text-2">Total beds</p>
              <p className="text-xl font-bold text-[var(--cat-accent)]">{team.accomPlayers + team.accomStaff + team.accomAccompanying}</p>
            </div>
          </div>
        ) : team.accomDeclined ? (
          <p className="text-sm th-text-2 italic">Команда отказалась от проживания в отеле.</p>
        ) : (
          <p className="text-sm th-text-2 italic">Команда ещё не ответила на вопрос о проживании.</p>
        )}
        {team.accomConfirmed && (team.accomCheckIn || team.accomCheckOut) && (
          <div className="mt-3 flex gap-6 text-sm">
            {team.accomCheckIn && (
              <div>
                <span className="text-xs th-text-2 block">Check-in</span>
                <span className="font-semibold th-text">{team.accomCheckIn}</span>
              </div>
            )}
            {team.accomCheckOut && (
              <div>
                <span className="text-xs th-text-2 block">Check-out</span>
                <span className="font-semibold th-text">{team.accomCheckOut}</span>
              </div>
            )}
          </div>
        )}
        {team.accomConfirmed && team.accomNotes && (
          <div className="mt-3 rounded-lg th-bg border th-border p-3 text-sm th-text-2">
            <span className="text-xs font-semibold th-text-2 block mb-1">Special requests</span>
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

        {/* Package Item Overrides */}
        {report.package && (
          <PackageItemOverridesCard
            teamId={teamId}
            packageId={report.package.id}
          />
        )}

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
                <h4 className="text-xs font-semibold uppercase tracking-wide th-text-2 mb-3 flex items-center gap-1.5">
                  <Hotel className="w-3.5 h-3.5" /> Отель команды
                </h4>
                {availableHotels.length === 0 ? (
                  <p className="text-sm th-text-2 italic">
                    Отели не добавлены.{" "}
                    <button onClick={() => router.push(`/${locale}/admin/tournaments`)}
                      className="text-[var(--cat-accent)] hover:underline cursor-pointer">Добавить в турнире</button>
                  </p>
                ) : (
                  <div className="space-y-3">
                    <select
                      className="w-full rounded-lg border th-border px-3 py-2 text-sm th-card focus:outline-none focus:border-[var(--cat-accent)]"
                      value={team.hotelId ?? ""}
                      onChange={async (e) => {
                        const val = e.target.value;
                        await adminFetch(`/api/admin/teams/${teamId}`, {
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
                      <div className="rounded-lg bg-[var(--cat-accent)]/5 border border-[var(--cat-accent)]/20 p-3 space-y-1.5">
                        <p className="text-sm font-semibold text-[var(--cat-accent)]">{assignedHotel.name}</p>
                        {assignedHotel.address && <p className="text-xs th-text-2">{assignedHotel.address}</p>}
                        {assignedHotel.contactName && <p className="text-xs th-text-2">Контакт: {assignedHotel.contactName}</p>}
                        {assignedHotel.contactPhone && <a href={`tel:${assignedHotel.contactPhone}`} className="text-xs text-[var(--cat-accent)] hover:underline block">{assignedHotel.contactPhone}</a>}
                        {assignedHotel.contactEmail && <p className="text-xs th-text-2">{assignedHotel.contactEmail}</p>}
                        {assignedHotel.notes && <p className="text-xs th-text-2 italic">{assignedHotel.notes}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {tInfo && <>

              {/* Meals */}
              {(tInfo.mealTimes || tInfo.mealLocation || tInfo.mealNotes) && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide th-text-2 mb-3 flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5" /> Meals
                  </h4>
                  <div className="space-y-2">
                    <InfoRow icon={<Clock className="w-4 h-4" />} label="Meal times" value={tInfo.mealTimes} />
                    <InfoRow icon={<MapPin className="w-4 h-4" />} label="Location" value={tInfo.mealLocation} />
                    {tInfo.mealNotes && (
                      <div className="rounded-lg th-bg border th-border p-2.5 text-xs th-text-2">
                        {tInfo.mealNotes}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Venue */}
              {(tInfo.venueName || tInfo.venueAddress) && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide th-text-2 mb-3 flex items-center gap-1.5">
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
                  <h4 className="text-xs font-semibold uppercase tracking-wide th-text-2 mb-3 flex items-center gap-1.5">
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
              <h4 className="text-xs font-semibold uppercase tracking-wide th-text-2 mb-3">Arrival</h4>
              {travel.arrivalType ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold th-text">
                    {TRANSPORT_ICONS[travel.arrivalType] ?? <Plane className="w-4 h-4" />}
                    <span>{TRANSPORT_LABELS[travel.arrivalType] ?? travel.arrivalType}</span>
                  </div>
                  {travel.arrivalDate && (
                    <p className="text-sm th-text-2">
                      {fmtDate(travel.arrivalDate)}{travel.arrivalTime && ` at ${travel.arrivalTime}`}
                    </p>
                  )}
                  {travel.arrivalDetails && (
                    <p className="text-sm font-medium th-text">{travel.arrivalDetails}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm th-text-2 italic">Not specified</p>
              )}
            </div>

            {/* Departure */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide th-text-2 mb-3">Departure</h4>
              {travel.departureType ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold th-text">
                    {TRANSPORT_ICONS[travel.departureType] ?? <Plane className="w-4 h-4" />}
                    <span>{TRANSPORT_LABELS[travel.departureType] ?? travel.departureType}</span>
                  </div>
                  {travel.departureDate && (
                    <p className="text-sm th-text-2">
                      {fmtDate(travel.departureDate)}{travel.departureTime && ` at ${travel.departureTime}`}
                    </p>
                  )}
                  {travel.departureDetails && (
                    <p className="text-sm font-medium th-text">{travel.departureDetails}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm th-text-2 italic">Not specified</p>
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
            <div className="flex items-center gap-3 text-sm th-text-2">
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
          <div className="mb-4 rounded-lg border p-3"
            style={{ borderColor: "var(--badge-warning-border)", background: "var(--badge-warning-bg)" }}>
            <p className="text-sm font-semibold flex items-center gap-2 mb-2"
              style={{ color: "var(--badge-warning-color)" }}>
              <AlertTriangle className="w-4 h-4" /> Medical / Dietary ({medicalPeople.length} persons)
            </p>
            <div className="space-y-1">
              {medicalPeople.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-medium th-text">{p.firstName} {p.lastName}</span>
                  {p.allergies && <span className="th-card border rounded-full px-2 py-0.5"
                    style={{ borderColor: "var(--badge-warning-border)", color: "var(--badge-warning-color)" }}>⚠ {p.allergies}</span>}
                  {p.dietaryRequirements && <span className="th-card border rounded-full px-2 py-0.5"
                    style={{ borderColor: "var(--badge-info-border)", color: "var(--badge-info-color)" }}>🥗 {p.dietaryRequirements}</span>}
                  {p.medicalNotes && <span className="th-card border rounded-full px-2 py-0.5"
                    style={{ borderColor: "var(--badge-error-border)", color: "var(--badge-error-color)" }}>💊 {p.medicalNotes}</span>}
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
                      <tr className="border-b th-border">
                        {["#", "Name", "DOB / Age", "Pos", "Hotel", "Transfer"].map((h, i) => (
                          <th key={i} className="text-left pb-2 pr-3 text-xs font-medium th-text-2 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((p, i) => (
                        <tr key={p.id} className="border-b th-border last:border-0"
                          style={(p.allergies || p.dietaryRequirements) ? { background: "var(--badge-warning-bg)" } : {}}>
                          <td className="py-2.5 pr-3 th-text-2 tabular-nums">{p.shirtNumber ?? i + 1}</td>
                          <td className="py-2.5 pr-3 font-medium th-text whitespace-nowrap">
                            {p.firstName} {p.lastName}
                            {(p.allergies || p.dietaryRequirements) && (
                              <AlertTriangle className="inline w-3.5 h-3.5 text-amber-500 ml-1" />
                            )}
                          </td>
                          <td className="py-2.5 pr-3 th-text-2 text-xs whitespace-nowrap">
                            {p.dateOfBirth ? (
                              <>{fmtDate(p.dateOfBirth)} <span className="opacity-60">({calcAge(p.dateOfBirth)}y)</span></>
                            ) : "—"}
                          </td>
                          <td className="py-2.5 pr-3 th-text-2 text-xs">{p.position ?? "—"}</td>
                          <td className="py-2.5 pr-3 text-xs">
                            {p.needsHotel ? <span className="font-medium" style={{ color: "var(--cat-accent)" }}>✓</span> : <span className="th-text-2">—</span>}
                          </td>
                          <td className="py-2.5 text-xs">
                            {p.needsTransfer ? <span className="font-medium" style={{ color: "var(--cat-accent)" }}>✓</span> : <span className="th-text-2">—</span>}
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
                      <tr className="border-b th-border">
                        {["Name", "Role", "Hotel", "Transfer"].map((h, i) => (
                          <th key={i} className="text-left pb-2 pr-3 text-xs font-medium th-text-2">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((p) => (
                        <tr key={p.id} className="border-b th-border last:border-0">
                          <td className="py-2.5 pr-3 font-medium th-text whitespace-nowrap">
                            {p.firstName} {p.lastName}
                            {p.isResponsible && <Badge variant="info" className="ml-2">Responsible</Badge>}
                          </td>
                          <td className="py-2.5 pr-3 th-text-2 text-xs">{p.role ?? p.position ?? "—"}</td>
                          <td className="py-2.5 pr-3 text-xs">
                            {p.needsHotel ? <span className="font-medium" style={{ color: "var(--cat-accent)" }}>✓</span> : <span className="th-text-2">—</span>}
                          </td>
                          <td className="py-2.5 text-xs">
                            {p.needsTransfer ? <span className="font-medium" style={{ color: "var(--cat-accent)" }}>✓</span> : <span className="th-text-2">—</span>}
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
                      <tr className="border-b th-border">
                        {["Name", "Hotel", "Transfer"].map((h, i) => (
                          <th key={i} className="text-left pb-2 pr-3 text-xs font-medium th-text-2">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {accompanying.map((p) => (
                        <tr key={p.id} className="border-b th-border last:border-0">
                          <td className="py-2.5 pr-3 font-medium th-text">{p.firstName} {p.lastName}</td>
                          <td className="py-2.5 pr-3 text-xs">
                            {p.needsHotel ? <span className="font-medium" style={{ color: "var(--cat-accent)" }}>✓</span> : <span className="th-text-2">—</span>}
                          </td>
                          <td className="py-2.5 text-xs">
                            {p.needsTransfer ? <span className="font-medium" style={{ color: "var(--cat-accent)" }}>✓</span> : <span className="th-text-2">—</span>}
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
            <p className="text-sm th-text-2 italic">No people registered yet.</p>
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
            {savingNotes && <span className="text-xs th-text-2">Saving...</span>}
          </div>
        </CardHeader>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          rows={3}
          placeholder="Internal notes visible only to admins..."
          className="w-full rounded-lg border th-border th-card px-3 py-2.5 text-sm th-text placeholder:th-text-2/50 focus:outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/15 focus:border-[var(--cat-accent)] resize-y"
        />
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
          ADD PAYMENT MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="popup-bg w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle><CreditCard className="w-5 h-5 inline mr-2" />Add Payment</CardTitle>
                <button onClick={() => { setShowPaymentModal(false); resetPaymentForm(); }}
                  className="th-text-2 hover:th-text transition-colors cursor-pointer text-xl leading-none">×</button>
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
                <label className="block text-sm font-medium th-text mb-1.5">Notes (optional)</label>
                <textarea value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} rows={2}
                  placeholder="Additional notes..."
                  className="w-full rounded-lg border th-border th-card px-3 py-2 text-sm th-text focus:outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/15 resize-none" />
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
