"use client";
import { useTournamentPublic } from "@/lib/tournament-public-context";
import { useState } from "react";
import { MapPin, Hotel, Bus, Phone, ExternalLink } from "lucide-react";

const MOCK_FIELDS = [
  { name: "Стадион Калев", address: "Filtri tee 2, Tallinn", surface: "Натуральный газон", capacity: "5 000", mapUrl: "#" },
  { name: "Поле Ласнамяэ", address: "Valukoja 12, Tallinn", surface: "Искусственное покрытие", capacity: "500", mapUrl: "#" },
  { name: "Поле Пирита", address: "Merivälja tee 15, Tallinn", surface: "Натуральный газон", capacity: "1 200", mapUrl: "#" },
];

const MOCK_HOTELS = [
  { name: "Hilton Tallinn Park", stars: 5, address: "A. Lauteri 3", price: "от 120 €/ночь", phone: "+372 630 0000" },
  { name: "Nordic Hotel Forum", stars: 4, address: "Viru väljak 3", price: "от 85 €/ночь", phone: "+372 622 9900" },
  { name: "Sokos Hotel Viru", stars: 4, address: "Viru väljak 4", price: "от 95 €/ночь", phone: "+372 680 9300" },
];

const MOCK_TRANSFERS = [
  { from: "Таллинский аэропорт", info: "Автобус № 2, 3, 4 · до центра 20 мин · Такси ~15 €" },
  { from: "Таллинский вокзал", info: "Трамвай № 1, 2 · до стадиона 15 мин" },
  { from: "Паромный терминал", info: "Трамвай № 2 · до центра 10 мин" },
];

const TABS = [
  { key: "fields", label: "Игровые поля" },
  { key: "hotels", label: "Размещение" },
  { key: "transfer", label: "Трансфер" },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function ParticipantsPage() {
  const { org } = useTournamentPublic();
  const brand = org.brandColor;
  const [tab, setTab] = useState<TabKey>("fields");

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
      {/* Tabs */}
      <div className="flex" style={{ borderBottom: "1px solid var(--cat-divider)" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 py-3 text-[13px] font-semibold transition-all border-b-2"
            style={{
              color: tab === t.key ? brand : "var(--cat-text-secondary)",
              borderColor: tab === t.key ? brand : "transparent",
              background: "transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-3">
        {/* Fields */}
        {tab === "fields" && MOCK_FIELDS.map((f, i) => (
          <div key={i} className="flex items-start gap-3 p-4 rounded-xl"
            style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-tag-border)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[13px] font-black"
              style={{ background: brand + "15", color: brand }}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold" style={{ color: "var(--cat-text)" }}>{f.name}</p>
              <p className="flex items-center gap-1 text-[11px] mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                <MapPin className="w-3 h-3" />{f.address}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[11px]" style={{ color: "var(--cat-text-secondary)" }}>{f.surface}</span>
                <span className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>· {f.capacity} мест</span>
              </div>
            </div>
            <a href={f.mapUrl} className="text-[11px] font-medium flex items-center gap-1 shrink-0"
              style={{ color: brand }}>
              <ExternalLink className="w-3 h-3" /> Карта
            </a>
          </div>
        ))}

        {/* Hotels */}
        {tab === "hotels" && MOCK_HOTELS.map((h, i) => (
          <div key={i} className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-tag-border)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: brand + "15" }}>
              <Hotel className="w-4 h-4" style={{ color: brand }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-semibold" style={{ color: "var(--cat-text)" }}>{h.name}</p>
                <span className="text-yellow-500 text-[10px]">{"★".repeat(h.stars)}</span>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--cat-text-muted)" }}>{h.address}</p>
              <p className="text-[12px] font-semibold mt-0.5" style={{ color: brand }}>{h.price}</p>
            </div>
            <a href={`tel:${h.phone}`} className="p-2 rounded-lg transition-colors hover:opacity-80"
              style={{ color: "var(--cat-text-secondary)" }}>
              <Phone className="w-4 h-4" />
            </a>
          </div>
        ))}

        {/* Transfer */}
        {tab === "transfer" && MOCK_TRANSFERS.map((tr, i) => (
          <div key={i} className="flex items-start gap-3 p-4 rounded-xl"
            style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-tag-border)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: brand + "15" }}>
              <Bus className="w-4 h-4" style={{ color: brand }} />
            </div>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "var(--cat-text)" }}>{tr.from}</p>
              <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>{tr.info}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
