# ADR-002: GitHub OAuth with Auth.js

- **Status:** Accepted
- **Date:** 2026-09-13
- **Spec:** §3 Authentication, §5 Authentication, §6, §39

## Context

MVP access is a single-operator (later multi-user) web app. Login must work on localhost and Vercel, support logout, and restrict access to a configured GitHub username. Secrets must not ship in client bundles.

## Decision

Authenticate with **Auth.js (NextAuth) and the GitHub OAuth provider**.

Required environment variables:

```env
AUTH_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
ALLOWED_GITHUB_USERNAMES=thisisishara,dinushiTJ
AUTH_TRUST_HOST=true
```

Rules:

- `ALLOWED_GITHUB_USERNAMES` is a comma-separated list of GitHub logins, or `*` to allow any GitHub account.
- Sessions are validated server-side; cookies are secure.
- Production callback/proxy follows Auth.js + Vercel guidance.
- GitHub username and GitHub user id are stored on the session after allow-list checks.
- Application `users.id` is a UUID distinct from the GitHub login (see [ADR-001](./001-supabase-as-application-database.md)).

## Consequences

- No password store or email magic-link in MVP.
- Access-denied is a first-class route when OAuth succeeds but the allow-list rejects the user.
- GitHub App/OAuth credentials stay in env files ignored by git.
- Later multi-user expansion can keep GitHub as the IdP while widening the allow-list or replacing it with a users table policy.

## Alternatives considered

| Option | Why not for MVP |
| --- | --- |
| Supabase Auth (GitHub) | Dual session models; Spec names Auth.js |
| Credentials / email | Out of scope; GitHub is the operator identity |
| Hard-coded GitHub username in source | Secrets/config belong in env |
