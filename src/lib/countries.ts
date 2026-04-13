// Единый список стран для всей системы
// Используется в: регистрация организации, клуба, публичная форма участника
// Формат: { code: ISO 3166-1 alpha-2, name: English, flag: emoji }

export interface Country {
  code: string;
  name: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  // ─── Baltic & Nordic ───────────────────────────────────────────────────────
  { code: "EE", name: "Estonia",              flag: "🇪🇪" },
  { code: "LV", name: "Latvia",               flag: "🇱🇻" },
  { code: "LT", name: "Lithuania",            flag: "🇱🇹" },
  { code: "FI", name: "Finland",              flag: "🇫🇮" },
  { code: "SE", name: "Sweden",               flag: "🇸🇪" },
  { code: "NO", name: "Norway",               flag: "🇳🇴" },
  { code: "DK", name: "Denmark",              flag: "🇩🇰" },
  { code: "IS", name: "Iceland",              flag: "🇮🇸" },
  // ─── Eastern Europe ────────────────────────────────────────────────────────
  { code: "RU", name: "Russia",               flag: "🇷🇺" },
  { code: "UA", name: "Ukraine",              flag: "🇺🇦" },
  { code: "BY", name: "Belarus",              flag: "🇧🇾" },
  { code: "PL", name: "Poland",               flag: "🇵🇱" },
  { code: "CZ", name: "Czech Republic",       flag: "🇨🇿" },
  { code: "SK", name: "Slovakia",             flag: "🇸🇰" },
  { code: "HU", name: "Hungary",              flag: "🇭🇺" },
  { code: "RO", name: "Romania",              flag: "🇷🇴" },
  { code: "BG", name: "Bulgaria",             flag: "🇧🇬" },
  { code: "MD", name: "Moldova",              flag: "🇲🇩" },
  // ─── Western Europe ────────────────────────────────────────────────────────
  { code: "DE", name: "Germany",              flag: "🇩🇪" },
  { code: "AT", name: "Austria",              flag: "🇦🇹" },
  { code: "CH", name: "Switzerland",          flag: "🇨🇭" },
  { code: "NL", name: "Netherlands",          flag: "🇳🇱" },
  { code: "BE", name: "Belgium",              flag: "🇧🇪" },
  { code: "LU", name: "Luxembourg",           flag: "🇱🇺" },
  { code: "FR", name: "France",               flag: "🇫🇷" },
  { code: "MC", name: "Monaco",               flag: "🇲🇨" },
  // ─── British Isles ─────────────────────────────────────────────────────────
  { code: "GB-ENG", name: "England",          flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { code: "GB-SCT", name: "Scotland",         flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { code: "GB-WLS", name: "Wales",            flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
  { code: "GB-NIR", name: "Northern Ireland", flag: "🇬🇧" },
  { code: "IE", name: "Ireland",              flag: "🇮🇪" },
  // ─── Southern Europe ───────────────────────────────────────────────────────
  { code: "ES", name: "Spain",                flag: "🇪🇸" },
  { code: "PT", name: "Portugal",             flag: "🇵🇹" },
  { code: "IT", name: "Italy",                flag: "🇮🇹" },
  { code: "GR", name: "Greece",               flag: "🇬🇷" },
  { code: "HR", name: "Croatia",              flag: "🇭🇷" },
  { code: "SI", name: "Slovenia",             flag: "🇸🇮" },
  { code: "RS", name: "Serbia",               flag: "🇷🇸" },
  { code: "BA", name: "Bosnia and Herzegovina", flag: "🇧🇦" },
  { code: "ME", name: "Montenegro",           flag: "🇲🇪" },
  { code: "MK", name: "North Macedonia",      flag: "🇲🇰" },
  { code: "AL", name: "Albania",              flag: "🇦🇱" },
  { code: "XK", name: "Kosovo",               flag: "🇽🇰" },
  { code: "CY", name: "Cyprus",               flag: "🇨🇾" },
  { code: "MT", name: "Malta",                flag: "🇲🇹" },
  // ─── Caucasus & Central Asia ───────────────────────────────────────────────
  { code: "GE", name: "Georgia",              flag: "🇬🇪" },
  { code: "AM", name: "Armenia",              flag: "🇦🇲" },
  { code: "AZ", name: "Azerbaijan",           flag: "🇦🇿" },
  { code: "KZ", name: "Kazakhstan",           flag: "🇰🇿" },
  { code: "UZ", name: "Uzbekistan",           flag: "🇺🇿" },
  { code: "TM", name: "Turkmenistan",         flag: "🇹🇲" },
  { code: "KG", name: "Kyrgyzstan",           flag: "🇰🇬" },
  { code: "TJ", name: "Tajikistan",           flag: "🇹🇯" },
  // ─── Middle East ───────────────────────────────────────────────────────────
  { code: "TR", name: "Turkey",               flag: "🇹🇷" },
  { code: "IL", name: "Israel",               flag: "🇮🇱" },
  { code: "SA", name: "Saudi Arabia",         flag: "🇸🇦" },
  { code: "AE", name: "UAE",                  flag: "🇦🇪" },
  { code: "QA", name: "Qatar",                flag: "🇶🇦" },
  { code: "IR", name: "Iran",                 flag: "🇮🇷" },
  { code: "IQ", name: "Iraq",                 flag: "🇮🇶" },
  { code: "JO", name: "Jordan",               flag: "🇯🇴" },
  { code: "LB", name: "Lebanon",              flag: "🇱🇧" },
  // ─── Americas ──────────────────────────────────────────────────────────────
  { code: "US", name: "United States",        flag: "🇺🇸" },
  { code: "CA", name: "Canada",               flag: "🇨🇦" },
  { code: "MX", name: "Mexico",               flag: "🇲🇽" },
  { code: "BR", name: "Brazil",               flag: "🇧🇷" },
  { code: "AR", name: "Argentina",            flag: "🇦🇷" },
  { code: "CO", name: "Colombia",             flag: "🇨🇴" },
  { code: "CL", name: "Chile",                flag: "🇨🇱" },
  { code: "PE", name: "Peru",                 flag: "🇵🇪" },
  { code: "UY", name: "Uruguay",              flag: "🇺🇾" },
  { code: "VE", name: "Venezuela",            flag: "🇻🇪" },
  { code: "EC", name: "Ecuador",              flag: "🇪🇨" },
  { code: "BO", name: "Bolivia",              flag: "🇧🇴" },
  // ─── Africa ────────────────────────────────────────────────────────────────
  { code: "NG", name: "Nigeria",              flag: "🇳🇬" },
  { code: "GH", name: "Ghana",                flag: "🇬🇭" },
  { code: "SN", name: "Senegal",              flag: "🇸🇳" },
  { code: "CI", name: "Ivory Coast",          flag: "🇨🇮" },
  { code: "CM", name: "Cameroon",             flag: "🇨🇲" },
  { code: "MA", name: "Morocco",              flag: "🇲🇦" },
  { code: "EG", name: "Egypt",                flag: "🇪🇬" },
  { code: "ZA", name: "South Africa",         flag: "🇿🇦" },
  { code: "TN", name: "Tunisia",              flag: "🇹🇳" },
  { code: "DZ", name: "Algeria",              flag: "🇩🇿" },
  // ─── Asia & Pacific ────────────────────────────────────────────────────────
  { code: "CN", name: "China",                flag: "🇨🇳" },
  { code: "JP", name: "Japan",                flag: "🇯🇵" },
  { code: "KR", name: "South Korea",          flag: "🇰🇷" },
  { code: "IN", name: "India",                flag: "🇮🇳" },
  { code: "AU", name: "Australia",            flag: "🇦🇺" },
  { code: "NZ", name: "New Zealand",          flag: "🇳🇿" },
  // ─── Other ─────────────────────────────────────────────────────────────────
  { code: "OTHER", name: "Other",             flag: "🌍" },
];

// Удобный доступ по коду
export const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

// Удобный доступ по имени
export const COUNTRY_BY_NAME = new Map(COUNTRIES.map((c) => [c.name, c]));

// Хелпер: получить флаг по имени страны
export function getCountryFlag(name: string | null | undefined): string {
  if (!name) return "";
  return COUNTRY_BY_NAME.get(name)?.flag ?? "";
}
