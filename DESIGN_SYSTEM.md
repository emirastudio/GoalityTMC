# Goality TMC — Design System & Integration Guide

> Этот файл описывает единую дизайн-систему проекта. Используй его как полное руководство при работе с любой страницей: публичная часть, админка организатора, супер-админка, командный портал.

## Эталонная страница

Страница каталога (`src/app/[locale]/(public)/catalog/`) — это reference implementation. Там реализованы все паттерны: dual-theme (dark/light), анимации, карточки, токены. CSS файл: `src/app/[locale]/(public)/catalog/catalog.css`, компонент переключения темы: `src/app/[locale]/(public)/catalog/theme-toggle.tsx`.

---

## 1. Цветовая палитра

### Brand colors
```
Mint (Primary Accent):  #2BFEBA (light: #B3FDE0, dark: #00D98F)
Navy (Dark Base):       #272D2D (light: #363E3E, dark: #1C2121)
Deep Dark:              #0A0E14 (used for dark theme backgrounds)
```

### Semantic colors
```
Success:   #059669  (bg: #D1FAE5, border: #A7F3D0)
Warning:   #D97706  (bg: #FEF3C7, border: #FCD34D)
Error:     #DC2626  (bg: #FEE2E2, border: #FECACA)
Info:      #3B82F6  (bg: #DBEAFE, border: #93C5FD)
```

### Text hierarchy (light theme)
```
Primary:    #111827   (заголовки, основной текст)
Secondary:  #6B7280   (подписи, метаданные)
Muted:      #9CA3AF   (третичный, иконки)
Faint:      #D1D5DB   (disabled, placeholder)
```

### Text hierarchy (dark theme)
```
Primary:    #ffffff
Secondary:  rgba(255,255,255,0.4)
Muted:      rgba(255,255,255,0.3)
Faint:      rgba(255,255,255,0.2)
```

### Surfaces (light theme)
```
Background:   #F7F8FA
Card:         #ffffff (border: rgba(0,0,0,0.06))
Input:        #ffffff (border: #E5E7EB)
Divider:      #F3F4F6
```

### Surfaces (dark theme)
```
Background:   #0A0E14
Sidebar:      #1C2121 (header: #161A1A)
Card:         rgba(255,255,255,0.04) (border: rgba(255,255,255,0.08))
Input:        rgba(255,255,255,0.06) (border: rgba(255,255,255,0.1))
Divider:      rgba(255,255,255,0.06)
```

---

## 2. Типографика

Шрифт: **Geist Sans** (via `next/font`), fallback: `system-ui, sans-serif`

### Размеры (используем фиксированные, НЕ Tailwind text-sm/md/lg)
```
Badges/Tags:     text-[10px]  font-semibold  uppercase tracking-wider
Meta labels:     text-[11px]  font-medium
Body small:      text-[12px]  font-medium
Body default:    text-[13px]  font-medium
Card titles:     text-[14px]  font-bold
Section titles:  text-base    font-bold       (16px)
Page titles:     text-xl      font-bold       (20px)
Hero titles:     text-4xl md:text-5xl font-extrabold tracking-tight
```

### Паттерны текста
- Org names: `text-[10px] font-semibold uppercase tracking-wider` + muted color
- Truncation: `truncate` для однострочных, `line-clamp-2` для карточек
- Tabular numbers: `font-variant-numeric: tabular-nums` для счётчиков/дат

---

## 3. Spacing & Layout

### Grid system
```
Max content width:   max-w-[1400px] mx-auto px-6
Admin main content:  flex-1 p-6 md:p-8
Sidebar width:       w-60 (admin) | w-64 (team)
```

### Card grid (адаптивный)
```
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5
```

### Gaps
```
Tight:    gap-1.5 (tags, small groups)
Normal:   gap-2 to gap-3 (pills, nav items)
Cards:    gap-5 (card grids)
Sections: gap-8 to gap-10 (between sections)
```

