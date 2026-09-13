# SkillTrack

Personal skill-roadmap tracker. Phase 1 covers the Next.js app, GitHub OAuth, and a protected dashboard.

## Setup

1. Copy `.env.example` to `.env.local` (or keep using `.env`).
2. Create a GitHub OAuth App with callback URL `http://localhost:3000/api/auth/callback/github`.
3. Set:

```env
AUTH_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
ALLOWED_GITHUB_USERNAME=
AUTH_TRUST_HOST=true
```

`ALLOWED_GITHUB_USERNAME` is a single GitHub login. Use `*` to allow any GitHub account.

Generate `AUTH_SECRET` with:

```bash
npx auth secret
```

## Develop

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated users are sent to login; allowed GitHub users land on `/dashboard`.
