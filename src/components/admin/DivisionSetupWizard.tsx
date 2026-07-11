"use client";

/**
 * DivisionSetupWizard — the guided "even a child gets it" layer over the
 * division setup. Shows a linear 4-step progression (teams → draw → schedule
 * → publish), each step with plain-language status and one obvious action.
 * The existing tabs/planner stay as the "advanced" surface — this only
 * orchestrates and points; it never hides functionality.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Users, Shuffle, CalendarClock, Send,
  Check, ArrowRight, Loader2,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { computeSetupSteps, type SetupState, type SetupStepKey } from "@/lib/setup-steps";

type Props = {
  base: string;
  classId: number | null;
  orgSlug: string;
  tournamentId: number;
  /** Switch the parent to the draw tab (the "Провести жеребьёвку" action). */
  onGoToDraw: () => void;
};

const STEP_ICON: Record<SetupStepKey, typeof Users> = {
  teams: Users,
  draw: Shuffle,
  schedule: CalendarClock,
  publish: Send,
};

export function DivisionSetupWizard({ base, classId, orgSlug, tournamentId, onGoToDraw }: Props) {
  const t = useTranslations("schedule");
  const [state, setState] = useState<SetupState | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const q = classId ? `?classId=${classId}` : "";
    try {
      const [mRes, tRes, pRes] = await Promise.all([
        fetch(`${base}/matches${q}`, { credentials: "include", cache: "no-store" }),
        fetch(`${base}/teams${q}`, { credentials: "include", cache: "no-store" }),
        fetch(`${base}/schedule/publish`, { credentials: "include", cache: "no-store" }),
      ]);
      const matches = mRes.ok ? await mRes.json() : [];
      const teams = tRes.ok ? await tRes.json() : [];
      const pub = pRes.ok ? await pRes.json() : { published: false };
      const arr = Array.isArray(matches) ? matches : [];
      setState({
        confirmedTeams: Array.isArray(teams) ? teams.length : 0,
        totalMatches: arr.length,
        matchesWithTeams: arr.filter((m) => m.homeTeamId && m.awayTeamId).length,
        scheduledMatches: arr.filter((m) => m.scheduledAt).length,
        published: !!pub.published,
      });
    } catch {
      /* keep last state */
    }
  }, [base, classId]);

  useEffect(() => { load(); }, [load]);

  const plan = useMemo(() => (state ? computeSetupSteps(state) : null), [state]);

  const setPublish = async (publish: boolean) => {
    setBusy(true);
    try {
      await fetch(`${base}/schedule/publish`, {
        method: publish ? "POST" : "DELETE",
        credentials: "include",
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!state || !plan) return null;

  const cls = classId ? `?classId=${classId}` : "";
  const teamsHref = `/org/${orgSlug}/admin/tournament/${tournamentId}/teams${cls}`;
  const formatHref = `/org/${orgSlug}/admin/tournament/${tournamentId}/format${cls}`;
  const plannerHref = `/org/${orgSlug}/admin/tournament/${tournamentId}/planner${cls}`;

  const stepNumber = (k: SetupStepKey) => ({ teams: 1, draw: 2, schedule: 3, publish: 4 }[k]);

  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
    >
      {/* Stepper */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {plan.steps.map((s) => {
          const Icon = STEP_ICON[s.key];
          const isDone = s.status === "done";
          const isCurrent = s.status === "current";
          return (
            <div
              key={s.key}
              className="rounded-xl p-2.5 text-center border"
              style={{
                background: isCurrent ? "var(--cat-tag-bg)" : "transparent",
                borderColor: isCurrent ? "var(--cat-accent)" : "var(--cat-card-border)",
                opacity: s.status === "todo" ? 0.55 : 1,
              }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center mx-auto mb-1.5 text-xs font-black"
                style={{
                  background: isDone ? "#2BFEBA" : isCurrent ? "var(--cat-accent)" : "var(--cat-tag-bg)",
                  color: isDone || isCurrent ? "#05221a" : "var(--cat-text-muted)",
                }}
              >
                {isDone ? <Check className="w-4 h-4" /> : stepNumber(s.key)}
              </div>
              <div className="text-xs font-bold flex items-center justify-center gap-1" style={{ color: "var(--cat-text)" }}>
                <Icon className="w-3 h-3" /> {t(`wizardStep_${s.key}`)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Current step / done panel */}
      {plan.allDone ? (
        <div className="rounded-xl p-3 flex items-center gap-3"
          style={{ background: "rgba(43,254,186,0.06)", border: "1px solid rgba(43,254,186,0.3)" }}>
          <Check className="w-5 h-5 shrink-0" style={{ color: "#2BFEBA" }} />
          <p className="text-sm font-bold flex-1" style={{ color: "#2BFEBA" }}>{t("wizardAllDone")}</p>
          <button onClick={() => setPublish(false)} disabled={busy}
            className="text-xs font-bold underline-offset-2 hover:underline disabled:opacity-50"
            style={{ color: "var(--cat-text-muted)" }}>
            {busy ? "…" : t("wizardUnpublish")}
          </button>
        </div>
      ) : (
        <CurrentStep
          stepKey={plan.currentKey!}
          state={state}
          t={t}
          busy={busy}
          stepNumber={stepNumber(plan.currentKey!)}
          onDraw={onGoToDraw}
          onPublish={() => setPublish(true)}
          teamsHref={teamsHref}
          formatHref={formatHref}
          plannerHref={plannerHref}
        />
      )}
    </div>
  );
}

function CurrentStep({
  stepKey, state, t, busy, stepNumber, onDraw, onPublish, teamsHref, formatHref, plannerHref,
}: {
  stepKey: SetupStepKey;
  state: SetupState;
  t: ReturnType<typeof useTranslations>;
  busy: boolean;
  stepNumber: number;
  onDraw: () => void;
  onPublish: () => void;
  teamsHref: string;
  formatHref: string;
  plannerHref: string;
}) {
  // Per-step plain-language question, status hint, and the single CTA.
  let question = "";
  let hint = "";
  let cta: React.ReactNode = null;

  if (stepKey === "teams") {
    question = t("wizardQ_teams");
    hint = t("wizardHint_teams", { count: state.confirmedTeams });
    cta = <LinkCta href={teamsHref} label={t("wizardCta_teams")} />;
  } else if (stepKey === "draw") {
    question = t("wizardQ_draw");
    if (state.totalMatches === 0) {
      hint = t("wizardHint_noFormat");
      cta = <LinkCta href={formatHref} label={t("wizardCta_format")} />;
    } else {
      hint = t("wizardHint_draw");
      cta = <ButtonCta onClick={onDraw} label={t("wizardCta_draw")} busy={false} />;
    }
  } else if (stepKey === "schedule") {
    question = t("wizardQ_schedule");
    hint = t("wizardHint_schedule", { done: state.scheduledMatches, total: state.totalMatches });
    cta = <LinkCta href={plannerHref} label={t("wizardCta_schedule")} />;
  } else {
    question = t("wizardQ_publish");
    hint = t("wizardHint_publish");
    cta = <ButtonCta onClick={onPublish} label={t("wizardCta_publish")} busy={busy} />;
  }

  return (
    <div className="rounded-xl p-3.5" style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)" }}>
      <div className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "var(--cat-text-muted)" }}>
        {t("wizardStepOf", { n: stepNumber })}
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-lg font-black" style={{ color: "var(--cat-text)" }}>{question}</div>
          <div className="text-sm" style={{ color: "var(--cat-text-secondary)" }}>{hint}</div>
        </div>
        <div className="shrink-0">{cta}</div>
      </div>
    </div>
  );
}

function ButtonCta({ onClick, label, busy }: { onClick: () => void; label: string; busy: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
      style={{ background: "var(--cat-accent)", color: "#05221a" }}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      {label} {!busy && <ArrowRight className="w-4 h-4" />}
    </button>
  );
}

function LinkCta({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
      style={{ background: "var(--cat-accent)", color: "#05221a" }}
    >
      {label} <ArrowRight className="w-4 h-4" />
    </Link>
  );
}
