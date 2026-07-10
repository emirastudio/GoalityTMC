"use client";

import { useEffect, useState, useCallback, type ChangeEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAdminFetch } from "@/lib/tournament-context";
import { Card, CardTitle } from "@/components/ui/card";
import { MultilangInput } from "@/components/ui/multilang-input";
import { multilangFromRow, multilangToPayload, pickLocaleText, type MultilangValue } from "@/lib/i18n-text";
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
  nameRu: string | null;
  nameEt: string | null;
  nameEs: string | null;
  checkIn: string;
  checkOut: string;
  pricePerPlayer: string;
  pricePerStaff: string;
  pricePerAccompanying: string;
  includedMeals: number;
  mealNote: string | null;
  mealNoteRu: string | null;
  mealNoteEt: string | null;
  mealNoteEs: string | null;
}

interface MealOption {
  id: number;
  name: string;
  nameRu: string | null;
  nameEt: string | null;
  nameEs: string | null;
  description: string | null;
  descriptionRu: string | null;
  descriptionEt: string | null;
  descriptionEs: string | null;
  pricePerPerson: string;
  perDay: boolean;
}

interface TransferOption {
  id: number;
  name: string;
  nameRu: string | null;
  nameEt: string | null;
  nameEs: string | null;
  description: string | null;
  descriptionRu: string | null;
  descriptionEt: string | null;
  descriptionEs: string | null;
  pricePerPerson: string;
}

