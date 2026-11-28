# Zen Redesign Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Ai-zome design system, the rail shell, washi/sumi themes, the motion system with interactive sakura petals, and the restyled Keuangan and Login pages.

**Architecture:** Static multi-page app, no build step. Phase 1 adds a new stylesheet `css/zen.css` used only by `index.html` and `login.html`. The other five pages keep `css/style.css` until Phase 2, so nothing breaks in between. Three small global modules (`Theme`, `Motion`, `Petals`) attach to `window`. `js/shell.js` wires the rail buttons. Data logic in `js/api.js`, `js/auth.js` and `js/login.js` stays untouched.

**Tech Stack:** HTML, CSS custom properties, vanilla JS, GSAP 3.12.5 (CDN), Chart.js 4.4.1 (CDN), Supabase JS v2 (CDN), Google Fonts (Shippori Mincho, Zen Kaku Gothic New).

**Spec:** `docs/superpowers/specs/2026-11-28-zen-redesign-design.md`

## Global Constraints

- Branch: `redesign-ai-zome`. Do not merge to `main` until Phase 2 is done; `main` auto-deploys to Vercel.
- Tokens and hex values exactly as in spec section 1 (washi/sumi table). Sumi `--hanko` is `#F07A6E` (text). `--hanko-seal` is `#E0574A` (graphic only).
- Every text/background pair at least 4.5:1, in both themes.
- Fonts: `https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap` with preconnect.
- GSAP: `https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js`, `defer`, end of body. All motion code must work (no animation, no errors) when `window.gsap` is undefined.
- localStorage keys: `zen-theme` (`washi`|`sumi`), `zen-motion` (`full`|`calm`), `zen-petals` (`paused`|`playing`). Every read and write wrapped in try/catch.
- No em dash in any UI text or comment. UI copy in casual Indonesian.
- Hanko red is the only accent: expense amounts, active rail marker, delete actions, 済 stamp.
- Every icon-only button: `aria-label`, `title`-free custom tooltip shown on hover and focus, icon `aria-hidden="true"`.
- Motion calm (or system reduced motion with no override) means zero animation and hidden petal canvas.
- Keep the existing behavior of `js/common.js`: `esc`, `safeUrl`, toast, states, modal Esc/focus trap/focus return, confirm dialog.

## Review Focus

1. **Theme flash on load:** opening any Phase 1 page with `zen-theme=sumi` stored must paint dark from the first frame. Test in Task 1.
2. **localStorage blocked (private mode):** pages must load and toggles must still work for the session. Test in Task 1 and Task 3.
3. **Re-render after save must not replay count-up or stagger:** saving a transaction re-renders lists; only the first load animates. Test in Task 6.
4. **Petals must never block clicks:** clicking a button that sits over petals must trigger the button, not a gust. Test in Task 4.
5. **Chart in sumi:** the doughnut legend text and borders must stay readable after a theme switch without reload. Test in Task 6.

## Test harness

Mock Supabase lives in `.superpowers/mock/` (git-ignored). Start it with:

`python -I .superpowers/mock/server.py . 5517`

Then open `http://localhost:5517/<page>.html`. Query flags: `?delay=<ms>`, `?fail=1`, `?fail=0`, `?empty=1`. Seed data contains XSS payloads; `window.__xss` must stay `0`.

Each "Run" step below means: open the page in the harness and run the given snippet in the browser console (or the Claude browser `javascript_tool`). Expected output is given per step.

## File map

| File | Responsibility |
| --- | --- |
| `css/zen.css` (new) | Tokens (both themes), base, typography, shell, components, page styles for Keuangan and Login |
| `img/icons.svg` (new) | Icon sprite (spec section 1, Icons table) |
| `js/theme.js` (new) | `Theme` module: state, persistence, toggle, ink spread |
| `js/motion.js` (new) | `Motion` module: preference, `countUp`, `stagger`, `stampHanko`, modal in/out |
| `js/petals.js` (new) | `Petals` module: interactive canvas |
| `js/shell.js` (new) | Wires rail and mobile header buttons, tooltips |
| `js/common.js` | Modal open/close call `Motion.modalIn` / `Motion.modalOut` when present |
| `js/ui.js` | New template class names, chart colors from CSS vars, first-load motion |
| `index.html`, `login.html` | New shell and page markup, load new CSS/JS |

