"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "goality-theme";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

function getStoredTheme(fallback: Theme): Theme {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch { /* SSR or access denied */ }
  return fallback;
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  // On mount: read persisted preference
  useEffect(() => {
    setTheme(getStoredTheme(defaultTheme));
    setMounted(true);
  }, [defaultTheme]);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      return next;
    });
  }, []);

  // Prevent flash: use defaultTheme until mounted
  const activeTheme = mounted ? theme : defaultTheme;

  return (
    <ThemeContext.Provider value={{ theme: activeTheme, toggle }}>
      <div data-theme={activeTheme} className="contents">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useContext(ThemeContext);
  return (
    <button
      onClick={toggle}
      className={className ?? "w-8 h-8 rounded-lg flex items-center justify-center border transition-all outline-none focus:outline-none hover:opacity-70"}
      style={{
        background: "var(--cat-tag-bg)",
        borderColor: "var(--cat-card-border)",
      }}
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
    >
      {theme === "dark" ? (
        <Sun className="w-3.5 h-3.5" style={{ color: "var(--cat-text-secondary)" }} />
      ) : (
        <Moon className="w-3.5 h-3.5" style={{ color: "var(--cat-text-secondary)" }} />
      )}
    </button>
  );
}
