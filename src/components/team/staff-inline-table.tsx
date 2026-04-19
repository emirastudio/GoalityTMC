"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Trash2, ShieldCheck } from "lucide-react";

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

  const deleteStaff = async (id: number) => {
    await fetch(`/api/teams/${teamId}/people?id=${id}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <Card padding={false} className="overflow-hidden">
      <div className="overflow-x-auto">
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
                  <button onClick={() => deleteStaff(person.personId)}
                    className="p-1.5 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100 hover:text-red-500"
                    style={{ color: "var(--cat-text-muted)" }}>
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
                  onBlur={handleNewBlur} placeholder="email" className={cellCls} style={cellStyle} />
              </td>
              <td className="px-1">
                <input type="tel" value={newRow.phone} onChange={(e) => setNewRow({ ...newRow, phone: e.target.value })}
                  onBlur={handleNewBlur} placeholder="phone" className={cellCls} style={cellStyle} />
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

      <div className="px-4 py-2.5 text-[11px] border-t th-border" style={{ color: "var(--cat-text-muted)", background: "var(--cat-card-bg)" }}>
        {ts("fillRowToAdd")}
      </div>
    </Card>
  );
}
