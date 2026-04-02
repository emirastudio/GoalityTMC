"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  BedDouble,
  Utensils,
  Bus,
  Shirt,
  Trophy,
  Camera,
  Music,
  Dumbbell,
  Heart,
  Star,
  ShoppingBag,
  Wifi,
  Coffee,
  Car,
  Plane,
  MapPin,
  Upload,
  ImageIcon,
} from "lucide-react";

/* ─────────────────────────────────────────── icon catalog */

const SERVICE_ICONS: { name: string; icon: React.ElementType }[] = [
  { name: "BedDouble", icon: BedDouble },
  { name: "Utensils", icon: Utensils },
  { name: "Bus", icon: Bus },
  { name: "Car", icon: Car },
  { name: "Plane", icon: Plane },
  { name: "Shirt", icon: Shirt },
  { name: "Trophy", icon: Trophy },
  { name: "Camera", icon: Camera },
  { name: "Music", icon: Music },
  { name: "Dumbbell", icon: Dumbbell },
  { name: "Heart", icon: Heart },
  { name: "Star", icon: Star },
  { name: "ShoppingBag", icon: ShoppingBag },
  { name: "Wifi", icon: Wifi },
  { name: "Coffee", icon: Coffee },
  { name: "MapPin", icon: MapPin },
  { name: "Package", icon: Package },
];

function resolveIcon(name: string | null | undefined): React.ElementType {
  if (!name) return Layers;
  return SERVICE_ICONS.find((i) => i.name === name)?.icon ?? Layers;
}

/* ─────────────────────────────────────────── types */

