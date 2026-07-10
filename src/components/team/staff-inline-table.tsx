"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trash2, ShieldCheck, Plus } from "lucide-react";

type RosterStaff = {
  personId: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  personType: "player" | "staff" | "accompanying";
  isResponsibleOnSite: boolean;
  needsHotel: boolean;
};

type NewRow = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isResponsibleOnSite: boolean;
  needsHotel: boolean;
};

interface StaffInlineTableProps {
  staff: RosterStaff[];
  teamId: number;
  registrationId: number | null;
  roleOptions: { value: string; label: string }[];
  onRefresh: () => void;
}

const cellCls = "w-full bg-transparent text-sm px-2 py-2 outline-none rounded transition-colors focus:ring-1 focus:ring-[var(--cat-accent)]/20";
const selectCls = "w-full bg-transparent text-sm px-1 py-2 outline-none rounded transition-colors appearance-none cursor-pointer focus:ring-1 focus:ring-[var(--cat-accent)]/20";
const cellStyle = { color: "var(--cat-text)" } as React.CSSProperties;

const mFieldCls = "w-full text-sm px-3 py-2.5 rounded-lg border th-border outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/20";
const mInputStyle = { background: "var(--cat-input-bg)", color: "var(--cat-text)" } as React.CSSProperties;

function MField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="block text-[10px] font-semibold uppercase tracking-wider th-text-2 mb-1">{label}</span>
      {children}
    </label>
  );
}

const theadStyle: React.CSSProperties = { background: "var(--cat-card-bg)" };
const newRowStyle: React.CSSProperties = { background: "var(--cat-badge-open-bg)" };

