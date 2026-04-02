"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdminFetch } from "@/lib/tournament-context";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Trophy,
  GraduationCap,
  ShoppingBag,
  Plus,
  Trash2,
  Save,
  Loader2,
  Check,
  Info,
} from "lucide-react";

/* ────────────────────────────────────────────────── types */

interface TournamentClass {
  id?: number;
  name: string;
  format: string | null;
  minBirthYear: number | null;
  maxPlayers: number | null;
  maxStaff: number | null;
  _deleted?: boolean;
}

interface TournamentProduct {
  id?: number;
  name: string;
  category: string;
  price: string;
  perPerson: boolean;
  isRequired: boolean;
  sortOrder: number;
  _deleted?: boolean;
}

interface TournamentData {
  id: number;
  name: string;
  year: number;
  startDate: string | null;
  endDate: string | null;
  registrationDeadline: string | null;
  registrationOpen: boolean;
  currency: string;
  classes: TournamentClass[];
  products: TournamentProduct[];
}

type Tab = "general" | "classes" | "products" | "fields" | "hotels" | "info";

const FORMATS = ["5x5", "6x6", "7x7", "8x8", "9x9", "11x11"];

interface TournamentField {
  id?: number;
  name: string;
  address: string;
  mapUrl: string;
  scheduleUrl: string;
  notes: string;
  sortOrder: number;
  _deleted?: boolean;
}

interface TournamentHotel {
  id?: number;
  name: string;
  address: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  notes: string;
  sortOrder: number;
  _deleted?: boolean;
}

interface TournamentInfoData {
  hotelName?: string;
  hotelAddress?: string;
  hotelCheckIn?: string;
  hotelCheckOut?: string;
  hotelNotes?: string;
  venueName?: string;
  venueAddress?: string;
  venueMapUrl?: string;
  mealTimes?: string;
  mealLocation?: string;
  mealNotes?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  scheduleUrl?: string;
  scheduleDescription?: string;
  additionalNotes?: string;
}

const CATEGORIES = [
  "registration",
  "accommodation",
  "transfer",
  "meals",
  "extra",
];

/* ────────────────────────────────────────── helpers */

function toDateInput(val: string | null): string {
  if (!val) return "";
  return val.slice(0, 10);
}

function SectionTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
        active
          ? "bg-navy text-white"
          : "th-card th-text-2 hover:th-bg border th-border"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function SaveButton({
  saving,
  saved,
  onClick,
}: {
  saving: boolean;
  saved: boolean;
  onClick: () => void;
}) {
  return (
    <Button onClick={onClick} disabled={saving}>
      {saving ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : saved ? (
        <Check className="w-4 h-4" />
      ) : (
        <Save className="w-4 h-4" />
      )}
      {saving ? "Saving..." : saved ? "Saved" : "Save"}
    </Button>
  );
}

/* ────────────────────────────────────────── page */

