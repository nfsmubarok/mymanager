# Zen Dashboard (マネージャー)

A personal dashboard I use to keep money, plans, and small hobbies in one place. The UI is in casual Indonesian, styled after rice paper, matcha, and sakura.

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
- Hosted on Vercel.

## Project structure

```
css/style.css      all styles, design tokens at the top
js/common.js       shared helpers: HTML escaping, toast, modal (Esc + focus), confirm dialog, loading/error states
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
- User text is escaped before it is rendered, and links and images only accept `http`/`https` URLs. This matters because the demo account is shared between visitors.

## What I learned

Started as one big file and got split into one script per page as features piled up. The latest pass cleaned up accessibility (keyboard use, focus, color contrast), added loading and error states, and fixed an XSS hole that the shared demo account made reachable.
