"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";

// Tournament logo with onError fallback to a Trophy icon.
// Use everywhere a tournament's logoUrl is rendered so a missing
// file (404) never shows the browser's broken-image placeholder.
export function TournamentLogo({
  src,
  alt,
  sizePx = 40,
  iconPx = 20,
  className = "",
}: {
  src: string | null | undefined;
  alt: string;
  sizePx?: number;
  iconPx?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = src && !failed;
  return (
    <div
      className={`rounded-xl shrink-0 flex items-center justify-center overflow-hidden ${className}`}
      style={{
        width: sizePx,
        height: sizePx,
        background: "var(--cat-tag-bg)",
        border: "1px solid var(--cat-card-border)",
      }}
    >
      {showImg ? (
        <img
          src={src!}
          alt={alt}
          className="w-full h-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <Trophy style={{ width: iconPx, height: iconPx, color: "var(--cat-accent)" }} />
      )}
    </div>
  );
}
