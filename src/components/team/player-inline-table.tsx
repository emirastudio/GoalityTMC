"use client";

import { useState, useRef, useCallback, Fragment } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronUp, Trash2, Plus, ClipboardList, X } from "lucide-react";

// Row from /api/registrations/[id]/roster — pivot joined with people.
type RosterPlayer = {
  personId: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  position: string | null;
  personType: "player" | "staff" | "accompanying";
  includedInRoster: boolean;
  needsHotel: boolean;
  shirtNumber: number | null;
  allergies: string | null;
  dietaryRequirements: string | null;
  medicalNotes: string | null;
};

type NewRow = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  position: string;
  shirtNumber: string;
};

interface PlayerInlineTableProps {
  players: RosterPlayer[];
  teamId: number;
  registrationId: number | null;
  positionOptions: { value: string; label: string }[];
  onRefresh: () => void;
}

function calcAge(dob: string | null): string {
  if (!dob) return "—";
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age > 0 && age < 100 ? String(age) : "—";
}

const cellCls = "w-full bg-transparent text-sm px-2 py-2 outline-none rounded transition-colors focus:ring-1 focus:ring-[var(--cat-accent)]/20";
const selectCls = "w-full bg-transparent text-sm px-1 py-2 outline-none rounded transition-colors appearance-none cursor-pointer focus:ring-1 focus:ring-[var(--cat-accent)]/20";
const cellStyle = { color: "var(--cat-text)" } as React.CSSProperties;

// Mobile card field styles (labelled, full-width, ≥44px tap targets).
const mFieldCls = "w-full text-sm px-3 py-2.5 rounded-lg border th-border bg-transparent outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/20";
const mInputStyle = { background: "var(--cat-input-bg)", color: "var(--cat-text)" } as React.CSSProperties;

function MField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="block text-[10px] font-semibold uppercase tracking-wider th-text-2 mb-1">{label}</span>
      {children}
    </label>
  );
}

