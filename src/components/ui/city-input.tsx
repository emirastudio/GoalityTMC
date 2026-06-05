"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { getCitiesForCountry } from "@/lib/cities";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";
import { useTheme } from "@/components/ui/theme-provider";

interface CityInputProps {
  value: string;
  onChange: (val: string) => void;
  country: string; // country name or code
  label?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  variant?: "default" | "onboarding";
}

export function CityInput({
  value,
  onChange,
  country,
  label,
  required,
  placeholder = "City...",
  className,
  variant = "default",
}: CityInputProps) {
  // Portal renders at document.body (escapes overflow-hidden parents),
  // but that also escapes the ThemeProvider's data-theme wrapper. Stamp
  // the active theme on the portal root so --cat-* vars resolve and the
  // dropdown matches the page (dark fallback on a light page = invisible).
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOnboarding = variant === "onboarding";

  // Measure the input box and pin the portal dropdown right below it.
  const measure = useCallback(() => {
    const el = fieldRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  // Keep the dropdown glued to the input while open (scroll / resize).
  useEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, measure]);

  // Reset city and query when country changes
  useEffect(() => {
    setQuery("");
    onChange("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]);

  // Sync query with external value changes (e.g., initial load)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      const tgt = e.target as Node;
      const inField = ref.current?.contains(tgt);
      const inMenu = menuRef.current?.contains(tgt);
      if (!inField && !inMenu) setOpen(false);
    }
    document.addEventListener("pointerdown", handleOutside as EventListener);
    return () => document.removeEventListener("pointerdown", handleOutside as EventListener);
  }, []);

  const cities = getCitiesForCountry(country);
  const filtered = query.trim()
    ? cities.filter((c) => c.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : cities.slice(0, 8);

  const showDropdown = open && filtered.length > 0;

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    onChange(v);
    setOpen(true);
  }

  function handleSelect(city: string) {
    setQuery(city);
    onChange(city);
    setOpen(false);
  }

  const inputClass = isOnboarding
    ? "w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all"
    : cn(
        "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all",
        "focus:border-[var(--cat-accent)] focus:ring-2 focus:ring-[var(--cat-accent)]/15"
      );

  const inputStyle = isOnboarding
    ? {
        background: "var(--cat-input-bg)",
        border: `1px solid ${open ? "var(--cat-accent)" : "var(--cat-input-border)"}`,
        color: "var(--cat-text)",
      }
    : {
        background: "var(--cat-input-bg, var(--cat-tag-bg))",
        borderColor: "var(--cat-card-border)",
        color: "var(--cat-text)",
      };

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

      <div className="relative" ref={fieldRef}>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={inputClass}
          style={inputStyle}
          autoComplete="off"
        />
        <MapPin
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: "var(--cat-text-secondary)" }}
        />
      </div>

      {showDropdown && pos && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          data-theme={theme}
          className="rounded-xl shadow-lg overflow-hidden border"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 9999,
            background: "var(--cat-dropdown-bg, #1a2030)",
            borderColor: "var(--cat-card-border)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}
        >
          <div className="max-h-56 overflow-y-auto">
            {filtered.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => handleSelect(city)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors"
                style={{
                  color: value === city ? "var(--cat-accent)" : "var(--cat-text)",
                  background: value === city ? "var(--cat-accent)08" : "transparent",
                  fontWeight: value === city ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  if (value !== city)
                    (e.currentTarget as HTMLElement).style.background = "var(--cat-tag-bg)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    value === city ? "var(--cat-accent)08" : "transparent";
                }}
              >
                <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cat-text-secondary)" }} />
                <span className="flex-1">{city}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
