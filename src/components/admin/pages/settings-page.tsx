"use client";

// ── Страница настроек турнира ──────────────────────────────────────────────────
// Показывает все основные данные турнира: название, даты, локация,
// поля/стадионы, медиа (лого/обложка), сервисы (проживание/питание/трансфер)

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useTournament } from "@/lib/tournament-context";
import {
  Trophy, Calendar, MapPin, Hotel, Utensils, Bus,
  Loader2, Check, Save, Image as ImageIcon,
  ChevronDown, Globe, Wrench, ArrowRight, AlertCircle, X,
} from "lucide-react";
import { CountrySelect } from "@/components/ui/country-select";
import { CityInput } from "@/components/ui/city-input";

// ── Константы ─────────────────────────────────────────────────────────────────

const ACCENT = "#2BFEBA";

const CURRENCIES = ["EUR", "USD", "GBP", "SEK", "NOK", "DKK", "CHF", "PLN", "CZK"];

const MONTH_NAMES_RU = [
  "Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь",
];
const WEEKDAYS_SHORT = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

// ── Типы ──────────────────────────────────────────────────────────────────────

interface SettingsData {
  id: number;
  name: string;
  year: number;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  specificDays: string[];
  country: string | null;
  city: string | null;
  hasAccommodation: boolean;
  hasMeals: boolean;
  hasTransfer: boolean;
  logoUrl: string | null;
  coverUrl: string | null;
  cardImageUrl: string | null;
  registrationOpen: boolean;
}

// ── Вспомогательные компоненты ────────────────────────────────────────────────

function SectionCard({ icon: Icon, color, title, children }: {
  icon: React.ElementType;
  color: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border p-6"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <h3 className="text-base font-bold" style={{ color: "var(--cat-text)" }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wide"
        style={{ color: "var(--cat-text-muted)" }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", className = "" }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all ${className}`}
      style={{
        background:  "var(--cat-input-bg, var(--cat-tag-bg))",
        borderColor: "var(--cat-card-border)",
        color:       "var(--cat-text)",
      }}
      onFocus={e => { e.currentTarget.style.borderColor = ACCENT; }}
      onBlur={e =>  { e.currentTarget.style.borderColor = "var(--cat-card-border)"; }}
    />
  );
}

function Toggle({ on, onToggle, label, icon: Icon, color }: {
  on: boolean;
  onToggle: () => void;
  label: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-3 w-full rounded-xl px-4 py-3 border transition-all text-left"
      style={{
        background:   on ? `${color}12` : "var(--cat-tag-bg)",
        borderColor:  on ? color : "var(--cat-card-border)",
      }}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: on ? `${color}20` : "transparent" }}>
        <Icon className="w-4 h-4" style={{ color: on ? color : "var(--cat-text-muted)" }} />
      </div>
      <span className="flex-1 text-sm font-medium" style={{ color: on ? "var(--cat-text)" : "var(--cat-text-secondary)" }}>
        {label}
      </span>
      {/* Pill toggle */}
      <div className="relative w-10 h-5 rounded-full transition-all shrink-0"
        style={{ background: on ? color : "var(--cat-card-border)" }}>
        <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
          style={{ left: on ? "calc(100% - 1.25rem)" : "0.125rem" }} />
      </div>
    </button>
  );
}

// ── Мини-календарь для выбора конкретных дней ─────────────────────────────────

