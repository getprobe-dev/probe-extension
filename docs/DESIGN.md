# PRobe — Design Reference

This document covers the visual language, color tokens, typography, and component patterns used in PRobe. It is intended for contributors working on the UI.

The entire UI renders inside a **Shadow DOM** to fully isolate PRobe's styles from GitHub's CSS.

---

## Logo

The icon is typographic — the letters **P** and **R** set in **Outfit ExtraBold (800)** on a deep teal-black (`#1a2e2b`) rounded-square background. "P" is rendered in mint (`#5eead4`), "R" in slate (`#f1f5f9`), and a subtle glass/glow layer in mint adds depth. The result reads as "PR" at a glance — a direct nod to "pull request" — while the teal-and-mint treatment ties it to the rest of the UI palette.

| Element | Value |
|---|---|
| Background | `#1a2e2b` (deep teal-black) |
| "P" | `#5eead4` (mint) |
| "R" | `#f1f5f9` (slate) |
| Glass / glow | `#5eead4` (mint) |
| Typeface | Outfit 800 (ExtraBold) |

---

## Color Palette

The palette is built around a **dark teal/navy** and **mint** pairing — warm enough to feel approachable, cool enough to sit comfortably alongside GitHub's neutral UI.

| Token | Hex | Usage |
|---|---|---|
| **Navy** | `#1a2e2b` | Panel header, code block backgrounds, tooltips, foreground text |
| **Navy Light** | `#243d39` | Code block borders, gradient stops on primary buttons |
| **Mint** | `#5eead4` | Primary accent — user message bubbles, focus rings, streaming cursor, hover states, addition bars, commit glow |
| **Mint Light** | `#a7f3d0` | Secondary accent highlights |
| **Mint Faint** | `#ecfdf5` | Hover background on starter pills |
| **Surface** | `#f8fafb` | Input backgrounds, comment composer, dashboard cards |
| **Surface Elevated** | `#fdfefe` | Elevated card backgrounds |
| **Slate 100** | `#f1f5f9` | Assistant message bubbles, inline code backgrounds, muted/secondary fills |
| **Slate 200** | `#e2e8f0` | Borders, dividers, scrollbar thumbs |
| **Slate 400** | `#94a3b8` | Input borders (resting), starter pill borders |
| **Slate 500** | `#64748b` | Muted foreground text, secondary labels |
| **Slate 600** | `#475569` | Starter pill text |
| **Green 600** | `#16a34a` | Additions count |
| **Red 600** | `#dc2626` | Deletions count |
| **Red 400** | `#f87171` | Deletion text in tooltips, destructive hover |

---

## Typography

- **Body font**: Inter (loaded from Google Fonts), falling back to the system font stack (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`).
- **Brand/display font**: Outfit (Medium–ExtraBold) for the "PRobe" wordmark and stat card numbers.
- **Monospace**: `SFMono-Regular`, Consolas, `Liberation Mono`, Menlo — used in code blocks, the comment composer, and inline `code` spans.
- **Base size**: 14px / 1.5 line height inside the panel.

---

## Components & Surfaces

- **Panel** — Fixed 400px-wide sidebar that slides in from the right with a `cubic-bezier(0.16, 1, 0.3, 1)` ease. A subtle left border-shadow separates it from the page. The GitHub page content reflows by adding a matching `margin-right`.
- **Header bar** — Solid navy (`#1a2e2b`) with white text. Action buttons use a frosted-glass gradient (`rgba(255,255,255,0.18)` → `0.06`) with a deep drop-shadow for a tactile "raised" feel.
- **Message bubbles** — User messages are mint (`#5eead4`) with navy text, rounded with a flattened bottom-right corner. Assistant messages are slate (`#f1f5f9`) with a flattened bottom-left corner.
- **Streaming cursor** — A 6px mint bar that pulses at the end of the last rendered element while the response streams in.
- **Send button** — Navy gradient (`#243d39` → `#1a2e2b`) with a mint icon, a `3px` bottom shadow for depth, and an active state that translates down to simulate a physical press.
- **Starter pills** — White background with a slate border and `2px` bottom shadow. On hover they shift to a mint border with a mint faint background, giving an "illuminate" effect.
- **Focus pills** (file/line chips in the input) — `#5eead4` at 10% opacity background with a 20% opacity border, keeping them present but non-distracting.
- **Dashboard cards** — Surface background (`#f8fafb`) with a 1px slate border and 12px border-radius.
- **Code blocks** (in markdown) — Navy background (`#1a2e2b`) with slate-200 text. Inline code is slate-100 with a 1px border.
- **Blockquotes** — 3px mint left border with slate-500 text.
- **Links** — Navy text with a mint underline that transitions to navy on hover.
- **Floating action button** — The PRobe icon with a `4px` bottom shadow and a mint glow ring on hover. Press pushes it down with an inset shadow.

---

## Button Depth System

All interactive elements use a consistent "physical" depth system:

1. **Resting** — A `box-shadow` on the bottom edge simulates the button sitting above the surface.
2. **Hover** — Shadow deepens slightly or border color shifts to mint.
3. **Active/pressed** — `translateY` pushes the element down, shadow switches to `inset`, simulating a button press into the surface.
4. **Disabled** — Reduced opacity, no shadow, `cursor: not-allowed`.

This is applied consistently across the send button, header buttons, starter pills, composer buttons, review submit, and the floating action button.

---

## Animations

| Animation | Easing | Duration | Usage |
|---|---|---|---|
| `slideIn` | `cubic-bezier(0.16, 1, 0.3, 1)` | 280ms | Panel entrance |
| `fadeIn` | `ease-out` | 250ms | Message bubbles, dashboard |
| `logoPulse` | `ease-in-out` | 1.6s loop | Loading state (PRobe icon) |
| `pulse-cursor` | `ease-in-out` | 800ms loop | Streaming cursor |
| Margin transition | `cubic-bezier(0.16, 1, 0.3, 1)` | 250ms | GitHub page reflow when panel opens/closes |

---

## Scrollbar

Custom WebKit scrollbar: 5px wide, transparent track, `#cbd5e1` thumb that darkens to `#94a3b8` on hover. Keeps the panel feeling lightweight.
