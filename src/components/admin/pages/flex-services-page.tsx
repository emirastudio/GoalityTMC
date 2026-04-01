"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useAdminFetch } from "@/lib/tournament-context";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Package,
  Layers,
  Loader2,
  Pencil,
  Check,
  X,
} from "lucide-react";

/* ─────────────────────────────────────────── types */

interface Service {
  id: number;
  name: string;
  nameRu: string | null;
  nameEt: string | null;
  sortOrder: number;
}

interface PackageData {
  id: number;
  name: string;
  nameRu: string | null;
  nameEt: string | null;
  description: string | null;
  isDefault: boolean;
  itemsCount: number;
  assignedTeams: number;
}

interface PackageItem {
  id: number;
  serviceId: number;
  serviceName: string;
  details: string | null;
  pricingMode: string;
  price: string;
  days: number | null;
  quantity: number | null;
  sortOrder: number;
}

type Tab = "services" | "packages";

/* ─────────────────────────────────────────── shared helpers */

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
          : "bg-white text-text-secondary hover:bg-surface border border-border"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <span>{message}</span>
      <button type="button" onClick={onDismiss} className="cursor-pointer shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────── ServiceTypesTab */

function ServiceTypesTab() {
  const t = useTranslations("flexServices");
  const adminFetch = useAdminFetch();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const loadServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/services2");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("errors.loadFailed"));
      }
      setServices(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [adminFetch, t]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const addService = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/services2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("errors.addFailed"));
      }
      setNewName("");
      await loadServices();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("errors.addFailed"));
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (svc: Service) => {
    setEditId(svc.id);
    setEditName(svc.name);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName("");
  };

  const saveEdit = async () => {
    if (!editName.trim() || editId === null) return;
    setSaving(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/services2", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, name: editName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("errors.saveFailed"));
      }
      cancelEdit();
      await loadServices();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (id: number) => {
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/services2?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("errors.deleteFailed"));
      }
      setDeleteId(null);
      await loadServices();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("errors.deleteFailed"));
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
        {t("services.title")}
      </h2>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Add form */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addService()}
          placeholder={t("services.namePlaceholder")}
          className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-navy/30"
        />
        <button
          type="button"
          onClick={addService}
          disabled={adding || !newName.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 transition-colors disabled:opacity-40 cursor-pointer"
        >
          {adding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {t("services.add")}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">{t("loading")}</span>
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-xl border border-border bg-white shadow-sm px-6 py-12 text-center">
          <Layers className="w-8 h-8 text-text-secondary/40 mx-auto mb-3" />
          <p className="text-sm text-text-secondary">{t("services.empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {services.map((svc) => (
            <div
              key={svc.id}
              className="rounded-xl border border-border bg-white shadow-sm p-4 flex items-center justify-between gap-3"
            >
              {editId === svc.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="flex-1 rounded-md border border-border bg-white px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-navy/30"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={saving}
                    className="inline-flex items-center gap-1 text-xs font-medium text-navy hover:text-navy/80 cursor-pointer"
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    {t("save")}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="text-xs text-text-secondary cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-sm text-navy">{svc.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(svc)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-navy transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {t("edit")}
                    </button>
                    {deleteId === svc.id ? (
                      <span className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => deleteService(svc.id)}
                          className="text-xs font-medium text-error cursor-pointer hover:underline"
                        >
                          {t("confirmDelete")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(null)}
                          className="text-xs text-text-secondary cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteId(svc.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-error transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t("delete")}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────── PackageItemsSection */

function PackageItemsSection({
  packageId,
  services,
}: {
  packageId: number;
  services: Service[];
}) {
  const t = useTranslations("flexServices");
  const adminFetch = useAdminFetch();

  const [items, setItems] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

  const [form, setForm] = useState({
    serviceId: "",
    details: "",
    pricingMode: "per_person",
    price: "",
    days: "",
    quantity: "",
  });

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/packages2/${packageId}/items`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("errors.loadFailed"));
      }
      setItems(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [adminFetch, packageId, t]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const addItem = async () => {
    if (!form.serviceId || !form.price) return;
    setAdding(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        serviceId: Number(form.serviceId),
        details: form.details || null,
        pricingMode: form.pricingMode,
        price: form.price,
      };
      if (form.pricingMode === "per_person_per_day" && form.days) {
        payload.days = Number(form.days);
      }
      if (form.pricingMode === "per_unit" && form.quantity) {
        payload.quantity = Number(form.quantity);
      }
      const res = await adminFetch(`/api/admin/packages2/${packageId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("errors.addFailed"));
      }
      setForm({
        serviceId: "",
        details: "",
        pricingMode: "per_person",
        price: "",
        days: "",
        quantity: "",
      });
      await loadItems();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("errors.addFailed"));
    } finally {
      setAdding(false);
    }
  };

  const deleteItem = async (id: number) => {
    setError(null);
    try {
      const res = await adminFetch(
        `/api/admin/packages2/${packageId}/items?id=${id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("errors.deleteFailed"));
      }
      setDeleteItemId(null);
      await loadItems();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("errors.deleteFailed"));
      setDeleteItemId(null);
    }
  };

  const pricingModeLabel = (mode: string) => {
    switch (mode) {
      case "per_person":
        return t("modes.per_person");
      case "per_person_per_day":
        return t("modes.per_person_per_day");
      case "per_unit":
        return t("modes.per_unit");
      case "flat":
        return t("modes.flat");
      default:
        return mode;
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">{t("loading")}</span>
        </div>
      ) : (
        <>
          {/* Existing items */}
          {items.length === 0 ? (
            <p className="text-xs text-text-secondary py-2">{t("packages.noItems")}</p>
          ) : (
            <div className="space-y-1.5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-surface border border-border px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-navy">
                      {item.serviceName}
                    </span>
                    {item.details && (
                      <span className="text-xs text-text-secondary ml-2">
                        {item.details}
                      </span>
                    )}
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-text-secondary">
                        {pricingModeLabel(item.pricingMode)}
                      </span>
                      <span className="text-xs font-semibold text-text-primary">
                        {item.price}
                      </span>
                      {item.days !== null && (
                        <span className="text-xs text-text-secondary">
                          {item.days} {t("items.days")}
                        </span>
                      )}
                      {item.quantity !== null && (
                        <span className="text-xs text-text-secondary">
                          {t("items.qty")}: {item.quantity}
                        </span>
                      )}
                    </div>
                  </div>

                  {deleteItemId === item.id ? (
                    <span className="inline-flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => deleteItem(item.id)}
                        className="text-xs font-medium text-error cursor-pointer hover:underline"
                      >
                        {t("confirmDelete")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteItemId(null)}
                        className="text-xs text-text-secondary cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteItemId(item.id)}
                      className="inline-flex items-center text-xs text-text-secondary hover:text-error transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add item form */}
          <div className="rounded-lg border border-dashed border-border bg-surface/50 p-3 space-y-2">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              {t("items.addTitle")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={form.serviceId}
                onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))}
                className="rounded-md border border-border bg-white px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-navy/30 appearance-none"
              >
                <option value="">{t("items.selectService")}</option>
                {services.map((svc) => (
                  <option key={svc.id} value={String(svc.id)}>
                    {svc.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={form.details}
                onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                placeholder={t("items.detailsPlaceholder")}
                className="rounded-md border border-border bg-white px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
              <select
                value={form.pricingMode}
                onChange={(e) => setForm((f) => ({ ...f, pricingMode: e.target.value }))}
                className="rounded-md border border-border bg-white px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-navy/30 appearance-none"
              >
                <option value="per_person">{t("modes.per_person")}</option>
                <option value="per_person_per_day">{t("modes.per_person_per_day")}</option>
                <option value="per_unit">{t("modes.per_unit")}</option>
                <option value="flat">{t("modes.flat")}</option>
              </select>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder={t("items.pricePlaceholder")}
                className="rounded-md border border-border bg-white px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
              {form.pricingMode === "per_person_per_day" && (
                <input
                  type="number"
                  value={form.days}
                  onChange={(e) => setForm((f) => ({ ...f, days: e.target.value }))}
                  placeholder={t("items.daysPlaceholder")}
                  className="rounded-md border border-border bg-white px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-navy/30"
                />
              )}
              {form.pricingMode === "per_unit" && (
                <input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  placeholder={t("items.quantityPlaceholder")}
                  className="rounded-md border border-border bg-white px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-navy/30"
                />
              )}
            </div>
            <button
              type="button"
              onClick={addItem}
              disabled={adding || !form.serviceId || !form.price}
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-navy/90 transition-colors disabled:opacity-40 cursor-pointer"
            >
              {adding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {t("items.add")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────── PackagesTab */

function PackagesTab({ services }: { services: Service[] }) {
  const t = useTranslations("flexServices");
  const adminFetch = useAdminFetch();

  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/packages2");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("errors.loadFailed"));
      }
      setPackages(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [adminFetch, t]);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const addPackage = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/packages2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("errors.addFailed"));
      }
      setNewName("");
      await loadPackages();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("errors.addFailed"));
    } finally {
      setAdding(false);
    }
  };

  const deletePackage = async (id: number) => {
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/packages2?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("errors.deleteFailed"));
      }
      setDeleteId(null);
      if (expandedId === id) setExpandedId(null);
      await loadPackages();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("errors.deleteFailed"));
      setDeleteId(null);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
        {t("packages.title")}
      </h2>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Add form */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addPackage()}
          placeholder={t("packages.namePlaceholder")}
          className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-navy/30"
        />
        <button
          type="button"
          onClick={addPackage}
          disabled={adding || !newName.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 transition-colors disabled:opacity-40 cursor-pointer"
        >
          {adding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {t("packages.add")}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">{t("loading")}</span>
        </div>
      ) : packages.length === 0 ? (
        <div className="rounded-xl border border-border bg-white shadow-sm px-6 py-12 text-center">
          <Package className="w-8 h-8 text-text-secondary/40 mx-auto mb-3" />
          <p className="text-sm text-text-secondary">{t("packages.empty")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-xl border border-border bg-white shadow-sm p-4"
            >
              {/* Package header */}
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => toggleExpand(pkg.id)}
                  className="flex items-start gap-3 flex-1 text-left cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-navy">
                        {pkg.name}
                      </span>
                      {pkg.isDefault && (
                        <span className="inline-flex items-center rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">
                          {t("packages.default")}
                        </span>
                      )}
                    </div>
                    {pkg.description && (
                      <p className="text-xs text-text-secondary mt-0.5">
                        {pkg.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-text-secondary">
                      <span>
                        {pkg.itemsCount} {t("packages.items")}
                      </span>
                      <span>
                        {pkg.assignedTeams} {t("packages.teams")}
                      </span>
                    </div>
                  </div>
                  {expandedId === pkg.id ? (
                    <ChevronUp className="w-4 h-4 text-text-secondary shrink-0 mt-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-text-secondary shrink-0 mt-1" />
                  )}
                </button>

                {/* Delete */}
                {deleteId === pkg.id ? (
                  <span className="inline-flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => deletePackage(pkg.id)}
                      className="text-xs font-medium text-error cursor-pointer hover:underline"
                    >
                      {t("confirmDelete")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(null)}
                      className="text-xs text-text-secondary cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteId(pkg.id)}
                    disabled={pkg.assignedTeams > 0}
                    title={
                      pkg.assignedTeams > 0
                        ? t("packages.cannotDelete")
                        : undefined
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-error transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Expanded items section */}
              {expandedId === pkg.id && (
                <PackageItemsSection
                  packageId={pkg.id}
                  services={services}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────── Page */

export function FlexServicesPageContent() {
  const t = useTranslations("flexServices");
  const adminFetch = useAdminFetch();
  const [tab, setTab] = useState<Tab>("services");
  const [services, setServices] = useState<Service[]>([]);

  // Load services for the packages tab (needed for the item add form)
  useEffect(() => {
    adminFetch("/api/admin/services2")
      .then((r) => (r.ok ? r.json() : []))
      .then(setServices)
      .catch(() => {});
  }, [adminFetch]);

  return (
    <div className="flex-1 min-h-screen bg-surface p-6 lg:p-8 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2.5">
          <Package className="w-5 h-5 text-navy" />
          {t("pageTitle")}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {t("pageDescription")}
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <SectionTab
          active={tab === "services"}
          onClick={() => setTab("services")}
          icon={Layers}
          label={t("tabs.services")}
        />
        <SectionTab
          active={tab === "packages"}
          onClick={() => setTab("packages")}
          icon={Package}
          label={t("tabs.packages")}
        />
      </div>

      {/* Tab content */}
      {tab === "services" ? (
        <ServiceTypesTab />
      ) : (
        <PackagesTab services={services} />
      )}
    </div>
  );
}
