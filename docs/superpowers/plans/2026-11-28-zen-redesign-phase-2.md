# Zen Redesign Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Jadwal & tugas, Wishlist, Hobi, Dumpspaces and Sudoku to the Ai-zome design. Close the security note and the deferred minors from Phase 1 review. Retire `css/style.css` so the branch can merge.

**Architecture:** Same static multi-page app. Every page gets the Phase 1 shell (head theme snippet, rail, mobile header, tab bar, page head, petals canvas) and loads `css/zen.css` plus `theme.js`, `motion.js`, `petals.js` and `shell.js`. Inline `onclick="fn('${id}')"` in JS templates is replaced by `data-action` attributes and one delegated listener per list (`onAction`). This removes the JS-string injection path the reviewer flagged. Data logic (Supabase calls) stays unchanged.

**Tech Stack:** HTML, CSS custom properties, vanilla JS, GSAP 3.12.5, Supabase JS v2 (all from Phase 1).

**Spec:** `docs/superpowers/specs/2026-11-28-zen-redesign-design.md` (Phase 2 = spec section 7, second paragraph)
**Phase 1 plan (patterns to copy):** `docs/superpowers/plans/2026-11-28-zen-redesign-phase-1.md`

## Global Constraints

- All Phase 1 Global Constraints still apply (tokens, fonts, GSAP URL, localStorage keys, no em dash, casual Indonesian, hanko as the only accent, icon buttons with `aria-label` plus tooltip, calm motion means no animation and no petals, keep `common.js` behavior).
- Modal sheet animation uses `opacity`, never `autoAlpha`/`visibility` (Phase 1 review finding: hidden sheets cannot take focus).
- No inline event handlers built from data. In JS templates, ids go in `data-id="${esc(id)}"` and actions in `data-action="<name>"`. Static `onclick="openModal('x')"` in HTML with literal arguments is fine.
- Shell markup is copied verbatim from `index.html` (Phase 1 contract). Only `aria-current="page"` moves, plus page title, eyebrow, tategaki and watermark.
- Page identity:

| Page | h1 | Watermark | Tategaki | Eyebrow |
| --- | --- | --- | --- | --- |
| `schedule.html` | Jadwal & tugas | 予 | 一日一歩 | Jadwal · `<bulan tahun>` |
| `wishlist.html` | Wishlist | 願 | 願いを叶える | Wishlist |
| `hobbies.html` | Hobi | 遊 | 好きなことを | Hobi |
| `dumpspaces.html` | Dumpspaces | 記 | 思いつきを書く | Dumpspaces |
| `minigames.html` | Sudoku | 数 | 静かに考える | Sudoku |

- Hanko 済 triggers (spec section 4, moment 3), only on the transition, never on load:
  - **Wishlist:** an update moves a wish from below 100% to 100% or more. Stamp the wish card.
  - **Tasks:** a checkbox change leaves zero unfinished tasks with `deadline` equal to today, and at least one task is due today. Stamp the task list paper.
  - **Sudoku:** the last empty cell is solved. Stamp the board container.
- Branch `redesign-ai-zome`. Merging to `main` is the owner's call after review.

## Review Focus

1. **Crafted ids:** a row whose id contains `'`, `)` or `<` must not run script when its buttons are clicked. Test in Task 1.
2. **Hanko on load:** a wishlist already at 100%, or a day whose tasks are all done, must not stamp when the page opens. Test in Tasks 4 and 3.
3. **Calendar keyboard and screen reader:** day buttons keep their `aria-label` ("Sabtu, 28 November, 2 jadwal") and the today marker in both themes. Test in Task 3.
4. **Old local data shapes:** hobbies or dumps rows missing `type`, `status`, `rating` or `url` must render with fallbacks, not crash the list. Test in Tasks 5 and 6.
5. **Sudoku on a phone:** the 9x9 board fits 375px with cells at least 34px and no horizontal overflow, in both themes. Test in Task 7.

## Test harness