// Staff per-tournament: email/phone/role — клубный справочник (вечное),
// isResponsibleOnSite и needsHotel — на конкретный турнир (pivot).
export function StaffInlineTable({ staff, teamId, registrationId, roleOptions, onRefresh }: StaffInlineTableProps) {
  const tp = useTranslations("people");
  const ts = useTranslations("staff");

  const [saving, setSaving] = useState<Set<number | "new">>(new Set());
  const [newRow, setNewRow] = useState<NewRow>({ firstName: "", lastName: "", email: "", phone: "", role: "", isResponsibleOnSite: false, needsHotel: false });
  const debounceTimers = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const savePerson = useCallback((personId: number, field: string, value: string) => {
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
    }, 600));
  }, [teamId]);

  const saveRoster = useCallback((personId: number, field: string, value: boolean) => {
    if (!registrationId) return;
    setSaving((s) => new Set(s).add(personId));
    fetch(`/api/registrations/${registrationId}/roster/${personId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    }).finally(() => {
      setSaving((s) => { const n = new Set(s); n.delete(personId); return n; });
      if (field === "isResponsibleOnSite") onRefresh();
    });
  }, [registrationId, onRefresh]);

  const createStaff = useCallback(async () => {
    if (!newRow.firstName.trim() || !newRow.lastName.trim()) return;
    setSaving((s) => new Set(s).add("new"));

    const personRes = await fetch(`/api/teams/${teamId}/people`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personType: "staff",
        firstName: newRow.firstName,
        lastName: newRow.lastName,
        email: newRow.email || null,
        phone: newRow.phone || null,
        role: newRow.role || null,
      }),
    });

    if (personRes.ok && registrationId) {
      const person = await personRes.json();
      await fetch(`/api/registrations/${registrationId}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: person.id }),
      });
      if (newRow.isResponsibleOnSite || newRow.needsHotel) {
        await fetch(`/api/registrations/${registrationId}/roster/${person.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isResponsibleOnSite: newRow.isResponsibleOnSite,
            needsHotel: newRow.needsHotel,
          }),
        });
      }
    }

    setNewRow({ firstName: "", lastName: "", email: "", phone: "", role: "", isResponsibleOnSite: false, needsHotel: false });
    onRefresh();
    setSaving((s) => { const n = new Set(s); n.delete("new"); return n; });
  }, [newRow, teamId, registrationId, onRefresh]);

  const handleNewBlur = () => {
    if (newRow.firstName.trim() && newRow.lastName.trim()) createStaff();
  };

  const deleteStaff = async (id: number, name: string) => {
    if (!confirm(tp("deleteConfirm", { name: name.trim() || tp("unnamed") }))) return;
    await fetch(`/api/teams/${teamId}/people?id=${id}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <Card padding={false} className="overflow-hidden">
      {/* Desktop: spreadsheet table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b th-border" style={theadStyle}>
              <th className="text-center px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2 w-10">№</th>
              <th className="text-left px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2">{tp("firstName")}</th>
              <th className="text-left px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2">{tp("lastName")}</th>
              <th className="text-left px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2">{tp("email")}</th>
              <th className="text-left px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2">{tp("phone")}</th>
              <th className="text-left px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2 w-40">{tp("role")}</th>
              <th className="text-center px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2 w-16" title={tp("responsibleOnSite")}>
                <ShieldCheck className="w-3.5 h-3.5 inline" />
              </th>
              <th className="text-center px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2 w-16" title={tp("needsHotel")}>🏨</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {staff.map((person, idx) => (
              <tr key={person.personId}
                className={cn("border-b th-border transition-colors group", saving.has(person.personId) && "bg-[var(--cat-badge-open-bg)]")}>
                <td className="text-center px-2">
                  <span className="text-xs font-medium" style={{ color: "var(--cat-text-muted)" }}>{idx + 1}</span>
                </td>
                <td className="px-1">
                  <input defaultValue={person.firstName} className={cellCls} style={cellStyle}
                    onBlur={(e) => savePerson(person.personId, "firstName", e.target.value)} />
                </td>
                <td className="px-1">
                  <input defaultValue={person.lastName} className={cellCls} style={cellStyle}
                    onBlur={(e) => savePerson(person.personId, "lastName", e.target.value)} />
                </td>
                <td className="px-1">
                  <input type="email" defaultValue={person.email ?? ""} className={cellCls} style={cellStyle}
                    onBlur={(e) => savePerson(person.personId, "email", e.target.value)} />
                </td>
                <td className="px-1">
                  <input type="tel" defaultValue={person.phone ?? ""} className={cellCls} style={cellStyle}
                    onBlur={(e) => savePerson(person.personId, "phone", e.target.value)} />
                </td>
                <td className="px-1">
                  <select defaultValue={person.role ?? ""} className={selectCls} style={cellStyle}
                    onChange={(e) => savePerson(person.personId, "role", e.target.value)}>
                    <option value="">—</option>
                    {roleOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </td>
                <td className="text-center px-2">
                  <input type="checkbox" className="accent-navy w-4 h-4 cursor-pointer"
                    defaultChecked={person.isResponsibleOnSite}
                    onChange={(e) => saveRoster(person.personId, "isResponsibleOnSite", e.target.checked)} />
                </td>
                <td className="text-center px-2">
                  <input type="checkbox" className="accent-navy w-4 h-4 cursor-pointer"
                    defaultChecked={person.needsHotel}
                    onChange={(e) => saveRoster(person.personId, "needsHotel", e.target.checked)} />
                </td>
                <td className="px-1">
                  <button onClick={() => deleteStaff(person.personId, `${person.firstName} ${person.lastName}`)}
                    className="p-1.5 rounded-lg transition-colors cursor-pointer opacity-60 hover:opacity-100 hover:text-red-500"
                    style={{ color: "var(--cat-text-muted)" }}
                    title={tp("deleteLabel")} aria-label={tp("deleteLabel")}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}

            <tr className={cn("border-b th-border", saving.has("new") && "bg-[var(--cat-badge-open-bg)]")} style={newRowStyle}>
              <td className="text-center px-2">
                <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{staff.length + 1}</span>
              </td>
              <td className="px-1">
                <input value={newRow.firstName} onChange={(e) => setNewRow({ ...newRow, firstName: e.target.value })}
                  onBlur={handleNewBlur} placeholder={tp("firstName")} className={cellCls} style={cellStyle} />
              </td>
              <td className="px-1">
                <input value={newRow.lastName} onChange={(e) => setNewRow({ ...newRow, lastName: e.target.value })}
                  onBlur={handleNewBlur} placeholder={tp("lastName")} className={cellCls} style={cellStyle} />
              </td>
              <td className="px-1">
                <input type="email" value={newRow.email} onChange={(e) => setNewRow({ ...newRow, email: e.target.value })}
                  onBlur={handleNewBlur} placeholder={tp("email")} className={cellCls} style={cellStyle} />
              </td>
              <td className="px-1">
                <input type="tel" value={newRow.phone} onChange={(e) => setNewRow({ ...newRow, phone: e.target.value })}
                  onBlur={handleNewBlur} placeholder={tp("phone")} className={cellCls} style={cellStyle} />
              </td>
              <td className="px-1">
                <select value={newRow.role} onChange={(e) => setNewRow({ ...newRow, role: e.target.value })}
                  className={selectCls} style={cellStyle}>
                  <option value="">—</option>
                  {roleOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </td>
              <td className="text-center px-2">
                <input type="checkbox" className="accent-navy w-4 h-4 cursor-pointer"
                  checked={newRow.isResponsibleOnSite}
                  onChange={(e) => setNewRow({ ...newRow, isResponsibleOnSite: e.target.checked })} />
              </td>
              <td className="text-center px-2">
                <input type="checkbox" className="accent-navy w-4 h-4 cursor-pointer"
                  checked={newRow.needsHotel}
                  onChange={(e) => setNewRow({ ...newRow, needsHotel: e.target.checked })} />
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <div className="md:hidden divide-y th-border">
        {staff.map((person, idx) => (
          <div key={person.personId} className={cn("p-4 space-y-3", saving.has(person.personId) && "bg-[var(--cat-badge-open-bg)]")}>
            <div className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-xs font-semibold" style={{ color: "var(--cat-text-muted)" }}>{idx + 1}</span>
              <span className="flex-1 truncate text-sm font-semibold" style={{ color: "var(--cat-text)" }}>
                {`${person.firstName} ${person.lastName}`.trim() || "—"}
              </span>
              <button onClick={() => deleteStaff(person.personId, `${person.firstName} ${person.lastName}`)}
                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg hover:text-red-500 transition-colors cursor-pointer"
                style={{ color: "var(--cat-text-muted)" }} title={tp("deleteLabel")} aria-label={tp("deleteLabel")}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MField label={tp("firstName")}>
                <input defaultValue={person.firstName} className={mFieldCls} style={mInputStyle}
                  onBlur={(e) => savePerson(person.personId, "firstName", e.target.value)} />
              </MField>
              <MField label={tp("lastName")}>
                <input defaultValue={person.lastName} className={mFieldCls} style={mInputStyle}
                  onBlur={(e) => savePerson(person.personId, "lastName", e.target.value)} />
              </MField>
              <MField label={tp("email")}>
                <input type="email" defaultValue={person.email ?? ""} className={mFieldCls} style={mInputStyle}
                  onBlur={(e) => savePerson(person.personId, "email", e.target.value)} />
              </MField>
              <MField label={tp("phone")}>
                <input type="tel" defaultValue={person.phone ?? ""} className={mFieldCls} style={mInputStyle}
                  onBlur={(e) => savePerson(person.personId, "phone", e.target.value)} />
              </MField>
            </div>
            <MField label={tp("role")}>
              <select defaultValue={person.role ?? ""} className={cn(mFieldCls, "appearance-none cursor-pointer")} style={mInputStyle}
                onChange={(e) => savePerson(person.personId, "role", e.target.value)}>
                <option value="">—</option>
                {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </MField>
            <div className="flex flex-col gap-2 pt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--cat-text-secondary)" }}>
                <input type="checkbox" className="accent-navy w-5 h-5 cursor-pointer" defaultChecked={person.isResponsibleOnSite}
                  onChange={(e) => saveRoster(person.personId, "isResponsibleOnSite", e.target.checked)} />
                <ShieldCheck className="w-4 h-4" /> {tp("responsibleOnSite")}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--cat-text-secondary)" }}>
                <input type="checkbox" className="accent-navy w-5 h-5 cursor-pointer" defaultChecked={person.needsHotel}
                  onChange={(e) => saveRoster(person.personId, "needsHotel", e.target.checked)} />
                🏨 {tp("needsHotel")}
              </label>
            </div>
          </div>
        ))}

        {/* New staff card */}
        <div className={cn("p-4 space-y-3", saving.has("new") && "bg-[var(--cat-badge-open-bg)]")} style={newRowStyle}>
          <div className="text-[11px] font-semibold uppercase tracking-wider th-text-2">{ts("addStaff")}</div>
          <div className="grid grid-cols-2 gap-2">
            <MField label={tp("firstName")}>
              <input value={newRow.firstName} onChange={(e) => setNewRow({ ...newRow, firstName: e.target.value })}
                placeholder={tp("firstName")} className={mFieldCls} style={mInputStyle} />
            </MField>
            <MField label={tp("lastName")}>
              <input value={newRow.lastName} onChange={(e) => setNewRow({ ...newRow, lastName: e.target.value })}
                placeholder={tp("lastName")} className={mFieldCls} style={mInputStyle} />
            </MField>
            <MField label={tp("email")}>
              <input type="email" value={newRow.email} onChange={(e) => setNewRow({ ...newRow, email: e.target.value })}
                placeholder={tp("email")} className={mFieldCls} style={mInputStyle} />
            </MField>
            <MField label={tp("phone")}>
              <input type="tel" value={newRow.phone} onChange={(e) => setNewRow({ ...newRow, phone: e.target.value })}
                placeholder={tp("phone")} className={mFieldCls} style={mInputStyle} />
            </MField>
          </div>
          <MField label={tp("role")}>
            <select value={newRow.role} onChange={(e) => setNewRow({ ...newRow, role: e.target.value })}
              className={cn(mFieldCls, "appearance-none cursor-pointer")} style={mInputStyle}>
              <option value="">—</option>
              {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </MField>
          <Button size="sm" loading={saving.has("new")} disabled={!newRow.firstName.trim() || !newRow.lastName.trim()} onClick={createStaff}>
            <Plus className="w-4 h-4" /> {ts("addStaff")}
          </Button>
        </div>
      </div>

      <div className="hidden md:block px-4 py-2.5 text-[11px] border-t th-border" style={{ color: "var(--cat-text-muted)", background: "var(--cat-card-bg)" }}>
        {ts("fillRowToAdd")}
      </div>
    </Card>
  );
}