function DatePickerCalendar({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (days: string[]) => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  // Смещение для понедельника как первого дня
  const startOffset = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  function fmt(d: number) {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${viewYear}-${mm}-${dd}`;
  }

  function toggleDay(dayStr: string) {
    if (selected.includes(dayStr)) {
      onChange(selected.filter(d => d !== dayStr));
    } else {
      onChange([...selected, dayStr].sort());
    }
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-tag-bg)" }}>
      {/* Навигация */}
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity text-xs"
          style={{ color: "var(--cat-text-muted)" }}>‹</button>
        <span className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
          {MONTH_NAMES_RU[viewMonth]} {viewYear}
        </span>
        <button type="button" onClick={nextMonth}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity text-xs"
          style={{ color: "var(--cat-text-muted)" }}>›</button>
      </div>

      {/* Дни недели */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS_SHORT.map(d => (
          <div key={d} className="text-center text-[10px] font-bold pb-1 uppercase"
            style={{ color: "var(--cat-text-muted)" }}>{d}</div>
        ))}
      </div>

      {/* Ячейки */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const s   = fmt(day);
          const sel = selected.includes(s);
          const isTd = s === todayStr;
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleDay(s)}
              className="aspect-square rounded-lg text-xs font-semibold transition-all flex items-center justify-center"
              style={{
                background: sel ? ACCENT : isTd ? `${ACCENT}20` : "transparent",
                color:      sel ? "#000" : "var(--cat-text)",
                border:     isTd && !sel ? `1px solid ${ACCENT}50` : "1px solid transparent",
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t"
          style={{ borderColor: "var(--cat-card-border)" }}>
          <span className="text-xs" style={{ color: ACCENT }}>
            {selected.length} {selected.length === 1 ? "день" : selected.length < 5 ? "дня" : "дней"} выбрано
          </span>
          <button type="button" onClick={() => onChange([])}
            className="text-xs hover:opacity-70" style={{ color: "var(--cat-text-muted)" }}>
            Сбросить
          </button>
        </div>
      )}
    </div>
  );
}

// ── Компонент загрузки фото ────────────────────────────────────────────────────

function ImageUploadButton({
  url, label, endpoint, onUploaded,
}: {
  url: string | null;
  label: string;
  endpoint: string;
  onUploaded: (newUrl: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  // Use endpoint as stable unique id for the label/input pair
  const inputId = `img-upload-${endpoint.replace(/\//g, "-")}`;

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(endpoint, { method: "POST", body: fd });
      if (res.ok) {
        const d = await res.json();
        onUploaded(d.url ?? d.logoUrl ?? d.coverUrl ?? "");
      }
    } catch {/* ignore */} finally {
      setUploading(false);
    }
  }

  return (
    <label
      htmlFor={inputId}
      className="relative w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 py-6 transition-all hover:opacity-80 cursor-pointer select-none"
      style={{
        borderColor:  url ? ACCENT : "var(--cat-card-border)",
        background:   url ? `${ACCENT}08` : "var(--cat-tag-bg)",
        overflow:     "hidden",
      }}
    >
      {url && (
        <img src={url} alt={label} className="absolute inset-0 w-full h-full object-cover opacity-30" />
      )}
      <div className="relative z-10 flex flex-col items-center gap-1 pointer-events-none">
        {uploading
          ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: ACCENT }} />
          : <ImageIcon className="w-5 h-5" style={{ color: url ? ACCENT : "var(--cat-text-muted)" }} />
        }
        <span className="text-xs font-semibold" style={{ color: url ? ACCENT : "var(--cat-text-muted)" }}>
          {url ? "Изменить" : label}
        </span>
      </div>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={uploading}
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) { handleFile(f); e.target.value = ""; }
        }}
      />
    </label>
  );
}

// ── Основной компонент страницы ────────────────────────────────────────────────