---

### Task 1: Tokens, base styles, and theme module

**Files:**
- Create: `css/zen.css`, `js/theme.js`
- Modify: `index.html` `<head>` (stylesheet swap, fonts, head theme snippet)

**Interfaces:**
- Produces: `window.Theme = { get(): 'washi'|'sumi', set(name: 'washi'|'sumi', originEl?: Element): Promise<void>, toggle(originEl?: Element): Promise<void>, onChange(fn: (name) => void): void }`
- Produces: `<html data-theme="washi|sumi">`; CSS tokens `--paper --card --ink --muted --line --ai --on-ai --hanko --hanko-seal --sakura` on `:root` and `[data-theme="sumi"]`.
- Produces: head snippet (identical on every page, placed before the stylesheet link):
  `<script>try{var t=localStorage.getItem('zen-theme');}catch(e){}document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'sumi':'washi');</script>`

- [ ] **Step 1: Write the checks** (save as `.superpowers/mock/checks/task1.js` for reuse)

```js
// run on index.html
const r = {};
r.theme = document.documentElement.dataset.theme;                       // 'washi' or 'sumi'
const bg = getComputedStyle(document.body).backgroundColor;
r.bgIsPaper = ['rgb(242, 240, 234)', 'rgb(18, 23, 34)'].includes(bg);  // true
await Theme.set('sumi');
r.afterSet = [document.documentElement.dataset.theme, localStorage.getItem('zen-theme')]; // ['sumi','sumi']
await Theme.toggle();
r.afterToggle = document.documentElement.dataset.theme;                  // 'washi'
r;
```

- [ ] **Step 2: Run to verify it fails**

Run: open `index.html` in the harness, paste the snippet.
Expected: `ReferenceError: Theme is not defined`.

- [ ] **Step 3: Implement**
  - `css/zen.css`: tokens from spec section 1. Base: `body { background: var(--paper); color: var(--ink); font-family: 'Zen Kaku Gothic New', system-ui, sans-serif; }`, washi-only paper dots (`[data-theme="washi"] body { background-image: radial-gradient(color-mix(in srgb, var(--ink) 4%, transparent) 1px, transparent 1px); background-size: 5px 5px; }`), headings in Shippori Mincho, `:focus-visible` ring `2px solid var(--ai)`, `cursor: pointer` and disabled rules, `.visually-hidden`, `.skip-link`, the `prefers-reduced-motion` block, and the state styles (`.state`, `.state-loading`, `.state-error`, `.empty-state`) restyled per spec section 3.
  - `js/theme.js`: `set` writes `data-theme` and storage (try/catch), calls listeners. The ink spread is added in Task 7, so here `set` resolves right away.
  - `index.html`: add the head snippet, fonts, and swap `css/style.css` to `css/zen.css`. Load `js/theme.js` before `js/common.js`.

- [ ] **Step 4: Run to verify it passes**

Run the snippet again. Expected: `{ theme: 'washi'|'sumi', bgIsPaper: true, afterSet: ['sumi','sumi'], afterToggle: 'washi' }`.
Also: run `localStorage.setItem('zen-theme','sumi')`, reload, and screenshot right after navigation. Expected: dark from the first frame (Review Focus 1).
Also: in DevTools, block storage (or run `Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}})` before the scripts load, through a query flag in the harness). Expected: page renders, `Theme.toggle()` still switches for the session (Review Focus 2).

- [ ] **Step 5: Measure contrast**

Run a contrast script over the token pairs in both themes (same formula as the antislop contrast tool). Expected: every text pair at least 4.5.

- [ ] **Step 6: Commit**

`git add css/zen.css js/theme.js index.html && git commit -m "Add Ai-zome tokens, base styles and theme module"`

