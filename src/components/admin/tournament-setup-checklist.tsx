"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  CheckCircle2, Circle, ChevronRight, X, Trophy,
  Layers, MapPin, Users, GitBranch, Sparkles,
} from "lucide-react";
import { useState } from "react";

export type ChecklistStep = {
  id: string;
  done: boolean;
  href: string;
};

interface Props {
  steps: ChecklistStep[];
  basePath: string;
}

const STEP_ICONS = {
  tournament: Trophy,
  division:   Layers,
  fields:     MapPin,
  registration: Users,
  format:     GitBranch,
};

export function TournamentSetupChecklist({ steps, basePath }: Props) {
  const t = useTranslations("setupChecklist");
  const [dismissed, setDismissed] = useState(false);

  const doneCount = steps.filter(s => s.done).length;
  const total = steps.length;
  const allDone = doneCount === total;
  const pct = Math.round((doneCount / total) * 100);

  if (dismissed || allDone) return null;

  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: "var(--checklist-bg)",
        border: "1px solid var(--checklist-border)",
        boxShadow: "var(--checklist-shadow)",
      }}
    >
      <style>{`
        :root {
          --checklist-bg: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
          --checklist-border: rgba(139,92,246,0.35);
          --checklist-shadow: 0 4px 32px rgba(139,92,246,0.15), 0 1px 0 rgba(255,255,255,0.05) inset;
          --checklist-text: #f1f5f9;
          --checklist-muted: rgba(241,245,249,0.55);
          --checklist-done-color: #34d399;
          --checklist-todo-color: rgba(241,245,249,0.25);
          --checklist-row-hover: rgba(139,92,246,0.12);
          --checklist-row-border: rgba(139,92,246,0.12);
          --checklist-btn-bg: rgba(139,92,246,0.2);
          --checklist-btn-border: rgba(139,92,246,0.4);
          --checklist-btn-text: #c4b5fd;
          --checklist-bar-bg: rgba(255,255,255,0.08);
          --checklist-bar-fill: linear-gradient(90deg, #8b5cf6, #06b6d4);
          --checklist-sparkle: #a78bfa;
          --checklist-dismiss: rgba(241,245,249,0.3);
        }
        [data-theme="light"] {
          --checklist-bg: linear-gradient(135deg, #faf5ff 0%, #ede9fe 50%, #f0f9ff 100%);
          --checklist-border: rgba(139,92,246,0.25);
          --checklist-shadow: 0 4px 24px rgba(139,92,246,0.10);
          --checklist-text: #1e1b4b;
          --checklist-muted: rgba(30,27,75,0.5);
          --checklist-done-color: #059669;
          --checklist-todo-color: rgba(30,27,75,0.2);
          --checklist-row-hover: rgba(139,92,246,0.07);
          --checklist-row-border: rgba(139,92,246,0.1);
          --checklist-btn-bg: rgba(139,92,246,0.1);
          --checklist-btn-border: rgba(139,92,246,0.3);
          --checklist-btn-text: #7c3aed;
          --checklist-bar-bg: rgba(139,92,246,0.1);
          --checklist-bar-fill: linear-gradient(90deg, #7c3aed, #0891b2);
          --checklist-sparkle: #7c3aed;
          --checklist-dismiss: rgba(30,27,75,0.3);
        }
      `}</style>

      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-start gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)" }}>
          <Sparkles className="w-5 h-5" style={{ color: "var(--checklist-sparkle)" }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-black" style={{ color: "var(--checklist-text)" }}>
              {t("title")}
            </h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ background: "rgba(139,92,246,0.2)", color: "var(--checklist-sparkle)", border: "1px solid rgba(139,92,246,0.3)" }}>
              {doneCount}/{total}
            </span>
          </div>
          <p className="text-[11px]" style={{ color: "var(--checklist-muted)" }}>
            {t("subtitle")}
          </p>
        </div>

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70 shrink-0"
          style={{ background: "rgba(255,255,255,0.05)", color: "var(--checklist-dismiss)" }}
          title={t("dismiss")}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold" style={{ color: "var(--checklist-muted)" }}>
            {t("progress", { pct })}
          </span>
          <span className="text-[10px] font-bold" style={{ color: "var(--checklist-sparkle)" }}>
            {t("stepsLeft", { n: total - doneCount })}
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--checklist-bar-bg)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: "var(--checklist-bar-fill)" }}
          />
        </div>
      </div>

      {/* Steps */}
      <div style={{ borderTop: "1px solid var(--checklist-row-border)" }}>
        {steps.map((step, idx) => {
          const Icon = STEP_ICONS[step.id as keyof typeof STEP_ICONS] ?? Circle;
          return (
            <div
              key={step.id}
              style={{ borderBottom: idx < steps.length - 1 ? "1px solid var(--checklist-row-border)" : "none" }}
            >
              {step.done ? (
                // Done row — no link, just status
                <div className="flex items-center gap-3 px-5 py-3">
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "var(--checklist-done-color)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold line-through" style={{ color: "var(--checklist-muted)" }}>
                      {t(`step_${step.id}`)}
                    </p>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: "rgba(52,211,153,0.12)", color: "var(--checklist-done-color)", border: "1px solid rgba(52,211,153,0.25)" }}>
                    {t("done")}
                  </span>
                </div>
              ) : (
                // Todo row — clickable link
                <Link
                  href={step.href}
                  className="flex items-center gap-3 px-5 py-3 transition-all group"
                  style={{ background: "transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--checklist-row-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <Circle className="w-4 h-4 shrink-0" style={{ color: "var(--checklist-todo-color)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold" style={{ color: "var(--checklist-text)" }}>
                      {t(`step_${step.id}`)}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--checklist-muted)" }}>
                      {t(`step_${step.id}_hint`)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shrink-0 transition-all group-hover:scale-105"
                    style={{ background: "var(--checklist-btn-bg)", border: "1px solid var(--checklist-btn-border)", color: "var(--checklist-btn-text)" }}>
                    <span className="text-[11px] font-bold">{t("goTo")}</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