export function SettingsPageContent() {
  const ctx = useTournament();
  const orgSlug      = ctx?.orgSlug ?? "";
  const tournamentId = ctx?.tournamentId ?? 0;

  const apiBase = `/api/org/${orgSlug}/tournament/${tournamentId}`;

  // ── Состояние формы ──────────────────────────────────────────────────────────

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const [name, setName]           = useState("");
  const [year, setYear]           = useState(new Date().getFullYear());
  const [currency, setCurrency]   = useState("EUR");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]     = useState("");
  const [usePeriod, setUsePeriod] = useState(true);    // период vs конкретные дни
  const [specificDays, setSpecificDays] = useState<string[]>([]);
  const [country, setCountry]     = useState("");
  const [city, setCity]           = useState("");
  const [hasAccommodation, setAccommodation] = useState(false);
  const [hasMeals, setMeals]                = useState(false);
  const [hasTransfer, setTransfer]          = useState(false);
  const [logoUrl, setLogoUrl]         = useState<string | null>(null);
  const [coverUrl, setCoverUrl]       = useState<string | null>(null);
  const [cardImageUrl, setCardImage]  = useState<string | null>(null);

  // ── Загрузка данных ──────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!orgSlug || !tournamentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/settings`);
      if (!res.ok) throw new Error("Failed to load");
      const d: SettingsData = await res.json();

      setName(d.name ?? "");
      setYear(d.year ?? new Date().getFullYear());
      setCurrency(d.currency ?? "EUR");
      setStartDate(d.startDate ? d.startDate.slice(0, 10) : "");
      setEndDate(d.endDate   ? d.endDate.slice(0, 10)   : "");
      setSpecificDays(d.specificDays ?? []);
      // Определяем режим: если есть конкретные дни — показываем календарь
      setUsePeriod(!d.specificDays?.length);
      setCountry(d.country ?? "");
      setCity(d.city ?? "");
      setAccommodation(d.hasAccommodation ?? false);
      setMeals(d.hasMeals ?? false);
      setTransfer(d.hasTransfer ?? false);
      setLogoUrl(d.logoUrl ?? null);
      setCoverUrl(d.coverUrl ?? null);
      setCardImage((d as any).cardImageUrl ?? null);
    } catch {
      setError("Не удалось загрузить настройки турнира");
    } finally {
      setLoading(false);
    }
  }, [orgSlug, tournamentId, apiBase]);

  useEffect(() => { load(); }, [load]);

  // ── Сохранение ───────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          year,
          currency,
          startDate:    usePeriod ? (startDate || null) : null,
          endDate:      usePeriod ? (endDate || null)   : null,
          specificDays: usePeriod ? [] : specificDays,
          country:      country || null,
          city:         city || null,
          hasAccommodation,
          hasMeals,
          hasTransfer,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Ошибка сохранения. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  }

  // ── Рендер ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 max-w-2xl">

      {/* ── Setup Hub баннер ── */}
      <a
        href={`/org/${orgSlug}/admin/tournament/${tournamentId}/setup`}
        className="flex items-center gap-4 rounded-2xl border p-4 transition-all hover:opacity-90"
        style={{ background: "rgba(43,254,186,0.06)", borderColor: "rgba(43,254,186,0.3)", textDecoration: "none" }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(43,254,186,0.15)" }}>
          <Wrench className="w-5 h-5" style={{ color: ACCENT }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-black" style={{ color: "var(--cat-text)" }}>Setup Hub</p>
          <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>
            Дивизионы · Формат · Площадки · Продукты · Публикация
          </p>
        </div>
        <ArrowRight className="w-4 h-4 shrink-0" style={{ color: ACCENT }} />
      </a>

      {/* ── Шапка ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>
            Настройки турнира
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            Основная информация, место проведения, поля и сервисы
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all disabled:opacity-60"
          style={{ background: ACCENT, color: "#000" }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? "Сохраняем…" : saved ? "Сохранено!" : "Сохранить"}
        </button>
      </div>

      {/* Сообщения */}
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm border"
          style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.25)", color: "#ef4444" }}>
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-xl px-4 py-3 text-sm border"
          style={{ background: `${ACCENT}12`, borderColor: `${ACCENT}40`, color: ACCENT }}>
          Настройки турнира сохранены!
        </div>
      )}

      {/* ── 1. Основное ── */}
      <SectionCard icon={Trophy} color={ACCENT} title="Основное">
        <div className="space-y-4">
          <Field label="Название турнира">
            <Input value={name} onChange={setName} placeholder="Например: Летний Кубок 2026" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Год">
              <Input value={String(year)} onChange={v => setYear(Number(v))} type="number" placeholder="2026" />
            </Field>
            <Field label="Валюта">
              <div className="relative">
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full appearance-none rounded-xl border px-3 py-2.5 text-sm pr-8 outline-none"
                  style={{
                    background: "var(--cat-input-bg, var(--cat-tag-bg))",
                    borderColor: "var(--cat-card-border)",
                    color: "var(--cat-text)",
                  }}
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--cat-text-muted)" }} />
              </div>
            </Field>
          </div>
        </div>
      </SectionCard>

      {/* ── 2. Даты ── */}
      <SectionCard icon={Calendar} color="#06b6d4" title="Даты проведения">
        {/* Переключатель режима */}
        <div className="flex rounded-xl border overflow-hidden mb-4"
          style={{ borderColor: "var(--cat-card-border)" }}>
          <button type="button"
            onClick={() => setUsePeriod(true)}
            className="flex-1 py-2 text-sm font-semibold transition-all"
            style={{
              background: usePeriod ? "#06b6d420" : "transparent",
              color: usePeriod ? "#06b6d4" : "var(--cat-text-muted)",
              borderRight: "1px solid var(--cat-card-border)",
            }}>
            Период
          </button>
          <button type="button"
            onClick={() => setUsePeriod(false)}
            className="flex-1 py-2 text-sm font-semibold transition-all"
            style={{
              background: !usePeriod ? "#06b6d420" : "transparent",
              color: !usePeriod ? "#06b6d4" : "var(--cat-text-muted)",
            }}>
            Конкретные дни
          </button>
        </div>

        {usePeriod ? (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Дата начала">
              <Input value={startDate} onChange={setStartDate} type="date" />
            </Field>
            <Field label="Дата окончания">
              <Input value={endDate} onChange={setEndDate} type="date" />
            </Field>
          </div>
        ) : (
          <DatePickerCalendar selected={specificDays} onChange={setSpecificDays} />
        )}
      </SectionCard>

      {/* ── 3. Локация ── */}
      <SectionCard icon={Globe} color="#8b5cf6" title="Место проведения">
        <div className="space-y-4">
          <Field label="Страна">
            <CountrySelect
              value={country}
              onChange={setCountry}
              placeholder="— Выберите страну —"
              variant="default"
            />
          </Field>
          <Field label="Город">
            <CityInput
              value={city}
              onChange={setCity}
              country={country}
              placeholder="Город"
              variant="default"
            />
          </Field>
        </div>
      </SectionCard>

      {/* ── 4. Медиа ── */}
      <SectionCard icon={ImageIcon} color="#ec4899" title="Медиа">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Логотип">
            <ImageUploadButton
              url={logoUrl}
              label="Загрузить логотип"
              endpoint={`${apiBase}/logo`}
              onUploaded={url => setLogoUrl(url)}
            />
          </Field>
          <Field label="Обложка">
            <ImageUploadButton
              url={coverUrl}
              label="Загрузить обложку"
              endpoint={`${apiBase}/cover`}
              onUploaded={url => setCoverUrl(url)}
            />
          </Field>
        </div>
        {/* Card image — отдельная картинка для каталога */}
        <div className="border-t pt-4" style={{ borderColor: "var(--cat-card-border)" }}>
          <Field label="Картинка в каталоге">
            <ImageUploadButton
              url={cardImageUrl}
              label="Загрузить картинку для каталога"
              endpoint={`${apiBase}/card-image`}
              onUploaded={url => setCardImage(url)}
            />
          </Field>
          <p className="text-xs mt-2" style={{ color: "var(--cat-text-muted)" }}>
            Показывается на карточке турнира в каталоге. Рекомендуется 700×400 или 16:9.
            Если не загружена — используется обложка.
          </p>
        </div>
        <p className="text-xs mt-3" style={{ color: "var(--cat-text-muted)" }}>
          Логотип: квадрат PNG/SVG до 10MB · Обложка: 1920×480 рекомендуется
        </p>
      </SectionCard>

      {/* Legacy "Дополнительные сервисы" block removed — these toggles
          controlled sidebar links to /accommodation, /meals, /transfer
          pages that never existed in the app router. The corresponding
          data is now part of the unified "Offerings" module — see the
          "Новый модуль услуг (v3)" card at the bottom of this page. */}

      {/* Нижняя кнопка сохранения */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold transition-all disabled:opacity-60"
          style={{ background: ACCENT, color: "#000" }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Сохраняем…" : "Сохранить все настройки"}
        </button>
      </div>

      {/* ── Danger Zone ── */}
      <SettingsDangerZone orgSlug={orgSlug} tournamentId={tournamentId} tournamentName={name} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Danger Zone — запрос на удаление турнира
// ─────────────────────────────────────────────────────────────

function SettingsDangerZone({ orgSlug, tournamentId, tournamentName }: {
  orgSlug: string;
  tournamentId: number;
  tournamentName: string;
}) {
  const t = useTranslations("orgAdmin");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [cancelling, setCancelling] = useState(false);

  const submit = async () => {
    setStatus("sending");
    const res = await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/delete-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok || d.error === "already_requested") {
      setStatus("sent");
      setOpen(false);
    } else {
      setStatus("idle");
    }
  };

  const cancelRequest = async () => {
    setCancelling(true);
    await fetch(`/api/org/${orgSlug}/tournament/${tournamentId}/delete-request`, { method: "DELETE" });
    setCancelling(false);
    setStatus("idle");
  };

  return (
    <div className="mt-4 rounded-2xl border-2 border-dashed p-5"
      style={{ borderColor: "rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.02)" }}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-black" style={{ color: "#DC2626" }}>{t("dangerZone")}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
            {t("dangerZoneDesc")}
          </p>
        </div>

        {status === "sent" ? (
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626" }}>
              ⏳ {t("deleteRequestSent")}
            </span>
            <button onClick={cancelRequest} disabled={cancelling}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all hover:opacity-70"
              style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-muted)" }}>
              {t("cancelRequest")}
            </button>
          </div>
        ) : (
          <button onClick={() => setOpen(true)}
            className="text-xs font-black px-4 py-2 rounded-xl border-2 transition-all hover:bg-red-50"
            style={{ borderColor: "rgba(220,38,38,0.4)", color: "#DC2626" }}>
            {t("requestDelete")}
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="w-full max-w-md rounded-3xl border p-6"
            style={{ background: "var(--cat-card-bg)", borderColor: "rgba(220,38,38,0.3)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(220,38,38,0.1)" }}>
                <AlertCircle className="w-5 h-5" style={{ color: "#DC2626" }} />
              </div>
              <div>
                <p className="text-sm font-black" style={{ color: "var(--cat-text)" }}>{t("requestDeleteTitle")}</p>
                <p className="text-xs" style={{ color: "var(--cat-text-muted)" }}>{tournamentName}</p>
              </div>
              <button onClick={() => setOpen(false)} className="ml-auto p-1.5 rounded-lg hover:opacity-60"
                style={{ color: "var(--cat-text-muted)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--cat-text-muted)" }}>
              {t("requestDeleteDesc")}
            </p>
            <div className="mb-4">
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--cat-text-muted)" }}>
                {t("deleteReason")} <span style={{ fontWeight: 400 }}>({t("optional")})</span>
              </label>
              <textarea
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-none"
                style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={t("deleteReasonPlaceholder")}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-70"
                style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-muted)" }}>
                {t("cancel")}
              </button>
              <button onClick={submit} disabled={status === "sending"}
                className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: "#DC2626", color: "#fff" }}>
                {status === "sending" ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t("sendDeleteRequest")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
