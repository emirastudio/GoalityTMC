"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronUp, Trash2, Plus, ShieldCheck } from "lucide-react";

type StaffMember = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  isResponsibleOnSite: boolean;
  allergies: string | null;
  dietaryRequirements: string | null;
  medicalNotes: string | null;
};

type NewRow = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isResponsibleOnSite: boolean;
};

interface StaffInlineTableProps {
  staff: StaffMember[];
  teamId: number;
  roleOptions: { value: string; label: string }[];
  onRefresh: () => void;
}

const cellInput = "w-full bg-transparent text-sm px-2 py-2 outline-none focus:bg-navy/5 focus:ring-1 focus:ring-navy/20 rounded transition-colors";
const cellSelect = "w-full bg-transparent text-sm px-1 py-2 outline-none focus:bg-navy/5 focus:ring-1 focus:ring-navy/20 rounded transition-colors appearance-none cursor-pointer";

export function StaffInlineTable({ staff, teamId, roleOptions, onRefresh }: StaffInlineTableProps) {
  const t = useTranslations("staff");
  const tp = useTranslations("people");

  const [expandedIds, setExpandedIds] = useState<Set<number | "new">>(new Set());
  const [saving, setSaving] = useState<Set<number | "new">>(new Set());
  const [newRow, setNewRow] = useState<NewRow>({ firstName: "", lastName: "", email: "", phone: "", role: "", isResponsibleOnSite: false });
  const [newMed, setNewMed] = useState({ allergies: "", dietaryRequirements: "", medicalNotes: "" });
  const debounceTimers = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const toggleExpand = (id: number | "new") => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const saveField = useCallback((personId: number, field: string, value: string | boolean) => {
    const existing = debounceTimers.current.get(personId);
    if (existing) clearTimeout(existing);

    debounceTimers.current.set(personId, setTimeout(async () => {
      setSaving((s) => new Set(s).add(personId));
      await fetch(`/api/teams/${teamId}/people?id=${personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      setSaving((s) => { const n = new Set(s); n.delete(personId); return n; });
      if (field === "isResponsibleOnSite") onRefresh();
    }, 600));
  }, [teamId, onRefresh]);

  const createStaff = useCallback(async () => {
    if (!newRow.firstName.trim() || !newRow.lastName.trim()) return;

    setSaving((s) => new Set(s).add("new"));
    const res = await fetch(`/api/teams/${teamId}/people`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personType: "staff",
        firstName: newRow.firstName,
        lastName: newRow.lastName,
        email: newRow.email || null,
        phone: newRow.phone || null,
        role: newRow.role || null,
        isResponsibleOnSite: newRow.isResponsibleOnSite,
        allergies: newMed.allergies || null,
        dietaryRequirements: newMed.dietaryRequirements || null,
        medicalNotes: newMed.medicalNotes || null,
      }),
    });

    if (res.ok) {
      setNewRow({ firstName: "", lastName: "", email: "", phone: "", role: "", isResponsibleOnSite: false });
      setNewMed({ allergies: "", dietaryRequirements: "", medicalNotes: "" });
      setExpandedIds((prev) => { const n = new Set(prev); n.delete("new"); return n; });
      onRefresh();
    }
    setSaving((s) => { const n = new Set(s); n.delete("new"); return n; });
  }, [newRow, newMed, teamId, onRefresh]);

  const handleNewBlur = () => {
    if (newRow.firstName.trim() && newRow.lastName.trim()) createStaff();
  };

  const deleteStaff = async (id: number) => {
    await fetch(`/api/teams/${teamId}/people?id=${id}`, { method: "DELETE" });
    onRefresh();
  };

  const hasMedical = (p: StaffMember) => !!(p.allergies || p.dietaryRequirements || p.medicalNotes);

  return (
    <Card padding={false} className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b th-border bg-surface/50">
              <th className="text-center px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2 w-10">№</th>
              <th className="text-left px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2">{tp("firstName")}</th>
              <th className="text-left px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2">{tp("lastName")}</th>
              <th className="text-left px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2">{tp("email")}</th>
              <th className="text-left px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2 w-28">{tp("phone")}</th>
              <th className="text-left px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2 w-36">{tp("role")}</th>
              <th className="text-center px-1 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2 w-10" title={tp("responsibleOnSite")}>
                <ShieldCheck className="w-4 h-4 mx-auto" />
              </th>
              <th className="w-10" />
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {staff.map((person, idx) => (
              <>
                <tr key={person.id} className={cn(
                  "border-b th-border transition-colors group",
                  saving.has(person.id) && "bg-gold/5",
                  expandedIds.has(person.id) && "bg-navy/5"
                )}>
                  <td className="text-center px-2">
                    <span className="text-xs text-text-secondary/50 font-medium">{idx + 1}</span>
                  </td>
                  <td className="px-1">
                    <input defaultValue={person.firstName} className={cellInput}
                      onBlur={(e) => saveField(person.id, "firstName", e.target.value)} />
                  </td>
                  <td className="px-1">
                    <input defaultValue={person.lastName} className={cellInput}
                      onBlur={(e) => saveField(person.id, "lastName", e.target.value)} />
                  </td>
                  <td className="px-1">
                    <input type="email" defaultValue={person.email ?? ""} className={cellInput}
                      placeholder="email@..." onBlur={(e) => saveField(person.id, "email", e.target.value)} />
                  </td>
                  <td className="px-1">
                    <input type="tel" defaultValue={person.phone ?? ""} className={cn(cellInput, "w-28")}
                      placeholder="+372..." onBlur={(e) => saveField(person.id, "phone", e.target.value)} />
                  </td>
                  <td className="px-1">
                    <select defaultValue={person.role ?? ""} className={cellSelect}
                      onChange={(e) => saveField(person.id, "role", e.target.value)}>
                      <option value="">—</option>
                      {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                  <td className="text-center px-1">
                    <input type="checkbox" defaultChecked={person.isResponsibleOnSite}
                      className="accent-navy w-4 h-4 cursor-pointer"
                      onChange={(e) => saveField(person.id, "isResponsibleOnSite", e.target.checked)} />
                  </td>
                  <td className="px-1">
                    <button onClick={() => toggleExpand(person.id)}
                      className={cn("p-1.5 rounded-lg transition-colors cursor-pointer",
                        hasMedical(person) ? "text-gold-dark hover:bg-gold/10" : "text-text-secondary/40 hover:text-text-secondary hover:th-bg"
                      )} title={tp("allergies")}>
                      {expandedIds.has(person.id) ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-1">
                    <button onClick={() => deleteStaff(person.id)}
                      className="p-1.5 text-text-secondary/30 hover:text-error rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>

                {expandedIds.has(person.id) && (
                  <tr key={`${person.id}-med`} className="border-b th-border bg-navy/5">
                    <td colSpan={9} className="px-6 py-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wider th-text-2">{tp("allergies")}</label>
                          <input defaultValue={person.allergies ?? ""} placeholder={tp("allergiesHint")}
                            className="w-full text-sm px-3 py-1.5 rounded-lg border th-border th-card focus:outline-none focus:ring-2 focus:ring-navy/20"
                            onBlur={(e) => saveField(person.id, "allergies", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wider th-text-2">{tp("dietaryRequirements")}</label>
                          <input defaultValue={person.dietaryRequirements ?? ""} placeholder={tp("dietaryHint")}
                            className="w-full text-sm px-3 py-1.5 rounded-lg border th-border th-card focus:outline-none focus:ring-2 focus:ring-navy/20"
                            onBlur={(e) => saveField(person.id, "dietaryRequirements", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wider th-text-2">{tp("medicalNotes")}</label>
                          <input defaultValue={person.medicalNotes ?? ""} placeholder={tp("medicalHint")}
                            className="w-full text-sm px-3 py-1.5 rounded-lg border th-border th-card focus:outline-none focus:ring-2 focus:ring-navy/20"
                            onBlur={(e) => saveField(person.id, "medicalNotes", e.target.value)} />
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}

            {/* New row */}
            <tr className={cn("border-b th-border bg-surface/30", saving.has("new") && "bg-gold/5")}>
              <td className="text-center px-2"><span className="text-xs text-text-secondary/30">{staff.length + 1}</span></td>
              <td className="px-1">
                <input value={newRow.firstName} onChange={(e) => setNewRow({ ...newRow, firstName: e.target.value })}
                  onBlur={handleNewBlur} placeholder={tp("firstName")} className={cn(cellInput, "placeholder:text-text-secondary/30")} />
              </td>
              <td className="px-1">
                <input value={newRow.lastName} onChange={(e) => setNewRow({ ...newRow, lastName: e.target.value })}
                  onBlur={handleNewBlur} placeholder={tp("lastName")} className={cn(cellInput, "placeholder:text-text-secondary/30")} />
              </td>
              <td className="px-1">
                <input type="email" value={newRow.email} onChange={(e) => setNewRow({ ...newRow, email: e.target.value })}
                  placeholder="email@..." className={cn(cellInput, "placeholder:text-text-secondary/30")} />
              </td>
              <td className="px-1">
                <input type="tel" value={newRow.phone} onChange={(e) => setNewRow({ ...newRow, phone: e.target.value })}
                  placeholder="+372..." className={cn(cellInput, "placeholder:text-text-secondary/30 w-28")} />
              </td>
              <td className="px-1">
                <select value={newRow.role} onChange={(e) => setNewRow({ ...newRow, role: e.target.value })}
                  className={cn(cellSelect, "text-text-secondary/60")}>
                  <option value="">—</option>
                  {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </td>
              <td className="text-center px-1">
                <input type="checkbox" checked={newRow.isResponsibleOnSite}
                  onChange={(e) => setNewRow({ ...newRow, isResponsibleOnSite: e.target.checked })}
                  className="accent-navy w-4 h-4 cursor-pointer" />
              </td>
              <td className="px-1">
                <button onClick={() => toggleExpand("new")}
                  className="p-1.5 text-text-secondary/30 hover:text-text-secondary rounded-lg transition-colors cursor-pointer">
                  {expandedIds.has("new") ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </td>
              <td />
            </tr>

            {expandedIds.has("new") && (
              <tr className="border-b th-border bg-surface/30">
                <td colSpan={9} className="px-6 py-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider th-text-2">{tp("allergies")}</label>
                      <input value={newMed.allergies} onChange={(e) => setNewMed({ ...newMed, allergies: e.target.value })}
                        placeholder={tp("allergiesHint")} className="w-full text-sm px-3 py-1.5 rounded-lg border th-border th-card focus:outline-none focus:ring-2 focus:ring-navy/20" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider th-text-2">{tp("dietaryRequirements")}</label>
                      <input value={newMed.dietaryRequirements} onChange={(e) => setNewMed({ ...newMed, dietaryRequirements: e.target.value })}
                        placeholder={tp("dietaryHint")} className="w-full text-sm px-3 py-1.5 rounded-lg border th-border th-card focus:outline-none focus:ring-2 focus:ring-navy/20" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider th-text-2">{tp("medicalNotes")}</label>
                      <input value={newMed.medicalNotes} onChange={(e) => setNewMed({ ...newMed, medicalNotes: e.target.value })}
                        placeholder={tp("medicalHint")} className="w-full text-sm px-3 py-1.5 rounded-lg border th-border th-card focus:outline-none focus:ring-2 focus:ring-navy/20" />
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2.5 text-[11px] text-text-secondary/60 bg-surface/30 border-t th-border">
        {tp("firstName")} + {tp("lastName")} → auto-save
      </div>
    </Card>
  );
}
