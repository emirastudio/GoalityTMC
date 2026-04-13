"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";
import { cn } from "@/lib/utils";

interface CountrySelectProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  /** Дополнительные классы для обёртки */
  className?: string;
  /** Вариант стилизации: "default" (th-* классы) | "onboarding" (CSS-var стили) */
  variant?: "default" | "onboarding";
}

export function CountrySelect({
  value,
  onChange,
  label,
  required,
  placeholder = "Select country...",
  className,
  variant = "default",
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = COUNTRIES.find((c) => c.name === value);
  const filtered = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("pointerdown", handleOutside as EventListener);
    return () => document.removeEventListener("pointerdown", handleOutside as EventListener);
  }, []);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const isOnboarding = variant === "onboarding";

  const triggerClass = isOnboarding
    ? "w-full flex items-center gap-2 px-4 py-3 rounded-xl text-[14px] outline-none transition-all text-left"
    : cn(
        "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border th-card text-sm transition-colors",
        open
          ? "border-[var(--cat-accent)] ring-2 ring-[var(--cat-accent)]/15"
          : "th-border hover:border-[var(--cat-accent)]/40",
        !value && "th-text-2"
      );

  const triggerStyle = isOnboarding
    ? {
        background: "var(--cat-input-bg)",
        border: `1px solid ${open ? "var(--cat-accent)" : "var(--cat-input-border)"}`,
        color: value ? "var(--cat-text)" : "var(--cat-text-faint)",
      }
    : undefined;

  return (
    <div ref={ref} className={cn("relative", className)}>
      {label && (
        isOnboarding ? (
          <label
            className="block text-[12px] font-semibold mb-1.5"
            style={{ color: "var(--cat-text-secondary)" }}
          >
            {label}{required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
        ) : (
          <label className="block text-sm font-medium th-text mb-1.5">
            {label}{required && <span className="text-error ml-0.5">*</span>}
          </label>
        )
      )}

      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setSearch(""); }}
        className={triggerClass}
        style={triggerStyle}
      >
        {selected ? (
          <>
            <span className="text-xl leading-none">{selected.flag}</span>
            <span className="flex-1 text-left" style={isOnboarding ? { color: "var(--cat-text)" } : undefined}>
              {selected.name}
            </span>
          </>
        ) : (
          <span
            className={isOnboarding ? "" : "flex-1 text-left"}
            style={isOnboarding ? { color: "var(--cat-text-faint)" } : undefined}
          >
            {placeholder}
          </span>
        )}
        <ChevronDown
          className={cn("w-4 h-4 shrink-0 transition-transform", open && "rotate-180")}
          style={{ color: "var(--cat-text-secondary)" }}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl shadow-lg overflow-hidden border"
          style={{
            background: "var(--cat-dropdown-bg, #1a2030)",
            borderColor: "var(--cat-card-border)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}
        >
          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 py-2 border-b"
            style={{ borderColor: "var(--cat-card-border)" }}
          >
            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-text-secondary)" }} />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: "var(--cat-text)" }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="shrink-0"
                style={{ color: "var(--cat-text-secondary)" }}
              >
                ×
              </button>
            )}
          </div>

          {/* Options */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p
                className="text-sm text-center py-3"
                style={{ color: "var(--cat-text-secondary)" }}
              >
                No results
              </p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { onChange(c.name); setOpen(false); setSearch(""); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors"
                  style={{
                    color: value === c.name ? "var(--cat-accent)" : "var(--cat-text)",
                    background: value === c.name ? "var(--cat-accent)08" : "transparent",
                    fontWeight: value === c.name ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (value !== c.name)
                      (e.currentTarget as HTMLElement).style.background = "var(--cat-tag-bg)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      value === c.name ? "var(--cat-accent)08" : "transparent";
                  }}
                >
                  <span className="text-xl leading-none">{c.flag}</span>
                  <span className="flex-1">{c.name}</span>
                  {value === c.name && (
                    <Check className="w-3.5 h-3.5 ml-auto shrink-0" style={{ color: "var(--cat-accent)" }} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
