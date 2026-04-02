"use client";

export type Lang = "en" | "ru";

export function LangTabs({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-lg border border-border p-0.5 bg-surface w-fit">
      {(["en", "ru"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer uppercase tracking-wider ${
            lang === l
              ? "shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          }`}
          style={lang === l ? { background: "var(--cat-accent)", color: "var(--cat-text)" } : undefined}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
