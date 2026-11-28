# Zen Dashboard (マネージャー)

A personal dashboard I use to keep money, plans, and small hobbies in one place. The UI is in casual Indonesian with an editorial Japanese look: washi paper by day, sumi ink by night, indigo for actions and a red hanko seal as the only accent.

Live: https://zenmanager-hazel.vercel.app/login.html

Click **Coba akun demo** on the login page to look around without signing up. The demo account is shared by every visitor, so don't put anything personal there.

<!-- TODO: add 2 real screenshots (money page + schedule) to docs/ and link them here -->

## What's inside

| Page | What it does |
| --- | --- |
| Keuangan | Income, expense, and transfers across several wallets. Balances are recalculated from the transaction history, plus a doughnut chart of this month's spending by category (Chart.js). |
| Jadwal & tugas | Monthly calendar with events per day, and a to-do list sorted by deadline and priority. |
| Wishlist | Savings target per item, progress bar, and a checklist of steps to get there. |
| Hobi | Watch/play queue and rated reviews for anime, films, series, and games. |
| Dumpspaces | Quick notes, links, and image uploads (Supabase Storage). |
| Sudoku | A small sudoku with three difficulty levels and three lives. |

## Stack

- Plain HTML, CSS, and JavaScript. No framework and no build step.
- Supabase for auth, Postgres, and file storage.
- Chart.js for the spending chart.
- GSAP for motion (count-up, list reveal, ink transitions, the 済 stamp). Everything still works without it.
- Shippori Mincho and Zen Kaku Gothic New from Google Fonts.
- Hosted on Vercel.

## Design

- Two themes, washi and sumi, switched with the moon button. The switch spreads like ink from the button where the browser supports View Transitions.
- Motion follows the system "reduce motion" setting by default, and the wind button overrides it. Calm mode turns off every animation and the sakura petals.
- Sakura petals drift behind the content. They react to the cursor, clicks and scrolling, and can be paused from the rail.
- Icons are drawn for this app: mon coin, calendar, ema plaque, kendama, makimono, soroban, noren.

## Project structure

```
css/zen.css        all styles; washi and sumi tokens at the top
img/icons.svg      icon sprite
js/theme.js        washi/sumi theme, ink spread transition
js/motion.js       motion preference, count-up, list reveal, hanko stamp, modal ink
js/petals.js       interactive sakura petals
js/shell.js        rail, mobile header, tooltips, tool buttons
js/common.js       shared helpers: HTML escaping, row actions (data-action), toast, modal (Esc + focus), confirm dialog, loading/error states
js/auth.js         Supabase client, login guard, logout
js/login.js        login, sign up, demo login
js/api.js          money page: fetch + save (wallets, transactions, transfers)
js/ui.js           money page: rendering and chart
js/schedule.js     calendar and tasks
js/wishlist.js     wishlist
js/hobbies.js      hobbies
js/dumpspaces.js   notes, links, images
js/minigames.js    sudoku
```

## Running it locally

Any static server works, for example:

```
npx serve .
```

Then open `http://localhost:3000/login.html`.

## Security notes

- The Supabase key in `js/auth.js` is the publishable (anon) key, which is meant to be public. Data isolation depends on Row Level Security, so every table (`wallets`, `transactions`, `schedules`, `tasks`, `wishlists`, `hobbies`, `dumpspaces`) and the `dumps-images` bucket need RLS policies that limit rows to `auth.uid() = user_id`.
- User text is escaped before it is rendered, and links and images only accept `http`/`https` URLs. Row buttons carry ids in `data-id` attributes and are handled by a delegated listener, so an id never ends up inside inline JavaScript. This matters because the demo account is shared between visitors.

## What I learned

Started as one big file and got split into one script per page as features piled up. A cleanup pass fixed accessibility (keyboard use, focus, color contrast), added loading and error states, and closed an XSS hole that the shared demo account made reachable. The redesign after that added the two themes, the motion system and the custom icons without touching the data layer.
