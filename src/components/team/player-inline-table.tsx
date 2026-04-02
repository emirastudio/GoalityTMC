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

const cellInput = "w-full bg-transparent text-sm px-2 py-2 outline-none focus:bg-navy/5 focus:ring-1 focus:ring-navy/20 rounded transition-colors";
const cellSelect = "w-full bg-transparent text-sm px-1 py-2 outline-none focus:bg-navy/5 focus:ring-1 focus:ring-navy/20 rounded transition-colors appearance-none cursor-pointer";

export function PlayerInlineTable({ players, teamId, positionOptions, onRefresh }: PlayerInlineTableProps) {
  const t = useTranslations("players");
  const tp = useTranslations("people");
  const tc = useTranslations("common");

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

  // Auto-save existing player field
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

  // Create new player
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
    if (newRow.firstName.trim() && newRow.lastName.trim()) {
      createPlayer();
    }
  };

  const deletePlayer = async (id: number) => {
    await fetch(`/api/teams/${teamId}/people?id=${id}`, { method: "DELETE" });
    onRefresh();
  };

  const hasMedical = (p: Player) => !!(p.allergies || p.dietaryRequirements || p.medicalNotes);

  return (
    <Card padding={false} className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b th-border bg-surface/50">
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
            {/* Existing players */}
            {players.map((player, idx) => (
              <>
                <tr key={player.id} className={cn(
                  "border-b th-border transition-colors group",
                  saving.has(player.id) && "bg-gold/5",
                  expandedIds.has(player.id) && "bg-navy/5"
                )}>
                  <td className="text-center px-2">
                    <span className="text-xs text-text-secondary/50 font-medium">{idx + 1}</span>
                  </td>
                  <td className="px-1">
                    <input
                      type="number"
                      defaultValue={player.shirtNumber ?? ""}
                      className={cn(cellInput, "w-14 text-center")}
                      onBlur={(e) => saveField(player.id, "shirtNumber", e.target.value)}
                    />
                  </td>
                  <td className="px-1">
                    <input
                      defaultValue={player.firstName}
                      className={cellInput}
                      onBlur={(e) => saveField(player.id, "firstName", e.target.value)}
                    />
                  </td>
                  <td className="px-1">
                    <input
                      defaultValue={player.lastName}
                      className={cellInput}
                      onBlur={(e) => saveField(player.id, "lastName", e.target.value)}
                    />
                  </td>
                  <td className="px-1">
                    <input
                      type="date"
                      defaultValue={player.dateOfBirth ? new Date(player.dateOfBirth).toISOString().split("T")[0] : ""}
                      className={cn(cellInput, "w-32")}
                      onBlur={(e) => saveField(player.id, "dateOfBirth", e.target.value)}
                    />
                  </td>
                  <td className="text-center px-2">
                    <span className="text-sm th-text-2 font-medium">{calcAge(player.dateOfBirth)}</span>
                  </td>
                  <td className="px-1">
                    <select
                      defaultValue={player.position ?? ""}
                      className={cellSelect}
                      onChange={(e) => saveField(player.id, "position", e.target.value)}
                    >
                      <option value="">—</option>
                      {positionOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1">
                    <button
                      onClick={() => toggleExpand(player.id)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors cursor-pointer",
                        hasMedical(player) ? "text-gold-dark hover:bg-gold/10" : "text-text-secondary/40 hover:text-text-secondary hover:th-bg"
                      )}
                      title={t("extraInfo")}
                    >
                      {expandedIds.has(player.id) ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-1">
                    <button
                      onClick={() => deletePlayer(player.id)}
                      className="p-1.5 text-text-secondary/30 hover:text-error rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>

                {/* Expanded medical sub-row */}
                {expandedIds.has(player.id) && (
                  <tr key={`${player.id}-med`} className="border-b th-border bg-navy/5">
                    <td colSpan={9} className="px-6 py-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wider th-text-2">{tp("allergies")}</label>
                          <input
                            defaultValue={player.allergies ?? ""}
                            placeholder={tp("allergiesHint")}
                            className="w-full text-sm px-3 py-1.5 rounded-lg border th-border th-card focus:outline-none focus:ring-2 focus:ring-navy/20"
                            onBlur={(e) => saveField(player.id, "allergies", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wider th-text-2">{tp("dietaryRequirements")}</label>
                          <input
                            defaultValue={player.dietaryRequirements ?? ""}
                            placeholder={tp("dietaryHint")}
                            className="w-full text-sm px-3 py-1.5 rounded-lg border th-border th-card focus:outline-none focus:ring-2 focus:ring-navy/20"
                            onBlur={(e) => saveField(player.id, "dietaryRequirements", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wider th-text-2">{tp("medicalNotes")}</label>
                          <input
                            defaultValue={player.medicalNotes ?? ""}
                            placeholder={tp("medicalHint")}
                            className="w-full text-sm px-3 py-1.5 rounded-lg border th-border th-card focus:outline-none focus:ring-2 focus:ring-navy/20"
                            onBlur={(e) => saveField(player.id, "medicalNotes", e.target.value)}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}

            {/* New player row */}
            <tr className={cn(
              "border-b th-border bg-surface/30",
              saving.has("new") && "bg-gold/5"
            )}>
              <td className="text-center px-2">
                <span className="text-xs text-text-secondary/30">{players.length + 1}</span>
              </td>
              <td className="px-1">
                <input
                  type="number"
                  value={newRow.shirtNumber}
                  onChange={(e) => setNewRow({ ...newRow, shirtNumber: e.target.value })}
                  placeholder="#"
                  className={cn(cellInput, "w-12 text-center placeholder:text-text-secondary/30")}
                />
              </td>
              <td className="px-1">
                <input
                  value={newRow.firstName}
                  onChange={(e) => setNewRow({ ...newRow, firstName: e.target.value })}
                  onBlur={handleNewBlur}
                  placeholder={tp("firstName")}
                  className={cn(cellInput, "placeholder:text-text-secondary/30")}
                />
              </td>
              <td className="px-1">
                <input
                  value={newRow.lastName}
                  onChange={(e) => setNewRow({ ...newRow, lastName: e.target.value })}
                  onBlur={handleNewBlur}
                  placeholder={tp("lastName")}
                  className={cn(cellInput, "placeholder:text-text-secondary/30")}
                />
              </td>
              <td className="px-1">
                <input
                  type="date"
                  value={newRow.dateOfBirth}
                  onChange={(e) => setNewRow({ ...newRow, dateOfBirth: e.target.value })}
                  className={cn(cellInput, "w-32")}
                />
              </td>
              <td className="text-center px-2">
                <span className="text-sm text-text-secondary/40">{calcAge(newRow.dateOfBirth || null)}</span>
              </td>
              <td className="px-1">
                <select
                  value={newRow.position}
                  onChange={(e) => setNewRow({ ...newRow, position: e.target.value })}
                  className={cn(cellSelect, "text-text-secondary/60")}
                >
                  <option value="">—</option>
                  {positionOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </td>
              <td className="px-1">
                <button
                  onClick={() => toggleExpand("new")}
                  className="p-1.5 text-text-secondary/30 hover:text-text-secondary rounded-lg transition-colors cursor-pointer"
                  title={t("extraInfo")}
                >
                  {expandedIds.has("new") ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </td>
              <td />
            </tr>

            {/* New player medical sub-row */}
            {expandedIds.has("new") && (
              <tr className="border-b th-border bg-surface/30">
                <td colSpan={9} className="px-6 py-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider th-text-2">{tp("allergies")}</label>
                      <input
                        value={newMed.allergies}
                        onChange={(e) => setNewMed({ ...newMed, allergies: e.target.value })}
                        placeholder={tp("allergiesHint")}
                        className="w-full text-sm px-3 py-1.5 rounded-lg border th-border th-card focus:outline-none focus:ring-2 focus:ring-navy/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider th-text-2">{tp("dietaryRequirements")}</label>
                      <input
                        value={newMed.dietaryRequirements}
                        onChange={(e) => setNewMed({ ...newMed, dietaryRequirements: e.target.value })}
                        placeholder={tp("dietaryHint")}
                        className="w-full text-sm px-3 py-1.5 rounded-lg border th-border th-card focus:outline-none focus:ring-2 focus:ring-navy/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider th-text-2">{tp("medicalNotes")}</label>
                      <input
                        value={newMed.medicalNotes}
                        onChange={(e) => setNewMed({ ...newMed, medicalNotes: e.target.value })}
                        placeholder={tp("medicalHint")}
                        className="w-full text-sm px-3 py-1.5 rounded-lg border th-border th-card focus:outline-none focus:ring-2 focus:ring-navy/20"
                      />
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Hint */}
      <div className="px-4 py-2.5 text-[11px] text-text-secondary/60 bg-surface/30 border-t th-border">
        {t("fillRowToAdd")}
      </div>
    </Card>
  );
}