Same as Phase 1: `.superpowers/mock/` (git-ignored), started via `.claude/launch.json` (`python -I .superpowers/mock/server.py . 5517`). Do not commit `.claude/`.

Static suite: `node .superpowers/mock/static-check.mjs <task>`. Task 1 extends it with Phase 2 checks:
- from Task 2 on, all seven `*.html` files load `css/zen.css`
- no `onclick="` or `onchange="` containing `${` in `js/*.js`
- `css/style.css` absent from Task 8

Browser checks run in the Claude browser with the snippet given per task. Make the Browser pane visible for timing checks; if it stays hidden, verify config and record a ruling.

## File map

| File | Change |
| --- | --- |
| `js/common.js` | Add `onAction(root, handlers)` |
| `js/ui.js` | Templates to `data-action`; zero totals without sign |
| `js/motion.js` | Kill running modal timelines in `modalIn`/`modalOut`; reset blot in calm |
| `js/shell.js` | Toggle buttons: stable label + `aria-pressed` |
| `js/petals.js` | Cursor velocity decays; reliable pointer leave |
| `js/schedule.js`, `js/wishlist.js`, `js/hobbies.js`, `js/dumpspaces.js`, `js/minigames.js` | Templates to `data-action` + new classes; hanko triggers; first-load stagger |
| `schedule.html`, `wishlist.html`, `hobbies.html`, `dumpspaces.html`, `minigames.html` | Phase 1 shell + new page markup |
| `index.html`, `login.html` | Head snippet wrapped in an IIFE |
| `css/zen.css` | Page sections for the five pages |
| `css/style.css` | Deleted (Task 8) |
| `README.md` | Project structure table updated (Task 8) |

---

### Task 1: Action delegation and Phase 1 follow-ups

**Files:**
- Modify: `js/common.js`, `js/ui.js`, `js/motion.js`, `js/shell.js`, `js/petals.js`, `index.html`, `login.html`, `.superpowers/mock/static-check.mjs`, `.superpowers/mock/supabase.js` (seed one wallet and one transaction with id `x');window.__xss=7;('`)

**Interfaces:**
- Produces: `onAction(root: Element | string, handlers: Record<string, (id: string, el: Element, event: Event) => void>): void`. It adds one `click` listener on `root`, finds `event.target.closest('[data-action]')` inside root, and calls `handlers[el.dataset.action](el.dataset.id, el, event)`. For `input[type=checkbox]` it listens to `change` instead, so keyboard toggling works.
- Index actions: `wallet-delete`, `tx-edit`, `tx-delete` on `#wallets-list` and `#all-tx-list`.
- `Motion.modalIn`/`modalOut` call `gsap.killTweensOf([sheet, blot])` first. When `!Motion.full`, `modalIn` resets any leftover blot to `scale 0, opacity 0` and clears sheet inline styles.
- `shell.js`:
  - Motion button: label "Gerak penuh" fixed, `aria-pressed` = `Motion.full`; tooltip "Gerak: penuh" or "Gerak: hemat".
  - Petals button: label "Kelopak sakura" fixed, `aria-pressed` = `!Petals.paused`; tooltip "Kelopak: jalan" or "Kelopak: dijeda".
- `petals.js`: `mouse.vx`/`vy` multiply by 0.9 each frame. Pointer leave is detected with `document.documentElement` `mouseleave` and `pointerout` when `relatedTarget === null`.
- `ui.js`: month totals show "Rp 0" with no sign when the value is 0.
- Head snippet: `<script>(function(){var t;try{t=localStorage.getItem('zen-theme');}catch(e){}document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'sumi':'washi');})();</script>`

- [ ] **Step 1: Write the checks**

