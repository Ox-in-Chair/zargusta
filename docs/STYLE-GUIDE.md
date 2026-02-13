# ZARyder Cup — Design System

*Refactored 2026-02-13 per Ox spec*

## Font

**Montserrat** — single font family, Google Font.

Weights: 400 (Regular), 600 (SemiBold), 700 (Bold), 900 (Black).

## Typography Scale (Desktop ≥768px)

| Element | Weight | Size | Line Height | Letter Spacing | Transform |
|---------|--------|------|-------------|----------------|-----------|
| Display | 900 | 48px | 1.1 | 4px | Uppercase |
| H1 | 900 | 36px | 1.15 | 3px | Uppercase |
| H2 | 700 | 24px | 1.2 | 2px | Uppercase |
| H3 | 700 | 18px | 1.3 | 1px | None |
| Body | 400 | 16px | 1.6 | 0 | None |
| Body Small | 400 | 14px | 1.5 | 0 | None |
| Label | 700 | 11px | 1.4 | 3px | Uppercase |
| Caption | 600 | 12px | 1.4 | 1px | None |
| Button | 700 | 14px | 1 | 2px | Uppercase |
| Number | 900 | 40px | 1.1 | 1px | None |

## Typography Scale (Mobile <768px)

| Element | Weight | Size | Letter Spacing |
|---------|--------|------|----------------|
| Display | 900 | 32px | 3px |
| H1 | 900 | 28px | 2px |
| H2 | 700 | 20px | 1.5px |
| H3 | 700 | 16px | 0.5px |
| Body | 400 | 15px | 0 |
| Label | 700 | 10px | 2.5px |
| Number | 900 | 32px | 0.5px |

## Colour Palette

### Primary
| Token | Hex | Usage |
|-------|-----|-------|
| `--blue-primary` | `#003399` | Headers, primary actions, active states, progress bars |
| `--blue-dark` | `#001A66` | Gradient ends, hover states |
| `--blue-light` | `#0051A8` | Links, secondary accents |
| `--gold-primary` | `#FFD700` | CTA buttons, highlights, labels, active indicators |
| `--gold-dark` | `#CCB000` | Hover on gold, pressed state |
| `--gold-light` | `#FFE44D` | Code highlights, data emphasis, sparklines |
| `--white` | `#FFFFFF` | Primary text on dark, headings |

### Backgrounds
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-dark` | `#0A0E1A` | App background |
| `--bg-card` | `#111827` | Cards, panels, containers |
| `--bg-card-elevated` | `#1A2035` | Modals, dropdowns, elevated surfaces |

### Neutrals
| Token | Hex | Usage |
|-------|-----|-------|
| `--grey-100` | `#E9ECEF` | High-emphasis body text |
| `--grey-300` | `#CED4DA` | Body text on dark backgrounds |
| `--grey-500` | `#6C757D` | Secondary text, placeholders, disabled |

### Semantic
| Token | Hex | Usage |
|-------|-----|-------|
| `--success` | `#22C55E` | Positive change, goal met |
| `--danger` | `#EF4444` | Negative change, errors |
| `--warning` | `#F59E0B` | Alerts, behind schedule |

## Theme

Dark only. No light mode toggle. Background is near-black (#0A0E1A) with card elevation (#111827).

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `6px` | Badges, pills, small elements |
| `--radius-md` | `10px` | Cards, inputs, buttons, panels |
| `--radius-lg` | `16px` | Hero cards, modals, elevated surfaces |

## Usage Rules

### Colour Hierarchy
- **Gold** reserved for primary CTAs, active states, and key labels only.
- **Blue** for backgrounds, progress indicators, secondary interactive elements.
- **White** is primary text on dark surfaces.
- **Grey tones** handle supporting text.

### Typography Hierarchy
- **900 (Black)** — Display, H1, financial numbers ONLY. Never body text.
- **700 (Bold)** — H2, H3, labels, buttons.
- **600 (SemiBold)** — Captions, helper text.
- **400 (Regular)** — All body text and descriptions.

### Responsive Scaling
- Desktop sizes scale down ~20-25% on mobile.
- Letter spacing reduces proportionally.
- Line heights remain consistent.
- Minimum touch target: 44px height on mobile.

### Contrast & Accessibility
- Gold (#FFD700) on dark (#0A0E1A): passes WCAG AA for large text.
- White on dark: passes AAA.
- **Grey-500 (#6C757D) on dark: AA for LARGE TEXT ONLY** — use Grey-300 (#CED4DA) minimum for small body text.
- All colour via CSS variables. No hardcoded hex.

### General
- Montserrat is the only font. No additional fonts.
- Labels always uppercase, 11px, 700 weight, 3px letter-spacing.
- Numbers always 900 weight, tabular-nums.