### Padding
```
Tags/Badges:  px-2 py-0.5  |  px-2.5 py-1
Pills:        px-4 py-1.5
Buttons:      px-4 py-2 (md) | px-6 py-3 (lg)
Cards:        p-4 (compact) | p-6 (default)
Sections:     p-8 md:p-10
```

---

## 4. Components

### Cards
```
Rounded:    rounded-2xl
Background: var(--cat-card-bg) or white
Border:     1px solid var(--cat-card-border)
Shadow:     var(--cat-card-shadow)
Hover:      translateY(-4px), усиленная тень, border accent
Animation:  fade-in-up 0.5s ease-out (staggered)
```

CSS class: `.cat-card` — автоматически даёт hover lift + fade-in + staggered delay.

### Buttons
```
Primary CTA:
  background: linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))
  color: var(--cat-accent-text)
  rounded-lg или rounded-xl
  shadow: 0 4px 14px var(--cat-accent-glow)
  class: .cat-cta-glow (пульсирующее свечение)

Secondary:
  background: var(--cat-card-bg)
  border: 1px solid var(--cat-card-border)
  color: var(--cat-text)

Ghost:
  background: transparent
  color: var(--cat-text-secondary)
  hover: opacity-80
```

### Badges
```
Status Open:
  bg: var(--cat-badge-open-bg), border: var(--cat-badge-open-border)
  text: var(--cat-badge-open-text), dot: animate-pulse

Status Closed:
  bg: var(--cat-badge-closed-bg), border: var(--cat-badge-closed-border)

Popular/Hot:
  class: .cat-hot-badge
  gradient: linear-gradient(135deg, #FF6B35, #FF4444)

Countdown:
  class: .cat-countdown
  bg-black/30, text-white/80, border-white/20
```

### Tags (возрастные классы)
Каждый тег получает класс по возрасту для цветовой кодировки:
```
.cat-age-u8, .cat-age-u9    → зелёный  (#10B981)
.cat-age-u10, .cat-age-u11  → синий    (#3B82F6)
.cat-age-u12, .cat-age-u13  → фиол.   (#8B5CF6)
.cat-age-u14, .cat-age-u15  → оранж.  (#F59E0B)
.cat-age-u16, .cat-age-u17  → красный (#EF4444)
.cat-age-u18, .cat-age-u19  → gold    (#D97706, gradient)
```
Base class: `.cat-age-tag` (добавляет hover scale 1.05)

### Pills (фильтры)
```
Active:   bg: var(--cat-pill-active-bg), border: var(--cat-pill-active-border), text: var(--cat-pill-active-text)
Inactive: bg: var(--cat-pill-bg), border: var(--cat-pill-border), text: var(--cat-pill-text)
Shape:    rounded-full, text-[12px] font-medium, px-4 py-1.5
Icon:     lucide icon w-3 h-3 перед текстом
```

### Input / Search
```
rounded-2xl, pl-12 pr-4 py-3.5
bg: var(--cat-input-bg), border: var(--cat-input-border)
Focus: class .cat-search — зелёное ring + accent border
```

### Sidebar (admin/team — dark)
```
Background:  #1C2121 (admin) | #0D1117 (team)
Nav items:   rounded-xl px-3 py-2.5 text-[13px] font-medium
Inactive:    text-white/55, hover: bg-white/6 text-white
Active:      bg-mint/12 text-mint (#2BFEBA)
Labels:      text-[10px] font-semibold uppercase tracking-widest text-white/30
Divider:     border-white/8
```

---

## 5. Shadows

### Light theme
```
None:           none
Subtle:         0 1px 3px rgba(0,0,0,0.04)
Card default:   0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)
Card hover:     0 12px 28px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)
CTA glow:       0 4px 14px + accent color с 20% opacity
```

### Dark theme
```
Card default:   0 0 0 1px rgba(255,255,255,0.04) (inner glow)
Card hover:     0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)
CTA glow:       animated glow-pulse с accent-glow
```

---

## 6. Animations & Effects