// Per-tournament roster: shirt number, hotel flag, allergies/medical — все
// полями pivot-таблицы registration_people, т.е. своё для каждого турнира.
// Базовые данные (имя, ДР, позиция) — правятся в клубном справочнике.
export function PlayerInlineTable({ players, teamId, registrationId, positionOptions, onRefresh }: PlayerInlineTableProps) {
  const t = useTranslations("players");
  const tp = useTranslations("people");

  const [expandedIds, setExpandedIds] = useState<Set<number | "new">>(new Set());
  const [saving, setSaving] = useState<Set<number | "new">>(new Set());
  const [newRow, setNewRow] = useState<NewRow>({ firstName: "", lastName: "", dateOfBirth: "", position: "", shirtNumber: "" });
  const [newMed, setNewMed] = useState({ allergies: "", dietaryRequirements: "", medicalNotes: "", needsHotel: false });
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasting, setPasting] = useState(false);
  const debounceTimers = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const toggleExpand = (id: number | "new") => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Клубное поле (имя/фамилия/ДР/позиция) → PATCH people
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

  // Турнирное поле (номер, отель, аллергии, медицина) → PATCH pivot
  const saveRoster = useCallback((personId: number, field: string, value: string | boolean | number | null) => {
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

  const createPlayer = useCallback(async () => {
    if (!newRow.firstName.trim() || !newRow.lastName.trim()) return;
    setSaving((s) => new Set(s).add("new"));

    // 1. создаём в клубном справочнике
    const personRes = await fetch(`/api/teams/${teamId}/people`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personType: "player",
        firstName: newRow.firstName,
        lastName: newRow.lastName,
        dateOfBirth: newRow.dateOfBirth || null,
        position: newRow.position || null,
      }),
    });

    if (personRes.ok && registrationId) {
      const person = await personRes.json();
      // 2. добавляем в pivot этого турнира с поездочными полями
      await fetch(`/api/registrations/${registrationId}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: person.id }),
      });
      if (newRow.shirtNumber || newMed.allergies || newMed.dietaryRequirements || newMed.medicalNotes || newMed.needsHotel) {
        await fetch(`/api/registrations/${registrationId}/roster/${person.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shirtNumber: newRow.shirtNumber ? Number(newRow.shirtNumber) : null,
            needsHotel: newMed.needsHotel,
            allergies: newMed.allergies || null,
            dietaryRequirements: newMed.dietaryRequirements || null,
            medicalNotes: newMed.medicalNotes || null,
          }),
        });
      }
    }

    setNewRow({ firstName: "", lastName: "", dateOfBirth: "", position: "", shirtNumber: "" });
    setNewMed({ allergies: "", dietaryRequirements: "", medicalNotes: "", needsHotel: false });
    setExpandedIds((prev) => { const n = new Set(prev); n.delete("new"); return n; });
    onRefresh();
    setSaving((s) => { const n = new Set(s); n.delete("new"); return n; });
  }, [newRow, newMed, teamId, registrationId, onRefresh]);

  const handleNewBlur = () => {
    if (newRow.firstName.trim() && newRow.lastName.trim()) createPlayer();
  };

  // Bulk import — one "First Last" per line. Creates each player in the club
  // directory + this tournament's roster, sequentially (keeps the API simple
  // and avoids hammering it from a phone on a flaky venue connection).
  const importPaste = useCallback(async () => {
    const lines = pasteText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    setPasting(true);
    for (const line of lines) {
      const parts = line.split(/\s+/);
      const firstName = parts.shift() ?? "";
      const lastName = parts.join(" ");
      if (!firstName) continue;
      const personRes = await fetch(`/api/teams/${teamId}/people`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personType: "player", firstName, lastName, dateOfBirth: null, position: null }),
      });
      if (personRes.ok && registrationId) {
        const person = await personRes.json();
        await fetch(`/api/registrations/${registrationId}/roster`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ personId: person.id }),
        });
      }
    }
    setPasteText("");
    setPasteOpen(false);
    setPasting(false);
    onRefresh();
  }, [pasteText, teamId, registrationId, onRefresh]);

  const deletePlayer = async (id: number, name: string) => {
    if (!confirm(tp("deleteConfirm", { name: name.trim() || tp("unnamed") }))) return;
    await fetch(`/api/teams/${teamId}/people?id=${id}`, { method: "DELETE" });
    onRefresh();
  };

  const hasMedical = (p: RosterPlayer) => !!(p.allergies || p.dietaryRequirements || p.medicalNotes);

  const medRowStyle: React.CSSProperties = { background: "var(--cat-badge-open-bg)" };
  const theadStyle: React.CSSProperties = { background: "var(--cat-card-bg)" };
  const newRowStyle: React.CSSProperties = { background: "var(--cat-badge-open-bg)" };

  return (
    <Card padding={false} className="overflow-hidden">
      {/* Bulk import toolbar (shared desktop + mobile) */}
      <div className="flex items-center justify-end px-4 py-2.5 border-b th-border" style={{ background: "var(--cat-card-bg)" }}>
        <button
          type="button"
          onClick={() => setPasteOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-lg border th-border transition-colors hover:opacity-80 cursor-pointer"
          style={{ color: "var(--cat-text-secondary)" }}
        >
          <ClipboardList className="w-3.5 h-3.5" /> {t("pasteList")}
        </button>
      </div>
      {pasteOpen && (
        <div className="px-4 py-3 border-b th-border space-y-2" style={{ background: "var(--cat-badge-open-bg)" }}>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={5}
            placeholder={t("pastePlaceholder")}
            className="w-full text-sm px-3 py-2 rounded-lg border th-border outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/20 resize-y"
            style={mInputStyle}
          />
          <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>{t("pasteHint")}</p>
          <div className="flex items-center gap-2">
            <Button size="sm" loading={pasting} disabled={!pasteText.trim()} onClick={importPaste}>
              {pasting ? t("pasteImporting") : t("pasteAdd")}
            </Button>
            <button
              type="button"
              onClick={() => { setPasteOpen(false); setPasteText(""); }}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:opacity-70 cursor-pointer"
              style={{ color: "var(--cat-text-muted)" }}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop: spreadsheet table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b th-border" style={theadStyle}>
              <th className="text-center px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2 w-10">№</th>
              <th className="text-center px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2 w-16">{tp("shirtNumber")}</th>
              <th className="text-left px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2">{tp("firstName")}</th>
              <th className="text-left px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2">{tp("lastName")}</th>
              <th className="text-left px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2 w-32">{tp("dateOfBirth")}</th>
              <th className="text-center px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2 w-16">{t("age")}</th>
              <th className="text-left px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2 w-32">{tp("position")}</th>
              <th className="text-center px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider th-text-2 w-20" title={tp("needsHotel")}>🏨</th>
              <th className="w-10" />
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {players.map((player, idx) => (
              <Fragment key={player.personId}>
                <tr
                  className={cn("border-b th-border transition-colors group", saving.has(player.personId) && "bg-[var(--cat-badge-open-bg)]")}
                  style={expandedIds.has(player.personId) ? medRowStyle : undefined}
                >
                  <td className="text-center px-2">
                    <span className="text-xs font-medium" style={{ color: "var(--cat-text-muted)" }}>{idx + 1}</span>
                  </td>
                  <td className="px-1">
                    <input type="number" defaultValue={player.shirtNumber ?? ""} style={cellStyle}
                      className={cn(cellCls, "w-14 text-center")}
                      onBlur={(e) => saveRoster(player.personId, "shirtNumber", e.target.value || null)} />
                  </td>
                  <td className="px-1">
                    <input defaultValue={player.firstName} className={cellCls} style={cellStyle}
                      onBlur={(e) => savePerson(player.personId, "firstName", e.target.value)} />
                  </td>
                  <td className="px-1">
                    <input defaultValue={player.lastName} className={cellCls} style={cellStyle}
                      onBlur={(e) => savePerson(player.personId, "lastName", e.target.value)} />
                  </td>
                  <td className="px-1">
                    <input type="date" defaultValue={player.dateOfBirth ? new Date(player.dateOfBirth).toISOString().split("T")[0] : ""}
                      className={cn(cellCls, "w-32")} style={cellStyle}
                      onBlur={(e) => savePerson(player.personId, "dateOfBirth", e.target.value)} />
                  </td>
                  <td className="text-center px-2">
                    <span className="text-sm font-medium" style={{ color: "var(--cat-text-secondary)" }}>{calcAge(player.dateOfBirth)}</span>
                  </td>
                  <td className="px-1">
                    <select defaultValue={player.position ?? ""} className={selectCls} style={cellStyle}
                      onChange={(e) => savePerson(player.personId, "position", e.target.value)}>
                      <option value="">—</option>
                      {positionOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="text-center px-2">
                    <input type="checkbox" className="accent-navy w-4 h-4 cursor-pointer"
                      defaultChecked={player.needsHotel}
                      onChange={(e) => saveRoster(player.personId, "needsHotel", e.target.checked)} />
                  </td>
                  <td className="px-1">
                    <button
                      onClick={() => toggleExpand(player.personId)}
                      className={cn("p-1.5 rounded-lg transition-colors cursor-pointer",
                        hasMedical(player) ? "text-[var(--cat-accent)] hover:opacity-80" : "hover:opacity-60"
                      )}
                      style={hasMedical(player) ? undefined : { color: "var(--cat-text-muted)" }}
                      title={t("extraInfo")}
                    >
                      {expandedIds.has(player.personId) ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-1">
                    <button
                      onClick={() => deletePlayer(player.personId, `${player.firstName} ${player.lastName}`)}
                      className="p-1.5 rounded-lg transition-colors cursor-pointer opacity-60 hover:opacity-100 hover:text-red-500"
                      style={{ color: "var(--cat-text-muted)" }}
                      title={tp("deleteLabel")}
                      aria-label={tp("deleteLabel")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>

                {expandedIds.has(player.personId) && (
                  <tr key={`${player.personId}-med`} className="border-b th-border" style={medRowStyle}>
                    <td colSpan={10} className="px-6 py-3">
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { key: "allergies", label: tp("allergies"), placeholder: tp("allergiesHint"), val: player.allergies },
                          { key: "dietaryRequirements", label: tp("dietaryRequirements"), placeholder: tp("dietaryHint"), val: player.dietaryRequirements },
                          { key: "medicalNotes", label: tp("medicalNotes"), placeholder: tp("medicalHint"), val: player.medicalNotes },
                        ].map(({ key, label, placeholder, val }) => (
                          <div key={key} className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase tracking-wider th-text-2">{label}</label>
                            <input defaultValue={val ?? ""} placeholder={placeholder}
                              className="w-full text-sm px-3 py-1.5 rounded-lg border th-border focus:outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/20"
                              style={{ background: "var(--cat-input-bg)", color: "var(--cat-text)" }}
                              onBlur={(e) => saveRoster(player.personId, key, e.target.value)} />
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}

            <tr className={cn("border-b th-border", saving.has("new") && "bg-[var(--cat-badge-open-bg)]")} style={newRowStyle}>
              <td className="text-center px-2">
                <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{players.length + 1}</span>
              </td>
              <td className="px-1">
                <input type="number" value={newRow.shirtNumber}
                  onChange={(e) => setNewRow({ ...newRow, shirtNumber: e.target.value })}
                  placeholder="#" className={cn(cellCls, "w-12 text-center")} style={cellStyle} />
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
                <input type="date" value={newRow.dateOfBirth}
                  onChange={(e) => setNewRow({ ...newRow, dateOfBirth: e.target.value })}
                  className={cn(cellCls, "w-32")} style={cellStyle} />
              </td>
              <td className="text-center px-2">
                <span className="text-sm" style={{ color: "var(--cat-text-muted)" }}>{calcAge(newRow.dateOfBirth || null)}</span>
              </td>
              <td className="px-1">
                <select value={newRow.position} onChange={(e) => setNewRow({ ...newRow, position: e.target.value })}
                  className={selectCls} style={cellStyle}>
                  <option value="">—</option>
                  {positionOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </td>
              <td className="text-center px-2">
                <input type="checkbox" className="accent-navy w-4 h-4 cursor-pointer"
                  checked={newMed.needsHotel}
                  onChange={(e) => setNewMed({ ...newMed, needsHotel: e.target.checked })} />
              </td>
              <td className="px-1">
                <button onClick={() => toggleExpand("new")}
                  className="p-1.5 rounded-lg transition-colors cursor-pointer hover:opacity-60"
                  style={{ color: "var(--cat-text-muted)" }} title={t("extraInfo")}>
                  {expandedIds.has("new") ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </td>
              <td />
            </tr>

            {expandedIds.has("new") && (
              <tr className="border-b th-border" style={newRowStyle}>
                <td colSpan={10} className="px-6 py-3">
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

      {/* Mobile: stacked cards (one per player) */}
      <div className="md:hidden divide-y th-border">
        {players.map((player, idx) => (
          <div key={player.personId} className={cn("p-4 space-y-3", saving.has(player.personId) && "bg-[var(--cat-badge-open-bg)]")}>
            <div className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-xs font-semibold" style={{ color: "var(--cat-text-muted)" }}>{idx + 1}</span>
              <input type="number" inputMode="numeric" defaultValue={player.shirtNumber ?? ""} placeholder="#"
                className="w-16 text-center text-sm px-2 py-2.5 rounded-lg border th-border outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/20"
                style={mInputStyle}
                onBlur={(e) => saveRoster(player.personId, "shirtNumber", e.target.value || null)} />
              <span className="flex-1 truncate text-sm font-semibold" style={{ color: "var(--cat-text)" }}>
                {`${player.firstName} ${player.lastName}`.trim() || "—"}
              </span>
              <button onClick={() => deletePlayer(player.personId, `${player.firstName} ${player.lastName}`)}
                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg hover:text-red-500 transition-colors cursor-pointer"
                style={{ color: "var(--cat-text-muted)" }} title={tp("deleteLabel")} aria-label={tp("deleteLabel")}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MField label={tp("firstName")}>
                <input defaultValue={player.firstName} className={mFieldCls} style={mInputStyle}
                  onBlur={(e) => savePerson(player.personId, "firstName", e.target.value)} />
              </MField>
              <MField label={tp("lastName")}>
                <input defaultValue={player.lastName} className={mFieldCls} style={mInputStyle}
                  onBlur={(e) => savePerson(player.personId, "lastName", e.target.value)} />
              </MField>
              <MField label={`${tp("dateOfBirth")} · ${calcAge(player.dateOfBirth)}`}>
                <input type="date" defaultValue={player.dateOfBirth ? new Date(player.dateOfBirth).toISOString().split("T")[0] : ""}
                  className={mFieldCls} style={mInputStyle}
                  onBlur={(e) => savePerson(player.personId, "dateOfBirth", e.target.value)} />
              </MField>
              <MField label={tp("position")}>
                <select defaultValue={player.position ?? ""} className={cn(mFieldCls, "appearance-none cursor-pointer")} style={mInputStyle}
                  onChange={(e) => savePerson(player.personId, "position", e.target.value)}>
                  <option value="">—</option>
                  {positionOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </MField>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--cat-text-secondary)" }}>
              <input type="checkbox" className="accent-navy w-5 h-5 cursor-pointer" defaultChecked={player.needsHotel}
                onChange={(e) => saveRoster(player.personId, "needsHotel", e.target.checked)} />
              🏨 {tp("needsHotel")}
            </label>
            <div>
              <button type="button" onClick={() => toggleExpand(player.personId)}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium cursor-pointer"
                style={{ color: hasMedical(player) ? "var(--cat-accent)" : "var(--cat-text-muted)" }}>
                {expandedIds.has(player.personId) ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {t("medicalSection")}
              </button>
              {expandedIds.has(player.personId) && (
                <div className="mt-2 space-y-2">
                  {[
                    { key: "allergies", label: tp("allergies"), placeholder: tp("allergiesHint"), val: player.allergies },
                    { key: "dietaryRequirements", label: tp("dietaryRequirements"), placeholder: tp("dietaryHint"), val: player.dietaryRequirements },
                    { key: "medicalNotes", label: tp("medicalNotes"), placeholder: tp("medicalHint"), val: player.medicalNotes },
                  ].map(({ key, label, placeholder, val }) => (
                    <MField key={key} label={label}>
                      <input defaultValue={val ?? ""} placeholder={placeholder} className={mFieldCls} style={mInputStyle}
                        onBlur={(e) => saveRoster(player.personId, key, e.target.value)} />
                    </MField>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* New player card */}
        <div className={cn("p-4 space-y-3", saving.has("new") && "bg-[var(--cat-badge-open-bg)]")} style={newRowStyle}>
          <div className="text-[11px] font-semibold uppercase tracking-wider th-text-2">{t("addPlayer")}</div>
          <div className="grid grid-cols-2 gap-2">
            <MField label={tp("firstName")}>
              <input value={newRow.firstName} onChange={(e) => setNewRow({ ...newRow, firstName: e.target.value })}
                placeholder={tp("firstName")} className={mFieldCls} style={mInputStyle} />
            </MField>
            <MField label={tp("lastName")}>
              <input value={newRow.lastName} onChange={(e) => setNewRow({ ...newRow, lastName: e.target.value })}
                placeholder={tp("lastName")} className={mFieldCls} style={mInputStyle} />
            </MField>
            <MField label={tp("shirtNumber")}>
              <input type="number" inputMode="numeric" value={newRow.shirtNumber}
                onChange={(e) => setNewRow({ ...newRow, shirtNumber: e.target.value })} placeholder="#"
                className={mFieldCls} style={mInputStyle} />
            </MField>
            <MField label={tp("dateOfBirth")}>
              <input type="date" value={newRow.dateOfBirth} onChange={(e) => setNewRow({ ...newRow, dateOfBirth: e.target.value })}
                className={mFieldCls} style={mInputStyle} />
            </MField>
          </div>
          <MField label={tp("position")}>
            <select value={newRow.position} onChange={(e) => setNewRow({ ...newRow, position: e.target.value })}
              className={cn(mFieldCls, "appearance-none cursor-pointer")} style={mInputStyle}>
              <option value="">—</option>
              {positionOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </MField>
          <Button size="sm" loading={saving.has("new")} disabled={!newRow.firstName.trim() || !newRow.lastName.trim()} onClick={createPlayer}>
            <Plus className="w-4 h-4" /> {t("addPlayer")}
          </Button>
        </div>
      </div>

      <div className="hidden md:block px-4 py-2.5 text-[11px] border-t th-border" style={{ color: "var(--cat-text-muted)", background: "var(--cat-card-bg)" }}>
        {t("fillRowToAdd")}
      </div>
    </Card>
  );
}
