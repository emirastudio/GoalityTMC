"use client";

/**
 * MultilangInput — Prestashop-style language switcher для одного поля.
 *
 * Один input/textarea + ряд табов сверху для переключения локали.
 * EN — обязательная (если требуется), остальные опциональны. На табе
 * показывается точка-индикатор «есть значение», если поле заполнено.
 *
 * Пример:
 *   <MultilangInput
 *     value={{ en: "Hotel", ru: "Отель", et: "", es: "" }}
 *     onChange={(v) => setTitle(v)}
 *     placeholder="Название"
 *     required
 *   />
 *
 * Состояние локалей хранится в одном объекте `MultilangValue` —
 * см. src/lib/i18n-text.ts. Сериализация в payload для API делается
 * через `multilangToPayload(baseField, value)`.
 */

import { useState } from "react";
import { Check } from "lucide-react";
import { ORG_TEXT_LOCALES, type MultilangValue, type OrgTextLocale } from "@/lib/i18n-text";

const LOCALE_LABEL: Record<OrgTextLocale, string> = {
  en: "EN",
  ru: "RU",
  et: "ET",
  es: "ES",
};

export function MultilangInput({
  value,
  onChange,
  placeholder,
  required = false,
  multiline = false,
  rows = 3,
  disabled = false,
  autoFocus = false,
  /** Какие локали показывать. По умолчанию все 4. */
  locales = ORG_TEXT_LOCALES,
  /** Какая локаль активна при первом рендере. По умолчанию EN. */
  defaultLocale = "en",
}: {
  value: MultilangValue;
  onChange: (next: MultilangValue) => void;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  locales?: readonly OrgTextLocale[];
  defaultLocale?: OrgTextLocale;
}) {
  const [active, setActive] = useState<OrgTextLocale>(defaultLocale);

  const filledCount = locales.filter((l) => (value[l] ?? "").trim()).length;
  const totalCount = locales.length;

  return (
    <div>
      {/* Tabs row */}
      <div className="flex items-center gap-1 mb-1.5 flex-wrap">
        {locales.map((lc) => {
          const isActive = active === lc;
          const filled = (value[lc] ?? "").trim().length > 0;
          const isPrimary = lc === "en" && required;
          return (
            <button
              key={lc}
              type="button"
              onClick={() => setActive(lc)}
              className="relative inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border transition-all"
              style={{
                background: isActive ? "var(--cat-badge-open-bg)" : "var(--cat-card-bg)",
                borderColor: isActive ? "var(--cat-accent)" : "var(--cat-card-border)",
                color: isActive
                  ? "var(--cat-accent)"
                  : filled
                    ? "var(--cat-text-secondary)"
                    : "var(--cat-text-muted)",
              }}
            >
              <span>{LOCALE_LABEL[lc]}</span>
              {isPrimary && (
                <span
                  className="text-[10px]"
                  style={{ color: filled ? "var(--cat-accent)" : "#ef4444" }}
                  title="Required"
                >
                  *
                </span>
              )}
              {/* Точка-индикатор для опциональных локалей с заполненным значением */}
              {!isPrimary && filled && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--cat-accent)" }}
                />
              )}
            </button>
          );
        })}

        {/* Прогресс справа */}
        <div
          className="ml-auto flex items-center gap-1 text-[10px]"
          style={{ color: "var(--cat-text-muted)" }}
        >
          {filledCount === totalCount && (
            <Check className="w-3 h-3" style={{ color: "var(--cat-accent)" }} />
          )}
          <span>
            {filledCount}/{totalCount}
          </span>
        </div>
      </div>

      {/* Input field — одно на все локали, переключается активным табом. */}
      {multiline ? (
        <textarea
          value={value[active] ?? ""}
          onChange={(e) => onChange({ ...value, [active]: e.target.value })}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          autoFocus={autoFocus}
          required={required && active === "en"}
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{
            background: "var(--cat-card-bg)",
            borderColor: "var(--cat-card-border)",
            color: "var(--cat-text)",
          }}
        />
      ) : (
        <input
          type="text"
          value={value[active] ?? ""}
          onChange={(e) => onChange({ ...value, [active]: e.target.value })}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          required={required && active === "en"}
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{
            background: "var(--cat-card-bg)",
            borderColor: "var(--cat-card-border)",
            color: "var(--cat-text)",
          }}
        />
      )}
    </div>
  );
}