---

### Task 2: Icon sprite and app shell

**Files:**
- Create: `img/icons.svg`, `js/shell.js`
- Modify: `index.html` (replace `aside.sidebar` with the rail, add mobile header and tab bar, new page header), `css/zen.css` (shell section, page transition rule)

**Interfaces:**
- Consumes: `Theme` (Task 1).
- Produces: icon ids `money calendar ema kendama scroll soroban moon sun noren wind petal`, used as `<svg aria-hidden="true"><use href="img/icons.svg#money"/></svg>`.
- Produces markup contract (later pages copy it):
  - `<nav class="rail" aria-label="Menu utama">` with `a.rail-logo`, `a.rail-link[aria-label][data-tip]` x6 (`aria-current="page"` on active), and `div.rail-tools` holding `button#btn-motion`, `button#btn-petals`, `button#btn-theme`, `button#btn-logout`.
  - `<header class="mobile-bar">` with the logo and the same four tools as `.mobile-tools` (ids suffixed `-m`).
  - `<nav class="tabbar" aria-label="Menu utama">` with six `a.tab` (icon plus label).
  - `<header class="page-head">` with `p.eyebrow`, `h1`, `span.tategaki[aria-hidden]`, and `span.watermark[aria-hidden]` (kanji 金 on Keuangan).
- Produces: `js/shell.js` exports nothing global; on `DOMContentLoaded` it binds theme buttons to `Theme.toggle(btn)`, updates the theme icon (`moon` in washi, `sun` in sumi), and creates one tooltip element shown on `mouseenter`/`focus` of any `[data-tip]` (hidden on `mouseleave`/`blur`/Escape). Motion and petal buttons are bound in Tasks 3 and 4.
- Logout keeps `id="btn-logout"` so `js/auth.js` still binds it; the mobile copy calls the same `logout()`.

- [ ] **Step 1: Write the checks** (`.superpowers/mock/checks/task2.js`)

```js
const r = {};
const links = [...document.querySelectorAll('.rail .rail-link')];
r.links = links.length;                                                         // 6
r.named = links.every(a => a.getAttribute('aria-label'));                        // true
r.active = document.querySelector('.rail [aria-current="page"]')?.getAttribute('href'); // 'index.html'
r.iconsHidden = [...document.querySelectorAll('.rail svg')].every(s => s.getAttribute('aria-hidden') === 'true'); // true
links[1].dispatchEvent(new Event('focus'));
r.tip = document.querySelector('.tooltip')?.textContent;                         // 'Jadwal & tugas'
r.h1 = document.querySelectorAll('h1').length;                                   // 1
r.watermarkHidden = document.querySelector('.watermark')?.getAttribute('aria-hidden'); // 'true'
r;
```

At 375px width also check: `document.documentElement.scrollWidth <= innerWidth`, `.tabbar` visible, `.rail` hidden, last content element bottom above the tab bar top.

- [ ] **Step 2: Run to verify it fails.** Expected: `links: 0`.
- [ ] **Step 3: Implement** the sprite (shapes from the approved mockup `.superpowers/brainstorm/296-1795843331/content/icons.html`, option A), the markup contract above, the shell CSS (rail 72px, active bar 3px `--hanko` on the left, tooltip, mobile breakpoint 768px, tab bar with `env(safe-area-inset-bottom)`, 44px targets), `@view-transition { navigation: auto; }` with a 250ms fade, and `js/shell.js`.
- [ ] **Step 4: Run checks at 1280px and 375px.** Expected values as commented. Keyboard: Tab from the skip link reaches the logo, six links, and four tools in order, each with a visible focus ring and tooltip.
- [ ] **Step 5: Commit** `git commit -m "Add icon sprite and rail shell"`

---

### Task 3: Motion module and modal motion

**Files:**
- Create: `js/motion.js`
- Modify: `js/common.js` (`openModal`, `closeModal`), `js/shell.js` (bind `#btn-motion`), `index.html` (GSAP script, motion.js)

