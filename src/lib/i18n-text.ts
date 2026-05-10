/**
 * Локализованный текст из БД.
 *
 * Конвенция переводимых полей в схеме: базовая колонка хранит EN
 * (`title`, `name`, `description`), варианты — суффикс локали:
 * `titleRu`, `titleEt`, `titleEs`, и т.д.
 *
 * Для каждого locale-а мы отдаём первый непустой вариант:
 *   active locale → fallback chain → base (en)
 *
 * Пример:
 *   pickLocaleText({ title: "Hotel", titleRu: "Отель" }, "et", "title")
 *     → "Hotel"  (et нет → fallback в base)
 */

// Все 4 поддерживаемые локали. EN = базовая колонка без суффикса.
export const ORG_TEXT_LOCALES = ["en", "ru", "et", "es"] as const;
export type OrgTextLocale = (typeof ORG_TEXT_LOCALES)[number];

/**
 * Достать значение поля для нужной локали с fallback.
 *
 * @param obj    — строка из БД (или DTO) с колонками `<base>` / `<base>Ru` / `<base>Et` / `<base>Es`
 * @param locale — целевая локаль (en/ru/et/es или любая строка — fallback в en)
 * @param base   — базовое имя поля (например "title", "name", "description")
 */
export function pickLocaleText<T extends Record<string, unknown>>(
  obj: T | null | undefined,
  locale: string,
  base: string,
): string {
  if (!obj) return "";
  const lc = (locale ?? "").toLowerCase().slice(0, 2);

  // Маппинг locale → имя колонки. EN = база (без суффикса).
  const variantKey =
    lc === "ru" ? `${base}Ru` :
    lc === "et" ? `${base}Et` :
    lc === "es" ? `${base}Es` :
    null;

  if (variantKey) {
    const v = obj[variantKey];
    if (typeof v === "string" && v.trim()) return v;
  }
  // Fallback на базовое значение (EN/универсальное).
  const baseVal = obj[base];
  return typeof baseVal === "string" ? baseVal : "";
}

/**
 * Удобный shortcut для нескольких полей сразу — возвращает объект с
 * ключами `title` / `description` / etc. уже выбранными под locale.
 */
export function pickLocaleFields<T extends Record<string, unknown>, K extends string>(
  obj: T | null | undefined,
  locale: string,
  bases: readonly K[],
): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const base of bases) {
    out[base] = pickLocaleText(obj, locale, base);
  }
  return out;
}

/**
 * Вариант для blog_posts и других таблиц с EN-named base колонкой
 * (`titleEn` вместо `title`). Логика та же — для активной локали берём
 * `<base><LocaleSuffix>`, fallback на `<base>En`.
 */
export function pickLocaleTextEn<T extends Record<string, unknown>>(
  obj: T | null | undefined,
  locale: string,
  base: string,
): string {
  if (!obj) return "";
  const lc = (locale ?? "").toLowerCase().slice(0, 2);
  const suffix =
    lc === "ru" ? "Ru" :
    lc === "et" ? "Et" :
    lc === "es" ? "Es" :
    "En";
  const v = obj[`${base}${suffix}`];
  if (typeof v === "string" && v.trim()) return v;
  // Fallback на канон — английский.
  const en = obj[`${base}En`];
  return typeof en === "string" ? en : "";
}

/**
 * Тип для multilang-input стейта в формах. Используется в
 * `MultilangInput`-компоненте.
 */
export type MultilangValue = {
  en: string;
  ru: string;
  et: string;
  es: string;
};

/** Пустой initial стейт для нового поля. */
export function emptyMultilang(): MultilangValue {
  return { en: "", ru: "", et: "", es: "" };
}

/**
 * Достать MultilangValue из row БД с конвенцией `<base>` / `<base>Ru` / etc.
 * Для использования в edit-формах: открываешь существующий offering →
 * вытаскиваешь все 4 локали в один объект.
 */
export function multilangFromRow<T extends Record<string, unknown>>(
  obj: T | null | undefined,
  base: string,
): MultilangValue {
  if (!obj) return emptyMultilang();
  return {
    en: typeof obj[base] === "string" ? (obj[base] as string) : "",
    ru: typeof obj[`${base}Ru`] === "string" ? (obj[`${base}Ru`] as string) : "",
    et: typeof obj[`${base}Et`] === "string" ? (obj[`${base}Et`] as string) : "",
    es: typeof obj[`${base}Es`] === "string" ? (obj[`${base}Es`] as string) : "",
  };
}

/**
 * Сериализовать MultilangValue обратно в payload для API.
 * EN мапится на `<base>` (без суффикса). Пустые строки → null для
 * локалей-вариантов (база остаётся как есть).
 */
export function multilangToPayload(
  base: string,
  v: MultilangValue,
): Record<string, string | null> {
  return {
    [base]:        v.en.trim(),
    [`${base}Ru`]: v.ru.trim() || null,
    [`${base}Et`]: v.et.trim() || null,
    [`${base}Es`]: v.es.trim() || null,
  };
}
