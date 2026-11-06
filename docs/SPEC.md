# Nuestras Metas — spec

A private savings dashboard for a couple. He moves to the US for ~5 years (comes home every December for the whole month); she stays in Mexico. Both log savings **manually** toward shared goals and see, at a glance, that the goals are materializing. UI language: **Spanish (es-MX)**. Code, commits, comments: English.

## Users & access
- Exactly two people. Login with Supabase Auth **email + password**; users are created by hand in the dashboard (sign-ups disabled, no emails sent).
- Data protected by Postgres **RLS**: only emails listed in table `allowed_emails` can read/write anything. Anyone else who logs in sees a clear "Esta cuenta no tiene acceso" screen.
- Each person has a profile: display name, home currency (USD or MXN), color.

## Data model (Supabase / Postgres) — `supabase/migrations/0001_init.sql`
- `allowed_emails(email text primary key)` — seeded by hand in SQL editor.
- `profiles(user_id uuid pk references auth.users, display_name text, currency text check in ('MXN','USD'), color text, created_at)`.
- `goals(id uuid pk default gen_random_uuid(), name text, emoji text, target_mxn numeric(14,2), target_date date null, color text, sort int, archived boolean default false, created_at)`.
- `contributions(id uuid pk, goal_id uuid fk goals on delete cascade, user_id uuid fk auth.users default auth.uid(), amount numeric(14,2) (positive = deposit, negative = withdrawal), currency text ('MXN'|'USD'), fx_usd_mxn numeric(10,4) — rate at time of entry, amount_mxn numeric(14,2) generated/computed = MXN value, date date default today, note text null, created_at)`.
- `settings(id int pk = 1, move_date date, return_date date)` — single row: when he leaves and the planned 5-year horizon.
- Helper `is_allowed()` SQL function (security definer) checking `auth.jwt()->>'email'` in allowed_emails. RLS on every table: allowed users can select/insert/update/delete; contributions update/delete only by owner (`user_id = auth.uid()`).
- Seed (in migration, idempotent): goals **Casa** 🏡 and **Boda** 💍 with placeholder targets (Casa 800,000 MXN, Boda 300,000 MXN) — editable in app.

## Currency
- Each person logs in their own currency; the form defaults to their profile currency.
- FX: fetch USD→MXN from `https://api.frankfurter.dev/v1/latest?base=USD&symbols=MXN` (no key). Cache in localStorage for 12h. Store the rate on every contribution so history never changes retroactively. If fetch fails, use last cached rate, else ask the user to type the rate.
- Totals display in MXN by default; a segmented toggle MXN/USD in the header converts using the current rate. Format with `Intl.NumberFormat('es-MX')`.

## Screens (mobile-first; both will use phones most)
1. **Login** — name of the app, email + password fields, "Entrar".
2. **Dashboard** (single scroll page):
   - Header: "Nuestras metas", currency toggle, avatar menu (perfil, metas, cerrar sesión).
   - **Hero**: concentric progress rings, one ring per active goal (outermost = first goal), animating once on load. Center: total saved together. Beside/below: legend rows "🏡 Casa — 34% · $272,000 de $800,000".
   - **Next December strip**: "Faltan 47 días para diciembre" while he's away (December = together; during December show "Estamos juntos ❤"). Below it a 5-segment timeline (one per December within move_date..return_date) with past ones filled. This is a real sequence, so numbered/ordered markers are fine.
   - **Goals list**: iOS grouped inset list. Each row: emoji, name, progress bar in goal color, saved / target, "a este ritmo: mar 2029" projection (based on average monthly MXN of last 6 months; hide if < 2 months data). Tap → goal detail.
   - **Chart**: cumulative savings over time (area chart, by month), stacked by person (his color / her color), toggle "Todas / per goal". Simple, labeled axes in es-MX month abbreviations.
   - **Who contributed**: a single horizontal split bar "Él 58% · Ella 42%" for this month and all time.
   - **Recent activity**: last 10 contributions (avatar initial, goal emoji, amount in original currency + MXN equivalent, date, note). Swipe/long-press or "…" to edit/delete own entries.
   - Floating "+ Agregar ahorro" button → bottom sheet: amount (big numeric input), currency segmented (prefilled), goal picker (chips), date (default today), note optional, deposit/withdrawal toggle. Save → optimistic insert, rings animate to new value, toast "Ahorro agregado".
3. **Goal detail** (sheet or route): ring, history chart for that goal, its contributions, edit goal (name, emoji, target, target date, color), archive.
4. **Settings**: profile (name, currency, color), move/return dates, manage goals (add/reorder/archive).

## Realtime
Subscribe to Supabase realtime on `contributions` and `goals` so when she adds something, his screen updates live.

## Demo mode
If `VITE_SUPABASE_URL` is missing, run with an in-memory/localStorage adapter and seeded fake data (two people "Daniel" and "Ella", ~14 months of contributions) and a banner "Modo demo". All UI must work in demo mode — it's how we build and screenshot before Supabase exists. Data access goes through one `DataSource` interface with two implementations (supabase, demo).

## Stack
Vite + React 19 + TypeScript (strict), Tailwind CSS v4 (@tailwindcss/vite), @supabase/supabase-js v2, recharts for the area chart (rings and bars are hand-rolled SVG), date-fns (es locale), framer-motion only for sheet + ring animation. Vitest for pure logic (fx conversion, projections, aggregates). PWA manifest + icons so it can be added to the home screen. Vite `base: '/nuestras-metas/'` for GitHub Pages. Hash router or no router (single page + sheets) to avoid GH Pages 404s.

## Deploy
GitHub Actions workflow `.github/workflows/deploy.yml`: on push to main → npm ci, build with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from repo secrets, deploy to GitHub Pages (actions/deploy-pages). The anon key is public by design; RLS is the security boundary. Never commit `.env`.