**Interfaces:**
- Produces: `window.Motion = { get full(): boolean, setFull(on: boolean): void, onChange(fn: (full) => void): void, countUp(el: Element, value: number, format: (n) => string): void, stagger(els: Element[] | NodeList): void, stampHanko(cardEl: Element): void, modalIn(overlay: Element, originEl: Element | null): void, modalOut(overlay: Element): Promise<void> }`
- `full` default: stored `zen-motion` if present, else `!matchMedia('(prefers-reduced-motion: reduce)').matches`. Also sets `document.documentElement.dataset.motion = 'full'|'calm'`.
- Exact timings from spec section 4: count-up 1.4s `power3.out`; stagger 0.5s each, 0.1s apart, from `opacity 0, x -14`; hanko from `scale 2.2, rotate -25` to `scale 1, rotate -8`, 0.28s `back.out(3)`, card shake 3 cycles of 3px; modal blot 0.45s `power2.out` then sheet `autoAlpha 0, y 12` to `1, 0` in 0.3s; modal out under 250ms total.
- When `!full` or no `window.gsap`: `countUp` writes the final text, `stagger` does nothing, `stampHanko` shows the seal statically, `modalOut` resolves immediately.
- `common.js`: `openModal` calls `window.Motion?.modalIn(modal, modalReturnFocus[modalId])` after adding `.open`. `closeModal` awaits `window.Motion ? Motion.modalOut(modal) : null` before removing `.open`, then restores focus as today. Esc and overlay click keep working.
- `#btn-motion` (and `-m`) toggles `Motion.setFull(!Motion.full)`, has `aria-pressed` = full, and the label "Gerak: penuh" or "Gerak: hemat" as tooltip and `aria-label`.

- [ ] **Step 1: Write the checks** (`checks/task3.js`)

```js
const W = ms => new Promise(s => setTimeout(s, ms)); const r = {};
Motion.setFull(false);
const el = document.createElement('p'); document.body.append(el);
Motion.countUp(el, 4131000, formatRp); r.calmCount = el.textContent;            // 'Rp 4.131.000' immediately
Motion.setFull(true);
Motion.countUp(el, 4131000, formatRp); await W(200); r.midCount = el.textContent !== 'Rp 4.131.000'; // true
await W(1500); r.endCount = el.textContent;                                       // 'Rp 4.131.000'
r.stored = localStorage.getItem('zen-motion');                                    // 'full'
openModal('walletModal'); await W(600);
r.open = document.getElementById('walletModal').classList.contains('open');      // true
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await W(400);
r.closed = !document.getElementById('walletModal').classList.contains('open');   // true
const card = document.createElement('div'); card.className = 'paper'; document.body.append(card);
Motion.stampHanko(card); await W(500);
const seal = card.querySelector('.hanko-seal');
r.seal = seal && seal.textContent;                                                // '済'
r.sealHidden = seal && seal.getAttribute('aria-hidden');                          // 'true'
r.sealVisible = seal && getComputedStyle(seal).opacity;                           // '1'
delete window.gsap; Motion.setFull(true); Motion.countUp(el, 5, String); r.noGsap = el.textContent; // '5'
r;
```

- [ ] **Step 2: Run to verify it fails.** Expected: `Motion is not defined`.
- [ ] **Step 3: Implement** `js/motion.js` with the interface above, the `common.js` hooks, and the motion button binding. Load order in `index.html`: Supabase, `theme.js`, `motion.js`, `common.js`, `auth.js`, `shell.js`, page scripts, then GSAP with `defer`.
- [ ] **Step 4: Run checks.** Expected values as commented. Also verify that the existing focus-return behavior still works: open the transaction modal with a real click, press Escape, and `document.activeElement` is the "+ Catat transaksi" button.
- [ ] **Step 5: Commit** `git commit -m "Add motion module and ink modal transitions"`

---

### Task 4: Interactive sakura petals

