"use client";

import { useEffect, useState, useCallback, type ChangeEvent } from "react";
import { useAdminFetch } from "@/lib/tournament-context";
import { LangTabs, type Lang } from "@/components/admin/lang-tabs";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Hotel,
  UtensilsCrossed,
  Car,
  BadgeDollarSign,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Check,
  X,
} from "lucide-react";

/* ─────────────────────────────────────────── types */

interface AccommodationOption {
  id: number;
  name: string;
  nameRu: string;
  checkIn: string;
  checkOut: string;
  pricePerPlayer: string;
  pricePerStaff: string;
  pricePerAccompanying: string;
  includedMeals: number;
  mealNote: string | null;
  mealNoteRu: string | null;
}

interface MealOption {
  id: number;
  name: string;
  nameRu: string;
  description: string | null;
  descriptionRu: string | null;
  pricePerPerson: string;
  perDay: boolean;
}

interface TransferOption {
  id: number;
  name: string;
  nameRu: string;
  description: string | null;
  descriptionRu: string | null;
  pricePerPerson: string;
}

interface RegistrationFee {
  id?: number;
  name: string;
  nameRu: string;
  price: string;
  isRequired: boolean;
}

type Tab = "accommodation" | "meals" | "transfers" | "registration";

/* ─────────────────────────────────────────── helpers */

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function formatPrice(val: string | number | null): string {
  if (val === null || val === undefined || val === "") return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return `€${n.toFixed(2)}`;
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

/* ─────────────────────────────────────────── sub-components */

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
          ? ""
          : "th-card th-text-2 hover:th-bg border th-border"
      }`}
      style={active ? { background: "var(--cat-accent)", color: "var(--cat-accent-text)" } : undefined}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function SavedBadge({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
      <Check className="w-3.5 h-3.5" />
      Saved!
    </span>
  );
}

function DeleteConfirm({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onConfirm}
        className="text-xs text-error font-medium cursor-pointer hover:underline"
      >
        Are you sure?
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-xs th-text-2 cursor-pointer hover:underline"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════ ACCOMMODATION TAB */

function AccommodationTab() {
  const adminFetch = useAdminFetch();
  const [items, setItems] = useState<AccommodationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | "new" | null>(null);
  const [lang, setLang] = useState<Lang>("en");

  const emptyForm = {
    name: "",
    nameRu: "",
    checkIn: "",
    checkOut: "",
    pricePerPlayer: "",
    pricePerStaff: "",
    pricePerAccompanying: "",
    includedMeals: 0,
    mealNote: "",
    mealNoteRu: "",
  };

  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/services/accommodation");
      if (!res.ok) throw new Error("Failed to load");
      setItems(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(emptyForm); setEditId("new"); };
  const openEdit = (item: AccommodationOption) => {
    setForm({
      name: item.name,
      nameRu: item.nameRu,
      checkIn: toDateInput(item.checkIn),
      checkOut: toDateInput(item.checkOut),
      pricePerPlayer: item.pricePerPlayer,
      pricePerStaff: item.pricePerStaff,
      pricePerAccompanying: item.pricePerAccompanying,
      includedMeals: item.includedMeals,
      mealNote: item.mealNote ?? "",
      mealNoteRu: item.mealNoteRu ?? "",
    });
    setEditId(item.id);
  };
  const cancelEdit = () => { setEditId(null); setForm(emptyForm); };

  const saveForm = async () => {
    setSaving(true);
    setError(null);
    try {
      const isNew = editId === "new";
      const url = isNew
        ? "/api/admin/services/accommodation"
        : `/api/admin/services/accommodation/${editId}`;
      const res = await adminFetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      await load();
      setEditId(null);
      setForm(emptyForm);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (id: number) => {
    try {
      const res = await adminFetch(`/api/admin/services/accommodation/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setDeleteId(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    }
  };

  const setField = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <Card padding={false}>
      <div className="p-6 border-b th-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CardTitle>Accommodation</CardTitle>
          <SavedBadge visible={saved} />
        </div>
        {editId === null && (
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4" /> Add option
          </Button>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg bg-red-50 border border-error/20 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {editId !== null && (
        <div className="p-6 border-b th-border th-bg/40">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold th-text">
              {editId === "new" ? "Add option" : "Edit option"}
            </p>
            <LangTabs lang={lang} onChange={setLang} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lang === "en" ? (
              <Input id="acc-name" label="Name" value={form.name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setField("name", e.target.value)} />
            ) : (
              <Input id="acc-nameRu" label="Name" value={form.nameRu}
                placeholder="Leave empty to use English"
                onChange={(e: ChangeEvent<HTMLInputElement>) => setField("nameRu", e.target.value)} />
            )}
            <Input id="acc-checkIn" label="Check-in" type="date" value={form.checkIn}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setField("checkIn", e.target.value)} />
            <Input id="acc-checkOut" label="Check-out" type="date" value={form.checkOut}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setField("checkOut", e.target.value)} />
            <Input id="acc-pricePlayer" label="Price/Player" type="number" step="0.01"
              value={form.pricePerPlayer} onChange={(e: ChangeEvent<HTMLInputElement>) => setField("pricePerPlayer", e.target.value)} />
            <Input id="acc-priceStaff" label="Price/Staff" type="number" step="0.01"
              value={form.pricePerStaff} onChange={(e: ChangeEvent<HTMLInputElement>) => setField("pricePerStaff", e.target.value)} />
            <Input id="acc-priceAccomp" label="Price/Accompanying" type="number" step="0.01"
              value={form.pricePerAccompanying}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setField("pricePerAccompanying", e.target.value)} />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium th-text">
                Meals included in package
              </label>
              <input
                type="number"
                min="0"
                value={form.includedMeals}
                onChange={(e) => setField("includedMeals", Number(e.target.value))}
                className="w-full rounded-lg border th-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
              />
            </div>
            {lang === "en" ? (
              <Input id="acc-mealNote" label="Meal note" value={form.mealNote}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setField("mealNote", e.target.value)} />
            ) : (
              <Input id="acc-mealNoteRu" label="Meal note" value={form.mealNoteRu}
                placeholder="Leave empty to use English"
                onChange={(e: ChangeEvent<HTMLInputElement>) => setField("mealNoteRu", e.target.value)} />
            )}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={saveForm} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save
            </Button>
            <Button variant="secondary" onClick={cancelEdit} disabled={saving}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b th-border text-left">
                {["Name", "Name (RU)", "Check-in", "Check-out", "€/Player", "€/Staff", "€/Accompanying", "Meals", ""].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-xs font-medium th-text-2 uppercase whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b th-border last:border-0 hover:th-bg/50">
                  <td className="px-4 py-3 text-sm th-text font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-sm th-text-2">{item.nameRu}</td>
                  <td className="px-4 py-3 text-sm th-text-2 whitespace-nowrap">{formatDate(item.checkIn)}</td>
                  <td className="px-4 py-3 text-sm th-text-2 whitespace-nowrap">{formatDate(item.checkOut)}</td>
                  <td className="px-4 py-3 text-sm th-text-2 whitespace-nowrap">{formatPrice(item.pricePerPlayer)}</td>
                  <td className="px-4 py-3 text-sm th-text-2 whitespace-nowrap">{formatPrice(item.pricePerStaff)}</td>
                  <td className="px-4 py-3 text-sm th-text-2 whitespace-nowrap">{formatPrice(item.pricePerAccompanying)}</td>
                  <td className="px-4 py-3 text-sm th-text-2 text-center">{item.includedMeals}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {deleteId === item.id ? (
                        <DeleteConfirm onConfirm={() => doDelete(item.id)} onCancel={() => setDeleteId(null)} />
                      ) : (
                        <>
                          <button type="button" onClick={() => openEdit(item)}
                            className="th-text-2 hover:opacity-80 transition-colors cursor-pointer">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => setDeleteId(item.id)}
                            className="th-text-2 hover:text-error transition-colors cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !editId && (
          <div className="text-center py-12 th-text-2 text-sm">
            <Hotel className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No options yet
          </div>
        )
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════ MEALS TAB */

function MealsTab() {
  const adminFetch = useAdminFetch();
  const [items, setItems] = useState<MealOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | "new" | null>(null);
  const [lang, setLang] = useState<Lang>("en");

  const emptyForm = { name: "", nameRu: "", description: "", descriptionRu: "", pricePerPerson: "", perDay: false };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/services/meals");
      if (!res.ok) throw new Error("Failed to load");
      setItems(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(emptyForm); setEditId("new"); };
  const openEdit = (item: MealOption) => {
    setForm({ name: item.name, nameRu: item.nameRu, description: item.description ?? "",
      descriptionRu: item.descriptionRu ?? "", pricePerPerson: item.pricePerPerson, perDay: item.perDay });
    setEditId(item.id);
  };
  const cancelEdit = () => { setEditId(null); setForm(emptyForm); };

  const saveForm = async () => {
    setSaving(true);
    setError(null);
    try {
      const isNew = editId === "new";
      const url = isNew ? "/api/admin/services/meals" : `/api/admin/services/meals/${editId}`;
      const res = await adminFetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      await load();
      setEditId(null);
      setForm(emptyForm);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (id: number) => {
    try {
      const res = await adminFetch(`/api/admin/services/meals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setDeleteId(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    }
  };

  const setField = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }

  return (
    <Card padding={false}>
      <div className="p-6 border-b th-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CardTitle>Extra Meals</CardTitle>
          <SavedBadge visible={saved} />
        </div>
        {editId === null && (
          <Button size="sm" onClick={openNew}><Plus className="w-4 h-4" /> Add option</Button>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg bg-red-50 border border-error/20 px-4 py-3 text-sm text-error">{error}</div>
      )}

      {editId !== null && (
        <div className="p-6 border-b th-border th-bg/40">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold th-text">
              {editId === "new" ? "Add option" : "Edit option"}
            </p>
            <LangTabs lang={lang} onChange={setLang} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lang === "en" ? (
              <Input id="meal-name" label="Name" value={form.name} onChange={(e: ChangeEvent<HTMLInputElement>) => setField("name", e.target.value)} />
            ) : (
              <Input id="meal-nameRu" label="Name" value={form.nameRu} placeholder="Leave empty to use English" onChange={(e: ChangeEvent<HTMLInputElement>) => setField("nameRu", e.target.value)} />
            )}
            {lang === "en" ? (
              <Input id="meal-desc" label="Description" value={form.description} onChange={(e: ChangeEvent<HTMLInputElement>) => setField("description", e.target.value)} />
            ) : (
              <Input id="meal-descRu" label="Description" value={form.descriptionRu} placeholder="Leave empty to use English" onChange={(e: ChangeEvent<HTMLInputElement>) => setField("descriptionRu", e.target.value)} />
            )}
            <Input id="meal-price" label="Price/Person" type="number" step="0.01"
              value={form.pricePerPerson} onChange={(e) => setField("pricePerPerson", e.target.value)} />
            <div className="flex items-center gap-3 pt-6">
              <input type="checkbox" id="meal-perDay" checked={form.perDay}
                onChange={(e) => setField("perDay", e.target.checked)}
                className="accent-navy w-4 h-4" />
              <label htmlFor="meal-perDay" className="text-sm font-medium th-text cursor-pointer">
                Per day
              </label>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={saveForm} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save
            </Button>
            <Button variant="secondary" onClick={cancelEdit} disabled={saving}><X className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b th-border text-left">
                {["Name", "Name (RU)", "Price/Person", "Per day", ""].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-xs font-medium th-text-2 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b th-border last:border-0 hover:th-bg/50">
                  <td className="px-4 py-3 text-sm th-text font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-sm th-text-2">{item.nameRu}</td>
                  <td className="px-4 py-3 text-sm th-text-2 whitespace-nowrap">{formatPrice(item.pricePerPerson)}</td>
                  <td className="px-4 py-3 text-center">
                    {item.perDay ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : <span className="th-text-2/40">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {deleteId === item.id ? (
                        <DeleteConfirm onConfirm={() => doDelete(item.id)} onCancel={() => setDeleteId(null)} />
                      ) : (
                        <>
                          <button type="button" onClick={() => openEdit(item)}
                            className="th-text-2 hover:opacity-80 transition-colors cursor-pointer">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => setDeleteId(item.id)}
                            className="th-text-2 hover:text-error transition-colors cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !editId && (
          <div className="text-center py-12 th-text-2 text-sm">
            <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No options yet
          </div>
        )
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════ TRANSFERS TAB */

function TransfersTab() {
  const adminFetch = useAdminFetch();
  const [items, setItems] = useState<TransferOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | "new" | null>(null);
  const [lang, setLang] = useState<Lang>("en");

  const emptyForm = { name: "", nameRu: "", description: "", descriptionRu: "", pricePerPerson: "" };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/services/transfers");
      if (!res.ok) throw new Error("Failed to load");
      setItems(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(emptyForm); setEditId("new"); };
  const openEdit = (item: TransferOption) => {
    setForm({ name: item.name, nameRu: item.nameRu, description: item.description ?? "",
      descriptionRu: item.descriptionRu ?? "", pricePerPerson: item.pricePerPerson });
    setEditId(item.id);
  };
  const cancelEdit = () => { setEditId(null); setForm(emptyForm); };

  const saveForm = async () => {
    setSaving(true);
    setError(null);
    try {
      const isNew = editId === "new";
      const url = isNew ? "/api/admin/services/transfers" : `/api/admin/services/transfers/${editId}`;
      const res = await adminFetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      await load();
      setEditId(null);
      setForm(emptyForm);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (id: number) => {
    try {
      const res = await adminFetch(`/api/admin/services/transfers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setDeleteId(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    }
  };

  const setField = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }

  return (
    <Card padding={false}>
      <div className="p-6 border-b th-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CardTitle>Transfers</CardTitle>
          <SavedBadge visible={saved} />
        </div>
        {editId === null && (
          <Button size="sm" onClick={openNew}><Plus className="w-4 h-4" /> Add option</Button>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg bg-red-50 border border-error/20 px-4 py-3 text-sm text-error">{error}</div>
      )}

      {editId !== null && (
        <div className="p-6 border-b th-border th-bg/40">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold th-text">
              {editId === "new" ? "Add option" : "Edit option"}
            </p>
            <LangTabs lang={lang} onChange={setLang} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lang === "en" ? (
              <Input id="tr-name" label="Name" value={form.name} onChange={(e: ChangeEvent<HTMLInputElement>) => setField("name", e.target.value)} />
            ) : (
              <Input id="tr-nameRu" label="Name" value={form.nameRu} placeholder="Leave empty to use English" onChange={(e: ChangeEvent<HTMLInputElement>) => setField("nameRu", e.target.value)} />
            )}
            {lang === "en" ? (
              <Input id="tr-desc" label="Description" value={form.description} onChange={(e: ChangeEvent<HTMLInputElement>) => setField("description", e.target.value)} />
            ) : (
              <Input id="tr-descRu" label="Description" value={form.descriptionRu} placeholder="Leave empty to use English" onChange={(e: ChangeEvent<HTMLInputElement>) => setField("descriptionRu", e.target.value)} />
            )}
            <Input id="tr-price" label="Price/Team" type="number" step="0.01"
              value={form.pricePerPerson} onChange={(e) => setField("pricePerPerson", e.target.value)} />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={saveForm} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save
            </Button>
            <Button variant="secondary" onClick={cancelEdit} disabled={saving}><X className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b th-border text-left">
                {["Name", "Name (RU)", "Description", "Price/Team", ""].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-xs font-medium th-text-2 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b th-border last:border-0 hover:th-bg/50">
                  <td className="px-4 py-3 text-sm th-text font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-sm th-text-2">{item.nameRu}</td>
                  <td className="px-4 py-3 text-sm th-text-2 max-w-xs truncate">{item.description ?? "—"}</td>
                  <td className="px-4 py-3 text-sm th-text-2 whitespace-nowrap">{formatPrice(item.pricePerPerson)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {deleteId === item.id ? (
                        <DeleteConfirm onConfirm={() => doDelete(item.id)} onCancel={() => setDeleteId(null)} />
                      ) : (
                        <>
                          <button type="button" onClick={() => openEdit(item)}
                            className="th-text-2 hover:opacity-80 transition-colors cursor-pointer">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => setDeleteId(item.id)}
                            className="th-text-2 hover:text-error transition-colors cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !editId && (
          <div className="text-center py-12 th-text-2 text-sm">
            <Car className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No options yet
          </div>
        )
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════ REGISTRATION FEE TAB */

function RegistrationTab() {
  const adminFetch = useAdminFetch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", nameRu: "", price: "", isRequired: true });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/services/registration");
      if (!res.ok) throw new Error("Failed to load");
      const data: RegistrationFee = await res.json();
      setForm({ name: data.name ?? "", nameRu: data.nameRu ?? "", price: data.price ?? "", isRequired: data.isRequired ?? true });
    } catch {
      // no existing record is OK
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveForm = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/services/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const setField = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-6">
        <CardTitle>Registration Fee</CardTitle>
        <SavedBadge visible={saved} />
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-error/20 px-4 py-3 text-sm text-error">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-xl">
        <Input id="reg-name" label="Name" value={form.name} onChange={(e) => setField("name", e.target.value)} />
        <Input id="reg-nameRu" label="Name (RU)" value={form.nameRu} onChange={(e) => setField("nameRu", e.target.value)} />
        <Input id="reg-price" label="Price (€)" type="number" step="0.01"
          value={form.price} onChange={(e) => setField("price", e.target.value)} />
        <div className="flex items-center gap-3 pt-6">
          <input type="checkbox" id="reg-required" checked={form.isRequired}
            onChange={(e) => setField("isRequired", e.target.checked)}
            className="accent-navy w-4 h-4" />
          <label htmlFor="reg-required" className="text-sm font-medium th-text cursor-pointer">
            Required
          </label>
        </div>
      </div>

      <div className="mt-6">
        <Button onClick={saveForm} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save
        </Button>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════ PAGE */

export function ServicesPageContent() {
  const [tab, setTab] = useState<Tab>("accommodation");

  return (
    <div className="space-y-6 w-full">
      <h1 className="text-2xl font-bold th-text">Services & Pricing</h1>

      <div className="flex flex-wrap gap-2">
        <SectionTab active={tab === "accommodation"} onClick={() => setTab("accommodation")} icon={Hotel} label="Accommodation" />
        <SectionTab active={tab === "meals"} onClick={() => setTab("meals")} icon={UtensilsCrossed} label="Extra Meals" />
        <SectionTab active={tab === "transfers"} onClick={() => setTab("transfers")} icon={Car} label="Transfers" />
        <SectionTab active={tab === "registration"} onClick={() => setTab("registration")} icon={BadgeDollarSign} label="Registration Fee" />
      </div>

      {tab === "accommodation" && <AccommodationTab />}
      {tab === "meals" && <MealsTab />}
      {tab === "transfers" && <TransfersTab />}
      {tab === "registration" && <RegistrationTab />}
    </div>
  );
}
