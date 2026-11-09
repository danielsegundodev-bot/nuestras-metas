# CLAUDE.md — Nuestras metas

Couple savings dashboard: two people log savings manually toward shared goals. Live on GitHub Pages, data in Supabase. Read `README.md`, `docs/SPEC.md` and `docs/DESIGN.md` before changing behavior or visuals.

## Working agreements (from the owner — follow exactly)

- **Talk to the user in Spanish**, including final summaries. Code, comments and commits in English. UI copy in Spanish (es-MX), sentence case, plain verbs; an action keeps its name through the flow ("Agregar ahorro" → toast "Ahorro agregado").
- **Commits:** `type(ACR-N): message`, e.g. `feat(TXN-1): ...`, `fix(RPT-2): ...`.
  - Acronyms used so far: SET, OPS, DAT, LOG, UI, VIZ, SHT, RPT, PWA, THM, TXN, FMT, PERF. Continue the numbering, or add a new short acronym for a new area.
  - **Never add `Co-Authored-By` or any AI/Claude attribution** to commits or PRs. The owner wants commits to appear fully authored by them.
- **Branch per change** (`feat/...`, `fix/...`), then merge into `main` with `git merge --no-ff ... -m "merge(ACR-N): ..."`, then push. Pushing `main` deploys to production.
  - Larger work is done in phases via subagents; tell subagents these same rules.
- Git identity is set per repo (`Jose Daniel Segundo Angulo <daniel.segundo.dev@gmail.com>`). Remote: `git@github.com:danielsegundodev-bot/nuestras-metas.git` (SSH key `~/.ssh/id_ed25519_github`; `gh` CLI is not logged in).
- **Before merging:** `npm run build`, `npm run test:run` and `npm run lint` must pass.
  - For UI changes, take Playwright screenshots in demo mode at 390×844 light and dark, and at 320px, then look at them. Playwright is a devDependency.
  - Keep screenshots out of the repo.
- **Do not commit secrets.** `.env.production` is intentionally committed: it holds the URL and the *publishable* key, which are public by design. Never add a `service_role` key. `.env.local` is gitignored.
- **Do not commit** login emails or passwords of the real users. The repo is public.

## Architecture

```
src/
  main.tsx            Providers, SW registration (prod only), vite:preloadError → reload once
  App.tsx             Session gate: loading / login / denied / error / dashboard
  data/
    DataSource.ts     Interface for all data access
    supabaseSource.ts Supabase impl (auth, CRUD, realtime channel on contributions+goals)
    demoSource.ts     localStorage impl used when VITE_SUPABASE_URL is absent
    demoSeed.ts       Deterministic fake data (Daniel 🦊 USD / Ella 🌻 MXN, 5 goals, 14 months)
    store.tsx         DataProvider + useData(): state, optimistic add/delete,
                      realtime debounce, reload on visibilitychange/online/pageshow
  lib/                Pure, tested logic: money (formatMoneyAuto, compact, fitText), fx
                      (frankfurter, 12h cache), stats (summaries, series, split, projection,
                      >100% ratios), december, dates, people (personColor, order), rings,
                      monthlyReport, platform
  ui/                 Components; sheets (Add, Goal, Settings, Transaction, AllActivity) and
                      the chart are React.lazy-loaded. ui/pdf/renderMonthlyPdf.ts is
                      dynamically imported.
supabase/migrations/  Run by hand in the Supabase SQL Editor (no CLI, no DB password here)
.github/workflows/    deploy.yml (Pages), keep-alive.yml (ping every 3 days)
public/               manifest, icons, sw.js (network-only pass-through; caches nothing on purpose)
```

## Data model (Postgres, RLS on everything)

- `allowed_emails(email)`. `is_allowed()` is a security-definer function that checks the JWT email against this table. Every policy requires it.
- `profiles(user_id, display_name, currency, color, avatar, created_at)`. Readable by both people; each person edits only their own row. A trigger creates the row on signup.
- `goals(id, name, emoji, target_mxn, target_date, color, sort, archived)`. Shared; both people can edit.
- `contributions(goal_id, user_id, amount, currency, fx_usd_mxn, amount_mxn generated, date, note, created_at)`.
  - Negative `amount` means a withdrawal.
  - The FX rate is stored per row and never recomputed.
  - Only the owner can update or delete a row.
- `settings(id=1, move_date, return_date)`. A single shared row.
- **Schema changes:** add a new numbered migration that is idempotent (`if not exists`). Tell the user to run it in the SQL Editor; you cannot run it yourself.
- **Deploy order:** UI that depends on a new column breaks until the user runs the migration. Say so explicitly before pushing.

## Design rules (see docs/DESIGN.md)

- **The rings are the one bold element.** Everything else stays quiet: iOS grouped inset lists, sheets and segmented controls.
- **Person color means "who"; goal color means "which goal".** Never mix them. Errors use `--danger`, not the person pink.
- **System fonts.** Numbers use `ui-rounded` with tabular figures (`num` utility). No all-caps labels, no decorative gradients, no generic card grids.
- **Money formatting goes through `formatMoneyAuto` / `formatMoneyCompact`.** Rule: no cents for amounts ≥ 1,000; cents below that; individual USD entries keep their cents.

## Gotchas learned in production

- **Supabase free email allows ~2 emails/hour.** That is why login is email+password with dashboard-created users; magic links were dropped.
- **Free Supabase projects pause after 7 days idle.** `keep-alive.yml` prevents it; don't remove it.
- **GitHub Pages caches HTML for about 10 minutes.** An installed PWA can keep an old build in memory, and lazy chunks then 404. `vite:preloadError` triggers an automatic reload, and the PDF handler also detects stale chunks. If the user says "no veo cambios" or "no funciona", suspect cache first: verify the live bundle hash with curl, then ask them to fully close and reopen the app.
- **Android installed PWA:**
  - The navigation bar color comes from the manifest, which allows only one color; it's set to `#000000`. Changes require reinstalling the PWA.
  - `<a download>` can be ignored, so the PDF uses `navigator.share({ files })` on touch devices and falls back to a download.
- **Never scan or brute-force the live site**; only normal page loads are OK.
- **jsPDF core Helvetica can't render emoji.** Notes are sanitized to Latin-1 in the PDF.

## Status (2026-11-09)

- **Done:** foundation, full dashboard UI, password login, monthly PDF, keep-alive, install button, resume sync, transaction detail and full history, big-number handling, optional per-entry FX override, emoji avatars. Migrations 0001 and 0002 are applied in production.
- **Real data:** both users exist. The app is in real use, starting from zero data.
- **Pending on the user's side:**
  - Confirm live sync between the two phones.
  - Change the weak shared password in Supabase (recommended).
- **Ideas the owner declined for now:** a "required pace" line in the goal chart; extra charts on the dashboard (to avoid visual noise); notifications.