export function TournamentSetupPageContent() {
  const adminFetch = useAdminFetch();
  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("general");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /* form state */
  const [name, setName] = useState("");
  const [year, setYear] = useState<number>(2026);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [regDeadline, setRegDeadline] = useState("");
  const [regOpen, setRegOpen] = useState(false);
  const [currency, setCurrency] = useState("EUR");

  const [classes, setClasses] = useState<TournamentClass[]>([]);
  const [products, setProducts] = useState<TournamentProduct[]>([]);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "class" | "product";
    idx: number;
  } | null>(null);

  // Tournament info state
  const [tInfo, setTInfo] = useState<TournamentInfoData>({});
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoSaved, setInfoSaved] = useState(false);

  // Fields state
  const [fields, setFields] = useState<TournamentField[]>([]);
  const [fieldsSaving, setFieldsSaving] = useState(false);
  const [fieldsSaved, setFieldsSaved] = useState(false);

  // Hotels state
  const [hotels, setHotels] = useState<TournamentHotel[]>([]);
  const [hotelsSaving, setHotelsSaving] = useState(false);
  const [hotelsSaved, setHotelsSaved] = useState(false);

  /* ─── fetch ─── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, infoRes, fieldsRes, hotelsRes] = await Promise.all([
        adminFetch("/api/admin/tournaments"),
        adminFetch("/api/admin/tournament-info"),
        adminFetch("/api/admin/tournament-fields"),
        adminFetch("/api/admin/tournament-hotels"),
      ]);
      if (!res.ok) throw new Error("Failed to load tournament data");
      const d: TournamentData = await res.json();
      setData(d);
      setName(d.name);
      setYear(d.year);
      setStartDate(toDateInput(d.startDate));
      setEndDate(toDateInput(d.endDate));
      setRegDeadline(toDateInput(d.registrationDeadline));
      setRegOpen(d.registrationOpen);
      setCurrency(d.currency);
      setClasses((d.classes ?? []).map((c: TournamentClass) => ({ ...c, format: c.format ?? null })));
      setProducts(d.products ?? []);
      if (fieldsRes.ok) {
        const f = await fieldsRes.json();
        setFields(Array.isArray(f) ? f.map((x: TournamentField) => ({
          id: x.id, name: x.name ?? "", address: x.address ?? "",
          mapUrl: x.mapUrl ?? "", scheduleUrl: x.scheduleUrl ?? "",
          notes: x.notes ?? "", sortOrder: x.sortOrder ?? 0,
        })) : []);
      }
      if (hotelsRes.ok) {
        const h = await hotelsRes.json();
        setHotels(Array.isArray(h) ? h.map((x: TournamentHotel) => ({
          id: x.id, name: x.name ?? "", address: x.address ?? "",
          contactName: x.contactName ?? "", contactPhone: x.contactPhone ?? "",
          contactEmail: x.contactEmail ?? "", notes: x.notes ?? "", sortOrder: x.sortOrder ?? 0,
        })) : []);
      }
      if (infoRes.ok) {
        const info = await infoRes.json();
        setTInfo({
          hotelName: info.hotelName ?? "",
          hotelAddress: info.hotelAddress ?? "",
          hotelCheckIn: info.hotelCheckIn ?? "",
          hotelCheckOut: info.hotelCheckOut ?? "",
          hotelNotes: info.hotelNotes ?? "",
          venueName: info.venueName ?? "",
          venueAddress: info.venueAddress ?? "",
          venueMapUrl: info.venueMapUrl ?? "",
          mealTimes: info.mealTimes ?? "",
          mealLocation: info.mealLocation ?? "",
          mealNotes: info.mealNotes ?? "",
          emergencyContact: info.emergencyContact ?? "",
          emergencyPhone: info.emergencyPhone ?? "",
          scheduleUrl: info.scheduleUrl ?? "",
          scheduleDescription: info.scheduleDescription ?? "",
          additionalNotes: info.additionalNotes ?? "",
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── save ─── */
  const save = async (payload: Record<string, unknown>) => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await adminFetch("/api/admin/tournaments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated: TournamentData = await res.json();
      setData(updated);
      setClasses(updated.classes ?? []);
      setProducts(updated.products ?? []);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const saveGeneral = () =>
    save({
      name,
      year,
      startDate: startDate || null,
      endDate: endDate || null,
      registrationDeadline: regDeadline || null,
      registrationOpen: regOpen,
      currency,
    });

  const saveClasses = () =>
    save({
      classes: classes.filter((c) => !c._deleted),
    });

  const saveProducts = () =>
    save({
      products: products
        .filter((p) => !p._deleted)
        .map((p, i) => ({ ...p, sortOrder: i })),
    });

  const saveFields = async () => {
    setFieldsSaving(true);
    setFieldsSaved(false);
    try {
      const toDelete = fields.filter((f) => f._deleted && f.id);
      const toUpsert = fields.filter((f) => !f._deleted);
      await Promise.all(toDelete.map((f) =>
        adminFetch(`/api/admin/tournament-fields?id=${f.id}`, { method: "DELETE" })
      ));
      for (const f of toUpsert) {
        if (f.id) {
          await adminFetch("/api/admin/tournament-fields", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
        } else {
          await adminFetch("/api/admin/tournament-fields", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
        }
      }
      // Refresh
      const res = await adminFetch("/api/admin/tournament-fields");
      if (res.ok) {
        const f = await res.json();
        setFields(Array.isArray(f) ? f.map((x: TournamentField) => ({
          id: x.id, name: x.name ?? "", address: x.address ?? "",
          mapUrl: x.mapUrl ?? "", scheduleUrl: x.scheduleUrl ?? "",
          notes: x.notes ?? "", sortOrder: x.sortOrder ?? 0,
        })) : []);
      }
      setFieldsSaved(true);
      setTimeout(() => setFieldsSaved(false), 2000);
    } catch {
      setError("Failed to save fields.");
    } finally {
      setFieldsSaving(false);
    }
  };

  const saveHotels = async () => {
    setHotelsSaving(true);
    setHotelsSaved(false);
    try {
      const toDelete = hotels.filter((h) => h._deleted && h.id);
      const toUpsert = hotels.filter((h) => !h._deleted);
      await Promise.all(toDelete.map((h) =>
        adminFetch(`/api/admin/tournament-hotels?id=${h.id}`, { method: "DELETE" })
      ));
      for (const h of toUpsert) {
        if (h.id) {
          await adminFetch("/api/admin/tournament-hotels", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(h) });
        } else {
          await adminFetch("/api/admin/tournament-hotels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(h) });
        }
      }
      // Refresh
      const res = await adminFetch("/api/admin/tournament-hotels");
      if (res.ok) {
        const h = await res.json();
        setHotels(Array.isArray(h) ? h.map((x: TournamentHotel) => ({
          id: x.id, name: x.name ?? "", address: x.address ?? "",
          contactName: x.contactName ?? "", contactPhone: x.contactPhone ?? "",
          contactEmail: x.contactEmail ?? "", notes: x.notes ?? "", sortOrder: x.sortOrder ?? 0,
        })) : []);
      }
      setHotelsSaved(true);
      setTimeout(() => setHotelsSaved(false), 2000);
    } catch {
      setError("Failed to save hotels.");
    } finally {
      setHotelsSaving(false);
    }
  };

  const saveInfo = async () => {
    setInfoSaving(true);
    setInfoSaved(false);
    try {
      const res = await adminFetch("/api/admin/tournament-info", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tInfo),
      });
      if (!res.ok) throw new Error("Save failed");
      setInfoSaved(true);
      setTimeout(() => setInfoSaved(false), 2000);
    } catch {
      setError("Failed to save info. Please try again.");
    } finally {
      setInfoSaving(false);
    }
  };

  /* ─── class mutations ─── */
  const addClass = () =>
    setClasses((prev) => [
      ...prev,
      { name: "", format: null, minBirthYear: null, maxPlayers: 25, maxStaff: 5 },
    ]);

  const addField = () =>
    setFields((prev) => [
      ...prev,
      { name: "", address: "", mapUrl: "", scheduleUrl: "", notes: "", sortOrder: prev.length },
    ]);

  const addHotel = () =>
    setHotels((prev) => [
      ...prev,
      { name: "", address: "", contactName: "", contactPhone: "", contactEmail: "", notes: "", sortOrder: prev.length },
    ]);

  const updateClass = (idx: number, field: string, value: unknown) =>
    setClasses((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );

  const deleteClass = (idx: number) => {
    if (classes[idx].id) {
      // Mark existing for server-side handling
      setClasses((prev) =>
        prev.map((c, i) => (i === idx ? { ...c, _deleted: true } : c))
      );
    } else {
      setClasses((prev) => prev.filter((_, i) => i !== idx));
    }
    setDeleteConfirm(null);
  };

  /* ─── product mutations ─── */
  const addProduct = () =>
    setProducts((prev) => [
      ...prev,
      {
        name: "",
        category: "registration",
        price: "0",
        perPerson: false,
        isRequired: false,
        sortOrder: prev.length,
      },
    ]);

  const updateProduct = (idx: number, field: string, value: unknown) =>
    setProducts((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    );

  const deleteProduct = (idx: number) => {
    if (products[idx].id) {
      setProducts((prev) =>
        prev.map((p, i) => (i === idx ? { ...p, _deleted: true } : p))
      );
    } else {
      setProducts((prev) => prev.filter((_, i) => i !== idx));
    }
    setDeleteConfirm(null);
  };

  /* ─── render ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-navy" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold th-text">
          Tournament Management
        </h1>
        <Card>
          <p className="text-error text-sm">{error}</p>
          <Button onClick={fetchData} className="mt-4" variant="secondary">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  const visibleClasses = classes.filter((c) => !c._deleted);
  const visibleProducts = products.filter((p) => !p._deleted);

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold th-text">
        Tournament Management
      </h1>

      {error && (
        <div className="rounded-lg bg-red-50 border border-error/20 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <SectionTab
          active={tab === "general"}
          onClick={() => setTab("general")}
          icon={Trophy}
          label="General Settings"
        />
        <SectionTab
          active={tab === "classes"}
          onClick={() => setTab("classes")}
          icon={GraduationCap}
          label="Classes"
        />
        <SectionTab
          active={tab === "products"}
          onClick={() => setTab("products")}
          icon={ShoppingBag}
          label="Products & Prices"
        />
        <SectionTab
          active={tab === "fields"}
          onClick={() => setTab("fields")}
          icon={Info}
          label="Fields"
        />
        <SectionTab
          active={tab === "hotels"}
          onClick={() => setTab("hotels")}
          icon={Info}
          label="Hotels"
        />
        <SectionTab
          active={tab === "info"}
          onClick={() => setTab("info")}
          icon={Info}
          label="Info"
        />
      </div>

      {/* ─── General Settings ─── */}
      {tab === "general" && (
        <Card>
          <CardTitle>General Settings</CardTitle>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              id="name"
              label="Tournament name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              id="year"
              label="Year"
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
            <Input
              id="startDate"
              label="Start date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              id="endDate"
              label="End date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <Input
              id="regDeadline"
              label="Registration deadline"
              type="date"
              value={regDeadline}
              onChange={(e) => setRegDeadline(e.target.value)}
            />
            <div className="space-y-1.5">
              <label
                htmlFor="currency"
                className="block text-sm font-medium th-text"
              >
                Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-lg border th-border th-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="SEK">SEK</option>
              </select>
            </div>
          </div>

          <div className="mt-5">
            <label className="flex items-center gap-3 text-sm font-medium th-text cursor-pointer">
              <input
                type="checkbox"
                checked={regOpen}
                onChange={(e) => setRegOpen(e.target.checked)}
                className="accent-navy w-4 h-4"
              />
              Registration open
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <SaveButton saving={saving} saved={saved} onClick={saveGeneral} />
          </div>
        </Card>
      )}

      {/* ─── Classes ─── */}
      {tab === "classes" && (
        <Card padding={false}>
          <div className="p-6 border-b th-border flex items-center justify-between">
            <CardTitle>Age Classes</CardTitle>
            <Button size="sm" onClick={addClass}>
              <Plus className="w-4 h-4" />
              Add Class
            </Button>
          </div>

          {visibleClasses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b th-border text-left">
                    <th className="px-4 py-3 text-xs font-medium th-text-2 uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-xs font-medium th-text-2 uppercase">
                      Format
                    </th>
                    <th className="px-4 py-3 text-xs font-medium th-text-2 uppercase">
                      Min Birth Year
                    </th>
                    <th className="px-4 py-3 text-xs font-medium th-text-2 uppercase">
                      Max Players
                    </th>
                    <th className="px-4 py-3 text-xs font-medium th-text-2 uppercase">
                      Max Staff
                    </th>
                    <th className="px-4 py-3 text-xs font-medium th-text-2 uppercase w-16">
                      &nbsp;
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((cls, idx) =>
                    cls._deleted ? null : (
                      <tr
                        key={cls.id ?? `new-${idx}`}
                        className="border-b th-border last:border-0 hover:th-bg"
                      >
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={cls.name}
                            onChange={(e) =>
                              updateClass(idx, "name", e.target.value)
                            }
                            placeholder="e.g. U12"
                            className="w-full rounded-lg border th-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={cls.format ?? ""}
                            onChange={(e) => updateClass(idx, "format", e.target.value || null)}
                            className="w-full rounded-lg border th-border px-3 py-2 text-sm focus:outline-none focus:border-navy th-card"
                          >
                            <option value="">—</option>
                            {FORMATS.map((f) => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={cls.minBirthYear ?? ""}
                            onChange={(e) =>
                              updateClass(
                                idx,
                                "minBirthYear",
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                            placeholder="2014"
                            className="w-28 rounded-lg border th-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={cls.maxPlayers ?? ""}
                            onChange={(e) =>
                              updateClass(
                                idx,
                                "maxPlayers",
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                            className="w-20 rounded-lg border th-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={cls.maxStaff ?? ""}
                            onChange={(e) =>
                              updateClass(
                                idx,
                                "maxStaff",
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                            className="w-20 rounded-lg border th-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          {deleteConfirm?.type === "class" &&
                          deleteConfirm.idx === idx ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => deleteClass(idx)}
                                className="text-xs text-error font-medium cursor-pointer hover:underline"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(null)}
                                className="text-xs th-text-2 cursor-pointer hover:underline"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteConfirm({ type: "class", idx })
                              }
                              className="th-text-2 hover:text-error transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 th-text-2 text-sm">
              <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No classes defined. Click &quot;Add Class&quot; to create one.
            </div>
          )}

          <div className="p-4 border-t th-border flex justify-end">
            <SaveButton saving={saving} saved={saved} onClick={saveClasses} />
          </div>
        </Card>
      )}

      {/* ─── Products & Prices ─── */}
      {tab === "products" && (
        <Card padding={false}>
          <div className="p-6 border-b th-border flex items-center justify-between">
            <CardTitle>Products & Prices</CardTitle>
            <Button size="sm" onClick={addProduct}>
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          </div>

          {visibleProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b th-border text-left">
                    <th className="px-4 py-3 text-xs font-medium th-text-2 uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-xs font-medium th-text-2 uppercase">
                      Category
                    </th>
                    <th className="px-4 py-3 text-xs font-medium th-text-2 uppercase">
                      Price ({currency})
                    </th>
                    <th className="px-4 py-3 text-xs font-medium th-text-2 uppercase text-center">
                      Per Person
                    </th>
                    <th className="px-4 py-3 text-xs font-medium th-text-2 uppercase text-center">
                      Required
                    </th>
                    <th className="px-4 py-3 text-xs font-medium th-text-2 uppercase w-16">
                      &nbsp;
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((prod, idx) =>
                    prod._deleted ? null : (
                      <tr
                        key={prod.id ?? `new-${idx}`}
                        className="border-b th-border last:border-0 hover:th-bg"
                      >
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={prod.name}
                            onChange={(e) =>
                              updateProduct(idx, "name", e.target.value)
                            }
                            placeholder="Product name"
                            className="w-full rounded-lg border th-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={prod.category}
                            onChange={(e) =>
                              updateProduct(idx, "category", e.target.value)
                            }
                            className="w-full rounded-lg border th-border px-3 py-2 text-sm focus:outline-none focus:border-navy th-card"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={prod.price}
                            onChange={(e) =>
                              updateProduct(idx, "price", e.target.value)
                            }
                            className="w-28 rounded-lg border th-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={prod.perPerson}
                            onChange={(e) =>
                              updateProduct(
                                idx,
                                "perPerson",
                                e.target.checked
                              )
                            }
                            className="accent-navy w-4 h-4"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={prod.isRequired}
                            onChange={(e) =>
                              updateProduct(
                                idx,
                                "isRequired",
                                e.target.checked
                              )
                            }
                            className="accent-navy w-4 h-4"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          {deleteConfirm?.type === "product" &&
                          deleteConfirm.idx === idx ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => deleteProduct(idx)}
                                className="text-xs text-error font-medium cursor-pointer hover:underline"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(null)}
                                className="text-xs th-text-2 cursor-pointer hover:underline"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteConfirm({ type: "product", idx })
                              }
                              className="th-text-2 hover:text-error transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 th-text-2 text-sm">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No products defined. Click &quot;Add Product&quot; to create one.
            </div>
          )}

          <div className="p-4 border-t th-border flex justify-end">
            <SaveButton saving={saving} saved={saved} onClick={saveProducts} />
          </div>
        </Card>
      )}

      {/* ─── Fields tab ─── */}
      {tab === "fields" && (
        <Card padding={false}>
          <div className="p-6 border-b th-border flex items-center justify-between">
            <CardTitle>⚽ Pitches / Bases</CardTitle>
            <Button size="sm" onClick={addField}>
              <Plus className="w-4 h-4" />
              Add pitch
            </Button>
          </div>
          <div className="divide-y divide-[var(--cat-card-border)]">
            {fields.filter((f) => !f._deleted).length === 0 && (
              <div className="text-center py-10 th-text-2 text-sm">
                No pitches defined. Click &quot;Add pitch&quot; to create one.
              </div>
            )}
            {fields.map((field, idx) =>
              field._deleted ? null : (
                <div key={field.id ?? `new-${idx}`} className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-navy bg-navy/10 rounded-full w-6 h-6 flex items-center justify-center shrink-0">{idx + 1}</span>
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => setFields((prev) => prev.map((f, i) => i === idx ? { ...f, name: e.target.value } : f))}
                      placeholder="Pitch / base name"
                      className="flex-1 rounded-lg border th-border px-3 py-2 text-sm font-medium focus:outline-none focus:border-navy"
                    />
                    <button
                      type="button"
                      onClick={() => setFields((prev) => prev.map((f, i) => i === idx ? { ...f, _deleted: true } : f))}
                      className="th-text-2 hover:text-error transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-9">
                    <input
                      type="text"
                      value={field.address}
                      onChange={(e) => setFields((prev) => prev.map((f, i) => i === idx ? { ...f, address: e.target.value } : f))}
                      placeholder="Address"
                      className="rounded-lg border th-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
                    />
                    <input
                      type="url"
                      value={field.mapUrl}
                      onChange={(e) => setFields((prev) => prev.map((f, i) => i === idx ? { ...f, mapUrl: e.target.value } : f))}
                      placeholder="Map link (Google Maps)"
                      className="rounded-lg border th-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
                    />
                    <input
                      type="url"
                      value={field.scheduleUrl}
                      onChange={(e) => setFields((prev) => prev.map((f, i) => i === idx ? { ...f, scheduleUrl: e.target.value } : f))}
                      placeholder="Schedule / bus link"
                      className="rounded-lg border th-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
                    />
                    <input
                      type="text"
                      value={field.notes}
                      onChange={(e) => setFields((prev) => prev.map((f, i) => i === idx ? { ...f, notes: e.target.value } : f))}
                      placeholder="Additional info"
                      className="rounded-lg border th-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
                    />
                  </div>
                </div>
              )
            )}
          </div>
          <div className="p-4 border-t th-border flex justify-end">
            <SaveButton saving={fieldsSaving} saved={fieldsSaved} onClick={saveFields} />
          </div>
        </Card>
      )}

      {/* ─── Hotels tab ─── */}
      {tab === "hotels" && (
        <Card padding={false}>
          <div className="p-6 border-b th-border flex items-center justify-between">
            <CardTitle>🏨 Hotels</CardTitle>
            <Button size="sm" onClick={addHotel}>
              <Plus className="w-4 h-4" />
              Add hotel
            </Button>
          </div>
          <div className="divide-y divide-[var(--cat-card-border)]">
            {hotels.filter((h) => !h._deleted).length === 0 && (
              <div className="text-center py-10 th-text-2 text-sm">
                No hotels yet. Click &quot;Add hotel&quot; to create one.
              </div>
            )}
            {hotels.map((hotel, idx) =>
              hotel._deleted ? null : (
                <div key={hotel.id ?? `new-${idx}`} className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-navy bg-navy/10 rounded-full w-6 h-6 flex items-center justify-center shrink-0">{idx + 1}</span>
                    <input
                      type="text"
                      value={hotel.name}
                      onChange={(e) => setHotels((prev) => prev.map((h, i) => i === idx ? { ...h, name: e.target.value } : h))}
                      placeholder="Hotel name"
                      className="flex-1 rounded-lg border th-border px-3 py-2 text-sm font-medium focus:outline-none focus:border-navy"
                    />
                    <button
                      type="button"
                      onClick={() => setHotels((prev) => prev.map((h, i) => i === idx ? { ...h, _deleted: true } : h))}
                      className="th-text-2 hover:text-error transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-9">
                    <input
                      type="text"
                      value={hotel.address}
                      onChange={(e) => setHotels((prev) => prev.map((h, i) => i === idx ? { ...h, address: e.target.value } : h))}
                      placeholder="Address"
                      className="rounded-lg border th-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
                    />
                    <input
                      type="text"
                      value={hotel.contactName}
                      onChange={(e) => setHotels((prev) => prev.map((h, i) => i === idx ? { ...h, contactName: e.target.value } : h))}
                      placeholder="Contact person"
                      className="rounded-lg border th-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
                    />
                    <input
                      type="tel"
                      value={hotel.contactPhone}
                      onChange={(e) => setHotels((prev) => prev.map((h, i) => i === idx ? { ...h, contactPhone: e.target.value } : h))}
                      placeholder="Phone"
                      className="rounded-lg border th-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
                    />
                    <input
                      type="email"
                      value={hotel.contactEmail}
                      onChange={(e) => setHotels((prev) => prev.map((h, i) => i === idx ? { ...h, contactEmail: e.target.value } : h))}
                      placeholder="Email"
                      className="rounded-lg border th-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
                    />
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        value={hotel.notes}
                        onChange={(e) => setHotels((prev) => prev.map((h, i) => i === idx ? { ...h, notes: e.target.value } : h))}
                        placeholder="Notes (breakfast, parking, etc.)"
                        className="w-full rounded-lg border th-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
                      />
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
          <div className="p-4 border-t th-border flex justify-end">
            <SaveButton saving={hotelsSaving} saved={hotelsSaved} onClick={saveHotels} />
          </div>
        </Card>
      )}

      {/* ─── Tournament Info ─── */}
      {tab === "info" && (
        <div className="space-y-5">
          {/* Hotel */}
          <Card>
            <CardTitle>🏨 General Hotel Info</CardTitle>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input id="hotelName" label="Hotel name" value={tInfo.hotelName ?? ""} onChange={(e) => setTInfo((p) => ({ ...p, hotelName: e.target.value }))} placeholder="Radisson Blu Hotel" />
              <Input id="hotelAddress" label="Address" value={tInfo.hotelAddress ?? ""} onChange={(e) => setTInfo((p) => ({ ...p, hotelAddress: e.target.value }))} placeholder="Example St. 1, Tallinn" />
              <Input id="hotelCheckIn" label="Check-in time" value={tInfo.hotelCheckIn ?? ""} onChange={(e) => setTInfo((p) => ({ ...p, hotelCheckIn: e.target.value }))} placeholder="14:00, 15 May" />
              <Input id="hotelCheckOut" label="Check-out time" value={tInfo.hotelCheckOut ?? ""} onChange={(e) => setTInfo((p) => ({ ...p, hotelCheckOut: e.target.value }))} placeholder="12:00, 18 May" />
              <div className="md:col-span-2">
                <label className="block text-sm font-medium th-text mb-1.5">Hotel notes</label>
                <textarea
                  rows={2}
                  className="w-full rounded-lg border th-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy resize-none"
                  value={tInfo.hotelNotes ?? ""}
                  onChange={(e) => setTInfo((p) => ({ ...p, hotelNotes: e.target.value }))}
                  placeholder="Breakfast included, free parking..."
                />
              </div>
            </div>
          </Card>

          {/* Venue */}
          <Card>
            <CardTitle>⚽ Venue / Pitches</CardTitle>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input id="venueName" label="Venue name" value={tInfo.venueName ?? ""} onChange={(e) => setTInfo((p) => ({ ...p, venueName: e.target.value }))} placeholder="A. Le Coq Arena" />
              <Input id="venueAddress" label="Address" value={tInfo.venueAddress ?? ""} onChange={(e) => setTInfo((p) => ({ ...p, venueAddress: e.target.value }))} placeholder="Asula 4c, Tallinn" />
              <div className="md:col-span-2">
                <Input id="venueMapUrl" label="Map link (Google Maps / Waze)" value={tInfo.venueMapUrl ?? ""} onChange={(e) => setTInfo((p) => ({ ...p, venueMapUrl: e.target.value }))} placeholder="https://maps.google.com/..." />
              </div>
            </div>
          </Card>

          {/* Meals */}
          <Card>
            <CardTitle>🍽️ Meals</CardTitle>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input id="mealTimes" label="Meal times" value={tInfo.mealTimes ?? ""} onChange={(e) => setTInfo((p) => ({ ...p, mealTimes: e.target.value }))} placeholder="Breakfast 7:30-9:00, Lunch 13:00, Dinner 19:00" />
              <Input id="mealLocation" label="Meal location" value={tInfo.mealLocation ?? ""} onChange={(e) => setTInfo((p) => ({ ...p, mealLocation: e.target.value }))} placeholder="Hotel restaurant, 1st floor" />
              <div className="md:col-span-2">
                <label className="block text-sm font-medium th-text mb-1.5">Meal notes</label>
                <textarea
                  rows={2}
                  className="w-full rounded-lg border th-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy resize-none"
                  value={tInfo.mealNotes ?? ""}
                  onChange={(e) => setTInfo((p) => ({ ...p, mealNotes: e.target.value }))}
                  placeholder="Vegetarian menu available on request..."
                />
              </div>
            </div>
          </Card>

          {/* Schedule */}
          <Card>
            <CardTitle>📅 Schedule</CardTitle>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input id="scheduleUrl" label="Schedule URL" value={tInfo.scheduleUrl ?? ""} onChange={(e) => setTInfo((p) => ({ ...p, scheduleUrl: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="md:col-span-2">
                <Input id="scheduleDescription" label="Description" value={tInfo.scheduleDescription ?? ""} onChange={(e) => setTInfo((p) => ({ ...p, scheduleDescription: e.target.value }))} placeholder="Full match and event schedule" />
              </div>
            </div>
          </Card>

          {/* Emergency & Notes */}
          <Card>
            <CardTitle>🚨 Emergency Contact</CardTitle>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input id="emergencyContact" label="Name / Role" value={tInfo.emergencyContact ?? ""} onChange={(e) => setTInfo((p) => ({ ...p, emergencyContact: e.target.value }))} placeholder="John Smith, organizer" />
              <Input id="emergencyPhone" label="Phone" value={tInfo.emergencyPhone ?? ""} onChange={(e) => setTInfo((p) => ({ ...p, emergencyPhone: e.target.value }))} placeholder="+372 5555 1234" />
              <div className="md:col-span-2">
                <label className="block text-sm font-medium th-text mb-1.5">Additional notes for teams</label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border th-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy resize-none"
                  value={tInfo.additionalNotes ?? ""}
                  onChange={(e) => setTInfo((p) => ({ ...p, additionalNotes: e.target.value }))}
                  placeholder="Important information for all participants..."
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <SaveButton saving={infoSaving} saved={infoSaved} onClick={saveInfo} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
