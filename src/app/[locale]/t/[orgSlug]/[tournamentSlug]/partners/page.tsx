"use client";
import { useTournamentPublic } from "@/lib/tournament-public-context";
import { ExternalLink, Star, Award, Heart } from "lucide-react";

const MOCK_MAIN_PARTNER = {
  name: "SportsMaster Estonia",
  tagline: "Official Equipment Partner · Est. 2001",
  description: "Ведущий поставщик спортивного оборудования в Эстонии. Официальный партнёр Kings Cup с 2019 года.",
  color: "#1a1a2e",
  url: "#",
};

const MOCK_PARTNERS = [
  { name: "Nike Football", type: "Официальный мяч", icon: Award },
  { name: "Mediq Estonia", type: "Медицинский партнёр", icon: Heart },
  { name: "Tallinn Sport", type: "Инфраструктурный партнёр", icon: Star },
  { name: "Baltic Sports TV", type: "Медиа партнёр", icon: Star },
  { name: "SportFood OÜ", type: "Партнёр питания", icon: Heart },
];

export default function PartnersPage() {
  const { org } = useTournamentPublic();
  const brand = org.brandColor;

  return (
    <div className="space-y-4">
      {/* Main partner banner */}
      <div className="rounded-2xl overflow-hidden relative"
        style={{ background: `linear-gradient(135deg, ${MOCK_MAIN_PARTNER.color}, #0f0f23)`, border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(255,255,255,0.04) 0%, transparent 60%)" }} />
        <div className="relative z-10 p-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-4">Главный партнёр</p>
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <Star className="w-10 h-10 text-white/30" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{MOCK_MAIN_PARTNER.name}</h2>
              <p className="text-[12px] text-white/50 mt-0.5">{MOCK_MAIN_PARTNER.tagline}</p>
              <p className="text-[13px] text-white/70 mt-2 leading-relaxed max-w-sm">{MOCK_MAIN_PARTNER.description}</p>
              <a href={MOCK_MAIN_PARTNER.url} className="inline-flex items-center gap-1.5 mt-3 text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white">
                Перейти на сайт <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Other partners */}
      <div className="rounded-2xl p-5" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: "var(--cat-text-muted)" }}>
          Партнёры турнира
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MOCK_PARTNERS.map((p) => (
            <div key={p.name} className="flex items-center gap-3 p-4 rounded-xl"
              style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-tag-border)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: brand + "15" }}>
                <p.icon className="w-5 h-5" style={{ color: brand }} />
              </div>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "var(--cat-text)" }}>{p.name}</p>
                <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>{p.type}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Become a partner CTA */}
      <div className="rounded-2xl p-5 text-center" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
        <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--cat-text)" }}>Стать партнёром турнира</p>
        <p className="text-[12px] mb-3" style={{ color: "var(--cat-text-secondary)" }}>Свяжитесь с нами для обсуждения партнёрства</p>
        {org.contactEmail && (
          <a href={`mailto:${org.contactEmail}`}
            className="inline-flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-90"
            style={{ background: brand }}>
            {org.contactEmail}
          </a>
        )}
      </div>
    </div>
  );
}
