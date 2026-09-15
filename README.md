# SkillTrack

Personal skill-roadmap tracker. GitHub OAuth signs you in; two Supabase projects keep local/preview data separate from production.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Create a GitHub OAuth App with **both** callback URLs on the same app:
   - Local: `http://localhost:3000/api/auth/callback/github`
   - Production: `https://skilltrack-lovat.vercel.app/api/auth/callback/github`
3. Create **two** Supabase projects on the Free plan (two active projects are included):
   - `skilltrack-dev` — local `npm run dev` and Vercel Preview ([dashboard](https://supabase.com/dashboard/project/kttuqdmzakhvzahizunv))
   - `skilltrack-prod` — Vercel Production only ([dashboard](https://supabase.com/dashboard/project/whtsvfcjqyflugocuwip))
4. In each project: **Project Settings → API**. Copy the Project URL, `anon` / publishable key, and `service_role` key.
5. Put **dev** values in `.env.local` (never commit this file):

```env
AUTH_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
ALLOWED_GITHUB_USERNAMES=thisisishara,dinushiTJ
AUTH_TRUST_HOST=true
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional helpers such as `SUPABASE_PROD_URL`, `SUPABASE_PROD_ANON_KEY`, and `SUPABASE_PROD_SERVICE_ROLE_KEY` can live in `.env.local` as a notepad for the production project. The Next.js app never reads those names. Vercel Production must get the **same unsuffixed names**, with the prod values copied in.

`ALLOWED_GITHUB_USERNAMES` is a comma-separated list of GitHub logins. Use `*` to allow any GitHub account.

`AUTH_TRUST_HOST=true` is required on Vercel so Auth.js trusts the forwarded host. The app also sets `trustHost: true` in Auth.js.

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Do not import it from Client Components. The publishable/anon key is listed for completeness; the app talks to Postgres from the server with the service-role key and RLS denies browser/anon access.

Generate `AUTH_SECRET` with:

```bash
npx auth secret
```

Set the GitHub OAuth App homepage to the production URL: [https://skilltrack-lovat.vercel.app](https://skilltrack-lovat.vercel.app).

### Apply database migrations

The same committed SQL in `supabase/migrations/` must run on **both** projects (`skilltrack-dev` and `skilltrack-prod`). `npm run db:push` is `npx supabase db push`.

```bash
npx supabase login

npx supabase link --project-ref kttuqdmzakhvzahizunv
npm run db:push

npx supabase link --project-ref whtsvfcjqyflugocuwip
npm run db:push

npx supabase link --project-ref kttuqdmzakhvzahizunv
```

The last `link` leaves the CLI pointed at **dev**, which is what local `npm run dev` uses.

Dashboards:

- Dev: [https://supabase.com/dashboard/project/kttuqdmzakhvzahizunv](https://supabase.com/dashboard/project/kttuqdmzakhvzahizunv)
- Prod: [https://supabase.com/dashboard/project/whtsvfcjqyflugocuwip](https://supabase.com/dashboard/project/whtsvfcjqyflugocuwip)

To apply by hand instead of the CLI, open **SQL Editor → New query** in each project and run every file in `supabase/migrations/` in filename order (not only the first file).

## Develop

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated users are sent to login; allowed GitHub users land on `/dashboard`. The first dashboard load upserts a `users` row in **skilltrack-dev**. Confirm it in the Table Editor (`public.users`). Production should stay empty until you sign in on the production URL.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs **checks only**: lint, typecheck, unit tests, integration tests (skipped without a live Supabase URL), Playwright (login page unless `E2E_SECRET` is set), a committed-migrations file check, and `next build`. It does **not** deploy and does **not** `supabase db push`.

`npm run test:integration` loads `.env.local` and talks to skilltrack-dev when `NEXT_PUBLIC_SUPABASE_URL` is not the CI placeholder. `npm run test:e2e` starts the app and covers `/login`; set `E2E_SECRET` locally to also run create-role and import flows.

Apply schema to **skilltrack-dev** and **skilltrack-prod** with `npm run db:push` as in [Apply database migrations](#apply-database-migrations).

## Deploy

Continuous deploy is Vercel’s Git integration (not GitHub Actions). Pushes to the default branch create a production deployment; pull requests get preview URLs.

Set Auth.js variables on Production, Preview, and Development. Set Supabase variables as follows:

| Variable | Production | Preview / Development |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | skilltrack-prod URL | skilltrack-dev URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | skilltrack-prod anon | skilltrack-dev anon |
| `SUPABASE_SERVICE_ROLE_KEY` | skilltrack-prod service role | skilltrack-dev service role |

After the first production hostname is known, keep it on the GitHub OAuth App:

- Homepage: [https://skilltrack-lovat.vercel.app](https://skilltrack-lovat.vercel.app)
- Callback: `https://skilltrack-lovat.vercel.app/api/auth/callback/github`
- Keep the localhost callback on the same app.

Confirm sign-in and sign-out on the production URL. A `users` row should appear only in **skilltrack-prod**.

### Manual (CLI)

From the repo root, with values in `.env.local` (never commit that file):

```bash
npx vercel login
npx vercel link
```

Push each secret. Repeat for Auth.js variables on production, preview, and development. For Supabase, use **prod keys on production** and **dev keys on preview and development**:

```bash
npx vercel env add AUTH_SECRET production --value "<value>" --yes
npx vercel env add AUTH_SECRET preview --value "<value>" --yes
npx vercel env add AUTH_SECRET development --value "<value>" --yes
```

To update an existing variable:

```bash
npx vercel env update AUTH_SECRET production --value "<value>" --yes
```

List what is set (values for Production/Preview stay hidden):

```bash
npx vercel env ls
```

Deploy production from the working tree:

```bash
npx vercel --prod
```

Then confirm GitHub OAuth callbacks and sign in / sign out on [https://skilltrack-lovat.vercel.app](https://skilltrack-lovat.vercel.app).