```js
// index.html with the crafted-id seed (?empty=0 after clearing sessionStorage.mock_db)
const W = ms => new Promise(s => setTimeout(s, ms)); await W(1500); const r = {};
document.querySelectorAll('#all-tx-list [data-action="tx-edit"], #all-tx-list .btn-text').forEach(b => b.click());
await W(300); document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id)); await W(500);
r.xss = window.__xss || 0;                                                     // 0 (RF1)
r.inlineHandlers = document.querySelectorAll('#all-tx-list [onclick], #wallets-list [onclick]').length; // 0
const keep = transactions; transactions = []; updateDashboard();
r.zeroSign = [document.getElementById('display-total-income').textContent, document.getElementById('display-total-expense').textContent]; // ['Rp 0', 'Rp 0']
transactions = keep; updateDashboard();
r.globalT = 't' in window;                                                     // false
Motion.setFull(true); openModal('walletModal'); await W(50); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await W(700);
Motion.setFull(false); openModal('walletModal'); await W(50);
const blot = document.querySelector('#walletModal .ink-blot');
r.blotClean = !blot || getComputedStyle(blot).opacity === '0' || blot.style.transform.includes('scale(0');   // true
closeModal('walletModal');
const mb = document.getElementById('btn-motion'); r.motionLabel = mb.getAttribute('aria-label'); r.motionPressed = mb.getAttribute('aria-pressed'); // 'Gerak penuh', 'false'
r;
```

Also: `node .superpowers/mock/static-check.mjs 1p2` reports 0 template inline handlers.

- [ ] **Step 2: Run to verify it fails.** Expected: `xss: 7` (crafted id breaks out of `onclick`), `inlineHandlers: 3` or more, `zeroSign: ['+Rp 0', '-Rp 0']`, `globalT: true`.
- [ ] **Step 3: Implement** the interfaces above. Static check additions: a `phase2` mode (argument ending in `p2`) that greps `js/*.js` for `onclick="` or `onchange="` followed by `${` on the same line.
- [ ] **Step 4: Run checks.** Expected values as commented. Rerun the Phase 1 Keuangan click-through (edit, delete cancel and confirm, wallet add and delete, transfer) to confirm actions still work through delegation.
- [ ] **Step 5: Commit** `git commit -m "Delegate row actions and close Phase 1 review follow-ups"`

---

### Task 2: Shell on the five pages

**Files:**
- Modify: `schedule.html`, `wishlist.html`, `hobbies.html`, `dumpspaces.html`, `minigames.html` (`<head>`, shell, page head, script tags only; page content untouched in this task)

**Interfaces:**
- Consumes: Phase 1 shell contract and the Task 1 head snippet.
- Script order on every page: Supabase, `theme.js`, `motion.js`, `petals.js`, `common.js`, `auth.js`, `shell.js`, page script, GSAP `defer`.
- The old `aside.sidebar` and old `header.header` are removed. The page's primary button moves into `.page-head`, keeping its id and `onclick`.

- [ ] **Step 1: Write the checks** (run on each of the five pages)

```js
const r = {};
r.zen = !!document.querySelector('link[href="css/zen.css"]');                   // true
r.oldCss = !!document.querySelector('link[href="css/style.css"]');              // false
r.rail = document.querySelectorAll('.rail .rail-link').length;                  // 6
r.current = document.querySelector('.rail [aria-current="page"]').getAttribute('href') === location.pathname.slice(1); // true
r.watermark = document.querySelector('.watermark')?.textContent;                // per page table
r.h1 = document.querySelectorAll('h1').length;                                  // 1
r.petals = !!document.querySelector('canvas.petals');                           // true
r;
```

- [ ] **Step 2: Run to verify it fails.** Expected: `zen: false`, `rail: 0`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run checks on all five pages.** Also: navigate rail links between all seven pages. Expected: no console errors, and the theme and motion choice persists across pages.
- [ ] **Step 5: Commit** `git commit -m "Add Ai-zome shell to remaining pages"`

---

### Task 3: Jadwal & tugas

**Files:**
- Modify: `schedule.html` (content markup), `js/schedule.js`, `css/zen.css` (Jadwal section)

