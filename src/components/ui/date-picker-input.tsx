"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Mo","Tu","We","Th","Fr","Sa","Su"];
const ACCENT = "#2BFEBA";

function parseYMD(val: string): Date | null {
  if (!val) return null;
  const [y, m, d] = val.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDisplay(val: string): string {
  const d = parseYMD(val);
  if (!d) return "";
  return `${String(d.getDate()).padStart(2, "0")} / ${String(d.getMonth() + 1).padStart(2, "0")} / ${d.getFullYear()}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function startWeekday(year: number, month: number): number {
  // 0=Mon … 6=Sun
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = "DD / MM / YYYY",
  inputCls,
  inputStyle,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputCls?: string;
  inputStyle?: React.CSSProperties;
}) {
  const today = new Date();
  const selected = parseYMD(value);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear]   = useState(selected?.getFullYear()  ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth()     ?? today.getMonth());

  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const prevMonth = useCallback(() => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }, [viewMonth]);

  function selectDay(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    onChange(toYMD(d));
    setOpen(false);
  }

  const totalDays = daysInMonth(viewYear, viewMonth);
  const startOffset = startWeekday(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  const todayYMD = toYMD(today);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => {
          if (selected) { setViewYear(selected.getFullYear()); setViewMonth(selected.getMonth()); }
          setOpen(o => !o);
        }}
        className={inputCls}
        style={{
          ...inputStyle,
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          gap: 8,
        }}
      >
        <span style={{ color: value ? "inherit" : "var(--cat-text-muted)", fontSize: 14 }}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <CalendarDays className="w-4 h-4 shrink-0" style={{ color: value ? "var(--cat-accent)" : "var(--cat-text-muted)" }} />
      </button>

      {/* Popover */}
      {open && (
        <div
          className="absolute z-50 mt-2 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            background: "var(--cat-card-bg, #1C2121)",
            border: "1px solid var(--cat-card-border)",
            minWidth: 280,
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          }}
        >
          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--cat-divider)" }}>
            <button type="button" onClick={prevMonth}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
              style={{ background: "var(--cat-tag-bg)" }}>
              <ChevronLeft className="w-4 h-4" style={{ color: "var(--cat-text-secondary)" }} />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm font-black" style={{ color: "var(--cat-text, #fff)" }}>
                {MONTHS[viewMonth]}
              </span>
              <span className="text-sm font-black" style={{ color: "var(--cat-accent)" }}>
                {viewYear}
              </span>
            </div>

            <button type="button" onClick={nextMonth}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
              style={{ background: "var(--cat-tag-bg)" }}>
              <ChevronRight className="w-4 h-4" style={{ color: "var(--cat-text-secondary)" }} />
            </button>
          </div>

          {/* Day grid */}
          <div className="p-3">
            {/* Headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-bold py-1"
                  style={{ color: "var(--cat-text-muted)", letterSpacing: "0.05em" }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Cells */}
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const ymd = toYMD(new Date(viewYear, viewMonth, day));
                const isSelected = ymd === value;
                const isToday = ymd === todayYMD;
                const isSat = (i % 7) === 5;
                const isSun = (i % 7) === 6;

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectDay(day)}
                    className="aspect-square rounded-xl flex items-center justify-center text-sm font-semibold transition-all hover:scale-105"
                    style={{
                      background: isSelected
                        ? "var(--cat-accent)"
                        : isToday
                        ? "var(--cat-pill-active-bg, rgba(43,254,186,0.12))"
                        : "transparent",
                      color: isSelected
                        ? "var(--cat-accent-text)"
                        : isToday
                        ? "var(--cat-accent)"
                        : isSat || isSun
                        ? "var(--cat-text-muted)"
                        : "var(--cat-text)",
                      outline: isToday && !isSelected ? `1.5px solid ${ACCENT}40` : "none",
                      fontWeight: isSelected || isToday ? 800 : 600,
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Today shortcut */}
          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={() => {
                onChange(todayYMD);
                setOpen(false);
              }}
              className="w-full py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
              style={{ background: "var(--cat-pill-active-bg, rgba(43,254,186,0.08))", color: "var(--cat-accent)", border: `1px solid var(--cat-accent-glow, rgba(43,254,186,0.2))` }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
