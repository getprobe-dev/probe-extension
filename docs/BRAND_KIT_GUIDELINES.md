# PRobe Brand Kit Guidelines

## Brand Overview

**Product name:** PRobe (capital P, capital R, lowercase obe)
**Tagline:** Free, open-source AI code review companion for GitHub PRs
**One-liner:** Chat with any GitHub pull request, probe into files and lines, and post review comments.
**Website:** getprobe.dev
**License:** AGPL-3.0

---

## Logo

The PRobe logo is a typographic lettermark. The letters P and R are set in Outfit ExtraBold (800) on a deep teal-black rounded-square background. A small magnifying glass icon sits in the upper right at larger sizes, omitted at 16px.

**Logo icon sizes:** 128x128, 48x48, 16x16
**Icon border radius:** 24px (128), 12px (48), 3px (16)

| Element        | Value                              |
|----------------|------------------------------------|
| Background     | #1a2e2b (deep teal-black)          |
| "P" color      | #5eead4 (mint)                     |
| "R" color      | #f1f5f9 (slate)                    |
| Magnifying glass | #5eead4 (mint)                   |
| Typeface       | Outfit 800 (ExtraBold)             |

**Wordmark:** PRobe, with P in mint (#5eead4), R in white/slate (#f1f5f9), and "obe" in a muted tone (rgba(241,245,249,0.35) on dark backgrounds).

**Clear space:** Maintain at least the width of the "P" character as padding around the logo on all sides.

**Don'ts:**
- Don't change the colors of P and R
- Don't use the logo on backgrounds that clash with teal
- Don't stretch or distort the proportions
- Don't add effects like drop shadows or outlines to the lettermark itself

---

## Color Palette

### Primary Colors

| Name           | Hex       | Usage                                              |
|----------------|-----------|----------------------------------------------------|
| Deep Teal-Black | #1a2e2b  | Logo background, panel header, code blocks, tooltips |
| Navy Light     | #243d39   | Gradient stops, secondary dark surfaces             |
| Mint           | #5eead4   | Primary accent everywhere: buttons, highlights, user messages, focus rings, hover states |
| Mint Light     | #a7f3d0   | Secondary accent highlights                         |
| Mint Faint     | #ecfdf5   | Hover backgrounds on light surfaces                 |

### Neutral Colors

| Name           | Hex       | Usage                                              |
|----------------|-----------|----------------------------------------------------|
| Surface        | #f8fafb   | Input backgrounds, dashboard cards                  |
| Surface Elevated | #fdfefe | Elevated card backgrounds                          |
| Slate 100      | #f1f5f9   | Assistant message bubbles, inline code backgrounds  |
| Slate 200      | #e2e8f0   | Borders, dividers                                   |
| Slate 400      | #94a3b8   | Input borders, muted elements                       |
| Slate 500      | #64748b   | Secondary text, muted labels                        |
| Slate 600      | #475569   | Pill text, tertiary elements                        |

### Semantic Colors

| Name           | Hex       | Usage                                              |
|----------------|-----------|----------------------------------------------------|
| Green 600      | #16a34a   | Additions count, success states                     |
| Red 600        | #dc2626   | Deletions count, destructive actions                |
| Red 400        | #f87171   | Deletion text in tooltips                           |

### Background Combinations

| Context              | Background | Text/Accent                    |
|----------------------|------------|--------------------------------|
| Dark surfaces        | #1a2e2b    | White (#f1f5f9) + Mint (#5eead4) |
| Light surfaces       | #f8fafb    | Dark (#1a2e2b) + Mint (#5eead4)  |
| Marketing/hero areas | #0d1614    | White (#f1f5f9) + Mint (#5eead4) |

---

## Typography

### Font Stack

| Purpose        | Font                                           | Weight         |
|----------------|-------------------------------------------------|---------------|
| Brand/display  | Outfit                                          | 700-900        |
| Body text      | Inter                                           | 400-600        |
| Monospace/code | SFMono-Regular, Consolas, Liberation Mono, Menlo | 400-600        |

### Usage

- **Product name "PRobe"** in headers and marketing: Outfit 800-900
- **Headings:** Outfit 700
- **Body copy:** Inter 400, 14px base size, 1.5 line height
- **Code snippets and technical content:** Monospace stack
- **Dashboard stat numbers:** Outfit 700

---

## Voice and Tone

### Personality
PRobe is a knowledgeable companion, not a corporate tool. It's the senior developer who sits next to you and quietly helps you understand the code. Confident but not arrogant. Technical but approachable.

### Writing Principles
- First person when telling the PRobe story ("I built this because...")
- Direct and conversational, not marketing-speak
- Avoid grand claims; let the product speak for itself
- Emphasize that PRobe helps the reviewer, not replaces them
- Always highlight: free, open source, bring your own keys, transparent

### Key Phrases
- "Chat with any GitHub pull request"
- "Probe into files and lines"
- "Your AI review companion"
- "Cut the diamond with a diamond"
- "Free, open source, bring your own keys"
- "Built for developers who review more than they code"

### Words to Use
companion, probe, review, chat, free, open source, transparent, context, skills, focus

### Words to Avoid
revolutionary, game-changing, disruptive, magic, automate, replace, bot

---

## Visual Style

### Overall Aesthetic
Dark, developer-native, approachable. PRobe should feel like it belongs alongside GitHub's dark mode UI. Warm teal tones keep it friendly rather than cold and corporate.

### Backgrounds
- Marketing and hero sections: #0d1614 (near-black) with subtle radial mint glows
- Product UI: #1a2e2b (deep teal-black) for headers and dark surfaces, #f8fafb for light content areas
- Avoid pure black (#000000) and pure white (#ffffff)

### Shadows and Depth
Interactive elements use a consistent physical depth system:
- Resting: bottom box-shadow simulating the element above the surface
- Hover: shadow deepens or border shifts to mint
- Active/pressed: translateY pushes down, shadow switches to inset
- Disabled: reduced opacity, no shadow

### Border Radius
- Large containers/panels: 20-24px
- Cards and inputs: 12px
- Buttons and pills: 10-12px (or 100px for fully rounded pills)
- Small elements: 4-6px

### Animations
- Panel entrance: cubic-bezier(0.16, 1, 0.3, 1), 280ms
- Fade-ins: ease-out, 250ms
- Loading pulse: ease-in-out, 1.6s loop
- Keep motion subtle and purposeful, never decorative

---

## Asset Inventory

| Asset                    | Dimensions  | Usage                          |
|--------------------------|-------------|--------------------------------|
| Logo icon (large)        | 128x128     | Chrome Web Store, GitHub, docs |
| Logo icon (medium)       | 48x48       | Extension toolbar, favicons    |
| Logo icon (small)        | 16x16       | Browser tab favicon            |
| GitHub social preview    | 1280x640    | Repository social card         |
| YouTube thumbnail        | 1280x720    | Video thumbnail                |
| Product Hunt hero        | 1270x760    | PH launch preview              |
| Chrome Store small tile  | 440x280     | CWS listing                    |
| Chrome Store marquee     | 1400x560    | CWS featured banner            |