**Interfaces:**
- Consumes: `onAction`, `Motion.stagger`, `Motion.stampHanko`, Phase 1 components.
- Layout (RHYTHM 3):
  - **Left, wide:** the calendar as a large paper sheet. The month title is in mincho with `‹ ›` icon buttons. Day cells are thin-ruled squares. Today has a hanko-red outline, and selected-day hover uses an indigo tint. Event pills use the priority classes: High = hanko, Medium = ai, Low = muted outline.
  - **Right column:** "Hari ini" as an unboxed list with a left rule, then "Tugas" as a `.paper` ledger with checkboxes.
  - Collapses to one column under 1100px.
- Actions:
  - `#daily-schedule-list`: `schedule-edit` and `schedule-delete`.
  - `#task-list`: `task-toggle` (checkbox with `data-action="task-toggle"` and `data-id`, on change) and `task-delete`.
  - The tasks section is `<section class="paper" id="task-paper">`.
- `toggleTask` stamps `#task-paper` when the Global Constraints rule is met.
- `openAddFromDaily` and `editSchedule` now `await closeModal('dailyModal')` before `openModal(...)`.
- First load: `Motion.stagger` on day cells with events, then the today list rows.
- Calendar day `aria-label` format is unchanged (RF3).

- [ ] **Step 1: Write the checks**

```js
const W = ms => new Promise(s => setTimeout(s, ms)); await W(1500); const r = {};
r.inline = document.querySelectorAll('#task-list [onclick], #task-list [onchange], #daily-schedule-list [onclick]').length; // 0
const today = document.querySelector('.day-cell.today');
r.todayLabel = /\d+ jadwal|kosong/.test(today.getAttribute('aria-label'));           // true (RF3)
r.todayOutline = getComputedStyle(today).outlineColor || getComputedStyle(today).borderColor; // hanko token
r.sealOnLoad = !!document.querySelector('#task-paper .hanko-seal');                 // false (RF2)
// make one task due today, unfinished, then finish it
const t = tasks[0]; t.deadline = localDateStr(); t.completed = false; tasks.slice(1).forEach(x => { if (x.deadline === localDateStr()) x.completed = true; });
renderTasks(); document.querySelector(`#task-list input[data-id="${CSS.escape(String(t.id))}"]`).click(); await W(900);
r.sealAfterDone = !!document.querySelector('#task-paper .hanko-seal');              // true
// daily -> add flow keeps focus in the schedule modal
today.focus(); today.click(); await W(400);
[...document.querySelectorAll('#dailyModal button')].find(b => b.textContent.includes('Tambah')).click(); await W(800);
r.focusInSchedule = document.getElementById('scheduleModal').contains(document.activeElement); // true
r.prefill = document.getElementById('sch-date').value;                              // date of the clicked day
r.xss = window.__xss || 0;                                                          // 0
r;
```

Also rerun the Phase 1-era Jadwal click-through: edit from daily, add from daily, delete from daily (confirm on top), task add, toggle and delete, month navigation. Do it in both themes and at 375px.

- [ ] **Step 2: Run to verify it fails.** Expected: `inline` above 0, `#task-paper` missing.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run checks.** Expected values as commented; no overflow at 375px; console clean.
- [ ] **Step 5: Commit** `git commit -m "Redesign Jadwal page"`

---

### Task 4: Wishlist

**Files:**
- Modify: `wishlist.html`, `js/wishlist.js`, `css/zen.css` (Wishlist section)

**Interfaces:**
- Layout: a grid of `.paper` wish cards (min 280px), each with:
  - the title in mincho (`.card-link` with action `wish-open`)
  - the target in tabular numbers
  - an ink progress bar: 6px, `--ai` fill, `--line` track; at 100% the fill turns `--muted` and "Tercapai" shows
  - up to 3 plans as a small ledger

  The first card spans two columns on desktop when there are 3 or more wishes (RHYTHM 3: the featured wish is the one closest to its target).
- `saveEditWish` calls `Motion.stampHanko(card)` only when the previous percent was below 100 and the new one is 100 or more (RF2).
- First load: `Motion.stagger` on cards.

- [ ] **Step 1: Write the checks**

