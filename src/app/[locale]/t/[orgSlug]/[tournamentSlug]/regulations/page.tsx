"use client";
import { useTournamentPublic } from "@/lib/tournament-public-context";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const SECTIONS = [
  { title: "1. Общие положения", content: "Турнир проводится в соответствии с правилами FIFA и UEFA. Все команды обязаны соблюдать регламент. Организатор оставляет за собой право вносить изменения в расписание по техническим причинам." },
  { title: "2. Возрастные категории", content: "Возраст игроков определяется на 1 января текущего года. Участие игроков в категории ниже своего возраста запрещено. Участие в более старшей категории возможно с письменного согласия родителей." },
  { title: "3. Система проведения", content: "Групповой этап: каждая команда играет с каждой по круговой системе. Плей-офф: четвертьфинал, полуфинал и финал проводятся по системе с выбыванием. При ничьей в плей-офф — серия пенальти." },
  { title: "4. Правила начисления очков", content: "Победа: 3 очка. Ничья: 1 очко. Поражение: 0 очков. При равенстве очков: разница мячей → забитые мячи → личная встреча." },
  { title: "5. Требования к документам", content: "Заявочный лист с подписями. Копии свидетельств о рождении всех игроков. Медицинские справки (оригиналы). Фотографии игроков (паспортный формат)." },
  { title: "6. Штрафные санкции", content: "Жёлтая карточка: предупреждение. Две жёлтые = красная: автоматический пропуск следующего матча. Прямая красная карточка: минимум 1 матч дисквалификации." },
];

export default function RegulationsPage() {
  const { org } = useTournamentPublic();
  const brand = org.brandColor;
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={{ background: "var(--cat-card-bg)", border: "1px solid var(--cat-card-border)" }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: brand + "15" }}>
            <BookOpen className="w-4.5 h-4.5" style={{ color: brand }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--cat-text-muted)" }}>Документ</p>
            <p className="text-[14px] font-bold" style={{ color: "var(--cat-text)" }}>Регламент турнира 2026</p>
          </div>
        </div>

        <div className="space-y-2">
          {SECTIONS.map((s, i) => (
            <div key={i} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--cat-tag-border)" }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left transition-colors hover:opacity-80"
                style={{ background: open === i ? brand + "10" : "var(--cat-tag-bg)" }}>
                <span className="text-[13px] font-semibold" style={{ color: open === i ? brand : "var(--cat-text)" }}>{s.title}</span>
                {open === i ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: brand }} /> : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--cat-text-muted)" }} />}
              </button>
              {open === i && (
                <div className="px-4 pb-4 pt-2" style={{ background: "var(--cat-card-bg)" }}>
                  <p className="text-[13px] leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>{s.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
