"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { Sun, Moon } from "lucide-react";

export type Theme = "dark" | "light";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const toggle = useCallback(() => setTheme((p) => (p === "dark" ? "light" : "dark")), []);
  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <div data-theme={theme} className="contents">
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
        <Sun className="w-3.5 h-3.5" style={{ color: "var(--cat-text-muted)" }} />
      ) : (
        <Moon className="w-3.5 h-3.5" style={{ color: "var(--cat-text-secondary)" }} />
      )}
    </button>
  );
}
