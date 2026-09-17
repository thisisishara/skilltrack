# ADR-012: Admin approval for GitHub users

- **Status:** Accepted
- **Date:** 2026-09-17
- **Spec:** §6 Authentication and Authorization, §25 users
- **Supersedes:** [ADR-002](./002-github-oauth-with-authjs.md) allow-list portion

## Context

An `ALLOWED_GITHUB_USERNAMES` environment variable required a redeploy whenever a GitHub login should be added or removed. That does not scale for a small multi-user app.

## Decision

Keep GitHub OAuth as the identity provider. Store access on `public.users`:

- `role` is `admin` or `user`
- `approval_status` is `pending`, `approved`, or `denied`

Rules enforced in PostgreSQL (trigger + check constraints):

- GitHub login `thisisishara` is always `admin` and `approved`
- No other row can be `admin`
- The UI cannot promote or demote admins

Sign-in upserts a user row. New users start `pending` and see **Approval needed to log in**. The admin reviews pending requests and the full user list at `/dashboard/users` and can approve or deny.

## Consequences

- Adding a user is: they try GitHub login, then the admin approves
- Access policy lives in the database on both skilltrack-dev and skilltrack-prod
- Auth.js no longer consults an allow-list env var

## Alternatives considered

| Option | Why not |
| --- | --- |
| Keep `ALLOWED_GITHUB_USERNAMES` | Requires env edits and deploys for every user |
| UI to promote admins | Out of scope; admin is fixed at the database for now |