interface Service {
  id: number;
  name: string;
  nameRu: string | null;
  nameEt: string | null;
  icon: string | null;
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
  serviceIcon: string | null;
  details: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  imageUrl: string | null;
  note: string | null;
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

/* ─────────────────────────────────────────── IconPicker */

function IconPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (name: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const Selected = resolveIcon(value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border th-border th-card px-3 py-1.5 text-sm th-text hover:th-bg transition-colors cursor-pointer"
      >
        <Selected className="w-4 h-4" style={{ color: "var(--cat-accent)" }} />
        <span className="text-xs th-text-2">
          {value ?? "No icon"}
        </span>
        <ChevronDown className="w-3 h-3 th-text-2 ml-1" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 popup-bg border th-border rounded-xl shadow-lg p-2 grid grid-cols-6 gap-1 w-56">
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            className="col-span-6 text-xs th-text-2 text-left px-2 py-1 rounded hover:th-bg cursor-pointer"
          >
            No icon
          </button>
          {SERVICE_ICONS.map(({ name, icon: Icon }) => (
            <button
              key={name}
              type="button"
              title={name}
              onClick={() => { onChange(name); setOpen(false); }}
              className={`flex items-center justify-center p-2 rounded-lg cursor-pointer transition-colors ${
                value === name
                  ? ""
                  : "hover:th-bg"
              }`}
              style={value === name ? { background: "var(--cat-accent)", color: "var(--cat-accent-text)" } : { color: "var(--cat-accent)" }}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────── ImageUpload */

function ImageUpload({
  value,
  onChange,
  adminFetch,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  adminFetch: ReturnType<typeof useAdminFetch>;
}) {
  const t = useTranslations("flexServices");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await adminFetch("/api/admin/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      onChange(data.url);
    } catch {
      // silently ignore — user can try again
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {value ? (
        <div className="relative w-14 h-14 rounded-lg overflow-hidden border th-border shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5 cursor-pointer"
          >
            <X className="w-2.5 h-2.5 text-white" />
          </button>
        </div>
      ) : (
        <div className="w-14 h-14 rounded-lg border border-dashed th-border th-bg flex items-center justify-center shrink-0">
          <ImageIcon className="w-5 h-5 th-text-2/40" />
        </div>
      )}
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-md border th-border th-card px-3 py-1.5 text-xs font-medium th-text-2 hover:opacity-80 hover:th-bg transition-colors cursor-pointer disabled:opacity-40"
      >
        {uploading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Upload className="w-3.5 h-3.5" />
        )}
        {uploading ? t("items.imageUploading") : t("items.imageUpload")}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
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
  const [newIcon, setNewIcon] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState<string | null>(null);
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
        body: JSON.stringify({ name: newName.trim(), icon: newIcon }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("errors.addFailed"));
      }
      setNewName("");
      setNewIcon(null);
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
    setEditIcon(svc.icon);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName("");
    setEditIcon(null);
  };

  const saveEdit = async () => {
    if (!editName.trim() || editId === null) return;
    setSaving(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/services2", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, name: editName.trim(), icon: editIcon }),
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
      <h2 className="text-sm font-semibold th-text-2 uppercase tracking-wide">
        {t("services.title")}
      </h2>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Add form */}
      <div className="flex items-center gap-2">
        <IconPicker value={newIcon} onChange={setNewIcon} />
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addService()}
          placeholder={t("services.namePlaceholder")}
          className="flex-1 rounded-md border th-border th-card px-3 py-2 text-sm th-text placeholder:th-text-2/50 focus:outline-none focus:ring-2 focus:ring-navy/30"
        />
        <button
          type="button"
          onClick={addService}
          disabled={adding || !newName.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-40 cursor-pointer"
          style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}
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
        <div className="flex items-center justify-center py-16 th-text-2">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">{t("loading")}</span>
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-xl border th-border th-card shadow-sm px-6 py-12 text-center">
          <Layers className="w-8 h-8 th-text-2/40 mx-auto mb-3" />
          <p className="text-sm th-text-2">{t("services.empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {services.map((svc) => {
            const SvcIcon = resolveIcon(svc.icon);
            return (
              <div
                key={svc.id}
                className="rounded-xl border th-border th-card shadow-sm p-4 flex items-center justify-between gap-3"
              >
                {editId === svc.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <IconPicker value={editIcon} onChange={setEditIcon} />
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="flex-1 rounded-md border th-border th-card px-3 py-1.5 text-sm th-text focus:outline-none focus:ring-2 focus:ring-navy/30"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={saving}
                      className="inline-flex items-center gap-1 text-xs font-medium hover:opacity-80 cursor-pointer"
                      style={{ color: "var(--cat-accent)" }}
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
                      className="text-xs th-text-2 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--cat-badge-open-bg)] flex items-center justify-center shrink-0">
                        <SvcIcon className="w-4 h-4" style={{ color: "var(--cat-accent)" }} />
                      </div>
                      <span className="font-medium text-sm" style={{ color: "var(--cat-accent)" }}>{svc.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(svc)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium th-text-2 hover:opacity-80 transition-colors cursor-pointer"
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
                            className="text-xs th-text-2 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteId(svc.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium th-text-2 hover:text-error transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {t("delete")}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
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
    note: "",
    dateFrom: "",
    dateTo: "",
    imageUrl: null as string | null,
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
        note: form.note || null,
        dateFrom: form.dateFrom || null,
        dateTo: form.dateTo || null,
        imageUrl: form.imageUrl || null,
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
        note: "",
        dateFrom: "",
        dateTo: "",
        imageUrl: null,
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
    const key = `modes.${mode}` as Parameters<typeof t>[0];
    return t(key) ?? mode;
  };

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  };

  return (
    <div className="mt-3 pt-3 border-t th-border space-y-3">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <div className="flex items-center gap-2 py-4 th-text-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">{t("loading")}</span>
        </div>
      ) : (
        <>
          {/* Existing items */}
          {items.length === 0 ? (
            <p className="text-xs th-text-2 py-2">{t("packages.noItems")}</p>
          ) : (
            <div className="space-y-1.5">
              {items.map((item) => {
                const ItemIcon = resolveIcon(item.serviceIcon);
                return (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-2 rounded-lg th-bg border th-border px-3 py-2"
                  >
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {item.imageUrl ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border th-border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[var(--cat-badge-open-bg)] flex items-center justify-center shrink-0">
                          <ItemIcon className="w-5 h-5" style={{ color: "var(--cat-accent)" }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium" style={{ color: "var(--cat-accent)" }}>
                          {item.serviceName}
                        </span>
                        {item.details && (
                          <span className="text-xs th-text-2 ml-2">
                            {item.details}
                          </span>
                        )}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                          <span className="text-xs th-text-2">
                            {pricingModeLabel(item.pricingMode)}
                          </span>
                          <span className="text-xs font-semibold th-text">
                            {item.price}
                          </span>
                          {item.days !== null && (
                            <span className="text-xs th-text-2">
                              {item.days} {t("items.days")}
                            </span>
                          )}
                          {item.quantity !== null && (
                            <span className="text-xs th-text-2">
                              {t("items.qty")}: {item.quantity}
                            </span>
                          )}
                          {(item.dateFrom || item.dateTo) && (
                            <span className="text-xs th-text-2">
                              {formatDate(item.dateFrom)} – {formatDate(item.dateTo)}
                            </span>
                          )}
                        </div>
                        {item.note && (
                          <p className="text-xs th-text-2/70 mt-0.5 italic">
                            {item.note}
                          </p>
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
                          className="text-xs th-text-2 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteItemId(item.id)}
                        className="inline-flex items-center text-xs th-text-2 hover:text-error transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add item form */}
          <div className="rounded-lg border border-dashed th-border th-bg/50 p-3 space-y-3">
            <p className="text-xs font-semibold th-text-2 uppercase tracking-wide">
              {t("items.addTitle")}
            </p>

            {/* Row 1: service + details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={form.serviceId}
                onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))}
                className="rounded-md border th-border th-card px-3 py-1.5 text-sm th-text focus:outline-none focus:ring-2 focus:ring-navy/30 appearance-none"
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
                className="rounded-md border th-border th-card px-3 py-1.5 text-sm th-text placeholder:th-text-2/50 focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
            </div>

            {/* Row 2: pricing mode + price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={form.pricingMode}
                onChange={(e) => setForm((f) => ({ ...f, pricingMode: e.target.value }))}
                className="rounded-md border th-border th-card px-3 py-1.5 text-sm th-text focus:outline-none focus:ring-2 focus:ring-navy/30 appearance-none"
              >
                <option value="per_person">{t("modes.per_person")}</option>
                <option value="per_person_per_day">{t("modes.per_person_per_day")}</option>
                <option value="per_unit">{t("modes.per_unit")}</option>
                <option value="flat">{t("modes.flat")}</option>
                <option value="per_player">{t("modes.per_player")}</option>
                <option value="per_staff">{t("modes.per_staff")}</option>
                <option value="per_accompanying">{t("modes.per_accompanying")}</option>
                <option value="per_team">{t("modes.per_team")}</option>
              </select>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder={t("items.pricePlaceholder")}
                className="rounded-md border th-border th-card px-3 py-1.5 text-sm th-text placeholder:th-text-2/50 focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
            </div>

            {/* Conditional: days / quantity */}
            {form.pricingMode === "per_person_per_day" && (
              <input
                type="number"
                value={form.days}
                onChange={(e) => setForm((f) => ({ ...f, days: e.target.value }))}
                placeholder={t("items.daysPlaceholder")}
                className="w-full rounded-md border th-border th-card px-3 py-1.5 text-sm th-text placeholder:th-text-2/50 focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
            )}
            {form.pricingMode === "per_unit" && (
              <input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                placeholder={t("items.quantityPlaceholder")}
                className="w-full rounded-md border th-border th-card px-3 py-1.5 text-sm th-text placeholder:th-text-2/50 focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
            )}

            {/* Row 3: date from + date to */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs th-text-2 mb-1 block">{t("items.dateFrom")}</label>
                <input
                  type="date"
                  value={form.dateFrom}
                  onChange={(e) => setForm((f) => ({ ...f, dateFrom: e.target.value }))}
                  className="w-full rounded-md border th-border th-card px-3 py-1.5 text-sm th-text focus:outline-none focus:ring-2 focus:ring-navy/30"
                />
              </div>
              <div>
                <label className="text-xs th-text-2 mb-1 block">{t("items.dateTo")}</label>
                <input
                  type="date"
                  value={form.dateTo}
                  onChange={(e) => setForm((f) => ({ ...f, dateTo: e.target.value }))}
                  className="w-full rounded-md border th-border th-card px-3 py-1.5 text-sm th-text focus:outline-none focus:ring-2 focus:ring-navy/30"
                />
              </div>
            </div>

            {/* Row 4: note */}
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder={t("items.notePlaceholder")}
              className="w-full rounded-md border th-border th-card px-3 py-1.5 text-sm th-text placeholder:th-text-2/50 focus:outline-none focus:ring-2 focus:ring-navy/30"
            />

            {/* Row 5: image upload */}
            <div>
              <label className="text-xs th-text-2 mb-1.5 block">{t("items.image")}</label>
              <ImageUpload
                value={form.imageUrl}
                onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
                adminFetch={adminFetch}
              />
            </div>

            <button
              type="button"
              onClick={addItem}
              disabled={adding || !form.serviceId || !form.price}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium hover:opacity-90 transition-colors disabled:opacity-40 cursor-pointer"
          style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}
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
  const [editPkgId, setEditPkgId] = useState<number | null>(null);
  const [editPkgName, setEditPkgName] = useState("");
  const [savingPkg, setSavingPkg] = useState(false);

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

  const startEditPkg = (pkg: PackageData) => {
    setEditPkgId(pkg.id);
    setEditPkgName(pkg.name);
  };

  const saveEditPkg = async () => {
    if (!editPkgName.trim() || editPkgId === null) return;
    setSavingPkg(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/packages2", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editPkgId, name: editPkgName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("errors.saveFailed"));
      }
      setEditPkgId(null);
      await loadPackages();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("errors.saveFailed"));
    } finally {
      setSavingPkg(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold th-text-2 uppercase tracking-wide">
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
          className="flex-1 rounded-md border th-border th-card px-3 py-2 text-sm th-text placeholder:th-text-2/50 focus:outline-none focus:ring-2 focus:ring-navy/30"
        />
        <button
          type="button"
          onClick={addPackage}
          disabled={adding || !newName.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-40 cursor-pointer"
          style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}
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
        <div className="flex items-center justify-center py-16 th-text-2">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">{t("loading")}</span>
        </div>
      ) : packages.length === 0 ? (
        <div className="rounded-xl border th-border th-card shadow-sm px-6 py-12 text-center">
          <Package className="w-8 h-8 th-text-2/40 mx-auto mb-3" />
          <p className="text-sm th-text-2">{t("packages.empty")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-xl border th-border th-card shadow-sm p-4"
            >
              {/* Package header */}
              <div className="flex items-start justify-between gap-3">
                {editPkgId === pkg.id ? (
                  /* ── inline name edit ── */
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editPkgName}
                      onChange={(e) => setEditPkgName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditPkg();
                        if (e.key === "Escape") setEditPkgId(null);
                      }}
                      className="flex-1 rounded-md border th-border th-card px-3 py-1.5 text-sm th-text focus:outline-none focus:ring-2 focus:ring-navy/30"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={saveEditPkg}
                      disabled={savingPkg}
                      className="inline-flex items-center gap-1 text-xs font-medium hover:opacity-80 cursor-pointer"
                      style={{ color: "var(--cat-accent)" }}
                    >
                      {savingPkg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      {t("save")}
                    </button>
                    <button type="button" onClick={() => setEditPkgId(null)} className="text-xs th-text-2 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleExpand(pkg.id)}
                    className="flex items-start gap-3 flex-1 text-left cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm" style={{ color: "var(--cat-accent)" }}>
                          {pkg.name}
                        </span>
                        {pkg.isDefault && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                          style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }}>
                            {t("packages.default")}
                          </span>
                        )}
                      </div>
                      {pkg.description && (
                        <p className="text-xs th-text-2 mt-0.5">
                          {pkg.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-1.5 text-xs th-text-2">
                        <span>{pkg.itemsCount} {t("packages.items")}</span>
                        <span>{pkg.assignedTeams} {t("packages.teams")}</span>
                      </div>
                    </div>
                    {expandedId === pkg.id ? (
                      <ChevronUp className="w-4 h-4 th-text-2 shrink-0 mt-1" />
                    ) : (
                      <ChevronDown className="w-4 h-4 th-text-2 shrink-0 mt-1" />
                    )}
                  </button>
                )}

                {/* Edit + Delete */}
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
                      className="text-xs th-text-2 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {editPkgId !== pkg.id && (
                      <button
                        type="button"
                        onClick={() => startEditPkg(pkg)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium th-text-2 hover:opacity-80 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteId(pkg.id)}
                      disabled={pkg.assignedTeams > 0}
                      title={pkg.assignedTeams > 0 ? t("packages.cannotDelete") : undefined}
                      className="inline-flex items-center gap-1.5 text-xs font-medium th-text-2 hover:text-error transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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

  useEffect(() => {
    adminFetch("/api/admin/services2")
      .then((r) => (r.ok ? r.json() : []))
      .then(setServices)
      .catch(() => {});
  }, [adminFetch]);

  return (
    <div className="flex-1 min-h-screen th-bg p-6 lg:p-8 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold th-text flex items-center gap-2.5">
          <Package className="w-5 h-5" style={{ color: "var(--cat-accent)" }} />
          {t("pageTitle")}
        </h1>
        <p className="text-sm th-text-2 mt-1">
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
