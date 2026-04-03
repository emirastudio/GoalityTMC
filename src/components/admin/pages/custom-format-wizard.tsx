"use client";

/**
 * Custom Format Wizard
 * Позволяет строить многофазные турниры с любыми правилами перехода:
 * Groups → Secondary Groups → Separate Playoffs, etc.
 */

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { useTournament } from "@/lib/tournament-context";
import {
  Plus, Trash2, ChevronRight, ChevronLeft, Zap, Loader2,
  CheckCircle, Shuffle, RotateCcw, ArrowDown, ArrowRight,
  Layers, Trophy, Users, Edit2, X, GripVertical,
} from "lucide-react";

// ─── Design constants ─────────────────────────────────────────────────────────

const ACCENT = "#2BFEBA";
const GROUP_COLORS = ["#10b981","#f59e0b","#8b5cf6","#ec4899","#06b6d4","#f97316","#84cc16","#a855f7","#10b981","#f59e0b","#8b5cf6","#ec4899"];
const GROUP_LETTERS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomGroup {
  id: string;
  name: string;
  color: string;
  teamsCapacity: number; // How many teams this group will receive
}

export interface CustomPhase {
  id: string;
  name: string;
  type: "groups" | "bracket";
  groupCount: number;
  teamsPerGroup: number;
  groups: CustomGroup[];
  // For bracket type - which size
  knockoutTeams?: number;
  thirdPlace?: boolean;
}

export interface TransitionRule {
  fromPosition: number; // 1-based position in source group
  toGroupId: string;    // ID of target group in next phase
}

export interface PhaseTransition {
  fromPhaseId: string;
  toPhaseId: string;
  applyToAll: boolean;  // Same rules apply to all groups in fromPhase
  rules: TransitionRule[]; // "Position X → Group Y"
}

interface Team {
  id: number;
  name: string;
  clubName?: string | null;
  clubBadgeUrl?: string | null;
}

// ─── Default group names for secondary phases ──────────────────────────────────

const SECONDARY_GROUP_PRESETS = [
  [
    { name: "Gold Group", color: "#f59e0b" },
    { name: "Silver Group", color: "#94a3b8" },
    { name: "Bronze Group", color: "#cd7f32" },
  ],
  [
    { name: "Championship", color: "#10b981" },
    { name: "Relegation", color: "#ec4899" },
  ],
  [
    { name: "Superfinal", color: "#f59e0b" },
    { name: "Final A", color: "#10b981" },
    { name: "Final B", color: "#8b5cf6" },
    { name: "Final C", color: "#ec4899" },
  ],
];

// ─── Helper: build default groups for a phase ────────────────────────────────

function buildDefaultGroups(count: number, phaseIndex: number): CustomGroup[] {
  if (phaseIndex === 0) {
    // Phase 1: classic A/B/C/D
    return Array.from({ length: count }, (_, i) => ({
      id: `p0-g${i}`,
      name: `Group ${GROUP_LETTERS[i]}`,
      color: GROUP_COLORS[i],
      teamsCapacity: 6,
    }));
  }
  // Phase 2+: try presets
  const preset = SECONDARY_GROUP_PRESETS[phaseIndex - 1];
  if (preset && count <= preset.length) {
    return preset.slice(0, count).map((p, i) => ({
      id: `p${phaseIndex}-g${i}`,
      name: p.name,
      color: p.color,
      teamsCapacity: 6,
    }));
  }
  return Array.from({ length: count }, (_, i) => ({
    id: `p${phaseIndex}-g${i}`,
    name: `Group ${i + 1}`,
    color: GROUP_COLORS[i],
    teamsCapacity: 6,
  }));
}

// ─── Step 1: Phase Chain Builder ──────────────────────────────────────────────

