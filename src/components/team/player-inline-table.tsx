"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Trash2, Plus } from "lucide-react";

type Player = {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  shirtNumber: number | null;
  position: string | null;
  allergies: string | null;
  dietaryRequirements: string | null;
  medicalNotes: string | null;
};

type NewRow = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  shirtNumber: string;
  position: string;
};

interface PlayerInlineTableProps {
  players: Player[];
  teamId: number;
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

/* Базовые стили ячеек — цвет текста задаётся через inline style */
const cellCls = "w-full bg-transparent text-sm px-2 py-2 outline-none rounded transition-colors focus:ring-1 focus:ring-[var(--cat-accent)]/20";
const selectCls = "w-full bg-transparent text-sm px-1 py-2 outline-none rounded transition-colors appearance-none cursor-pointer focus:ring-1 focus:ring-[var(--cat-accent)]/20";
const cellStyle = { color: "var(--cat-text)" } as React.CSSProperties;

export function PlayerInlineTable({ players, teamId, positionOptions, onRefresh }: PlayerInlineTableProps) {
  const t = useTranslations("players");
  const tp = useTranslations("people");

  const [expandedIds, setExpandedIds] = useState<Set<number | "new">>(new Set());
  const [saving, setSaving] = useState<Set<number | "new">>(new Set());
  const [newRow, setNewRow] = useState<NewRow>({ firstName: "", lastName: "", dateOfBirth: "", shirtNumber: "", position: "" });
  const [newMed, setNewMed] = useState({ allergies: "", dietaryRequirements: "", medicalNotes: "" });
  const debounceTimers = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const toggleExpand = (id: number | "new") => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* Автосохранение поля существующего игрока */
  const saveField = useCallback((playerId: number, field: string, value: string) => {
    const existing = debounceTimers.current.get(playerId);
    if (existing) clearTimeout(existing);

    debounceTimers.current.set(playerId, setTimeout(async () => {
      setSaving((s) => new Set(s).add(playerId));
      await fetch(`/api/teams/${teamId}/people?id=${playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      setSaving((s) => { const n = new Set(s); n.delete(playerId); return n; });
    }, 600));
  }, [teamId]);

  /* Создание нового игрока */
  const createPlayer = useCallback(async () => {
    if (!newRow.firstName.trim() || !newRow.lastName.trim()) return;

    setSaving((s) => new Set(s).add("new"));
    const body: Record<string, unknown> = {
      personType: "player",
      firstName: newRow.firstName,
      lastName: newRow.lastName,
      dateOfBirth: newRow.dateOfBirth || null,
      shirtNumber: newRow.shirtNumber || null,
      position: newRow.position || null,
      allergies: newMed.allergies || null,
      dietaryRequirements: newMed.dietaryRequirements || null,
      medicalNotes: newMed.medicalNotes || null,
    };

    const res = await fetch(`/api/teams/${teamId}/people`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setNewRow({ firstName: "", lastName: "", dateOfBirth: "", shirtNumber: "", position: "" });
      setNewMed({ allergies: "", dietaryRequirements: "", medicalNotes: "" });
      setExpandedIds((prev) => { const n = new Set(prev); n.delete("new"); return n; });
      onRefresh();
    }
    setSaving((s) => { const n = new Set(s); n.delete("new"); return n; });
  }, [newRow, newMed, teamId, onRefresh]);

  const handleNewBlur = () => {
    if (newRow.firstName.trim() && newRow.lastName.trim()) createPlayer();
  };

  const deletePlayer = async (id: number) => {
    await fetch(`/api/teams/${teamId}/people?id=${id}`, { method: "DELETE" });
    onRefresh();
  };

  const hasMedical = (p: Player) => !!(p.allergies || p.dietaryRequirements || p.medicalNotes);

  /* Стиль строки медицинских данных */
  const medRowStyle: React.CSSProperties = { background: "var(--cat-badge-open-bg)" };
  /* Стиль шапки таблицы */
  const theadStyle: React.CSSProperties = { background: "var(--cat-card-bg)" };
  /* Стиль строки ввода нового */
  const newRowStyle: React.CSSProperties = { background: "var(--cat-badge-open-bg)" };

  return (
    <Card padding={false} className="overflow-hidden">
      <div className="overflow-x-auto">
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
              <th className="w-10" />
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {/* Существующие игроки */}
            {players.map((player, idx) => (
              <>
                <tr
                  key={player.id}
                  className={cn("border-b th-border transition-colors group", saving.has(player.id) && "bg-[var(--cat-badge-open-bg)]")}
                  style={expandedIds.has(player.id) ? medRowStyle : undefined}
                >
                  <td className="text-center px-2">
                    <span className="text-xs font-medium" style={{ color: "var(--cat-text-muted)" }}>{idx + 1}</span>
                  </td>
                  <td className="px-1">
                    <input type="number" defaultValue={player.shirtNumber ?? ""} style={cellStyle}
                      className={cn(cellCls, "w-14 text-center")}
                      onBlur={(e) => saveField(player.id, "shirtNumber", e.target.value)} />
                  </td>
                  <td className="px-1">
                    <input defaultValue={player.firstName} className={cellCls} style={cellStyle}
                      onBlur={(e) => saveField(player.id, "firstName", e.target.value)} />
                  </td>
                  <td className="px-1">
                    <input defaultValue={player.lastName} className={cellCls} style={cellStyle}
                      onBlur={(e) => saveField(player.id, "lastName", e.target.value)} />
                  </td>
                  <td className="px-1">
                    <input type="date" defaultValue={player.dateOfBirth ? new Date(player.dateOfBirth).toISOString().split("T")[0] : ""}
                      className={cn(cellCls, "w-32")} style={cellStyle}
                      onBlur={(e) => saveField(player.id, "dateOfBirth", e.target.value)} />
                  </td>
                  <td className="text-center px-2">
                    <span className="text-sm font-medium" style={{ color: "var(--cat-text-secondary)" }}>{calcAge(player.dateOfBirth)}</span>
                  </td>
                  <td className="px-1">
                    <select defaultValue={player.position ?? ""} className={selectCls} style={cellStyle}
                      onChange={(e) => saveField(player.id, "position", e.target.value)}>
                      <option value="">—</option>
                      {positionOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1">
                    <button
                      onClick={() => toggleExpand(player.id)}
                      className={cn("p-1.5 rounded-lg transition-colors cursor-pointer",
                        hasMedical(player) ? "text-[var(--cat-accent)] hover:opacity-80" : "hover:opacity-60"
                      )}
                      style={hasMedical(player) ? undefined : { color: "var(--cat-text-muted)" }}
                      title={t("extraInfo")}
                    >
                      {expandedIds.has(player.id) ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-1">
                    <button
                      onClick={() => deletePlayer(player.id)}
                      className="p-1.5 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100 hover:text-red-500"
                      style={{ color: "var(--cat-text-muted)" }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>

                {/* Раскрытая строка медданных */}
                {expandedIds.has(player.id) && (
                  <tr key={`${player.id}-med`} className="border-b th-border" style={medRowStyle}>
                    <td colSpan={9} className="px-6 py-3">
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
                              onBlur={(e) => saveField(player.id, key, e.target.value)} />
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}

            {/* Строка нового игрока */}
            <tr className={cn("border-b th-border", saving.has("new") && "bg-[var(--cat-badge-open-bg)]")} style={newRowStyle}>
              <td className="text-center px-2">
                <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{players.length + 1}</span>
              </td>
              <td className="px-1">
                <input type="number" value={newRow.shirtNumber}
                  onChange={(e) => setNewRow({ ...newRow, shirtNumber: e.target.value })}
                  placeholder="#" className={cn(cellCls, "w-12 text-center")}
                  style={{ color: "var(--cat-text)", "--placeholder-color": "var(--cat-text-muted)" } as React.CSSProperties} />
              </td>
              <td className="px-1">
                <input value={newRow.firstName} onChange={(e) => setNewRow({ ...newRow, firstName: e.target.value })}
                  onBlur={handleNewBlur} placeholder={tp("firstName")}
                  className={cellCls} style={cellStyle} />
              </td>
              <td className="px-1">
                <input value={newRow.lastName} onChange={(e) => setNewRow({ ...newRow, lastName: e.target.value })}
                  onBlur={handleNewBlur} placeholder={tp("lastName")}
                  className={cellCls} style={cellStyle} />
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
              <td className="px-1">
                <button onClick={() => toggleExpand("new")}
                  className="p-1.5 rounded-lg transition-colors cursor-pointer hover:opacity-60"
                  style={{ color: "var(--cat-text-muted)" }} title={t("extraInfo")}>
                  {expandedIds.has("new") ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </td>
              <td />
            </tr>

            {/* Раскрытые медданные новой строки */}
            {expandedIds.has("new") && (
              <tr className="border-b th-border" style={newRowStyle}>
                <td colSpan={9} className="px-6 py-3">
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

      {/* Подсказка */}
      <div className="px-4 py-2.5 text-[11px] border-t th-border" style={{ color: "var(--cat-text-muted)", background: "var(--cat-card-bg)" }}>
        {t("fillRowToAdd")}
      </div>
    </Card>
  );
}
