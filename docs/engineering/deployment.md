# Deployment

Ship SkillTrack by committing, pushing Git, applying **new** SQL to both Supabase projects when needed, then deploying production with the Vercel CLI.

This project’s production URL is **[https://skilltrack-lovat.vercel.app](https://skilltrack-lovat.vercel.app)**. GitHub Actions does **not** deploy and does **not** run `supabase db push`. Vercel Git integration is optional; production is shipped with `npx vercel --prod` from the repo root. **Push to Git regularly** even when you also CLI-deploy, so `main` matches what is live.

Do **not** commit `.env.local`, secrets, or `.next`.

## Environments

| Env | Use | Supabase project | Project ref |
| --- | --- | --- | --- |
| Dev | Local `npm run dev`, Vercel Preview | `skilltrack-dev` | `kttuqdmzakhvzahizunv` |
| Prod | Vercel Production only | `skilltrack-prod` | `whtsvfcjqyflugocuwip` |

Dashboards:

- Dev: [https://supabase.com/dashboard/project/kttuqdmzakhvzahizunv](https://supabase.com/dashboard/project/kttuqdmzakhvzahizunv)
- Prod: [https://supabase.com/dashboard/project/whtsvfcjqyflugocuwip](https://supabase.com/dashboard/project/whtsvfcjqyflugocuwip)

`npm run db:push` is `npx supabase db push`. The same files in `supabase/migrations/` must run on **both** remotes. After a prod push, **re-link to dev** so local work stays on `skilltrack-dev`.

## Typical ship order

1. Confirm there is new committed SQL that is not on the remotes. If not, skip databases.
2. Commit (only if the user asked) and **`git push`**.
3. Apply pending migrations to **dev**, then **prod**, then link back to **dev**.
4. Deploy production with the Vercel CLI.
5. Confirm the production alias [https://skilltrack-lovat.vercel.app](https://skilltrack-lovat.vercel.app).

## Git

Push `main` (or the current branch) to origin as part of every ship. CLI deploys do not record a Git SHA in the Vercel dashboard when Git is not connected; the alias can still be current.

```bash
git status -sb
git push origin HEAD
```

Do not force-push `main`. Do not skip hooks unless the user explicitly asks.

## Database migrations

List what is local vs already applied:

```bash
npx supabase login

npx supabase migration list --linked
npx supabase migration list --project-ref kttuqdmzakhvzahizunv
npx supabase migration list --project-ref whtsvfcjqyflugocuwip
```

If every local timestamp is already on both remotes, **do not** `db push`.

When there **are** unapplied files, run them on both projects:

```bash
npx supabase link --project-ref kttuqdmzakhvzahizunv
npm run db:push

npx supabase link --project-ref whtsvfcjqyflugocuwip
npm run db:push

npx supabase link --project-ref kttuqdmzakhvzahizunv
```

The last `link` leaves the CLI on **dev**.

To apply by hand, open **SQL Editor → New query** in each project and run every file in `supabase/migrations/` in filename order.

## Vercel

First time (or after unlink):

```bash
npx vercel login
npx vercel link
```

Production deploy from the working tree (use `--yes` in non-interactive agents; `--force` when you must skip build cache so the alias is definitely this tree):

```bash
npx vercel --prod --yes
npx vercel --prod --yes --force
```

The CLI prints a deployment URL and should alias **https://skilltrack-lovat.vercel.app**.

Env: Production uses **skilltrack-prod** `NEXT_PUBLIC_SUPABASE_URL`, anon, and `SUPABASE_SERVICE_ROLE_KEY`. Preview and Development use **skilltrack-dev**. Auth.js vars (`AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_TRUST_HOST`) belong on Production, Preview, and Development. `TRACK_ENCRYPTION_KEY` is required for Track. Never paste secrets into Git.

```bash
npx vercel env ls
```