function PhasesStep({ phases, setPhases, transitions, setTransitions }: {
  phases: CustomPhase[];
  setPhases: (p: CustomPhase[]) => void;
  transitions: PhaseTransition[];
  setTransitions: (t: PhaseTransition[]) => void;
}) {
  const [editingPhase, setEditingPhase] = useState<string | null>(null);

  function addPhase() {
    const idx = phases.length;
    const newPhase: CustomPhase = {
      id: `phase-${Date.now()}`,
      name: idx === 0 ? "Групповой этап" : idx === 1 ? "Квалификационные группы" : `Фаза ${idx + 1}`,
      type: "groups",
      groupCount: idx === 0 ? 4 : 3,
      teamsPerGroup: 6,
      groups: buildDefaultGroups(idx === 0 ? 4 : 3, idx),
    };
    const updated = [...phases, newPhase];
    setPhases(updated);

    // Auto-create transition if we have a previous phase
    if (idx > 0) {
      const prevPhase = phases[idx - 1];
      const newTransition: PhaseTransition = {
        fromPhaseId: prevPhase.id,
        toPhaseId: newPhase.id,
        applyToAll: true,
        rules: [],
      };
      setTransitions([...transitions, newTransition]);
    }
  }

  function removePhase(phaseId: string) {
    const updated = phases.filter(p => p.id !== phaseId);
    setPhases(updated);
    // Remove transitions involving this phase
    setTransitions(transitions.filter(t => t.fromPhaseId !== phaseId && t.toPhaseId !== phaseId));
  }

  function updatePhase(phaseId: string, updates: Partial<CustomPhase>) {
    setPhases(phases.map(p => {
      if (p.id !== phaseId) return p;
      const updated = { ...p, ...updates };
      // Rebuild groups if groupCount changed
      if (updates.groupCount !== undefined && updates.groupCount !== p.groupCount) {
        const phaseIdx = phases.findIndex(ph => ph.id === phaseId);
        updated.groups = buildDefaultGroups(updates.groupCount, phaseIdx);
      }
      return updated;
    }));
  }

  function updateGroup(phaseId: string, groupId: string, updates: Partial<CustomGroup>) {
    setPhases(phases.map(p => {
      if (p.id !== phaseId) return p;
      return { ...p, groups: p.groups.map(g => g.id === groupId ? { ...g, ...updates } : g) };
    }));
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black mb-2" style={{ color: "var(--cat-text)" }}>Постройте структуру фаз</h2>
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
          Добавьте фазы и настройте группы в каждой из них
        </p>
      </div>

      <div className="space-y-2">
        {phases.map((phase, idx) => {
          const isEditing = editingPhase === phase.id;
          const phaseColor = phase.type === "groups" ? ACCENT : "#ec4899";

          return (
            <div key={phase.id}>
              {/* Phase card */}
              <div className="rounded-2xl border-2 overflow-hidden"
                style={{ borderColor: isEditing ? phaseColor : "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>
                {/* Phase header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-black"
                    style={{ background: `${phaseColor}20`, color: phaseColor }}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    {isEditing ? (
                      <input
                        autoFocus
                        value={phase.name}
                        onChange={e => updatePhase(phase.id, { name: e.target.value })}
                        onBlur={() => setEditingPhase(null)}
                        onKeyDown={e => e.key === "Enter" && setEditingPhase(null)}
                        className="text-sm font-bold px-2 py-1 rounded-lg border w-full outline-none"
                        style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>{phase.name}</span>
                        <button onClick={() => setEditingPhase(phase.id)} className="opacity-30 hover:opacity-80 transition-opacity">
                          <Edit2 className="w-3.5 h-3.5" style={{ color: "var(--cat-text-muted)" }} />
                        </button>
                      </div>
                    )}
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                      {phase.type === "groups"
                        ? `${phase.groupCount} групп · ${phase.teamsPerGroup} команд в группе`
                        : `Плей-офф · ${phase.knockoutTeams ?? 8} команд`}
                    </p>
                  </div>

                  {/* Type switcher */}
                  <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "var(--cat-tag-bg)" }}>
                    {(["groups", "bracket"] as const).map(t => (
                      <button key={t} onClick={() => updatePhase(phase.id, { type: t })}
                        className="px-2 py-1 rounded-md text-[10px] font-bold transition-all"
                        style={{
                          background: phase.type === t ? phaseColor : "transparent",
                          color: phase.type === t ? "#000" : "var(--cat-text-muted)",
                        }}>
                        {t === "groups" ? "Группы" : "Плей-офф"}
                      </button>
                    ))}
                  </div>

                  {/* Delete */}
                  {phases.length > 1 && (
                    <button onClick={() => removePhase(phase.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center opacity-30 hover:opacity-80 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--cat-text-muted)" }} />
                    </button>
                  )}
                </div>

                {/* Phase config */}
                <div className="px-4 pb-4 border-t" style={{ borderColor: "var(--cat-card-border)" }}>
                  {phase.type === "groups" && (
                    <div className="pt-3 space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1.5"
                            style={{ color: "var(--cat-text-muted)" }}>Количество групп</label>
                          <div className="flex gap-1 flex-wrap">
                            {[2, 3, 4, 6, 8].map(n => (
                              <button key={n} onClick={() => updatePhase(phase.id, { groupCount: n })}
                                className="w-9 h-9 rounded-xl text-sm font-black border-2 transition-all"
                                style={{
                                  borderColor: phase.groupCount === n ? phaseColor : "var(--cat-card-border)",
                                  background: phase.groupCount === n ? `${phaseColor}15` : "var(--cat-tag-bg)",
                                  color: phase.groupCount === n ? phaseColor : "var(--cat-text-secondary)",
                                }}>
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1.5"
                            style={{ color: "var(--cat-text-muted)" }}>Команд в группе</label>
                          <div className="flex gap-1 flex-wrap">
                            {[3, 4, 5, 6, 7, 8].map(n => (
                              <button key={n} onClick={() => updatePhase(phase.id, { teamsPerGroup: n })}
                                className="w-9 h-9 rounded-xl text-sm font-black border-2 transition-all"
                                style={{
                                  borderColor: phase.teamsPerGroup === n ? phaseColor : "var(--cat-card-border)",
                                  background: phase.teamsPerGroup === n ? `${phaseColor}15` : "var(--cat-tag-bg)",
                                  color: phase.teamsPerGroup === n ? phaseColor : "var(--cat-text-secondary)",
                                }}>
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Group name editor */}
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1.5"
                          style={{ color: "var(--cat-text-muted)" }}>Названия групп</label>
                        <div className="flex gap-1.5 flex-wrap">
                          {phase.groups.map(group => (
                            <div key={group.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                              style={{ background: `${group.color}15`, border: `1px solid ${group.color}35` }}>
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: group.color }} />
                              <input
                                value={group.name}
                                onChange={e => updateGroup(phase.id, group.id, { name: e.target.value })}
                                className="text-[11px] font-semibold bg-transparent outline-none w-20"
                                style={{ color: group.color }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {phase.type === "bracket" && (
                    <div className="pt-3 flex items-center gap-6">
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1.5"
                          style={{ color: "var(--cat-text-muted)" }}>Размер сетки</label>
                        <div className="flex gap-1">
                          {[4, 8, 16].map(n => (
                            <button key={n} onClick={() => updatePhase(phase.id, { knockoutTeams: n })}
                              className="w-10 h-10 rounded-xl text-sm font-black border-2 transition-all"
                              style={{
                                borderColor: (phase.knockoutTeams ?? 8) === n ? "#ec4899" : "var(--cat-card-border)",
                                background: (phase.knockoutTeams ?? 8) === n ? "rgba(236,72,153,0.12)" : "var(--cat-tag-bg)",
                                color: (phase.knockoutTeams ?? 8) === n ? "#ec4899" : "var(--cat-text-secondary)",
                              }}>
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--cat-text-secondary)" }}>
                        <input type="checkbox" checked={phase.thirdPlace ?? false}
                          onChange={e => updatePhase(phase.id, { thirdPlace: e.target.checked })}
                          className="w-4 h-4 rounded" style={{ accentColor: "#ec4899" }} />
                        Матч за 3-е место
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Transition arrow between phases */}
              {idx < phases.length - 1 && (
                <div className="flex flex-col items-center py-1">
                  <ArrowDown className="w-4 h-4" style={{ color: "var(--cat-text-muted)", opacity: 0.5 }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add phase button */}
      <button onClick={addPhase}
        className="mt-4 w-full py-3 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-semibold transition-all hover:opacity-80"
        style={{ borderColor: `${ACCENT}40`, color: ACCENT, background: `${ACCENT}05` }}>
        <Plus className="w-4 h-4" /> Добавить фазу
      </button>
    </div>
  );
}

// ─── Step 2: Advancement Rules ────────────────────────────────────────────────

function AdvancementRulesStep({ phases, transitions, setTransitions }: {
  phases: CustomPhase[];
  transitions: PhaseTransition[];
  setTransitions: (t: PhaseTransition[]) => void;
}) {
  // Find transition between two phases
  function getTransition(fromPhaseId: string, toPhaseId: string): PhaseTransition | undefined {
    return transitions.find(t => t.fromPhaseId === fromPhaseId && t.toPhaseId === toPhaseId);
  }

  function updateTransition(fromPhaseId: string, toPhaseId: string, updates: Partial<PhaseTransition>) {
    setTransitions(transitions.map(t =>
      t.fromPhaseId === fromPhaseId && t.toPhaseId === toPhaseId
        ? { ...t, ...updates }
        : t
    ));
  }

  function setRule(fromPhaseId: string, toPhaseId: string, position: number, toGroupId: string) {
    const existing = getTransition(fromPhaseId, toPhaseId);
    if (!existing) return;
    const rules = existing.rules.filter(r => r.fromPosition !== position);
    if (toGroupId !== "__eliminated__") {
      rules.push({ fromPosition: position, toGroupId });
    }
    updateTransition(fromPhaseId, toPhaseId, { rules: rules.sort((a, b) => a.fromPosition - b.fromPosition) });
  }

  function getRule(transition: PhaseTransition, position: number): string {
    return transition.rules.find(r => r.fromPosition === position)?.toGroupId ?? "__eliminated__";
  }

  function autoFill(fromPhase: CustomPhase, toPhase: CustomPhase, transition: PhaseTransition) {
    // Simple auto-fill: distribute positions evenly across target groups
    const positions = fromPhase.teamsPerGroup;
    const targetGroups = toPhase.groups;
    const teamsPerTargetGroup = Math.ceil(positions / targetGroups.length);
    const rules: TransitionRule[] = [];
    let groupIdx = 0;
    for (let pos = 1; pos <= positions; pos++) {
      groupIdx = Math.min(Math.floor((pos - 1) / teamsPerTargetGroup), targetGroups.length - 1);
      rules.push({ fromPosition: pos, toGroupId: targetGroups[groupIdx].id });
    }
    updateTransition(fromPhase.id, toPhase.id, { rules });
  }

  if (transitions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
          Добавьте как минимум 2 фазы для настройки правил переходов
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-black mb-2" style={{ color: "var(--cat-text)" }}>Правила переходов</h2>
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
          Кто из каждой группы куда переходит в следующую фазу
        </p>
      </div>

      {transitions.map(transition => {
        const fromPhase = phases.find(p => p.id === transition.fromPhaseId);
        const toPhase = phases.find(p => p.id === transition.toPhaseId);
        if (!fromPhase || !toPhase) return null;

        const positions = Array.from({ length: fromPhase.teamsPerGroup }, (_, i) => i + 1);

        return (
          <div key={`${transition.fromPhaseId}-${transition.toPhaseId}`}
            className="rounded-2xl border overflow-hidden"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            {/* Header */}
            <div className="px-5 py-4 border-b flex items-center justify-between"
              style={{ borderColor: "var(--cat-card-border)" }}>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>{fromPhase.name}</span>
                <ArrowRight className="w-4 h-4" style={{ color: "var(--cat-text-muted)" }} />
                <span className="text-sm font-bold" style={{ color: ACCENT }}>{toPhase.name}</span>
              </div>
              <button onClick={() => autoFill(fromPhase, toPhase, transition)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ background: `${ACCENT}15`, color: ACCENT }}>
                <Shuffle className="w-3 h-3" /> Авто-заполнить
              </button>
            </div>

            {/* Rules table */}
            <div className="p-5">
              {/* Column headers */}
              <div className="flex gap-3 mb-3">
                <div className="w-28 text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: "var(--cat-text-muted)" }}>Место в группе</div>
                <div className="flex-1 text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: "var(--cat-text-muted)" }}>Переходит в</div>
              </div>

              <div className="space-y-2">
                {positions.map(pos => {
                  const ruleGroupId = getRule(transition, pos);
                  const targetGroup = toPhase.groups.find(g => g.id === ruleGroupId);

                  // Medal icon for top positions
                  const medal = pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : null;

                  return (
                    <div key={pos} className="flex items-center gap-3">
                      {/* Position badge */}
                      <div className="w-28 flex items-center gap-2">
                        <span className="text-base">{medal}</span>
                        <span className="text-sm font-semibold" style={{ color: "var(--cat-text)" }}>
                          {pos}-е место
                        </span>
                      </div>

                      {/* Destination selector */}
                      <div className="flex-1 flex items-center gap-2">
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-text-muted)", opacity: 0.5 }} />
                        <select
                          value={ruleGroupId}
                          onChange={e => setRule(fromPhase.id, toPhase.id, pos, e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl text-sm font-semibold border outline-none transition-all"
                          style={{
                            background: targetGroup ? `${targetGroup.color}12` : "var(--cat-tag-bg)",
                            borderColor: targetGroup ? `${targetGroup.color}40` : "var(--cat-card-border)",
                            color: targetGroup ? targetGroup.color : "var(--cat-text-muted)",
                          }}>
                          <option value="__eliminated__" style={{ background: "var(--cat-dropdown-bg, #1a1a1a)", color: "var(--cat-text-muted)" }}>
                            ❌ Выбывает
                          </option>
                          {toPhase.groups.map(group => (
                            <option key={group.id} value={group.id}
                              style={{ background: "var(--cat-dropdown-bg, #1a1a1a)", color: "var(--cat-text)" }}>
                              → {group.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary chips */}
              <div className="mt-4 pt-4 border-t flex flex-wrap gap-2" style={{ borderColor: "var(--cat-card-border)" }}>
                {toPhase.groups.map(group => {
                  const count = transition.rules.filter(r => r.toGroupId === group.id).length;
                  const totalSources = fromPhase.groupCount; // per source group
                  const totalTeams = count * totalSources;
                  return (
                    <div key={group.id} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
                      style={{ background: `${group.color}12`, color: group.color, border: `1px solid ${group.color}30` }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: group.color }} />
                      {group.name}: {count} позиц. × {totalSources} групп = <strong>{totalTeams} команд</strong>
                    </div>
                  );
                })}
                {transition.rules.length < fromPhase.teamsPerGroup && (
                  <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
                    style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.3)" }}>
                    ⚠ {(fromPhase.teamsPerGroup - transition.rules.length) * fromPhase.groupCount} команд выбывают
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 3: Team draw (Phase 1 only) ────────────────────────────────────────

function CustomDrawStep({ phases, teamGroups, setTeamGroups, teams }: {
  phases: CustomPhase[];
  teamGroups: Record<string, number[]>;
  setTeamGroups: (g: Record<string, number[]>) => void;
  teams: Team[];
}) {
  const phase1 = phases[0];
  if (!phase1) return null;

  const groups = phase1.groups;
  const assignedIds = new Set(Object.values(teamGroups).flat());
  const unassigned = teams.filter(t => !assignedIds.has(t.id));

  function assignTeam(teamId: number, groupId: string) {
    const newGroups = { ...teamGroups };
    for (const key of Object.keys(newGroups)) {
      newGroups[key] = newGroups[key].filter(id => id !== teamId);
    }
    newGroups[groupId] = [...(newGroups[groupId] ?? []), teamId];
    setTeamGroups(newGroups);
  }

  function removeTeam(teamId: number) {
    const newGroups = { ...teamGroups };
    for (const key of Object.keys(newGroups)) {
      newGroups[key] = newGroups[key].filter(id => id !== teamId);
    }
    setTeamGroups(newGroups);
  }

  function autoDistribute() {
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    const newGroups: Record<string, number[]> = {};
    for (const g of groups) newGroups[g.id] = [];
    shuffled.forEach((t, i) => {
      newGroups[groups[i % groups.length].id].push(t.id);
    });
    setTeamGroups(newGroups);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>Жеребьёвка</h2>
          <p className="text-sm mt-1" style={{ color: "var(--cat-text-muted)" }}>
            Распределение команд по группам Фазы 1
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTeamGroups({})}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border"
            style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)", background: "var(--cat-tag-bg)" }}>
            <RotateCcw className="w-3.5 h-3.5" /> Очистить
          </button>
          <button onClick={autoDistribute}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background: ACCENT, color: "#000", boxShadow: `0 0 16px rgba(43,254,186,0.4)` }}>
            <Shuffle className="w-3.5 h-3.5" /> Авто-жеребьёвка
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Pool */}
        <div className="w-44 shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5"
            style={{ color: "var(--cat-text-muted)" }}>
            <Users className="w-3.5 h-3.5" /> Пул ({unassigned.length})
          </div>
          <div className="rounded-2xl border p-2 space-y-1.5"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", minHeight: "280px" }}>
            {unassigned.length === 0
              ? <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="w-7 h-7 mb-2" style={{ color: ACCENT }} />
                  <p className="text-xs" style={{ color: ACCENT }}>Все распределены</p>
                </div>
              : unassigned.map(team => (
                <div key={team.id} className="rounded-xl border p-2"
                  style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}>
                  <p className="text-xs font-semibold truncate mb-1.5" style={{ color: "var(--cat-text)" }}>{team.name}</p>
                  <div className="flex gap-1 flex-wrap">
                    {groups.map(g => (
                      <button key={g.id} onClick={() => assignTeam(team.id, g.id)}
                        className="text-[9px] font-black px-1.5 py-0.5 rounded-md transition-all hover:opacity-80"
                        style={{ background: `${g.color}20`, color: g.color }}>
                        {g.name.split(" ")[0].slice(0, 6)}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Groups */}
        <div className="flex-1 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(groups.length, 4)}, 1fr)` }}>
          {groups.map(group => {
            const groupTeamIds = teamGroups[group.id] ?? [];
            const groupTeams = groupTeamIds.map(id => teams.find(t => t.id === id)).filter(Boolean) as Team[];
            return (
              <div key={group.id} className="rounded-2xl border-2 overflow-hidden"
                style={{ borderColor: `${group.color}45`, background: `${group.color}05` }}>
                <div className="px-3 py-2.5 flex items-center justify-between border-b"
                  style={{ borderColor: `${group.color}25`, background: `${group.color}12` }}>
                  <span className="text-sm font-black" style={{ color: group.color }}>{group.name}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${group.color}20`, color: group.color }}>{groupTeams.length}</span>
                </div>
                <div className="p-2 space-y-1.5 min-h-[200px]">
                  {groupTeams.map(team => (
                    <div key={team.id} className="flex items-center gap-2 px-2.5 py-2 rounded-xl border"
                      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
                      <div className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center text-[8px] font-black"
                        style={{ background: `${group.color}20`, color: group.color }}>
                        {team.name.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium flex-1 truncate" style={{ color: "var(--cat-text)" }}>{team.name}</span>
                      <button onClick={() => removeTeam(team.id)} className="opacity-30 hover:opacity-90 transition-opacity">
                        <X className="w-3 h-3" style={{ color: "var(--cat-text-muted)" }} />
                      </button>
                    </div>
                  ))}
                  {groupTeams.length === 0 && (
                    <div className="flex items-center justify-center py-8 rounded-xl border-2 border-dashed"
                      style={{ borderColor: `${group.color}25` }}>
                      <span className="text-xs" style={{ color: group.color, opacity: 0.5 }}>+ Команды</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Summary & Generate ───────────────────────────────────────────────

function CustomGenerateStep({ phases, transitions, teams, generating }: {
  phases: CustomPhase[];
  transitions: PhaseTransition[];
  teams: Team[];
  generating: boolean;
}) {
  const totalGroups = phases.filter(p => p.type === "groups").reduce((s, p) => s + p.groupCount, 0);
  const totalMatches = phases.filter(p => p.type === "groups").reduce((s, p) => {
    const n = p.teamsPerGroup;
    return s + p.groupCount * (n * (n - 1)) / 2;
  }, 0);

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(236,72,153,0.15)", boxShadow: "0 0 32px rgba(236,72,153,0.3)" }}>
          <Layers className="w-8 h-8" style={{ color: "#ec4899" }} />
        </div>
        <h2 className="text-2xl font-black mb-2" style={{ color: "var(--cat-text)" }}>Ваш формат готов</h2>
        <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>
          Система создаст все фазы, группы и правила переходов
        </p>
      </div>

      {/* Phase chain summary */}
      <div className="space-y-2 mb-6">
        {phases.map((phase, idx) => (
          <div key={phase.id}>
            <div className="rounded-xl border px-4 py-3 flex items-center gap-3"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                style={{ background: `${ACCENT}15`, color: ACCENT }}>{idx + 1}</div>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>{phase.name}</p>
                <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
                  {phase.type === "groups"
                    ? `${phase.groupCount} групп · ${phase.teamsPerGroup} команд · ${(phase.teamsPerGroup * (phase.teamsPerGroup - 1) / 2) * phase.groupCount} матчей`
                    : `Плей-офф · ${phase.knockoutTeams ?? 8} команд`}
                </p>
              </div>
              {phase.groups.map(g => (
                <div key={g.id} className="w-3 h-3 rounded-full" style={{ background: g.color }} title={g.name} />
              ))}
            </div>
            {idx < phases.length - 1 && (
              <div className="flex justify-center py-0.5">
                <ArrowDown className="w-3.5 h-3.5" style={{ color: "var(--cat-text-muted)", opacity: 0.4 }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Фаз", value: phases.length, color: "#ec4899" },
          { label: "Команд", value: teams.length, color: ACCENT },
          { label: "≈ Матчей", value: totalMatches, color: "#f59e0b" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border p-4 text-center"
            style={{ background: "var(--cat-card-bg)", borderColor: `${color}25` }}>
            <p className="text-2xl font-black" style={{ color }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      {generating && (
        <div className="rounded-2xl border p-6 text-center"
          style={{ background: "rgba(236,72,153,0.04)", borderColor: "rgba(236,72,153,0.3)" }}>
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: "#ec4899" }} />
          <p className="text-sm font-semibold" style={{ color: "#ec4899" }}>Создаём структуру...</p>
        </div>
      )}
    </div>
  );
}

// ─── Done Screen ──────────────────────────────────────────────────────────────

function DoneScreen({ orgSlug, tournamentId }: { orgSlug: string; tournamentId: number }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8"
        style={{ background: "rgba(43,254,186,0.12)", boxShadow: "0 0 50px rgba(43,254,186,0.35)" }}>
        <CheckCircle className="w-12 h-12" style={{ color: ACCENT }} />
      </div>
      <h2 className="text-3xl font-black mb-3" style={{ color: "var(--cat-text)" }}>Формат создан!</h2>
      <p className="text-sm mb-8 max-w-sm" style={{ color: "var(--cat-text-muted)" }}>
        Все фазы, группы и правила переходов созданы. После завершения каждой фазы команды будут перемещены согласно правилам.
      </p>
      <div className="flex gap-3">
        <Link href={`/org/${orgSlug}/admin/tournament/${tournamentId}/schedule`}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
          style={{ background: ACCENT, color: "#000", boxShadow: `0 0 24px rgba(43,254,186,0.45)` }}>
          К расписанию <ChevronRight className="w-4 h-4" />
        </Link>
        <Link href={`/org/${orgSlug}/admin/tournament/${tournamentId}`}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border"
          style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)", background: "var(--cat-card-bg)" }}>
          Обзор
        </Link>
      </div>
    </div>
  );
}

// ─── Round defs helper ────────────────────────────────────────────────────────

function getRoundDefs(totalTeams: number, thirdPlace: boolean) {
  const rounds: { name: string; nameRu: string; shortName: string; matchCount: number; isTwoLegged: boolean; hasThirdPlace: boolean }[] = [];
  const nameMap: Record<number, { name: string; nameRu: string; short: string }> = {
    2:  { name: "Final",         nameRu: "Финал",         short: "F" },
    4:  { name: "Semi-Final",    nameRu: "Полуфинал",     short: "SF" },
    8:  { name: "Quarter-Final", nameRu: "Четвертьфинал", short: "QF" },
    16: { name: "Round of 16",   nameRu: "1/8 финала",    short: "R16" },
    32: { name: "Round of 32",   nameRu: "1/16 финала",   short: "R32" },
  };
  let n = totalTeams;
  while (n >= 2) {
    const info = nameMap[n] ?? { name: `Round of ${n}`, nameRu: `1/${n / 2} финала`, short: `R${n}` };
    rounds.push({ name: info.name, nameRu: info.nameRu, shortName: info.short, matchCount: n / 2, isTwoLegged: false, hasThirdPlace: n === 2 && thirdPlace });
    if (n === 2 && thirdPlace) {
      rounds.push({ name: "3rd Place", nameRu: "За 3-е место", shortName: "3P", matchCount: 1, isTwoLegged: false, hasThirdPlace: false });
    }
    n = n / 2;
  }
  return rounds;
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

const STEPS = ["phases", "rules", "draw", "generate"] as const;
type Step = typeof STEPS[number];

const STEP_LABELS: Record<Step, string> = {
  phases: "Фазы",
  rules: "Правила",
  draw: "Жеребьёвка",
  generate: "Запуск",
};

export function CustomFormatWizard() {
  const ctx = useTournament();
  const tournamentId = ctx?.tournamentId ?? 0;
  const orgSlug = ctx?.orgSlug ?? "";

  const [step, setStep] = useState<Step>("phases");
  const [phases, setPhases] = useState<CustomPhase[]>([
    {
      id: "phase-1",
      name: "Групповой этап",
      type: "groups",
      groupCount: 4,
      teamsPerGroup: 6,
      groups: buildDefaultGroups(4, 0),
    },
    {
      id: "phase-2",
      name: "Квалификационные группы",
      type: "groups",
      groupCount: 3,
      teamsPerGroup: 8,
      groups: buildDefaultGroups(3, 1),
    },
  ]);
  const [transitions, setTransitions] = useState<PhaseTransition[]>([
    { fromPhaseId: "phase-1", toPhaseId: "phase-2", applyToAll: true, rules: [] },
  ]);
  const [teamGroups, setTeamGroups] = useState<Record<string, number[]>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!orgSlug || !tournamentId) return;
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/teams`)
      .then(r => r.json())
      .then(d => setTeams(Array.isArray(d) ? d : (d.teams ?? [])));
  }, [orgSlug, tournamentId]);

  const stepIndex = STEPS.indexOf(step);

  function goNext() {
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  }

  function goBack() {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev);
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const createdStages: Record<string, number> = {}; // phaseId → stageId
      const createdGroupIds: Record<string, number> = {}; // customGroupId → dbGroupId

      for (let phaseIdx = 0; phaseIdx < phases.length; phaseIdx++) {
        const phase = phases[phaseIdx];

        if (phase.type === "groups") {
          // Create group stage
          const stageRes = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/stages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: phase.name, nameRu: phase.name, type: "group", order: phaseIdx + 1 }),
          });
          const stage = await stageRes.json();
          createdStages[phase.id] = stage.id;

          // Create groups within phase
          for (let gi = 0; gi < phase.groups.length; gi++) {
            const group = phase.groups[gi];
            const groupRes = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/stages/${stage.id}/groups`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: group.name, nameEn: group.name, order: gi + 1 }),
            });
            const dbGroup = await groupRes.json();
            createdGroupIds[group.id] = dbGroup.id;

            // Assign teams to Phase 1 groups
            if (phaseIdx === 0) {
              const teamIds = teamGroups[group.id] ?? [];
              if (teamIds.length >= 2) {
                await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/groups/${dbGroup.id}/teams`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ teamIds }),
                });
                await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/matches/generate`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ stageId: stage.id, groupId: dbGroup.id }),
                });
              }
            }
          }
        } else {
          // Create knockout stage
          const stageRes = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/stages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: phase.name, nameRu: phase.name, type: "knockout", order: phaseIdx + 1 }),
          });
          const stage = await stageRes.json();
          createdStages[phase.id] = stage.id;

          const roundDefs = getRoundDefs(phase.knockoutTeams ?? 8, phase.thirdPlace ?? false);
          for (let ri = 0; ri < roundDefs.length; ri++) {
            await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/stages/${stage.id}/rounds`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...roundDefs[ri], order: ri + 1 }),
            });
          }
        }
      }

      // Create qualification rules
      for (const transition of transitions) {
        const fromStageId = createdStages[transition.fromPhaseId];
        const toStageId = createdStages[transition.toPhaseId];
        if (!fromStageId || !toStageId) continue;

        for (const rule of transition.rules) {
          const targetDbGroupId = createdGroupIds[rule.toGroupId];
          if (!targetDbGroupId) continue;

          const toPhase = phases.find(p => p.id === transition.toPhaseId);
          const targetGroup = toPhase?.groups.find(g => g.id === rule.toGroupId);

          await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/qualification-rules`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fromStageId,
              targetStageId: toStageId,
              fromRank: rule.fromPosition,
              toRank: rule.fromPosition,
              targetSlot: targetGroup?.name ?? null,
              condition: {
                type: "custom_advancement",
                targetGroupId: targetDbGroupId,
                targetGroupName: targetGroup?.name,
                applyToAll: transition.applyToAll,
              },
            }),
          });
        }
      }

      setDone(true);
    } catch (e) {
      console.error("Custom format generation error:", e);
    } finally {
      setGenerating(false);
    }
  }

  if (done) return <DoneScreen orgSlug={orgSlug} tournamentId={tournamentId} />;

  return (
    <div className="min-h-[70vh] flex flex-col">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link href={`/org/${orgSlug}/admin/tournament/${tournamentId}/format`}
          className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all hover:opacity-70"
          style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>
          <ChevronLeft className="w-4 h-4" style={{ color: "var(--cat-text-secondary)" }} />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(236,72,153,0.15)" }}>
              <Layers className="w-4 h-4" style={{ color: "#ec4899" }} />
            </div>
            <h1 className="text-xl font-black" style={{ color: "var(--cat-text)" }}>Мой формат</h1>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>Полностью кастомная структура турнира</p>
        </div>
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-0 mb-10">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className="rounded-full flex items-center justify-center transition-all duration-500"
                style={{
                  width: s === step ? 36 : 28,
                  height: s === step ? 36 : 28,
                  background: i < stepIndex ? "#ec4899" : s === step ? "#ec4899" : "var(--cat-tag-bg)",
                  border: `2px solid ${i <= stepIndex ? "#ec4899" : "var(--cat-card-border)"}`,
                  boxShadow: s === step ? "0 0 18px rgba(236,72,153,0.6)" : "none",
                  opacity: i > stepIndex ? 0.4 : 1,
                }}>
                {i < stepIndex
                  ? <CheckCircle className="w-3.5 h-3.5" style={{ color: "#fff" }} />
                  : <span className="text-xs font-black" style={{ color: s === step ? "#fff" : "var(--cat-text-muted)" }}>{i + 1}</span>
                }
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-wide"
                style={{ color: s === step ? "#ec4899" : "var(--cat-text-muted)", opacity: i > stepIndex ? 0.4 : 1 }}>
                {STEP_LABELS[s]}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-14 h-px mx-1 mb-5"
                style={{ background: i < stepIndex ? "#ec4899" : "var(--cat-card-border)", opacity: i < stepIndex ? 0.7 : 0.3 }} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1">
        {step === "phases" && <PhasesStep phases={phases} setPhases={setPhases} transitions={transitions} setTransitions={setTransitions} />}
        {step === "rules" && <AdvancementRulesStep phases={phases} transitions={transitions} setTransitions={setTransitions} />}
        {step === "draw" && <CustomDrawStep phases={phases} teamGroups={teamGroups} setTeamGroups={setTeamGroups} teams={teams} />}
        {step === "generate" && <CustomGenerateStep phases={phases} transitions={transitions} teams={teams} generating={generating} />}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t" style={{ borderColor: "var(--cat-card-border)" }}>
        <button onClick={goBack} disabled={stepIndex === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80 disabled:opacity-30"
          style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)", background: "var(--cat-card-bg)" }}>
          <ChevronLeft className="w-4 h-4" /> Назад
        </button>

        {step !== "generate" ? (
          <button onClick={goNext}
            disabled={step === "phases" && phases.length < 1}
            className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
            style={{ background: "#ec4899", color: "#fff", boxShadow: "0 0 18px rgba(236,72,153,0.4)" }}>
            Далее <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-black transition-all disabled:opacity-60"
            style={{
              background: generating ? "var(--cat-card-border)" : "#ec4899",
              color: generating ? "var(--cat-text-muted)" : "#fff",
              boxShadow: generating ? "none" : "0 0 28px rgba(236,72,153,0.5)",
            }}>
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Создаётся...</> : <><Zap className="w-4 h-4" /> Создать формат</>}
          </button>
        )}
      </div>
    </div>
  );
}
