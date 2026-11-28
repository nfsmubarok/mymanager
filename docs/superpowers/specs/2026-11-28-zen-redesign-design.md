# Zen Dashboard redesign: Ai-zome

Date: 2026-11-28
Status: approved in conversation, waiting for spec review
Branch: `redesign-ai-zome`

## Goal

Rebuild the visual design of the dashboard so it works as a portfolio piece (memorable, distinctly Japanese, cinematic) while staying comfortable for daily personal use. Behavior and data stay the same.

## Decisions made with the owner

| Topic | Decision |
| --- | --- |
| Main purpose | Both portfolio and daily use; portfolio weighs more for now |
| Identity | Keep the Japanese theme, push it bolder and more editorial |
| Palette | Ai-zome (indigo) + hanko red (option B) |
| Layout | Narrow vertical rail on the left (option B) |
| Rail navigation | Icons only, no Japanese words; icons in a Japanese style |
| Icon style | Line icons (option A), custom drawn |
| Motion | Cinematic (option 2); all five demoed moments kept |
| Sakura petals | Real petal shape, interactive (cursor wind, click gust, scroll drift) |
| Dark mode | Yes: washi (day) and sumi (night) with a toggle |
| Build approach | Vanilla HTML/CSS/JS + GSAP from CDN (approach A), no framework, no build step |
| Order | Phase 1: design system + shell + Money + Login, then owner review; Phase 2: other 5 pages |
| UI language | Casual Indonesian (unchanged) |

## Dials (antislop)

Design Read: personal life dashboard used as a portfolio piece, for the owner and recruiters/clients, in an editorial Japanese (washi paper, indigo dye, hanko seal) language, dial ENERGY 3 / RHYTHM 3 / MOTION 3.

## Out of scope

- Any change to Supabase queries, table schemas, auth flow, or data model.
- New features (budgets, recurring transactions, etc.).
- Moving to a framework or adding a build step.

## 1. Visual system

### Color tokens

All tokens live on `:root` (washi) and `[data-theme="sumi"]`. Text pairs below were measured; every text pair is at least 4.5:1.

| Token | Washi | Sumi | Use |
| --- | --- | --- | --- |
| `--paper` | `#F2F0EA` | `#121722` | page background |
| `--card` | `#FAF9F5` | `#1A2030` | cards, modals, rail |
| `--ink` | `#1C2230` | `#E6E3DA` | main text (13.95 / 13.97) |
| `--muted` | `#5A6170` | `#A9AEB9` | secondary text (5.45 / 8.06) |
| `--line` | ink at 15% | ink at 15% | rules, borders, ledger lines |
| `--ai` | `#2E4A7A` | `#9DB4E0` | primary action, active, income (7.75 / 8.57) |
| `--on-ai` | `#FFFFFF` | `#121722` | text on primary buttons (8.84 / 8.57) |
| `--hanko` | `#B23A2E` | `#F07A6E` | the single accent: expense, active marker, delete text (5.21 / 6.59) |
| `--hanko-seal` | `#B23A2E` | `#E0574A` | the 済 stamp graphic (non-text, 3:1 rule) |
| `--sakura` | `#F2AFC0` family | same | petals only, never text |

Rules:
- Hanko red is the only accent. It is used for expense amounts, the active-page marker on the rail, delete actions, and the 済 stamp. Nothing else is red.
- Washi mode gets a faint dot texture (`radial-gradient`, 4% ink) to suggest paper fiber. Sumi mode has no texture.
- No gradients other than the petal sprites and the paper texture. No glow, no glassmorphism.

### Typography

- Display: Shippori Mincho 700/800 for page titles, big amounts, section titles, the vertical logo, and tategaki phrases.
- Body: Zen Kaku Gothic New 400/500/700 for everything else, with `font-variant-numeric: tabular-nums` on amounts.
- Loaded from Google Fonts with `display=swap` and `preconnect`.
- Reason: mincho gives the editorial, calligraphic voice; Zen Kaku Gothic is a Japanese-designed sans that pairs with it and keeps forms and numbers readable.
- No uppercase labels with wide tracking (only the small eyebrow above page titles uses modest tracking, written in sentence case).

### Shape and spacing

- Radius: 3px buttons and inputs, 6px cards, 8px modals. No pill shapes except the round icon buttons in the rail.
- Borders: 1px `--line`. Shadows only on modals and the toast.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 72. Page sections vary in composition (RHYTHM 3), not just spacing.

