"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronUp, Trash2, Plus } from "lucide-react";

type RosterAccompanying = {
  personId: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  personType: "player" | "staff" | "accompanying";
  needsHotel: boolean;
  allergies: string | null;
  dietaryRequirements: string | null;
  medicalNotes: string | null;
};

type NewRow = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  needsHotel: boolean;
};

interface AccompanyingInlineTableProps {
  persons: RosterAccompanying[];
  teamId: number;
  registrationId: number | null;
  onRefresh: () => void;
}

const cellCls = "w-full bg-transparent text-sm px-2 py-2 outline-none rounded transition-colors focus:ring-1 focus:ring-[var(--cat-accent)]/20";
const cellStyle = { color: "var(--cat-text)" } as React.CSSProperties;

const theadStyle: React.CSSProperties = { background: "var(--cat-card-bg)" };
const medRowStyle: React.CSSProperties = { background: "var(--cat-badge-open-bg)" };
const newRowStyle: React.CSSProperties = { background: "var(--cat-badge-open-bg)" };

// Сопровождающие per-tournament: имя/email/phone — клубный справочник,
// needsHotel/аллергии/медицина — pivot (на конкретный турнир).
export function AccompanyingInlineTable({ persons, teamId, registrationId, onRefresh }: AccompanyingInlineTableProps) {
  const tp = useTranslations("people");
  const ta = useTranslations("accompanying");

  const [expandedIds, setExpandedIds] = useState<Set<number | "new">>(new Set());
  const [saving, setSaving] = useState<Set<number | "new">>(new Set());
  const [newRow, setNewRow] = useState<NewRow>({ firstName: "", lastName: "", email: "", phone: "", needsHotel: false });
  const [newMed, setNewMed] = useState({ allergies: "", dietaryRequirements: "", medicalNotes: "" });
  const debounceTimers = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const toggleExpand = (id: number | "new") => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

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

  const saveRoster = useCallback((personId: number, field: string, value: string | boolean | null) => {
    if (!registrationId) return;
    const existing = debounceTimers.current.get(personId + 100000);
    if (existing) clearTimeout(existing);
    debounceTimers.current.set(personId + 100000, setTimeout(async () => {
      setSaving((s) => new Set(s).add(personId));
      await fetch(`/api/registrations/${registrationId}/roster/${personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      setSaving((s) => { const n = new Set(s); n.delete(personId); return n; });
    }, 400));
  }, [registrationId]);

  const createPerson = useCallback(async () => {
    if (!newRow.firstName.trim() || !newRow.lastName.trim()) return;
    setSaving((s) => new Set(s).add("new"));

    if (registrationId) {
      // Используем специальный endpoint — он создаст person + pivot за раз
      await fetch(`/api/registrations/${registrationId}/accompanying`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: newRow.firstName,
          lastName: newRow.lastName,
          email: newRow.email || null,
          phone: newRow.phone || null,
          needsHotel: newRow.needsHotel,
        }),
      });
    } else {
      // Fallback: только в справочник (маловероятно — на странице всегда есть регистрация)
      await fetch(`/api/teams/${teamId}/people`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personType: "accompanying",
          firstName: newRow.firstName,
          lastName: newRow.lastName,
          email: newRow.email || null,
          phone: newRow.phone || null,
        }),
      });
    }

    setNewRow({ firstName: "", lastName: "", email: "", phone: "", needsHotel: false });
    setNewMed({ allergies: "", dietaryRequirements: "", medicalNotes: "" });
    setExpandedIds((prev) => { const n = new Set(prev); n.delete("new"); return n; });
    onRefresh();
    setSaving((s) => { const n = new Set(s); n.delete("new"); return n; });
  }, [newRow, teamId, registrationId, onRefresh]);

  const handleNewBlur = () => {
    if (newRow.firstName.trim() && newRow.lastName.trim()) createPerson();
  };

  const deletePerson = async (id: number) => {
    await fetch(`/api/teams/${teamId}/people?id=${id}`, { method: "DELETE" });
    onRefresh();
  };

  const hasMedical = (p: RosterAccompanying) => !!(p.allergies || p.dietaryRequirements || p.medicalNotes);

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
              <th className="text-center px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2 w-16" title={tp("needsHotel")}>🏨</th>
              <th className="w-10" />
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {persons.map((person, idx) => (
              <>
                <tr key={person.personId}
                  className={cn("border-b th-border transition-colors group", saving.has(person.personId) && "bg-[var(--cat-badge-open-bg)]")}
                  style={expandedIds.has(person.personId) ? medRowStyle : undefined}>
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
                  <td className="text-center px-2">
                    <input type="checkbox" className="accent-navy w-4 h-4 cursor-pointer"
                      defaultChecked={person.needsHotel}
                      onChange={(e) => saveRoster(person.personId, "needsHotel", e.target.checked)} />
                  </td>
                  <td className="px-1">
                    <button onClick={() => toggleExpand(person.personId)}
                      className={cn("p-1.5 rounded-lg transition-colors cursor-pointer",
                        hasMedical(person) ? "text-[var(--cat-accent)] hover:opacity-80" : "hover:opacity-60")}
                      style={hasMedical(person) ? undefined : { color: "var(--cat-text-muted)" }}>
                      {expandedIds.has(person.personId) ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-1">
                    <button onClick={() => deletePerson(person.personId)}
                      className="p-1.5 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100 hover:text-red-500"
                      style={{ color: "var(--cat-text-muted)" }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>

                {expandedIds.has(person.personId) && (
                  <tr key={`${person.personId}-med`} className="border-b th-border" style={medRowStyle}>
                    <td colSpan={8} className="px-6 py-3">
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { key: "allergies", label: tp("allergies"), placeholder: tp("allergiesHint"), val: person.allergies },
                          { key: "dietaryRequirements", label: tp("dietaryRequirements"), placeholder: tp("dietaryHint"), val: person.dietaryRequirements },
                          { key: "medicalNotes", label: tp("medicalNotes"), placeholder: tp("medicalHint"), val: person.medicalNotes },
                        ].map(({ key, label, placeholder, val }) => (
                          <div key={key} className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase tracking-wider th-text-2">{label}</label>
                            <input defaultValue={val ?? ""} placeholder={placeholder}
                              className="w-full text-sm px-3 py-1.5 rounded-lg border th-border focus:outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/20"
                              style={{ background: "var(--cat-input-bg)", color: "var(--cat-text)" }}
                              onBlur={(e) => saveRoster(person.personId, key, e.target.value)} />
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}

            <tr className={cn("border-b th-border", saving.has("new") && "bg-[var(--cat-badge-open-bg)]")} style={newRowStyle}>
              <td className="text-center px-2">
                <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{persons.length + 1}</span>
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
              <td className="text-center px-2">
                <input type="checkbox" className="accent-navy w-4 h-4 cursor-pointer"
                  checked={newRow.needsHotel}
                  onChange={(e) => setNewRow({ ...newRow, needsHotel: e.target.checked })} />
              </td>
              <td className="px-1">
                <button onClick={() => toggleExpand("new")}
                  className="p-1.5 rounded-lg transition-colors cursor-pointer hover:opacity-60"
                  style={{ color: "var(--cat-text-muted)" }}>
                  {expandedIds.has("new") ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </td>
              <td />
            </tr>

            {expandedIds.has("new") && (
              <tr className="border-b th-border" style={newRowStyle}>
                <td colSpan={8} className="px-6 py-3">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: "allergies" as const, label: tp("allergies"), placeholder: tp("allergiesHint") },
                      { key: "dietaryRequirements" as const, label: tp("dietaryRequirements"), placeholder: tp("dietaryHint") },
                      { key: "medicalNotes" as const, label: tp("medicalNotes"), placeholder: tp("medicalHint") },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key} className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider th-text-2">{label}</label>
                        <input value={newMed[key]}
                          onChange={(e) => setNewMed({ ...newMed, [key]: e.target.value })}
                          placeholder={placeholder}
                          className="w-full text-sm px-3 py-1.5 rounded-lg border th-border focus:outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/20"
                          style={{ background: "var(--cat-input-bg)", color: "var(--cat-text)" }} />
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2.5 text-[11px] border-t th-border" style={{ color: "var(--cat-text-muted)", background: "var(--cat-card-bg)" }}>
        {ta("fillRowToAdd")}
      </div>
    </Card>
  );
}