Все анимации — CSS only, GPU-accelerated (transform, opacity). Никакого JS.

### Keyframes (определены в catalog.css, перенести в globals.css)
```css
@keyframes fade-in-up      — появление снизу (opacity + translateY)
@keyframes shimmer          — sweep сияние по поверхности
@keyframes gradient-shift   — переливание gradient text
@keyframes float-slow       — мягкое парение декоративных элементов
@keyframes glow-pulse       — пульсирующее свечение CTA
@keyframes icon-bounce      — bounce иконки при hover
```

### CSS classes для анимаций
```
.cat-card          — fade-in + staggered delay + hover lift
.cat-cta-glow      — пульсирующее свечение кнопки
.cat-banner        — shimmer sweep по ::after
.cat-gradient-text — animated gradient на тексте
.cat-feature       — hover lift + pattern background
.cat-float-1/2/3   — floating decorative elements
.cat-org-ring      — conic-gradient ring вокруг аватара
.cat-search        — focus glow ring
.cat-stat          — gradient underline под числом
.cat-footer        — gradient line вместо border-top
```

### Transitions (стандарт для всего проекта)
```css
/* Быстрые (hover) */
transition: all 0.2s ease;
transition: transform 0.2s ease, opacity 0.2s ease;

/* Плавные (cards, panels) */
transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 0.3s ease;

/* Медленные (images, decorative) */
transition: transform 0.5s ease;
```

### Reduced motion
```css
@media (prefers-reduced-motion: reduce) {
  /* Отключить все animation, оставить opacity:1, transform:none */
}
```

---

## 7. Иконки

Библиотека: **lucide-react** (тонкие линейные иконки)

### Размеры
```
Micro (в тегах):   w-2.5 h-2.5
Small (в мете):    w-3 h-3 или w-3.5 h-3.5
Medium (в cards):  w-4 h-4
Large (features):  w-5 h-5
Hero (decorative): w-6 h-6 до w-8 h-8
```

### Стилизация
```
Accent icons:    style={{ color: "var(--cat-icon-accent)" }}
Muted icons:     style={{ color: "var(--cat-text-muted)" }}
Brand icons:     style={{ color: brand }} (динамический цвет организатора)
```

---

## 8. Dual Theme System

### Архитектура
1. `ThemeProvider` — React Context + `data-theme` атрибут на wrapper div
2. CSS custom properties — все цвета через `var(--cat-*)` в `[data-theme="dark"]` / `[data-theme="light"]`
3. Inline styles в JSX: `style={{ color: "var(--cat-text)" }}`
4. Класс `.contents` на wrapper чтобы не ломать layout

### Правила
- НЕ использовать Tailwind color classes (`bg-white`, `text-gray-500`) для тематизируемых элементов
- Все цвета через CSS variables
- Фиксированные цвета (иконки фич, бренд организатора) — через inline `style={{ color }}` напрямую
- Tailwind классы ОК для layout, spacing, typography size, rounded, flex, grid

### Переключатель темы
```tsx
// theme-toggle.tsx
"use client";
import { createContext, useContext, useState, useCallback } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "dark" | "light";
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark", toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const toggle = useCallback(() => setTheme(p => p === "dark" ? "light" : "dark"), []);
  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <div data-theme={theme} className="contents">{children}</div>
    </ThemeContext.Provider>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useContext(ThemeContext);
  return (
    <button onClick={toggle} className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      {theme === "dark"
        ? <Sun className="w-3.5 h-3.5" style={{ color: "var(--cat-text-muted)" }} />
        : <Moon className="w-3.5 h-3.5" style={{ color: "var(--cat-text-secondary)" }} />}
    </button>
  );
}
```

---

## 9. Флаги стран

