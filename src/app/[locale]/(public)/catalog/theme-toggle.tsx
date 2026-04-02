"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "dark" | "light";
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const toggle = useCallback(() => setTheme((p) => (p === "dark" ? "light" : "dark")), []);
  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <div data-theme={theme} className="contents">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useContext(ThemeContext);
  return (
    <button
      onClick={toggle}
      className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
      style={{
        background: "var(--cat-card-bg)",
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