### Icons

One SVG sprite at `img/icons.svg` with `<symbol>` ids, drawn on a 24px grid with 1.6 to 1.8 stroke and round caps, using `currentColor`:

| id | Object | Page |
| --- | --- | --- |
| `money` | mon coin with square hole | Keuangan |
| `calendar` | calendar with hanko dot | Jadwal & tugas |
| `ema` | ema prayer plaque | Wishlist |
| `kendama` | kendama toy | Hobi |
| `scroll` | makimono scroll | Dumpspaces |
| `soroban` | soroban abacus | Sudoku |
| `moon` / `sun` | crescent moon / sun | theme toggle |
| `noren` | noren shop curtain | logout |
| `wind` | three brush lines | motion toggle |

Every icon-only button has `aria-label` and a visible tooltip on hover and focus. Icons inside buttons are `aria-hidden="true"`.

## 2. Layout shell

### Desktop and tablet (768px and up)

- Left rail, 72px wide, full height, `--card` background, right border.
  - Top: vertical logo マネージャー (Shippori Mincho, `writing-mode: vertical-rl`), links to `index.html`.
  - Middle: six page links (`<a>` with icon, `aria-label`, `aria-current="page"` on the active one). The active link shows a 3px hanko-red bar on its left and indigo icon color.
  - Bottom: motion toggle, theme toggle, logout.
- Main area to the right, max content width 1200px, padding 32 to 48px.
- Every page header:
  - Small eyebrow (for example "Keuangan · November 2026").
  - Page title in mincho, 44 to 56px.
  - A short tategaki phrase in indigo at 50% opacity beside the title (decorative, `aria-hidden`).
  - A giant transparent kanji watermark in the top right of the page (金 Keuangan, 予 Jadwal, 願 Wishlist, 遊 Hobi, 記 Dumpspaces, 数 Sudoku), 6% opacity, `aria-hidden`, `pointer-events: none`.

### Mobile (below 768px)

- The rail becomes a fixed bottom tab bar with six icons plus small Indonesian labels (Keuangan, Jadwal, Wishlist, Hobi, Dumps, Sudoku). Height at least 56px, safe-area padding.
- A slim top header holds the logo (horizontal) and the motion, theme, and logout buttons.
- Main content gets bottom padding so the tab bar never covers content.
- Touch targets at least 44px. No horizontal overflow.

## 3. Components

- **Ledger (buku kas):** lists for transactions, tasks, wishlist plans, and the hobby queue render as ruled lines (1px `--line` rows on a faint indigo rule). Amounts align right in tabular numbers, income in `--ai`, expense in `--hanko`, transfer in `--muted`.
- **Paper card:** `--card` background, 1px border, 6px radius, no shadow.
- **Buttons:** primary (filled `--ai`), secondary (outline), text (for row actions), danger (hanko text or fill in the confirm dialog). Distinct hover, active, focus-visible, and disabled states.
- **Inputs:** underline-style fields on paper (bottom border 1.5px, light fill), visible label above, focus turns the underline indigo plus a focus ring.
- **Modal:** paper sheet, 8px radius, opens with the ink-blot motion (section 4). Keeps the existing behavior from `js/common.js`: Esc closes, focus trap, focus returns.
- **Toast:** ink-colored strip at the bottom with a small hanko dot for errors.
- **States:** loading, empty, and error keep the existing `renderState` helper; restyled to match (brush-like spinner ring in indigo, hanko text for errors).

## 4. Motion system

### Preference

- `js/motion.js` exposes `Motion.full` (boolean) and `Motion.onChange(fn)`.
- Default: `full = !matchMedia('(prefers-reduced-motion: reduce)').matches`.
- The rail's motion toggle overrides it; the choice is stored in `localStorage` key `zen-motion` (`full` / `calm`), wrapped in try/catch.
- When `full` is false, every animation below is skipped or set to duration 0, and the petal canvas is hidden.

### Library

GSAP 3.12.5 from `cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js`, loaded with `defer` at the end of the body. If GSAP fails to load, everything still works without animation (all motion code checks `window.gsap`).

### Moments