**Files:**
- Create: `js/petals.js`
- Modify: `js/shell.js` (bind `#btn-petals`), `index.html` (canvas element as first child of `<body>`: `<canvas class="petals" aria-hidden="true"></canvas>`), `css/zen.css` (`.petals { position: fixed; inset: 0; pointer-events: none; z-index: 0 }`, content above it)

**Interfaces:**
- Consumes: `Motion.full`, `Motion.onChange` (Task 3).
- Produces: `window.Petals = { get paused(): boolean, setPaused(on: boolean): void }`. Auto-starts on `DOMContentLoaded` when a `canvas.petals` exists.
- Behavior and constants from the approved demo `.superpowers/brainstorm/296-1795843331/content/petals.html`: three sprite tints, notched petal path, `BASE = 22`, `MAX = 60`, size `0.5 + random*0.45`, cursor radius 120, click gust radius 260 plus 7 new petals, scroll drift, DPR capped at 2.
- Differences from the demo: listen on `window` (not a stage), ignore `pointerdown` whose target is inside `a, button, input, select, textarea, label, [role="dialog"], .modal-overlay` (Review Focus 4), stop the RAF loop on `visibilitychange` hidden and restart on visible, hide the canvas when `!Motion.full || paused`.
- `#btn-petals` toggles `setPaused`, stores `zen-petals`, `aria-pressed` = paused, tooltip "Jeda kelopak" or "Putar kelopak".

- [ ] **Step 1: Write the checks** (`checks/task4.js`)

```js
const W = ms => new Promise(s => setTimeout(s, ms)); const r = {};
Motion.setFull(true); Petals.setPaused(false); await W(300);
const cv = document.querySelector('canvas.petals');
r.visible = getComputedStyle(cv).display !== 'none';                              // true
r.passThrough = getComputedStyle(cv).pointerEvents;                               // 'none'
let clicked = false; const b = document.querySelector('.btn-add'); b.addEventListener('click', () => clicked = true, { once: true });
b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); b.click();
r.buttonWorks = clicked;                                                          // true
closeModal('transactionModal');
Motion.setFull(false); await W(100); r.hiddenWhenCalm = getComputedStyle(cv).display;   // 'none'
Motion.setFull(true); Petals.setPaused(true); r.stored = localStorage.getItem('zen-petals'); // 'paused'
r;
```

- [ ] **Step 2: Run to verify it fails.** Expected: `Petals is not defined`.
- [ ] **Step 3: Implement** `js/petals.js` with the interface above and the button binding.
- [ ] **Step 4: Run checks.** Expected values as commented. Screenshot with motion full: petals visible behind content in both themes, notched shape readable.
- [ ] **Step 5: Commit** `git commit -m "Add interactive sakura petals"`

---

### Task 5: Components restyle

**Files:**
- Modify: `css/zen.css` (components section)

**Interfaces:**
- Produces CSS classes later pages use: `.paper` (card), `.ledger` with `.ledger-row`, `.ledger-main`, `.ledger-meta`, `.amount`, `.amount.in` (`--ai`), `.amount.out` (`--hanko`), `.amount.move` (`--muted`); buttons `.btn`, `.btn-primary`, `.btn-outline`, `.btn-text`, `.btn-danger`; `.field` (label plus underline input); `.modal-overlay`, `.modal-sheet`, `.modal-head`, `.modal-actions`; `#toast` states `.show`, `.success`, `.error`; `.chip`; `.hanko-seal` (the 済 element used by `Motion.stampHanko`).
- Values from spec section 1 (Shape and spacing) and section 3.

- [ ] **Step 1: Write the checks** (`checks/task5.js`, run on a scratch page `.superpowers/mock/components.html` that renders one of each component in both themes)

```js
const r = {};
const px = (sel, prop) => getComputedStyle(document.querySelector(sel))[prop];
r.btnRadius = px('.btn-primary', 'borderRadius');      // '3px'
r.cardRadius = px('.paper', 'borderRadius');           // '6px'
r.sheetRadius = px('.modal-sheet', 'borderRadius');    // '8px'
r.cardShadow = px('.paper', 'boxShadow');              // 'none'
r.outColor = px('.amount.out', 'color');               // washi: 'rgb(178, 58, 46)'
r;
```

