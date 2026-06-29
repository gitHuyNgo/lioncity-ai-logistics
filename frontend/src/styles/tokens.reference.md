# Design System Token Reference

> Single authoritative reference for every Design_Token defined in
> [`tokens.css`](./tokens.css). This document satisfies Requirement 1.5:
> **the count of documented tokens equals the count of defined tokens.**
>
> - **Tokens defined** in `:root` (light): **38**
> - **Tokens documented** below: **38**
>
> Color values are stored as bare HSL triples (`"H S% L%"`, no `hsl()` wrapper)
> per the shadcn convention so Tailwind can wrap them as `hsl(var(--token))`.
> The **Dark** column shows the value applied under the `.dark` class. Tokens
> whose dark value is _“inherits light”_ are not redefined in `.dark` and so
> resolve to their `:root` value in both themes.
>
> Brand identity: teal `#0d7c78` + deep ink `#0b1e24` + signal red `#d2233c`.
>
> ⚠️ This file is generated from the token source. When `tokens.css` changes,
> update this reference so the documented count stays equal to the defined
> count (validated by the token-completeness and contrast property tests).

## Border radius (1)

| # | Token | Light | Dark |
|---|-------|-------|------|
| 1 | `--radius` | `0.625rem` | `0.625rem` |

## Color — surfaces & text (7)

| # | Token | Light | Dark |
|---|-------|-------|------|
| 2 | `--background` | `200 33% 96%` | `197 45% 8%` |
| 3 | `--foreground` | `197 50% 9%` | `180 20% 92%` |
| 4 | `--card` | `0 0% 100%` | `197 40% 11%` |
| 5 | `--card-foreground` | `197 50% 9%` | `180 20% 92%` |
| 6 | `--popover` | `197 50% 9%` | `197 40% 11%` |
| 7 | `--popover-foreground` | `0 0% 100%` | `180 20% 92%` |
| 8 | `--secondary` | `200 24% 96%` | `197 30% 16%` |

## Color — brand & semantic (9)

| # | Token | Light | Dark |
|---|-------|-------|------|
| 9 | `--primary` | `178 81% 27%` | `174 62% 47%` |
| 10 | `--primary-foreground` | `0 0% 100%` | `197 50% 9%` |
| 11 | `--secondary-foreground` | `197 50% 9%` | `180 20% 92%` |
| 12 | `--muted` | `200 24% 96%` | `197 30% 16%` |
| 13 | `--muted-foreground` | `200 9% 40%` | `200 12% 65%` |
| 14 | `--accent` | `178 47% 92%` | `197 35% 18%` |
| 15 | `--accent-foreground` | `178 81% 18%` | `174 62% 70%` |
| 16 | `--destructive` | `350 73% 48%` | `350 80% 60%` |
| 17 | `--destructive-foreground` | `0 0% 100%` | `0 0% 100%` |

## Color — borders, inputs, focus ring (3)

| # | Token | Light | Dark |
|---|-------|-------|------|
| 18 | `--border` | `200 24% 88%` | `197 25% 22%` |
| 19 | `--input` | `200 24% 88%` | `197 25% 22%` |
| 20 | `--ring` | `178 81% 27%` | `174 62% 47%` |

## Color — chart series (5)

| # | Token | Light | Dark |
|---|-------|-------|------|
| 21 | `--chart-1` | `178 81% 27%` | `174 62% 47%` |
| 22 | `--chart-2` | `217 91% 60%` | `217 91% 68%` |
| 23 | `--chart-3` | `32 95% 44%` | `32 95% 55%` |
| 24 | `--chart-4` | `160 84% 26%` | `160 70% 45%` |
| 25 | `--chart-5` | `350 73% 48%` | `350 80% 62%` |

## Typography (2)

| # | Token | Light | Dark |
|---|-------|-------|------|
| 26 | `--font-sans` | `'Inter', 'IBM Plex Sans', system-ui, sans-serif` | same |
| 27 | `--font-serif` | `'IBM Plex Serif', 'Source Serif Pro', Georgia, serif` | same |

## Spacing (5)

| # | Token | Light | Dark |
|---|-------|-------|------|
| 28 | `--space-1` | `0.25rem` (4px) | same |
| 29 | `--space-2` | `0.5rem` (8px) | same |
| 30 | `--space-3` | `0.75rem` (12px) | same |
| 31 | `--space-4` | `1rem` (16px) | same |
| 32 | `--space-6` | `1.5rem` (24px) | same |

## Shadow (3)

| # | Token | Light | Dark |
|---|-------|-------|------|
| 33 | `--shadow-sm` | `0 1px 0 rgba(10, 30, 36, 0.02)` | `0 1px 0 rgba(0, 0, 0, 0.2)` |
| 34 | `--shadow-md` | `0 2px 6px rgba(10, 30, 36, 0.12)` | `0 2px 6px rgba(0, 0, 0, 0.4)` |
| 35 | `--shadow-lg` | `0 20px 50px rgba(10, 30, 36, 0.15)` | `0 20px 50px rgba(0, 0, 0, 0.5)` |

## Motion duration (3)

| # | Token | Light | Dark |
|---|-------|-------|------|
| 36 | `--motion-fast` | `150ms` | same |
| 37 | `--motion-base` | `250ms` | same |
| 38 | `--motion-slow` | `300ms` | same |

## Documented contrast pairings (Requirement 1.6)

Foreground/background pairings below are validated against WCAG AA by
[`lib/design/contrast.js`](../lib/design/contrast.js) and the contrast property
test (task 1.5). A pairing is documented **only if** it meets ≥ 4.5:1 for body
text or ≥ 3:1 for large text / UI boundaries in the relevant theme; pairings
that fall below threshold are intentionally excluded.

| Foreground token | Background token | Intended use |
|------------------|------------------|--------------|
| `--foreground` | `--background` | Body text on app background |
| `--card-foreground` | `--card` | Text on cards |
| `--popover-foreground` | `--popover` | Text in popovers/tooltips |
| `--primary-foreground` | `--primary` | Text/icons on primary buttons |
| `--secondary-foreground` | `--secondary` | Text on secondary surfaces |
| `--accent-foreground` | `--accent` | Text on accent surfaces |
| `--muted-foreground` | `--background` | Secondary/muted text on app background |

### Excluded pairings (below threshold — Requirement 1.6)

These foreground/background combinations are **intentionally not documented as
body-text pairings** because they fall below 4.5:1 for normal text:

| Foreground token | Background token | Measured (light / dark) | Reason |
|------------------|------------------|-------------------------|--------|
| `--destructive-foreground` | `--destructive` | 5.14 / **3.74** | Dark theme is below 4.5:1 for normal text. Acceptable only for large text / UI boundaries (≥ 3:1); do not use for small destructive-button labels in dark theme. |
