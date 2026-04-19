/**
 * Встроенные шаблоны услуг (seed defaults).
 *
 * Первый раз, когда организация открывает страницу /offerings в админке,
 * API-ручка проверяет — есть ли в organization_offering_templates хотя бы
 * одна запись с `is_builtin=true` и нужным slug. Если нет — инсертит.
 *
 * Организатор потом может редактировать или удалять эти шаблоны;
 * «Восстановить стандартные» снова вставит (по тем же slug'ам) в исходном виде.
 */

export type BuiltinTemplatePreset = {
  slug: string;
  title: string;
  titleRu: string;
  titleEt: string;
  description: string | null;
  descriptionRu: string | null;
  descriptionEt: string | null;
  icon: string;
  kind: "single" | "package";
  inclusion: "required" | "default" | "optional";
  priceModel:
    | "flat" | "per_team" | "per_person" | "per_player" | "per_staff"
    | "per_accompanying" | "per_night" | "per_meal" | "per_unit";
  defaultPriceCents: number;
  nightsCount: number | null;
  sortOrder: number;
};

export const BUILTIN_TEMPLATE_PRESETS: readonly BuiltinTemplatePreset[] = [
  {
    slug: "hotel-by-nights",
    title: "Hotel (per night, per person)",
    titleRu: "Отель на N ночей (за человека)",
    titleEt: "Hotell (N ööd, inimese kohta)",
    description: "Accommodation charged per person × nights",
    descriptionRu: "Проживание: цена × количество человек × количество ночей",
    descriptionEt: "Majutus: hind × inimeste arv × ööde arv",
    icon: "hotel",
    kind: "single",
    inclusion: "optional",
    priceModel: "per_night",
    defaultPriceCents: 0,
    nightsCount: null, // задаёт организатор после создания
    sortOrder: 10,
  },
  {
    slug: "hotel-by-dates",
    title: "Hotel (check-in → check-out)",
    titleRu: "Отель с даты по дату (за человека)",
    titleEt: "Hotell (kuupäev → kuupäev)",
    description: "Accommodation priced by date range",
    descriptionRu: "Проживание: цена за ночь × человек, даты вводятся в настройках услуги",
    descriptionEt: "Majutus kuupäevade vahemikuga",
    icon: "hotel",
    kind: "single",
    inclusion: "optional",
    priceModel: "per_night",
    defaultPriceCents: 0,
    nightsCount: null,
    sortOrder: 20,
  },
  {
    slug: "meals-by-count",
    title: "Meals (N per person)",
    titleRu: "Питание N раз (на человека)",
    titleEt: "Toitlustus (N korda inimese kohta)",
    description: "Meal count × persons",
    descriptionRu: "Цена за один приём × количество приёмов × человек",
    descriptionEt: "Hind korra kohta × söögikordade arv × inimesed",
    icon: "meal",
    kind: "single",
    inclusion: "optional",
    priceModel: "per_meal",
    defaultPriceCents: 0,
    nightsCount: null,
    sortOrder: 30,
  },
  {
    slug: "meals-all-inclusive",
    title: "Meals — all-inclusive (per person)",
    titleRu: "Питание всё включено (на человека)",
    titleEt: "Toitlustus — kõik sees (inimese kohta)",
    description: "Flat per-person price, all meals during tournament",
    descriptionRu: "Фиксированная цена за человека, все приёмы пищи на турнире",
    descriptionEt: "Fikseeritud hind inimese kohta, kõik söögid",
    icon: "meal",
    kind: "single",
    inclusion: "optional",
    priceModel: "per_person",
    defaultPriceCents: 0,
    nightsCount: null,
    sortOrder: 40,
  },
  {
    slug: "extra-meal",
    title: "Extra meal (per person)",
    titleRu: "Дополнительное питание (за 1 раз, на человека)",
    titleEt: "Lisatoitlustus (korra kohta, inimese kohta)",
    description: "One-off add-on meal, priced per person",
    descriptionRu: "Разовый приём пищи, оплачивается по каждому человеку",
    descriptionEt: "Ühekordne lisatoitlustus, inimese kohta",
    icon: "coffee",
    kind: "single",
    inclusion: "optional",
    priceModel: "per_meal",
    defaultPriceCents: 0,
    nightsCount: null,
    sortOrder: 50,
  },
  {
    slug: "tournament-card",
    title: "Tournament card (per person)",
    titleRu: "Турнирная карточка (на человека)",
    titleEt: "Turniirikaart (inimese kohta)",
    description: "Required participant entry fee",
    descriptionRu: "Обязательный взнос за участника (карточка турнира)",
    descriptionEt: "Kohustuslik osavõtukaart",
    icon: "ticket",
    kind: "single",
    inclusion: "required",
    priceModel: "per_person",
    defaultPriceCents: 0,
    nightsCount: null,
    sortOrder: 60,
  },
  {
    slug: "transfer-full",
    title: "Transfer — full service (per team)",
    titleRu: "Трансфер: полное обслуживание (на команду)",
    titleEt: "Transfeer — täisteenindus (meeskonna kohta)",
    description: "Full transportation service for the team",
    descriptionRu: "Полное транспортное обслуживание команды на турнире",
    descriptionEt: "Täielik transporditeenus meeskonnale",
    icon: "bus",
    kind: "single",
    inclusion: "optional",
    priceModel: "per_team",
    defaultPriceCents: 0,
    nightsCount: null,
    sortOrder: 70,
  },
  {
    slug: "transfer-airport",
    title: "Transfer — arrival/hotel/departure (per team)",
    titleRu: "Трансфер: Приезд — Отель — Отъезд (на команду)",
    titleEt: "Transfeer: saabumine — hotell — lahkumine (meeskonna kohta)",
    description: "Airport/station ↔ hotel only",
    descriptionRu: "Только Приезд → Отель и Отель → Отъезд",
    descriptionEt: "Ainult saabumine → hotell ja hotell → lahkumine",
    icon: "car",
    kind: "single",
    inclusion: "optional",
    priceModel: "per_team",
    defaultPriceCents: 0,
    nightsCount: null,
    sortOrder: 80,
  },
];