- [ ] **Step 2: Run to verify it fails.** Expected: `null` element errors (classes not styled or page missing).
- [ ] **Step 3: Implement** the components section and the scratch page.
- [ ] **Step 4: Run checks in washi and sumi.** In sumi, `r.outColor` is `rgb(240, 122, 110)`. Screenshot both themes; hover, active, focus-visible, and disabled states visibly differ.
- [ ] **Step 5: Commit** `git commit -m "Restyle components for Ai-zome"` (the scratch page stays git-ignored)

---

### Task 6: Keuangan page

**Files:**
- Modify: `index.html` (main content markup), `js/ui.js` (templates, chart colors, first-load motion), `css/zen.css` (Keuangan section)

**Interfaces:**
- Consumes: Task 2 markup contract, Task 3 `Motion`, Task 5 classes, `Theme.onChange`.
- Layout (approved mockup option B, `layout.html`):
  - page head: eyebrow "Keuangan · <month year>", h1 "Keuangan", tategaki "静かに数える", watermark 金
  - hero row: wallet select plus big mincho amount (left), primary "+ Catat transaksi" (right)
  - grid `1fr 1.4fr`:
    - left: "Bulan ini" ledger (Masuk, Keluar, Selisih), the doughnut, the Dompet list, the "Pindahin saldo" block
    - right: "Buku kas" ledger (recent 5), then the full "Semua transaksi" ledger with the month filter below
  - collapses to one column under 1100px
- `ui.js` changes:
  - `renderRecent`, `renderAllTransactions` and `renderWallets` output `.ledger-row` markup (still using `esc()` on every user value)
  - amounts get `.amount.in`, `.amount.out` or `.amount.move`
  - module-level `let firstPaint = true`: on the first successful `updateDashboard`, call `Motion.countUp` on the balance, total, and month rows, plus `Motion.stagger` on ledger rows, then set `firstPaint = false`
  - later renders write final values with no animation (Review Focus 3)
  - `chartColors` and legend color read from CSS variables at render time (`--ai`, `--hanko`, `--muted`, and tints)
  - `Theme.onChange(() => updateDashboard())` re-renders the chart (Review Focus 5)
- Data functions in `js/api.js` are not changed.

- [ ] **Step 1: Write the checks** (`checks/task6.js`)

```js
const W = ms => new Promise(s => setTimeout(s, ms)); const r = {};
await W(2200);
r.balance = document.getElementById('display-current-balance').textContent;      // 'Rp 4.131.000' style value, not 'Memuat...'
r.rows = document.querySelectorAll('#all-tx-list .ledger-row').length > 0;       // true
r.outClass = !!document.querySelector('#all-tx-list .amount.out');               // true
openModal('transactionModal'); document.getElementById('type-expense').checked = true;
document.getElementById('tx-desc').value = 'Tes'; document.getElementById('tx-amount').value = '1000';
const before = document.getElementById('display-current-balance').textContent;
document.getElementById('btn-save-tx').click(); await W(300);
r.noReplay = !/^Rp 0$/.test(document.getElementById('display-current-balance').textContent); // true: no count-up from 0 after save
await Theme.set('sumi'); await W(300);
r.legendColor = Chart.getChart('expenseChart').options.plugins.legend.labels.color;           // sumi --muted '#A9AEB9'
r.xss = window.__xss || 0;                                                         // 0
r;
```

Also rerun the earlier Keuangan click-through (edit, delete with cancel and confirm, add wallet, same-wallet transfer rejected, valid transfer, month filter, wallet select, `?delay`, `?fail` with retry).

- [ ] **Step 2: Run to verify it fails.** Expected: `rows: false` (old markup).
- [ ] **Step 3: Implement** the markup, the `ui.js` template and motion changes, and the page CSS.
- [ ] **Step 4: Run checks and the click-through** in washi and sumi, motion full and calm, at 1280px and 375px. Expected values as commented; no horizontal overflow; console clean.
- [ ] **Step 5: Commit** `git commit -m "Redesign Keuangan page"`

