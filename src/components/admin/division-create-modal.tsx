"use client";

// ── Визард создания дивизиона (2 шага) ────────────────────────────────────────
// Шаг 1: Основные данные (название, формат матча, год рождения, лимит команд)
// Шаг 2: Готово — ссылка в Format Builder (единственный источник правды)

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  X, GraduationCap, ChevronRight,
  Check, Loader2, GitBranch, CalendarDays,
  ArrowRight,
} from "lucide-react";

// ── Константы ─────────────────────────────────────────────────────────────────

const ACCENT = "#2BFEBA";

// Форматы матча (размер команды на поле)
const MATCH_FORMATS = [
  { value: "5x5",  label: "5×5",  hint: "мини-футбол" },
  { value: "7x7",  label: "7×7",  hint: "малое поле"  },
  { value: "8x8",  label: "8×8",  hint: "среднее поле" },
  { value: "9x9",  label: "9×9",  hint: "полу-поле"   },
  { value: "11x11",label: "11×11",hint: "стандарт"    },
];

// ── Основной компонент ────────────────────────────────────────────────────────

interface Props {
  orgSlug:       string;
  tournamentId:  number;
  effectivePlan: string;
  onClose:       () => void;
  onCreated:     (classId: number, className: string) => void;
}

export function DivisionCreateModal({ orgSlug, tournamentId, onClose, onCreated }: Props) {
  const t = useTranslations("divisionWizard");
  const router = useRouter();
  const apiBase = `/api/org/${orgSlug}/tournament/${tournamentId}`;

  // ── Состояние ────────────────────────────────────────────────────────────────
  const [step, setStep]         = useState<1 | 2>(1);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Шаг 1: основные данные
  const [name, setName]               = useState("");
  const [matchFormat, setMatchFormat] = useState("8x8");
  const [minBirth, setMinBirth]       = useState("");
  const [maxTeams, setMaxTeams]       = useState("16");
  const [startDate, setStartDate]     = useState("");
  const [endDate, setEndDate]         = useState("");

  // Подтягиваем даты турнира при открытии
  useEffect(() => {
    fetch(`/api/org/${orgSlug}/tournament/${tournamentId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((d: { startDate?: string | null; endDate?: string | null } | null) => {
        if (d?.startDate) setStartDate(d.startDate.slice(0, 10));
        if (d?.endDate)   setEndDate(d.endDate.slice(0, 10));
      })
      .catch(() => {});
  }, [orgSlug, tournamentId]);

  // Шаг 2: результат
  const [createdId, setCreatedId]     = useState<number | null>(null);

  // Закрытие по Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Создание дивизиона ────────────────────────────────────────────────────
  async function handleCreate() {
    setError(null);
    if (!name.trim()) { setError("Введите название дивизиона"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/classes`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:         name.trim(),
          format:       matchFormat,
          minBirthYear: minBirth ? Number(minBirth) : null,
          maxPlayers:   25,
          maxStaff:     5,
          maxTeams:     Number(maxTeams) || null,
          startDate:    startDate || null,
          endDate:      endDate || null,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (d.error === "Division limit reached") {
          throw new Error(`Лимит дивизионов достигнут (план ${d.plan}: max ${d.limit})`);
        }
        throw new Error(d.error ?? "Ошибка создания дивизиона");
      }

      const created = await res.json();
      setCreatedId(created.id);
      onCreated(created.id, name.trim());
      setStep(2);

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка");
    } finally {
      setSaving(false);
    }
  }

  // ── Переходы ─────────────────────────────────────────────────────────────────

  function goToFormat() {
    if (!createdId) return;
    router.push(`/org/${orgSlug}/admin/tournament/${tournamentId}/format?classId=${createdId}&className=${encodeURIComponent(name.trim())}`);
    onClose();
  }

  function goToSchedule() {
    if (!createdId) return;
    router.push(`/org/${orgSlug}/admin/tournament/${tournamentId}/schedule?classId=${createdId}&className=${encodeURIComponent(name.trim())}`);
    onClose();
  }

  // ── Рендер ────────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        style={{ background: "var(--cat-card-bg)", border: "1.5px solid var(--cat-card-border)" }}
      >
        {/* ── Шапка ── */}
        <div className="relative px-6 pt-6 pb-4">
          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)` }} />

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: `${ACCENT}15` }}>
                <GraduationCap className="w-5 h-5" style={{ color: ACCENT }} />
              </div>
              <div>
                <h2 className="text-lg font-black" style={{ color: "var(--cat-text)" }}>
                  {step === 1 ? t("title") : t("titleDone")}
                </h2>
                <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
                  {step === 1 ? t("step1Sub") : name}
                </p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-70"
              style={{ color: "var(--cat-text-muted)", background: "var(--cat-tag-bg)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Тело ── */}
        <div className="px-6 pb-6 space-y-5">

          {/* ── ШАГ 1: Основные данные ── */}
          {step === 1 && (
            <>
              {/* Название */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>
                  {t("nameLabel")}
                </label>
                <input
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                  placeholder={t("namePlaceholder")}
                  className="w-full rounded-2xl border px-4 py-3 text-sm font-semibold outline-none transition-all"
                  style={{
                    background:   "var(--cat-tag-bg)",
                    borderColor:  name ? ACCENT : "var(--cat-card-border)",
                    color:        "var(--cat-text)",
                    boxShadow:    name ? `0 0 0 3px ${ACCENT}15` : "none",
                  }}
                />
              </div>

              {/* Формат матча */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>
                  {t("matchFormatLabel")}
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {MATCH_FORMATS.map(f => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setMatchFormat(f.value)}
                      className="rounded-xl py-2 flex flex-col items-center gap-0.5 transition-all"
                      style={{
                        background:  matchFormat === f.value ? `${ACCENT}18` : "var(--cat-tag-bg)",
                        border:      `1.5px solid ${matchFormat === f.value ? ACCENT : "var(--cat-card-border)"}`,
                        color:       matchFormat === f.value ? ACCENT : "var(--cat-text-muted)",
                      }}
                    >
                      <span className="text-sm font-black">{f.label}</span>
                      <span className="text-[9px] opacity-70">{f.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Год рождения + Макс команд */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>
                    {t("birthYearLabel")}
                  </label>
                  <input
                    type="number"
                    value={minBirth}
                    onChange={e => setMinBirth(e.target.value)}
                    placeholder="2012"
                    min={1990} max={2020}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                    style={{
                      background:  "var(--cat-tag-bg)",
                      borderColor: "var(--cat-card-border)",
                      color:       "var(--cat-text)",
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>
                    {t("maxTeamsLabel")}
                  </label>
                  <input
                    type="number"
                    value={maxTeams}
                    onChange={e => setMaxTeams(e.target.value)}
                    min={2} max={128}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                    style={{
                      background:  "var(--cat-tag-bg)",
                      borderColor: "var(--cat-card-border)",
                      color:       "var(--cat-text)",
                    }}
                  />
                </div>
              </div>

              {/* Даты дивизиона (по умолчанию = даты турнира) */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>
                  Даты дивизиона
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>Начало</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                      style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>Конец</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                      style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
                    />
                  </div>
                </div>
                {(startDate || endDate) && (
                  <p className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                    Подтянуто из турнира · можно уточнить для этого дивизиона
                  </p>
                )}
              </div>

              {error && (
                <p className="text-sm rounded-xl px-3 py-2" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleCreate}
                disabled={saving || !name.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black transition-all disabled:opacity-50"
                style={{ background: ACCENT, color: "#000" }}
              >
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("creating")}</>
                  : <>{t("createBtn")} <ChevronRight className="w-4 h-4" /></>
                }
              </button>
            </>
          )}

          {/* ── ШАГ 2: Готово ── */}
          {step === 2 && (
            <>
              {/* Иконка успеха */}
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                    style={{ background: `${ACCENT}15`, border: `2px solid ${ACCENT}40` }}>
                    <GraduationCap className="w-10 h-10" style={{ color: ACCENT }} />
                  </div>
                  <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: ACCENT }}>
                    <Check className="w-4 h-4 text-black" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black" style={{ color: "var(--cat-text)" }}>
                    {t("titleDone")}
                  </p>
                  <p className="text-sm mt-1" style={{ color: "var(--cat-text-muted)" }}>
                    <span className="font-semibold" style={{ color: ACCENT }}>{name}</span> · {matchFormat}
                  </p>
                </div>
              </div>

              {/* Что дальше */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-widest px-1" style={{ color: "var(--cat-text-muted)" }}>
                  {t("whatsNext")}
                </p>

                {/* Единственный путь: Format Builder */}
                <button
                  type="button"
                  onClick={goToFormat}
                  className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 transition-all hover:opacity-80"
                  style={{ background: `${ACCENT}12`, border: `1.5px solid ${ACCENT}40` }}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: `${ACCENT}20` }}>
                    <GitBranch className="w-4 h-4" style={{ color: ACCENT }} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
                      {t("goToFormat")}
                    </p>
                    <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
                      {t("goToFormatDesc")}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4" style={{ color: ACCENT }} />
                </button>

                <button
                  type="button"
                  onClick={goToSchedule}
                  className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 transition-all hover:opacity-80"
                  style={{ background: "var(--cat-tag-bg)", border: "1.5px solid var(--cat-card-border)" }}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(6,182,212,0.12)" }}>
                    <CalendarDays className="w-4 h-4" style={{ color: "#06b6d4" }} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>{t("goToSchedule")}</p>
                    <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{t("goToScheduleDesc")}</p>
                  </div>
                  <ArrowRight className="w-4 h-4" style={{ color: "var(--cat-text-muted)" }} />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full text-sm py-2.5 rounded-2xl font-semibold transition-all hover:opacity-80"
                  style={{ color: "var(--cat-text-muted)", background: "transparent" }}
                >
                  {t("closeLater")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
