"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useAdminFetch } from "@/lib/tournament-context";
import { LangTabs, type Lang } from "@/components/admin/lang-tabs";
// no useTranslations — admin panel uses hardcoded English labels
import { Input } from "@/components/ui/input";
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Check,
  X,
  Users,
  ChevronDown,
} from "lucide-react";

/* ─────────────────────────────────────────── types */

interface ServicePackage {
  id: number;
  name: string;
  nameRu: string;
  description: string | null;
  isDefault: boolean;
  assignedTeams: number;
  accommodationOptionId: number | null;
  includeAccommodation: boolean;
  includeTransfer: boolean;
  includeRegistration: boolean;
  includeMeals: boolean;
  publishedTeams: number;
}

interface AccommodationOption {
  id: number;
  name: string;
}

interface Team {
  id: number;
  name: string;
  regNumber: string;
  club: {
    id: number | null;
    name: string | null;
  };
  currentPackage?: {
    id: number;
    name: string;
    isPublished: boolean;
  } | null;
}

type Tab = "packages" | "assignments";

/* ─────────────────────────────────────────── helpers */

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

function SavedBadge({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
      <Check className="w-3.5 h-3.5" />
      Saved!
    </span>
  );
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <span>{message}</span>
      <button type="button" onClick={onDismiss} className="cursor-pointer shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────── PackagesTab */

const EMPTY_FORM = {
  name: "",
  nameRu: "",
  description: "",
  isDefault: false,
  accommodationOptionId: "",
  includeAccommodation: true,
  includeTransfer: true,
  includeRegistration: true,
  includeMeals: true,
};

function PackagesTab() {
  const adminFetch = useAdminFetch();
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | "new" | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [lang, setLang] = useState<Lang>("en");
  const [accOptions, setAccOptions] = useState<AccommodationOption[]>([]);
  const [publishing, setPublishing] = useState<number | null>(null);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/packages");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load packages");
      }
      setPackages(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  useEffect(() => {
    adminFetch("/api/admin/services/accommodation")
      .then((r) => r.ok ? r.json() : [])
      .then(setAccOptions)
      .catch(() => {});
  }, []);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditId("new");
  };

  const openEdit = (pkg: ServicePackage) => {
    setForm({
      name: pkg.name,
      nameRu: pkg.nameRu,
      description: pkg.description ?? "",
      isDefault: pkg.isDefault,
      accommodationOptionId: pkg.accommodationOptionId ? String(pkg.accommodationOptionId) : "",
      includeAccommodation: pkg.includeAccommodation ?? true,
      includeTransfer: pkg.includeTransfer ?? true,
      includeRegistration: pkg.includeRegistration ?? true,
      includeMeals: pkg.includeMeals ?? true,
    });
    setEditId(pkg.id);
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
  };

  const saveForm = async () => {
    if (!form.name.trim()) {
      setError("Package name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const isNew = editId === "new";
      const payload = {
        ...form,
        accommodationOptionId: form.accommodationOptionId ? Number(form.accommodationOptionId) : null,
      };
      const res = await adminFetch("/api/admin/packages", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isNew ? payload : { id: editId, ...payload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }
      await loadPackages();
      cancelEdit();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deletePackage = async (id: number) => {
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/packages?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed");
      }
      await loadPackages();
      setDeleteId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setDeleteId(null);
    }
  };

  const publishAll = async (pkgId: number) => {
    setPublishing(pkgId);
    try {
      await adminFetch(`/api/admin/packages/${pkgId}/publish`, { method: "POST" });
      await loadPackages();
    } finally {
      setPublishing(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
          Packages
        </h2>
        <div className="flex items-center gap-3">
          <SavedBadge visible={saved} />
          {editId === null && (
            <Button
              onClick={openNew}
              className="bg-navy hover:bg-navy/90 text-white"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create Package
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Create / Edit form */}
      {editId !== null && (
        <div className="rounded-xl border border-border bg-white shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base text-text-primary">
              {editId === "new" ? "Create Package" : "Edit Package"}
            </h3>
            <LangTabs lang={lang} onChange={setLang} />
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text-secondary">
                Name {lang === "en" ? "*" : <span className="text-text-secondary/60">(RU — leave empty to use English)</span>}
              </label>
              <Input
                value={lang === "en" ? form.name : form.nameRu}
                onChange={(e) => setForm((f) => lang === "en" ? { ...f, name: e.target.value } : { ...f, nameRu: e.target.value })}
                placeholder={lang === "en" ? "Standard Package" : "Стандартный пакет"}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text-secondary">
                Description {lang === "ru" && <span className="text-text-secondary/60">(leave empty to use English)</span>}
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder={lang === "en" ? "Describe what's included…" : "Описание пакета…"}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-navy/30 resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text-secondary">
                Accommodation option
              </label>
              <select
                value={form.accommodationOptionId}
                onChange={(e) => setForm((f) => ({ ...f, accommodationOptionId: e.target.value }))}
                disabled={!form.includeAccommodation}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-navy/30 appearance-none disabled:opacity-40"
              >
                <option value="">— Select accommodation —</option>
                {accOptions.map((opt) => (
                  <option key={opt.id} value={String(opt.id)}>{opt.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Included services */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Included services</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { key: "includeRegistration", label: "📋 Registration Fee" },
                  { key: "includeAccommodation", label: "🏨 Accommodation" },
                  { key: "includeTransfer", label: "🚌 Transfer" },
                  { key: "includeMeals", label: "🍽️ Extra Meals" },
                ] as const
              ).map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer select-none bg-surface rounded-lg px-3 py-2 border border-border hover:border-navy/30 transition-colors">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-navy shrink-0"
                    checked={form[key]}
                    onChange={(e) => {
                      setForm((f) => {
                        const next = { ...f, [key]: e.target.checked };
                        // If accommodation is unchecked, clear the selected option
                        if (key === "includeAccommodation" && !e.target.checked) {
                          next.accommodationOptionId = "";
                        }
                        return next;
                      });
                    }}
                  />
                  <span className="text-sm text-text-primary">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              className="w-4 h-4 accent-navy"
              checked={form.isDefault}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
            />
            <span className="text-sm font-medium text-text-primary">Default package</span>
          </label>
          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={saveForm}
              disabled={saving}
              className="bg-navy hover:bg-navy/90 text-white"
              size="sm"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 mr-1.5" />
              )}
              Save
            </Button>
            <Button variant="secondary" size="sm" onClick={cancelEdit} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Package list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : packages.length === 0 ? (
        <div className="rounded-xl border border-border bg-white shadow-sm px-6 py-12 text-center">
          <Layers className="w-8 h-8 text-text-secondary/40 mx-auto mb-3" />
          <p className="text-sm text-text-secondary">No packages yet</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-xl border border-border bg-white shadow-sm p-4 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-text-primary">{pkg.name}</span>
                  {pkg.isDefault && (
                    <span className="inline-flex items-center rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">
                      Default
                    </span>
                  )}
                </div>
              </div>

              {pkg.description && (
                <p className="text-xs text-text-secondary leading-relaxed">{pkg.description}</p>
              )}

              {/* Service badges */}
              <div className="flex flex-wrap gap-1">
                {pkg.includeRegistration && (
                  <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-700">📋 Fee</span>
                )}
                {pkg.includeAccommodation && (
                  <span className="inline-flex items-center rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-xs text-purple-700">
                    🏨 {accOptions.find(o => o.id === pkg.accommodationOptionId)?.name ?? "Hotel"}
                  </span>
                )}
                {pkg.includeTransfer && (
                  <span className="inline-flex items-center rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-xs text-orange-700">🚌 Transfer</span>
                )}
                {pkg.includeMeals && (
                  <span className="inline-flex items-center rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs text-green-700">🍽️ Meals</span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <Users className="w-3.5 h-3.5" />
                <span>
                  {pkg.assignedTeams} teams
                </span>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                <span className="text-xs text-text-secondary">
                  {pkg.publishedTeams ?? 0}/{pkg.assignedTeams} published
                </span>
                <button
                  type="button"
                  disabled={publishing === pkg.id || pkg.assignedTeams === 0}
                  onClick={() => publishAll(pkg.id)}
                  className="text-xs font-semibold text-white bg-navy hover:bg-navy/80 px-3 py-1 rounded-md transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {publishing === pkg.id ? "..." : "Publish All"}
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1 mt-auto">
                <button
                  type="button"
                  onClick={() => openEdit(pkg)}
                  disabled={editId !== null}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-navy transition-colors cursor-pointer disabled:opacity-40"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>

                {deleteId === pkg.id ? (
                  <span className="inline-flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => deletePackage(pkg.id)}
                      className="text-xs font-medium text-error cursor-pointer hover:underline"
                    >
                      Are you sure?
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
                        ? `Cannot delete: ${pkg.assignedTeams} team(s) assigned`
                        : undefined
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-error transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────── AssignmentsTab */

function AssignmentsTab() {
  const adminFetch = useAdminFetch();

  const [teams, setTeams] = useState<Team[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [saved, setSaved] = useState<number | "bulk" | null>(null);
  const [selectValues, setSelectValues] = useState<Record<number, string>>({});
  const [togglingPublish, setTogglingPublish] = useState<number | null>(null);

  const flashSaved = (id: number | "bulk") => {
    setSaved(id);
    setTimeout(() => setSaved(null), 1500);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [teamsRes, packagesRes] = await Promise.all([
        adminFetch("/api/admin/teams"),
        adminFetch("/api/admin/packages"),
      ]);
      if (!teamsRes.ok || !packagesRes.ok) throw new Error("Failed to load data");

      const teamsData: Array<{
        id: number;
        name: string;
        regNumber: string;
        club: { id: number | null; name: string | null };
        currentPackage?: { id: number; name: string; isPublished: boolean } | null;
      }> = await teamsRes.json();
      const packagesData: ServicePackage[] = await packagesRes.json();

      setPackages(packagesData);

      // Fetch package assignments for each team
      const assignmentsRes = await adminFetch("/api/admin/teams/assignments");
      let assignmentMap: Record<number, { id: number; name: string; isPublished: boolean }> = {};

      if (assignmentsRes.ok) {
        const assignmentsData: Array<{ teamId: number; packageId: number; packageName: string; isPublished: boolean }> =
          await assignmentsRes.json();
        assignmentMap = Object.fromEntries(
          assignmentsData.map((a) => [a.teamId, { id: a.packageId, name: a.packageName, isPublished: a.isPublished }])
        );
      }

      const enriched = teamsData.map((team) => ({
        ...team,
        currentPackage: assignmentMap[team.id] ?? null,
      }));

      setTeams(enriched);

      // Pre-populate select values
      const selects: Record<number, string> = {};
      enriched.forEach((team) => {
        if (team.currentPackage) selects[team.id] = String(team.currentPackage.id);
      });
      setSelectValues(selects);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const assignPackage = async (teamId: number, packageId: number) => {
    setAssigningId(teamId);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/teams/${teamId}/assign-package`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Assignment failed");
      }
      // Optimistically update
      const pkg = packages.find((p) => p.id === packageId);
      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId
            ? { ...t, currentPackage: pkg ? { id: pkg.id, name: pkg.name, isPublished: false } : null }
            : t
        )
      );
      flashSaved(teamId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Assignment failed");
    } finally {
      setAssigningId(null);
    }
  };

  const removePackage = async (teamId: number) => {
    setRemovingId(teamId);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/teams/${teamId}/assign-package`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Remove failed");
      }
      setTeams((prev) =>
        prev.map((t) => (t.id === teamId ? { ...t, currentPackage: null } : t))
      );
      setSelectValues((prev) => {
        const next = { ...prev };
        delete next[teamId];
        return next;
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setRemovingId(null);
    }
  };

  const togglePublish = async (teamId: number, currentValue: boolean) => {
    setTogglingPublish(teamId);
    try {
      await adminFetch(`/api/admin/teams/${teamId}/assign-package`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !currentValue }),
      });
      await loadAll();
    } finally {
      setTogglingPublish(null);
    }
  };

  const assignDefaultToAll = async () => {
    const defaultPkg = packages.find((p) => p.isDefault);
    if (!defaultPkg) {
      setError("No default package configured");
      return;
    }
    setBulkAssigning(true);
    setError(null);
    try {
      const unassigned = teams.filter((t) => !t.currentPackage);
      await Promise.all(
        unassigned.map((team) =>
          adminFetch(`/api/admin/teams/${team.id}/assign-package`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packageId: defaultPkg.id }),
          })
        )
      );
      await loadAll();
      flashSaved("bulk");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bulk assign failed");
    } finally {
      setBulkAssigning(false);
    }
  };

  const defaultPkg = packages.find((p) => p.isDefault);
  const unassignedCount = teams.filter((t) => !t.currentPackage).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
          Team Assignments
        </h2>
        <div className="flex items-center gap-3">
          {saved === "bulk" && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
              <Check className="w-3.5 h-3.5" />
              Saved!
            </span>
          )}
          {defaultPkg && unassignedCount > 0 && (
            <Button
              onClick={assignDefaultToAll}
              disabled={bulkAssigning}
              variant="secondary"
              size="sm"
              className="border-navy text-navy hover:bg-navy hover:text-white transition-colors"
            >
              {bulkAssigning ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Layers className="w-3.5 h-3.5 mr-1.5" />
              )}
              Assign default to all ({unassignedCount})
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : teams.length === 0 ? (
        <div className="rounded-xl border border-border bg-white shadow-sm px-6 py-12 text-center">
          <Users className="w-8 h-8 text-text-secondary/40 mx-auto mb-3" />
          <p className="text-sm text-text-secondary">No teams found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide w-10">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Team
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Club
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Current Package
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {teams.map((team, idx) => {
                  const isAssigning = assigningId === team.id;
                  const isRemoving = removingId === team.id;
                  const justSaved = saved === team.id;

                  return (
                    <tr key={team.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-text-secondary font-mono">
                        {team.regNumber ?? idx + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-text-primary">{team.name}</td>
                      <td className="px-4 py-3 text-text-secondary">{team.club.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {team.currentPackage ? (
                            <span className="inline-flex items-center rounded-full bg-navy/10 px-2.5 py-1 text-xs font-semibold text-navy">
                              {team.currentPackage.name}
                            </span>
                          ) : (
                            <span className="text-text-secondary/60 text-xs">—</span>
                          )}
                          {team.currentPackage && (
                            <button
                              type="button"
                              onClick={() => togglePublish(team.id, team.currentPackage!.isPublished)}
                              disabled={togglingPublish === team.id}
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                                team.currentPackage.isPublished
                                  ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700"
                                  : "bg-orange-100 text-orange-700 hover:bg-green-100 hover:text-green-700"
                              }`}
                            >
                              {togglingPublish === team.id ? "..." : team.currentPackage.isPublished ? "✓ Published" : "Unpublished"}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {justSaved && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                              <Check className="w-3 h-3" />
                              Saved
                            </span>
                          )}

                          {/* Package select */}
                          {packages.length > 0 && (
                            <div className="relative">
                              <select
                                value={selectValues[team.id] ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSelectValues((prev) => ({ ...prev, [team.id]: val }));
                                  if (val) assignPackage(team.id, Number(val));
                                }}
                                disabled={isAssigning || isRemoving}
                                className="appearance-none rounded-md border border-border bg-white pl-3 pr-8 py-1.5 text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-navy/30 cursor-pointer disabled:opacity-50 min-w-[140px]"
                              >
                                <option value="">— Assign package —</option>
                                {packages.map((pkg) => (
                                  <option key={pkg.id} value={String(pkg.id)}>
                                    {pkg.name}
                                    {pkg.isDefault ? " ★" : ""}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                              {isAssigning && (
                                <Loader2 className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navy animate-spin" />
                              )}
                            </div>
                          )}

                          {/* Remove button */}
                          {team.currentPackage && (
                            <button
                              type="button"
                              onClick={() => removePackage(team.id)}
                              disabled={isAssigning || isRemoving}
                              className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-error transition-colors cursor-pointer disabled:opacity-40"
                            >
                              {isRemoving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <X className="w-3.5 h-3.5" />
                              )}
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────── Page */

export function PackagesPageContent() {
  const [tab, setTab] = useState<Tab>("packages");

  return (
    <div className="flex-1 min-h-screen bg-surface p-6 lg:p-8 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-navy" />
          Packages
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage service packages and assign them to teams
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <SectionTab
          active={tab === "packages"}
          onClick={() => setTab("packages")}
          icon={Layers}
          label="Packages"
        />
        <SectionTab
          active={tab === "assignments"}
          onClick={() => setTab("assignments")}
          icon={Users}
          label="Team Assignments"
        />
      </div>

      {/* Tab content */}
      {tab === "packages" ? <PackagesTab /> : <AssignmentsTab />}
    </div>
  );
}