interface RegistrationFee {
  id?: number;
  name: string;
  nameRu: string | null;
  nameEt: string | null;
  nameEs: string | null;
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

function SavedBadge({ visible, label }: { visible: boolean; label: string }) {
  if (!visible) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
      <Check className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

function DeleteConfirm({
  onConfirm,
  onCancel,
  label,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onConfirm}
        className="text-xs text-error font-medium cursor-pointer hover:underline"
      >
        {label}
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
  const t = useTranslations("orgAdmin.svc");
  const locale = useLocale();
  const adminFetch = useAdminFetch();
  const [items, setItems] = useState<AccommodationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | "new" | null>(null);

  const emptyForm: {
    nameML: MultilangValue;
    checkIn: string;
    checkOut: string;
    pricePerPlayer: string;
    pricePerStaff: string;
    pricePerAccompanying: string;
    includedMeals: number;
    mealNoteML: MultilangValue;
  } = {
    nameML: { en: "", ru: "", et: "", es: "" },
    checkIn: "",
    checkOut: "",
    pricePerPlayer: "",
    pricePerStaff: "",
    pricePerAccompanying: "",
    includedMeals: 0,
    mealNoteML: { en: "", ru: "", et: "", es: "" },
  };

  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/services/accommodation");
      if (!res.ok) throw new Error(t("loadFailed"));
      setItems(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("genericError"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(emptyForm); setEditId("new"); };
  const openEdit = (item: AccommodationOption) => {
    setForm({
      nameML: multilangFromRow(item as unknown as Record<string, unknown>, "name"),
      checkIn: toDateInput(item.checkIn),
      checkOut: toDateInput(item.checkOut),
      pricePerPlayer: item.pricePerPlayer,
      pricePerStaff: item.pricePerStaff,
      pricePerAccompanying: item.pricePerAccompanying,
      includedMeals: item.includedMeals,
      mealNoteML: multilangFromRow(item as unknown as Record<string, unknown>, "mealNote"),
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
      // Раскладываем multilang в плоские поля name/nameRu/nameEt/nameEs
      // плюс mealNote*-варианты — на сервере их подхватывают POST + PATCH.
      const { nameML, mealNoteML, ...rest } = form;
      const body = {
        ...rest,
        ...multilangToPayload("name", nameML),
        ...multilangToPayload("mealNote", mealNoteML),
      };
      const res = await adminFetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(t("saveFailed"));
      await load();
      setEditId(null);
      setForm(emptyForm);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("genericError"));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (id: number) => {
    try {
      const res = await adminFetch(`/api/admin/services/accommodation/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(t("deleteFailed"));
      setDeleteId(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("genericError"));
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
          <CardTitle>{t("accommodation")}</CardTitle>
          <SavedBadge visible={saved} label={t("saved")} />
        </div>
        {editId === null && (
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4" /> {t("addOption")}
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
          <p className="text-sm font-semibold th-text mb-4">
            {editId === "new" ? t("addOption") : t("editOption")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Имя в 4 локали через единый MultilangInput с табами EN/RU/ET/ES. */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium th-text mb-1">{t("name")}</label>
              <MultilangInput
                value={form.nameML}
                onChange={(nameML) => setForm((f) => ({ ...f, nameML }))}
                required
              />
            </div>
            <Input id="acc-checkIn" label={t("checkIn")} type="date" value={form.checkIn}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setField("checkIn", e.target.value)} />
            <Input id="acc-checkOut" label={t("checkOut")} type="date" value={form.checkOut}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setField("checkOut", e.target.value)} />
            <Input id="acc-pricePlayer" label={t("pricePlayer")} type="number" step="0.01"
              value={form.pricePerPlayer} onChange={(e: ChangeEvent<HTMLInputElement>) => setField("pricePerPlayer", e.target.value)} />
            <Input id="acc-priceStaff" label={t("priceStaff")} type="number" step="0.01"
              value={form.pricePerStaff} onChange={(e: ChangeEvent<HTMLInputElement>) => setField("pricePerStaff", e.target.value)} />
            <Input id="acc-priceAccomp" label={t("priceAccompanying")} type="number" step="0.01"
              value={form.pricePerAccompanying}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setField("pricePerAccompanying", e.target.value)} />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium th-text">
                {t("mealsIncluded")}
              </label>
              <input
                type="number"
                min="0"
                value={form.includedMeals}
                onChange={(e) => setField("includedMeals", Number(e.target.value))}
                className="w-full rounded-lg border th-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium th-text mb-1">{t("mealNote")}</label>
              <MultilangInput
                value={form.mealNoteML}
                onChange={(mealNoteML) => setForm((f) => ({ ...f, mealNoteML }))}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={saveForm} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t("save")}
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
                {[t("name"), t("checkIn"), t("checkOut"), t("pricePlayer"), t("priceStaff"), t("priceAccompanying"), t("mealsCol"), ""].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-xs font-medium th-text-2 uppercase whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b th-border last:border-0 hover:th-bg/50">
                  <td className="px-4 py-3 text-sm th-text font-medium">
                    {pickLocaleText(item as unknown as Record<string, unknown>, locale, "name") || item.name}
                  </td>
                  <td className="px-4 py-3 text-sm th-text-2 whitespace-nowrap">{formatDate(item.checkIn)}</td>
                  <td className="px-4 py-3 text-sm th-text-2 whitespace-nowrap">{formatDate(item.checkOut)}</td>
                  <td className="px-4 py-3 text-sm th-text-2 whitespace-nowrap">{formatPrice(item.pricePerPlayer)}</td>
                  <td className="px-4 py-3 text-sm th-text-2 whitespace-nowrap">{formatPrice(item.pricePerStaff)}</td>
                  <td className="px-4 py-3 text-sm th-text-2 whitespace-nowrap">{formatPrice(item.pricePerAccompanying)}</td>
                  <td className="px-4 py-3 text-sm th-text-2 text-center">{item.includedMeals}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {deleteId === item.id ? (
                        <DeleteConfirm onConfirm={() => doDelete(item.id)} onCancel={() => setDeleteId(null)} label={t("deleteConfirm")} />
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
            {t("noOptionsYet")}
          </div>
        )
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════ MEALS TAB */

function MealsTab() {
  const t = useTranslations("orgAdmin.svc");
  const locale = useLocale();
  const adminFetch = useAdminFetch();
  const [items, setItems] = useState<MealOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | "new" | null>(null);

  const emptyForm: {
    nameML: MultilangValue;
    descriptionML: MultilangValue;
    pricePerPerson: string;
    perDay: boolean;
  } = {
    nameML: { en: "", ru: "", et: "", es: "" },
    descriptionML: { en: "", ru: "", et: "", es: "" },
    pricePerPerson: "",
    perDay: false,
  };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/services/meals");
      if (!res.ok) throw new Error(t("loadFailed"));
      setItems(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("genericError"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(emptyForm); setEditId("new"); };
  const openEdit = (item: MealOption) => {
    setForm({
      nameML: multilangFromRow(item as unknown as Record<string, unknown>, "name"),
      descriptionML: multilangFromRow(item as unknown as Record<string, unknown>, "description"),
      pricePerPerson: item.pricePerPerson,
      perDay: item.perDay,
    });
    setEditId(item.id);
  };
  const cancelEdit = () => { setEditId(null); setForm(emptyForm); };

  const saveForm = async () => {
    setSaving(true);
    setError(null);
    try {
      const isNew = editId === "new";
      const url = isNew ? "/api/admin/services/meals" : `/api/admin/services/meals/${editId}`;
      const { nameML, descriptionML, ...rest } = form;
      const body = {
        ...rest,
        ...multilangToPayload("name", nameML),
        ...multilangToPayload("description", descriptionML),
      };
      const res = await adminFetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(t("saveFailed"));
      await load();
      setEditId(null);
      setForm(emptyForm);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("genericError"));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (id: number) => {
    try {
      const res = await adminFetch(`/api/admin/services/meals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(t("deleteFailed"));
      setDeleteId(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("genericError"));
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
          <CardTitle>{t("meals")}</CardTitle>
          <SavedBadge visible={saved} label={t("saved")} />
        </div>
        {editId === null && (
          <Button size="sm" onClick={openNew}><Plus className="w-4 h-4" /> {t("addOption")}</Button>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg bg-red-50 border border-error/20 px-4 py-3 text-sm text-error">{error}</div>
      )}

      {editId !== null && (
        <div className="p-6 border-b th-border th-bg/40">
          <p className="text-sm font-semibold th-text mb-4">
            {editId === "new" ? t("addOption") : t("editOption")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium th-text mb-1">{t("name")}</label>
              <MultilangInput
                value={form.nameML}
                onChange={(nameML) => setForm((f) => ({ ...f, nameML }))}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium th-text mb-1">{t("description")}</label>
              <MultilangInput
                value={form.descriptionML}
                onChange={(descriptionML) => setForm((f) => ({ ...f, descriptionML }))}
              />
            </div>
            <Input id="meal-price" label={t("pricePerPerson")} type="number" step="0.01"
              value={form.pricePerPerson} onChange={(e) => setField("pricePerPerson", e.target.value)} />
            <div className="flex items-center gap-3 pt-6">
              <input type="checkbox" id="meal-perDay" checked={form.perDay}
                onChange={(e) => setField("perDay", e.target.checked)}
                className="accent-navy w-4 h-4" />
              <label htmlFor="meal-perDay" className="text-sm font-medium th-text cursor-pointer">
                {t("perDay")}
              </label>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={saveForm} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t("save")}
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
                {[t("name"), t("pricePerPerson"), t("perDay"), ""].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-xs font-medium th-text-2 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b th-border last:border-0 hover:th-bg/50">
                  <td className="px-4 py-3 text-sm th-text font-medium">
                    {pickLocaleText(item as unknown as Record<string, unknown>, locale, "name") || item.name}
                  </td>
                  <td className="px-4 py-3 text-sm th-text-2 whitespace-nowrap">{formatPrice(item.pricePerPerson)}</td>
                  <td className="px-4 py-3 text-center">
                    {item.perDay ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : <span className="th-text-2/40">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {deleteId === item.id ? (
                        <DeleteConfirm onConfirm={() => doDelete(item.id)} onCancel={() => setDeleteId(null)} label={t("deleteConfirm")} />
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
            {t("noOptionsYet")}
          </div>
        )
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════ TRANSFERS TAB */

function TransfersTab() {
  const t = useTranslations("orgAdmin.svc");
  const locale = useLocale();
  const adminFetch = useAdminFetch();
  const [items, setItems] = useState<TransferOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | "new" | null>(null);

  const emptyForm: {
    nameML: MultilangValue;
    descriptionML: MultilangValue;
    pricePerPerson: string;
  } = {
    nameML: { en: "", ru: "", et: "", es: "" },
    descriptionML: { en: "", ru: "", et: "", es: "" },
    pricePerPerson: "",
  };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/services/transfers");
      if (!res.ok) throw new Error(t("loadFailed"));
      setItems(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("genericError"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(emptyForm); setEditId("new"); };
  const openEdit = (item: TransferOption) => {
    setForm({
      nameML: multilangFromRow(item as unknown as Record<string, unknown>, "name"),
      descriptionML: multilangFromRow(item as unknown as Record<string, unknown>, "description"),
      pricePerPerson: item.pricePerPerson,
    });
    setEditId(item.id);
  };
  const cancelEdit = () => { setEditId(null); setForm(emptyForm); };

  const saveForm = async () => {
    setSaving(true);
    setError(null);
    try {
      const isNew = editId === "new";
      const url = isNew ? "/api/admin/services/transfers" : `/api/admin/services/transfers/${editId}`;
      const { nameML, descriptionML, ...rest } = form;
      const body = {
        ...rest,
        ...multilangToPayload("name", nameML),
        ...multilangToPayload("description", descriptionML),
      };
      const res = await adminFetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(t("saveFailed"));
      await load();
      setEditId(null);
      setForm(emptyForm);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("genericError"));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (id: number) => {
    try {
      const res = await adminFetch(`/api/admin/services/transfers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(t("deleteFailed"));
      setDeleteId(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("genericError"));
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
          <CardTitle>{t("transfers")}</CardTitle>
          <SavedBadge visible={saved} label={t("saved")} />
        </div>
        {editId === null && (
          <Button size="sm" onClick={openNew}><Plus className="w-4 h-4" /> {t("addOption")}</Button>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg bg-red-50 border border-error/20 px-4 py-3 text-sm text-error">{error}</div>
      )}

      {editId !== null && (
        <div className="p-6 border-b th-border th-bg/40">
          <p className="text-sm font-semibold th-text mb-4">
            {editId === "new" ? t("addOption") : t("editOption")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium th-text mb-1">{t("name")}</label>
              <MultilangInput
                value={form.nameML}
                onChange={(nameML) => setForm((f) => ({ ...f, nameML }))}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium th-text mb-1">{t("description")}</label>
              <MultilangInput
                value={form.descriptionML}
                onChange={(descriptionML) => setForm((f) => ({ ...f, descriptionML }))}
              />
            </div>
            <Input id="tr-price" label={t("pricePerTeam")} type="number" step="0.01"
              value={form.pricePerPerson} onChange={(e) => setField("pricePerPerson", e.target.value)} />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={saveForm} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t("save")}
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
                {[t("name"), t("description"), t("pricePerTeam"), ""].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-xs font-medium th-text-2 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b th-border last:border-0 hover:th-bg/50">
                  <td className="px-4 py-3 text-sm th-text font-medium">
                    {pickLocaleText(item as unknown as Record<string, unknown>, locale, "name") || item.name}
                  </td>
                  <td className="px-4 py-3 text-sm th-text-2 max-w-xs truncate">
                    {pickLocaleText(item as unknown as Record<string, unknown>, locale, "description") || item.description || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm th-text-2 whitespace-nowrap">{formatPrice(item.pricePerPerson)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {deleteId === item.id ? (
                        <DeleteConfirm onConfirm={() => doDelete(item.id)} onCancel={() => setDeleteId(null)} label={t("deleteConfirm")} />
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
            {t("noOptionsYet")}
          </div>
        )
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════ REGISTRATION FEE TAB */

function RegistrationTab() {
  const t = useTranslations("orgAdmin.svc");
  const adminFetch = useAdminFetch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{
    nameML: MultilangValue;
    price: string;
    isRequired: boolean;
  }>({
    nameML: { en: "", ru: "", et: "", es: "" },
    price: "",
    isRequired: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/services/registration");
      if (!res.ok) throw new Error(t("loadFailed"));
      const data: RegistrationFee = await res.json();
      setForm({
        nameML: multilangFromRow(data as unknown as Record<string, unknown>, "name"),
        price: data.price ?? "",
        isRequired: data.isRequired ?? true,
      });
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
      const { nameML, ...rest } = form;
      const body = {
        ...rest,
        ...multilangToPayload("name", nameML),
      };
      const res = await adminFetch("/api/admin/services/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(t("saveFailed"));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("genericError"));
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
        <CardTitle>{t("registrationFee")}</CardTitle>
        <SavedBadge visible={saved} label={t("saved")} />
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-error/20 px-4 py-3 text-sm text-error">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-xl">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium th-text mb-1">{t("name")}</label>
          <MultilangInput
            value={form.nameML}
            onChange={(nameML) => setForm((f) => ({ ...f, nameML }))}
            required
          />
        </div>
        <Input id="reg-price" label={t("price")} type="number" step="0.01"
          value={form.price} onChange={(e) => setField("price", e.target.value)} />
        <div className="flex items-center gap-3 pt-6">
          <input type="checkbox" id="reg-required" checked={form.isRequired}
            onChange={(e) => setField("isRequired", e.target.checked)}
            className="accent-navy w-4 h-4" />
          <label htmlFor="reg-required" className="text-sm font-medium th-text cursor-pointer">
            {t("required")}
          </label>
        </div>
      </div>

      <div className="mt-6">
        <Button onClick={saveForm} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {t("save")}
        </Button>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════ PAGE */

export function ServicesPageContent() {
  const t = useTranslations("orgAdmin.svc");
  const [tab, setTab] = useState<Tab>("accommodation");

  return (
    <div className="space-y-6 w-full">
      <h1 className="text-2xl font-bold th-text">{t("title")}</h1>

      <div className="flex flex-wrap gap-2">
        <SectionTab active={tab === "accommodation"} onClick={() => setTab("accommodation")} icon={Hotel} label={t("accommodation")} />
        <SectionTab active={tab === "meals"} onClick={() => setTab("meals")} icon={UtensilsCrossed} label={t("meals")} />
        <SectionTab active={tab === "transfers"} onClick={() => setTab("transfers")} icon={Car} label={t("transfers")} />
        <SectionTab active={tab === "registration"} onClick={() => setTab("registration")} icon={BadgeDollarSign} label={t("registrationFee")} />
      </div>

      {tab === "accommodation" && <AccommodationTab />}
      {tab === "meals" && <MealsTab />}
      {tab === "transfers" && <TransfersTab />}
      {tab === "registration" && <RegistrationTab />}
    </div>
  );
}