```js
const W = ms => new Promise(s => setTimeout(s, ms)); await W(1500); const r = {};
r.inline = document.querySelectorAll('#wishlist-container [onclick]').length;      // 0
r.sealOnLoad = document.querySelectorAll('#wishlist-container .hanko-seal').length; // 0 (seed has one wish already over 100%) (RF2)
const w = wishlists.find(x => x.currentAmount < x.targetAmount);
document.querySelector(`[data-action="wish-open"][data-id="${CSS.escape(String(w.id))}"]`).click(); await W(400);
document.getElementById('edit-wish-current').value = String(w.targetAmount); document.getElementById('btn-update-wish').click(); await W(1200);
r.sealAfter = !!document.querySelector(`[data-id="${CSS.escape(String(w.id))}"]`).closest('.wish-card').querySelector('.hanko-seal'); // true
r.featured = getComputedStyle(document.querySelector('.wish-card')).gridColumnEnd; // 'span 2' when 3+ wishes at 1280px
r.xss = window.__xss || 0;                                                        // 0
r;
```

- [ ] **Step 2: Run to verify it fails.** Expected: `inline: 2` or more.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run checks** plus add, validation toast, edit plans, delete with confirm, in both themes and at 375px.
- [ ] **Step 5: Commit** `git commit -m "Redesign Wishlist page"`

---

### Task 5: Hobi

**Files:**
- Modify: `hobbies.html`, `js/hobbies.js`, `css/zen.css` (Hobi section), `.superpowers/mock/supabase.js` (seed row `b9`)

**Interfaces:**
- Layout:
  - **Left, wide:** rated cards as tall paper cards with a mincho kana cover (アニメ, 映画, ドラマ, ゲーム) on the type's tint, stars in `--hanko`, and the review in italic muted text.
  - **Right:** "Antrian" as a ledger with the type chip and the title (action `hobby-open`).
- Fallbacks (RF4):
  - unknown or missing `type` renders as Anime styling with the raw value escaped as the chip text
  - missing `rating` renders 0 stars with the label "Belum dinilai"
  - unknown `status` is treated as queue
- First load: `Motion.stagger` on cards and rows.

- [ ] **Step 1: Write the checks** (seed adds `{ id: 'b9', title: 'Tanpa tipe', user_id }` with no type, status or rating)

```js
const W = ms => new Promise(s => setTimeout(s, ms)); await W(1500); const r = {};
r.inline = document.querySelectorAll('#watchlist-container [onclick], #ratings-container [onclick]').length; // 0
r.fallbackShown = document.getElementById('watchlist-container').textContent.includes('Tanpa tipe');        // true (RF4)
r.kana = [...document.querySelectorAll('.card-cover')].map(c => c.textContent.trim());                       // includes 'アニメ'
r.xss = window.__xss || 0;                                                                                   // 0
r;
```

- [ ] **Step 2: Run to verify it fails.** Expected: `inline` above 0; with the old code the missing-status row is filtered out, so `fallbackShown: false`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run checks** plus add, edit (queue to completed shows the rating area), delete, in both themes and at 375px.
- [ ] **Step 5: Commit** `git commit -m "Redesign Hobi page"`

---

### Task 6: Dumpspaces

**Files:**
- Modify: `dumpspaces.html`, `js/dumpspaces.js`, `css/zen.css` (Dumpspaces section)

**Interfaces:**
- Layout: CSS columns masonry (`columns: 3 260px`, `break-inside: avoid`) of paper cards.
  - Notes: a note with a long body gets a tategaki-style left rule.
  - Links: link cards show the hostname in tabular muted text above "Buka link".
  - Images: image cards are full-bleed with the caption under them.
- Action `dump-delete`.
- Fallbacks (RF4): missing `url` on a Link shows "Link-nya ga valid." (existing); a missing `type` renders as Note.
- First load: `Motion.stagger` on cards.

- [ ] **Step 1: Write the checks**

