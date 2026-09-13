# ADR-001: Supabase as application database

- **Status:** Accepted
- **Date:** 2026-09-13
- **Spec:** §5 Database, §25, §27, §36, §39, §50 Phase 2

## Context

SkillTrack stores roles, roadmap nodes, checklists, notes, links, and job descriptions. Data must survive refactors of the UI, support unique constraints and transactions, isolate users, and remain affordable on a personal MVP (free-tier hosting). Identity is GitHub OAuth via Auth.js, not a vendor-specific auth product as the primary login.

## Decision

Use **Supabase PostgreSQL** as the application database.

- Schema lives in committed SQL migrations under `supabase/migrations/`.
- Application users are SkillTrack rows (`users.id`), independent of GitHub login strings.
- Auth.js remains the login mechanism; Supabase Auth is not the primary identity provider.
- Prefer the anon/publishable key plus RLS for any client access. Never expose the service-role key to the browser.
- Host the project on the Supabase free tier alongside Vercel for the app.

## Consequences

- Relational constraints (FKs, unique role names per user, cascade deletes) are enforced in Postgres.
- RLS is mandatory (see [ADR-007](./007-rls-based-user-isolation.md)).
- Schema changes require migrations in git, not dashboard-only edits.
- Local/dev and production share the same SQL model.
- Postgres features (transactions for import, indexes on `parent_id`) are available without a custom DB ops stack.

## Alternatives considered

| Option | Why not for MVP |
| --- | --- |
| SQLite / local files | Weak multi-user isolation and hosted story |
| Prisma + generic Postgres (Neon/RDS) | Extra ops; Spec already chose Supabase |
| Supabase Auth as identity | Spec: GitHub OAuth/Auth.js is primary |
| Notion or other SaaS stores | Explicit non-goal; export is native JSON |