Используем emoji-флаги в круглых контейнерах:
```tsx
const countryFlags: Record<string, string> = {
  Estonia: "\u{1F1EA}\u{1F1EA}", Finland: "\u{1F1EB}\u{1F1EE}",
  Latvia: "\u{1F1F1}\u{1F1FB}", Sweden: "\u{1F1F8}\u{1F1EA}",
  // ... 30+ стран
};

function getFlag(country: string | null): string {
  if (!country) return "\u{1F30D}"; // globe fallback
  return countryFlags[country] ?? "\u{1F30D}";
}

// Использование — круглый контейнер:
<div className="w-7 h-7 rounded-full flex items-center justify-center
  backdrop-blur-md border border-white/20 bg-black/25 text-sm leading-none">
  {getFlag(country)}
</div>
```

---

## 10. Паттерны для Admin Pages

### Sidebar навигация (уже реализована)
Оставить как есть — dark sidebar с mint акцентами.

### Основной контент — адаптация к новому стилю
Что менять в каждой admin/team странице:
1. **Заголовок страницы**: добавить gradient underline или accent dot
2. **Таблицы**: скругления `rounded-xl`, тонкие borders, hover row highlight
3. **Формы**: input с focus glow (`.cat-search` стиль)
4. **Карточки статистики**: gradient accent line снизу
5. **Пустые состояния**: иконка + текст + accent CTA
6. **Loading**: shimmer skeleton вместо спиннера

### Структура page layout
```tsx
<div style={{ background: "var(--cat-bg)" }}>
  {/* Page header */}
  <div className="flex items-center justify-between mb-8">
    <div>
      <h1 className="text-xl font-bold" style={{ color: "var(--cat-text)" }}>Page Title</h1>
      <p className="text-[13px] mt-1" style={{ color: "var(--cat-text-secondary)" }}>Description</p>
    </div>
    <Button variant="gold">Action</Button>
  </div>

  {/* Content cards */}
  <div className="rounded-2xl p-6" style={{
    background: "var(--cat-card-bg)",
    border: "1px solid var(--cat-card-border)",
    boxShadow: "var(--cat-card-shadow)"
  }}>
    ...
  </div>
</div>
```

---

## 11. Интеграция — что делать

### Шаг 1: Глобальные стили
Перенести CSS variables и keyframes из `catalog/catalog.css` в `src/app/globals.css`. Переименовать `--cat-*` в `--g-*` (goality) для единообразия.

### Шаг 2: ThemeProvider
Вынести `ThemeProvider` и `ThemeToggle` из `catalog/` в `src/components/ui/theme-provider.tsx`. Подключить в корневой layout.

### Шаг 3: UI компоненты
Обновить `src/components/ui/button.tsx`, `card.tsx`, `input.tsx`, `badge.tsx` чтобы они использовали CSS variables вместо hardcoded Tailwind colors. Добавить новые варианты.

### Шаг 4: Sidebars
Sidebar уже в нужном стиле — оставить, но добавить subtle gradient line под header.

### Шаг 5: Каждая страница
Пройтись по каждой route и адаптировать:
- `bg-white` → `var(--cat-card-bg)` или inline style
- `text-gray-*` → CSS variable
- `border-border` → `var(--cat-card-border)`
- Добавить hover effects на карточки
- Добавить анимации fade-in на контент

### Шаг 6: Responsive
Все сетки уже адаптивные. Sidebar скрывается на мобиле. Проверить каждую страницу на mobile viewport.

---

## 12. Reference Files

```
src/app/globals.css                                    — Tailwind tokens
src/app/[locale]/(public)/catalog/catalog.css          — Premium theme CSS (эталон)
src/app/[locale]/(public)/catalog/page.tsx             — Premium page (эталон)
src/app/[locale]/(public)/catalog/theme-toggle.tsx     — Theme switcher
src/components/ui/button.tsx                           — Button variants
src/components/ui/card.tsx                             — Card component
src/components/ui/input.tsx                            — Input component
src/components/ui/badge.tsx                            — Badge variants
src/components/admin/org-admin-sidebar.tsx              — Org admin sidebar
src/components/team/team-sidebar.tsx                   — Team sidebar
```
