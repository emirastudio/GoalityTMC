"use client";

import { useState } from "react";

/**
 * TeamBadge — единый компонент для отображения логотипа команды.
 *
 * Правила:
 *  - Если есть badgeUrl → показываем картинку (с fallback на букву при ошибке загрузки).
 *  - Если нет badgeUrl → буква-аватар (первая буква названия команды / клуба).
 *  - Если team = null/undefined → серый placeholder (TBD).
 *
 * Используется везде: schedule-page, planner-page, match-hub, public schedule.
 */

type TeamLike = {
  name?: string | null;
  club?: { name?: string | null; badgeUrl?: string | null } | null;
} | null | undefined;

type Props = {
  team: TeamLike;
  /** Размер в пикселях (ширина и высота). Default 20. */
  size?: number;
  /** Цвет фона буквы-аватара. Default "var(--cat-tag-bg)". */
  bg?: string;
  /** Цвет текста буквы-аватара. Default "var(--cat-text-muted)". */
  color?: string;
  className?: string;
};

export function TeamBadge({ team, size = 20, bg, color, className = "" }: Props) {
  const [imgError, setImgError] = useState(false);

  const bgColor = bg ?? "var(--cat-tag-bg)";
  const fgColor = color ?? "var(--cat-text-muted)";
  const radius = size <= 20 ? "5px" : size <= 32 ? "7px" : "10px";

  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    borderRadius: radius,
    flexShrink: 0,
  };

  // No team → grey TBD placeholder
  if (!team) {
    return (
      <div
        className={`${className}`}
        style={{ ...baseStyle, background: bgColor, opacity: 0.4 }}
        aria-label="TBD"
      />
    );
  }

  const url = team.club?.badgeUrl;
  const letter = (team.club?.name ?? team.name ?? "?").charAt(0).toUpperCase();

  // Has URL and hasn't failed loading → image
  if (url && !imgError) {
    return (
      <img
        src={url}
        alt={team.name ?? team.club?.name ?? ""}
        width={size}
        height={size}
        className={`object-contain ${className}`}
        style={{ ...baseStyle, background: bgColor }}
        onError={() => setImgError(true)}
      />
    );
  }

  // Fallback → letter avatar
  return (
    <div
      className={`flex items-center justify-center font-black ${className}`}
      style={{
        ...baseStyle,
        background: bgColor,
        color: fgColor,
        fontSize: Math.max(8, Math.round(size * 0.45)),
        lineHeight: 1,
      }}
      aria-label={team.name ?? team.club?.name ?? ""}
    >
      {letter}
    </div>
  );
}