---

### Task 7: Theme ink spread

**Files:**
- Modify: `js/theme.js`, `css/zen.css`

**Interfaces:**
- `Theme.set(name, originEl)` with `Motion.full` and `document.startViewTransition` available: start a view transition that swaps `data-theme`, and animate `::view-transition-new(root)` with `clip-path: circle(0 at X Y)` to `circle(R at X Y)` (R = distance to the farthest corner) over 0.7s `ease-in-out`. Returning to washi plays the reverse on `::view-transition-old(root)`. X, Y = center of `originEl`.
- Without motion or without the API: swap instantly.
- The promise resolves when the transition finishes.

- [ ] **Step 1: Write the checks** (`checks/task7.js`)

```js
const r = {}; Motion.setFull(true);
const btn = document.getElementById('btn-theme');
const t0 = performance.now(); await Theme.toggle(btn); r.ms = Math.round(performance.now() - t0); // about 700 when supported
r.theme = document.documentElement.dataset.theme;
Motion.setFull(false); const t1 = performance.now(); await Theme.toggle(btn); r.calmMs = Math.round(performance.now() - t1); // under 50
r;
```

- [ ] **Step 2: Run to verify it fails.** Expected: `ms` under 50 (no transition yet).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run checks.** Expected as commented. Visually confirm the circle grows from the moon button in both directions.
- [ ] **Step 5: Commit** `git commit -m "Add ink spread theme transition"`

---

### Task 8: Login page

**Files:**
- Modify: `login.html`, `css/zen.css` (login section)

**Interfaces:**
- Consumes: tokens, components, `Theme` (head snippet), `Motion` (no petals on login per spec).
- Layout: centered paper sheet; vertical logo マネージャー on the left edge of the sheet (desktop) or above the form (mobile); `.field` inputs; primary "Masuk", outline "Coba akun demo", the shared-demo hint, the toggle link; a small theme button in the top right corner. `js/login.js` logic and element ids stay unchanged.

- [ ] **Step 1: Write the checks** (`checks/task8.js`)

```js
const r = {};
r.ids = ['auth-form','auth-email','auth-password','btn-submit','btn-demo','btn-toggle'].every(id => document.getElementById(id)); // true
r.labels = [...document.querySelectorAll('input')].every(i => i.labels.length);  // true
r.noPetals = !document.querySelector('canvas.petals');                            // true
r.overflow = document.documentElement.scrollWidth > innerWidth;                   // false (also at 375px)
r.themeBtn = !!document.getElementById('btn-theme');                              // true
r.zenCss = !!document.querySelector('link[href="css/zen.css"]');                  // true
r;
```

- [ ] **Step 2: Run to verify it fails.** Expected: `themeBtn: false`, `zenCss: false`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run checks** plus the flow: toggle Daftar and Masuk, submit empty (toast), submit valid (redirects to index), in both themes and at 375px.
- [ ] **Step 5: Commit** `git commit -m "Redesign login page"`

---

### Task 9: Phase 1 verification

**Files:**
- Create: `anti-slop/report-002-<date>.md` (git-ignored, for the owner)

- [ ] **Step 1:** Run all `checks/task*.js` again on a fresh harness session (`?empty=1` once, then seeded data).
- [ ] **Step 2:** Measure every text/background pair used on index and login in both themes. Expected: all at least 4.5.
- [ ] **Step 3:** Keyboard-only pass through index and login in both themes; reduced-motion pass with the system setting on and no override (no animation, no petals).
- [ ] **Step 4:** Write the antislop Delivery Gate report (four blocks, each PASS with evidence), plus a list of what the owner should look at.
- [ ] **Step 5:** Push the branch (`git push -u origin redesign-ai-zome`). Do not open a PR to `main` yet; the owner reviews the Vercel preview of this branch before Phase 2.