```js
const W = ms => new Promise(s => setTimeout(s, ms)); await W(1500); const r = {};
r.inline = document.querySelectorAll('#dumps-container [onclick]').length;   // 0
r.jsLink = [...document.querySelectorAll('#dumps-container a')].some(a => a.href.startsWith('javascript')); // false
r.host = document.querySelector('.dump-host')?.textContent;                    // 'developer.mozilla.org'
r.columns = getComputedStyle(document.getElementById('dumps-container')).columnCount; // '3' at 1280px
r.xss = window.__xss || 0;                                                     // 0
r;
```

- [ ] **Step 2: Run to verify it fails.** Expected: `inline: 4`, `host: undefined`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run checks** plus add note, add link (javascript: rejected), image without file rejected, delete, in both themes and at 375px.
- [ ] **Step 5: Commit** `git commit -m "Redesign Dumpspaces page"`

---

### Task 7: Sudoku

**Files:**
- Modify: `minigames.html`, `js/minigames.js`, `css/zen.css` (Sudoku section)

**Interfaces:**
- Layout:
  - the board as a square paper sheet, max 480px wide
  - 3x3 block borders in `--ink`, cell borders in `--line`
  - given digits in Shippori Mincho `--muted`, solved digits in `--ai`, wrong flash on `--hanko-tint`
  - lives as three small hanko-red dots
  - the level select and "Ulang dari awal" beside the board on desktop, below it on mobile
- On solve: `Motion.stampHanko(document.getElementById('sudoku-paper'))` and the status text "Beres! Lu berhasil mecahin sudoku-nya."
- Keyboard arrows still move between cells (existing).
- Phone: at 375px the board width is the content width (about 343px), so the cells are about 38px (RF5).

- [ ] **Step 1: Write the checks**

```js
const W = ms => new Promise(s => setTimeout(s, ms)); await W(800); const r = {};
r.paper = !!document.getElementById('sudoku-paper');                           // true
// solve every empty cell
[...document.querySelectorAll('.sudoku-cell')].forEach((c, i) => { if (!c.readOnly) { c.value = String(solvedBoard[Math.floor(i / 9)][i % 9]); c.dispatchEvent(new Event('input')); } });
await W(900);
r.seal = !!document.querySelector('#sudoku-paper .hanko-seal');               // true
r.status = document.getElementById('game-status').textContent;                 // 'Beres! Lu berhasil mecahin sudoku-nya.'
r.cell = Math.round(document.querySelector('.sudoku-cell').getBoundingClientRect().width); // >= 34 at 375px (RF5)
r.overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth; // false
r;
```

- [ ] **Step 2: Run to verify it fails.** Expected: `paper: false`, `seal: false`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run checks** at 1280px and 375px in both themes, plus wrong answers (lives decrease, board locks at 0) and level change.
- [ ] **Step 5: Commit** `git commit -m "Redesign Sudoku page"`

---

### Task 8: Retire old stylesheet and verify the whole app

**Files:**
- Delete: `css/style.css`
- Modify: `README.md` (structure table: add `css/zen.css`, `img/icons.svg`, `js/theme.js`, `js/motion.js`, `js/petals.js`, `js/shell.js`; remove `css/style.css`)
- Create: `anti-slop/report-003-<date>.md` (git-ignored)

- [ ] **Step 1:** `git rm css/style.css`; run `node .superpowers/mock/static-check.mjs 8p2`. Expected: no file references `style.css`, 0 template inline handlers, all checks pass.
- [ ] **Step 2:** Rerun every Phase 1 and Phase 2 browser check on all seven pages, plus:
  - navigation through all rail links in both themes
  - `?fail=1` with retry on each data page
  - `?empty=1` on each data page
  - 375px on each page
  - system reduced motion with no override: no animation, no petals
  - keyboard-only pass on each page
- [ ] **Step 3:** Measure contrast of every new text/background pair (calendar pills, priority tags, kana covers, sudoku digits) in both themes. Expected: at least 4.5.
- [ ] **Step 4:** Write the Delivery Gate report for the whole app.
- [ ] **Step 5:** Commit `git commit -m "Remove legacy stylesheet and update README"`, then push the branch. Opening the PR and merging to `main` wait for the owner.
