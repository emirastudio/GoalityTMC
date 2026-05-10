"use client";

/**
 * Шаг 1 создания услуги — выбор архетипа.
 *
 * Организатор видит 6 «человеческих» категорий вместо 9 примитивов
 * pricingModel. Кликом по карточке открывается упрощённая форма
 * (CreateOfferingDialog с `simpleMode={archetype}`), где скрыта вся
 * лишняя сложность — остаются только название, цена и live-превью.
 *
 * Архетип «Свой вариант» открывает полный диалог как и раньше.
 */

import { X } from "lucide-react";
import { useTranslations } from "next-intl";

export type ArchetypeKey =
  | "hotel"
  | "meals_count"
  | "meals_all"
  | "fee"
  | "transfer"
  | "merch"
  | "advanced";

export type ArchetypeDef = {
  key: ArchetypeKey;
  /** lucide icon name from OFFERING_ICONS keys (or null for advanced) */
  iconKey: string | null;
  /** colored gradient for the card hero strip */
  hue: string;
};

// Все 6 архетипов + advanced. iconKey должен совпадать с ключами из
// src/lib/offerings/icons.ts чтобы превью карточки показало правильную
// иконку.
export const ARCHETYPES: ArchetypeDef[] = [
  { key: "hotel",       iconKey: "hotel",   hue: "#3b82f6" },
  { key: "meals_count", iconKey: "meal",    hue: "#ef4444" },
  { key: "meals_all",   iconKey: "meal",    hue: "#f59e0b" },
  { key: "fee",         iconKey: "fee",     hue: "#10b981" },
  { key: "transfer",    iconKey: "bus",     hue: "#8b5cf6" },
  { key: "merch",       iconKey: "shirt",   hue: "#ec4899" },
];

export function ArchetypePicker({
  onPick,
  onClose,
}: {
  onPick: (key: ArchetypeKey) => void;
  onClose: () => void;
}) {
  const t = useTranslations("offeringsAdmin");

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border overflow-hidden shadow-2xl"
        style={{
          background: "var(--cat-bg)",
          borderColor: "var(--cat-card-border)",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: "var(--cat-card-border)" }}
        >
          <div>
            <h3 className="text-base font-bold" style={{ color: "var(--cat-text)" }}>
              {t("archetypePickerTitle")}
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
              {t("archetypePickerSubtitle")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:opacity-70"
            style={{ color: "var(--cat-text-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto" style={{ flex: 1 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ARCHETYPES.map((a) => (
              <ArchetypeCard
                key={a.key}
                archetype={a}
                title={t(`arch_${a.key}_title`)}
                description={t(`arch_${a.key}_desc`)}
                example={t(`arch_${a.key}_example`)}
                onClick={() => onPick(a.key)}
              />
            ))}
          </div>

          {/* Advanced — отдельный полноширинный блок: визуально менее
              приоритетный чем 6 архетипов выше. */}
          <button
            type="button"
            onClick={() => onPick("advanced")}
            className="mt-3 w-full text-left rounded-2xl border-2 border-dashed px-4 py-3 transition-all hover:opacity-90"
            style={{
              borderColor: "var(--cat-card-border)",
              background: "var(--cat-card-bg)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
                  {t("arch_advanced_title")}
                </div>
                <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--cat-text-muted)" }}>
                  {t("arch_advanced_desc")}
                </p>
              </div>
              <span className="text-xs shrink-0" style={{ color: "var(--cat-text-muted)" }}>
                →
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function ArchetypeCard({
  archetype,
  title,
  description,
  example,
  onClick,
}: {
  archetype: ArchetypeDef;
  title: string;
  description: string;
  example: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-2xl border p-4 transition-all hover:scale-[1.01] hover:shadow-lg"
      style={{
        background: "var(--cat-card-bg)",
        borderColor: "var(--cat-card-border)",
        borderLeftWidth: 3,
        borderLeftColor: archetype.hue,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
          style={{
            background: `${archetype.hue}1A`,
            color: archetype.hue,
          }}
        >
          {ARCHETYPE_EMOJI[archetype.key] ?? "•"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold mb-0.5" style={{ color: "var(--cat-text)" }}>
            {title}
          </div>
          <p
            className="text-[11px] leading-snug mb-1.5"
            style={{ color: "var(--cat-text-muted)" }}
          >
            {description}
          </p>
          <p
            className="text-[11px] font-mono px-2 py-0.5 rounded inline-block"
            style={{
              background: "var(--cat-tag-bg)",
              color: "var(--cat-text-secondary)",
            }}
          >
            {example}
          </p>
        </div>
      </div>
    </button>
  );
}

// Симпатичные эмодзи на карточках. Не зависят от шрифта — работают везде.
const ARCHETYPE_EMOJI: Record<ArchetypeKey, string> = {
  hotel:       "🏨",
  meals_count: "🍽️",
  meals_all:   "🥗",
  fee:         "💵",
  transfer:    "🚐",
  merch:       "🎽",
  advanced:    "⚙️",
};