1. **Sakura petals** (`js/petals.js`), on every page except Login:
   - one `<canvas>` behind content, `pointer-events: none`, `aria-hidden`
   - pre-rendered petal sprites (notched tip, white-to-pink gradient, vein); 22 base petals, max 60
   - 3D flip via horizontal scale, swaying breeze
   - interactive: cursor or finger pushes petals (radius 120px), a click or tap on empty page space sends a gust and drops 7 petals, scroll adds drift
   - pause button in the rail; the paused state is stored in `localStorage` key `zen-petals`
   - stops drawing when the tab is hidden; capped DPR at 2
   - washi and sumi use the same petal colors
2. **Count-up and ledger stagger:** big amounts count up from 0 (1.4s, `power3.out`) on first load; ledger rows and cards fade and slide in with 0.08 to 0.12s stagger. Runs once per page load, not on every re-render after save.
3. **Hanko 済 stamp:** a reusable `stampHanko(targetEl)` in `js/motion.js` drops a 済 seal (scale 2.2 to 1, rotate -25 to -8 degrees, `back.out`), with a small shake of the card. Triggers:
   - a wishlist reaching 100% after an update
   - the last unfinished task for today being checked
   - a solved sudoku

   It does not trigger on page load for items that were already complete.
4. **Theme ink spread:** toggling to sumi grows an ink circle from the toggle button over the page, then swaps `data-theme`; toggling back shrinks it. Uses the View Transitions API (`document.startViewTransition` with a `clip-path` circle) where available, and falls back to an instant swap.
5. **Modal ink blot:** opening a modal expands a faint indigo blot from the trigger, then the sheet fades up. Closing reverses it quickly (under 250ms). Implemented in `openModal`/`closeModal` in `js/common.js` through optional hooks so non-motion behavior is unchanged.
6. **Page transitions:** cross-document View Transitions (`@view-transition { navigation: auto; }`), a short fade with the kanji watermark sliding slightly. Browsers without support navigate normally.

## 5. Theme

- `js/theme.js` sets `data-theme` on `<html>`: stored choice (`localStorage` key `zen-theme`), else `prefers-color-scheme`, else washi.
- A tiny inline script in `<head>` sets the attribute before first paint to avoid a flash. It is the only inline script and it is identical on every page.
- Chart.js colors read from CSS variables so the doughnut matches both themes. The chart is re-rendered on theme change.

## 6. File changes

| File | Change |
| --- | --- |
| `css/style.css` | Rewritten around the new tokens, shell, components, both themes |
| `img/icons.svg` | New icon sprite |
| `js/theme.js` | New: theme state, toggle, ink spread |
| `js/motion.js` | New: motion preference, count-up, stagger, hanko stamp, modal hooks |
| `js/petals.js` | New: interactive petal canvas |
| `js/common.js` | Small additions: modal motion hooks, rail tooltip helper |
| `*.html` (7 pages) | New shell markup (rail, mobile header, tab bar, page header, watermark); content sections restyled with new classes |
| `js/ui.js`, `js/schedule.js`, `js/wishlist.js`, `js/hobbies.js`, `js/dumpspaces.js`, `js/minigames.js` | Template class names updated; motion triggers added (count-up, stagger, hanko). Data logic untouched. |
| `.gitignore` | Add `.superpowers/` |

## 7. Phases

**Phase 1:** tokens, fonts, icons sprite, shell (rail, mobile header, tab bar), theme, motion system, petals, modal and toast restyle, Keuangan page, Login page. Owner reviews before Phase 2.

**Phase 2:** Jadwal & tugas, Wishlist, Hobi, Dumpspaces, Sudoku, using the shell and components from Phase 1, plus their page-specific motion (hanko triggers, calendar stagger, sudoku solve stamp).

## 8. Testing

Run against the local mock Supabase harness (scratchpad, not committed), never the production or demo account.

- Click through every control on the pages in scope, in washi and sumi, with motion full and calm.
- Verify that motion calm (and the system reduced-motion setting) disables all animation and hides petals.
- Keyboard: tab order through the rail and content, tooltips on focus, Esc on modals, visible focus in both themes.
- Mobile 375px: no horizontal overflow, tab bar does not cover content, 44px targets.
- Contrast: re-measure every text and background pair in both themes.
- XSS payloads in mock data still render as text.
- Console free of errors.
- Antislop Delivery Gate report at the end of each phase.

## 9. Risks

- **Performance on low-end phones:** petals are capped at 60 sprites and stop when the tab is hidden; motion calm turns them off.
- **View Transitions support:** progressive enhancement only, so unsupported browsers keep plain navigation.
- **Font weight:** two Google Fonts families add about 100 to 200 KB; `display=swap` keeps text visible while loading.
