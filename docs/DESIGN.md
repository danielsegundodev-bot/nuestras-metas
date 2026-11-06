# Nuestras Metas — design plan

Brief: "minimalista, buen diseño pero potente, estilo Apple". Two people, two countries, shared goals. The feeling to land: *calm proof that we are getting there*.

## Principles
1. **One bold thing: the rings.** Concentric progress rings for the goals are the hero and the only expressive element. Everything else is quiet, gray, aligned.
2. **Apple vernacular, not Apple cosplay.** System fonts, grouped inset lists, bottom sheets, segmented controls, large titles — the patterns iPhone users already read fluently. No Apple logos/trademarks, no copied screens.
3. **Two people, two colors.** Each person has a color used *only* to mean "who contributed" (split bar, stacked chart, activity avatars). Goal colors are used *only* for goals (rings, progress bars). Never mix the two meanings.
4. **Numbers are the content.** Rounded numerals, tabular figures, generous size; labels small and secondary. No decorative icons, no gradients-as-decoration, no shadows on everything.
5. **Warm copy, plain verbs.** "Agregar ahorro", "Ahorro agregado", "Faltan 47 días para diciembre". Sentence case, no all-caps labels, no exclamation spam.

## Color tokens (light / dark)
| token | light | dark | use |
|---|---|---|---|
| `--canvas` | `#F2F2F7` | `#000000` | page background (iOS grouped background) |
| `--surface` | `#FFFFFF` | `#1C1C1E` | grouped list / sheet surfaces |
| `--ink` | `#1C1C1E` | `#F2F2F7` | primary text |
| `--ink-2` | `#6C6C70` | `#AEAEB2` | secondary text |
| `--separator` | `#C6C6C8` @ 60% | `#38383A` | hairlines inside grouped lists |
| `--accent` | `#007AFF` | `#0A84FF` | buttons, links, focus |
| `--him` | `#5856D6` | `#5E5CE6` | his contributions (indigo) |
| `--her` | `#FF2D55` | `#FF375F` | her contributions (pink) |
| goal palette | `#34C759` green · `#FF9500` orange · `#30B0C7` teal · `#AF52DE` purple · `#FFCC00` yellow | dark variants +10% luminance | per-goal color (Casa = green, Boda = orange by default) |

Ring tracks: goal color at 18% opacity. Respect `prefers-color-scheme`.

## Type
- Body/UI: `system-ui, -apple-system, "SF Pro Text", "Segoe UI", Roboto, sans-serif`.
- Numerals & large titles: `ui-rounded, "SF Pro Rounded", system-ui, sans-serif` with `font-variant-numeric: tabular-nums`. Rounded numerals give warmth without a "cute" font.
- Scale (px): 13 caption · 15 footnote/secondary · 17 body · 22 title-3 · 28 title-2 · 34 large title · 48–56 hero total. Weights: 400 body, 600 headings/row titles, 700 hero numbers. Letter-spacing slightly negative (-0.02em) at ≥ 28px.

## Layout
Single column, max-width 640px centered (phone-first; on desktop it reads like an iPad sheet — intentional). 16px side gutters, 20px between groups, list rows 44px min-height.

```
┌──────────────────────────────┐
│ Nuestras metas      [MXN|USD] (D)│  large title, controls right
│                              │
│      ◯◯◯  rings  ◯◯◯         │  hero: rings left/centered,
│     $412,300 juntos          │  total in center of rings
│  🏡 Casa  34%  $272k / $800k │  legend rows under rings
│  💍 Boda  47%  $140k / $300k │
│                              │
│ Faltan 47 días para diciembre│  grouped row
│ ●●○○○  dic 2026 … dic 2030   │  5-December timeline
│                              │
│ Metas                        │  section title (sentence case)
│ ┌ 🏡 Casa ███████░░░  34%  ┐ │  grouped inset list rows
│ └ 💍 Boda █████████░  47%  ┘ │
│                              │
│ Cómo vamos  [Todas|Casa|Boda]│  stacked area chart by person
│ Quién ha aportado ████▌░░░   │  split bar him/her
│ Movimientos recientes        │  grouped list
│                     [+ Agregar ahorro] │  floating pill button, bottom
└──────────────────────────────┘
```
Text left-aligned everywhere except the ring center total.

## Motion
- Rings sweep from 0 to value once on first load (~900ms, ease-out) and animate to new value after adding a contribution. That's it for ambient motion.
- Sheets slide up with a spring; respect `prefers-reduced-motion` (no sweep, instant).

## Review against the brief (what was revised)
- First instinct was a grid of identical goal cards with progress bars + a big total stat — the generic finance dashboard. Replaced with **rings as hero + grouped list**, which is both more Apple-native and more specific to "watching several goals fill up together".
- Dropped a planned "monthly income" stat row: the brief is about goals materializing, not cash flow.
- Added the **December timeline** — the one element that is about *them* (distance, the yearly reunion), not generic savings.

## Quality floor
Responsive to 320px, visible focus rings (accent, 2px offset), `prefers-reduced-motion`, contrast AA, tap targets ≥ 44px, numbers never truncated (abbreviate $1.2M only when needed), safe-area insets for the floating button on iPhone.
