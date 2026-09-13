# ADR-007: RLS-based tenant/user isolation

- **Status:** Accepted
- **Date:** 2026-09-13
- **Spec:** §3 Data, §27, §36, §37, §39, §48.4

## Context

MVP is mostly single-user but the schema must support many users. Frontend checks are not enough: leaked anon keys or buggy queries must still fail closed. Client-supplied `user_id` / `role_id` / `node_id` cannot be trusted.

## Decision

Enforce isolation with **PostgreSQL Row Level Security** on Supabase, plus server-side ownership checks.

Core rule: a user may only read or mutate rows belonging to their application user.

| Table | Policy idea |
| --- | --- |
| `users` | Own row |
| `roles` | `user_id` = authenticated app user |
| `roadmap_nodes` | Parent role owned by user |
| `checklist_items` / `node_links` | Node’s role owned by user |
| `job_descriptions` | `user_id` = authenticated app user |

Also:

- Enable RLS on every user-owned table before exposing the anon key.
- Prefer anon/publishable key for client access; never ship the service-role key.
- Keep authorization in services ([ADR-003](./003-modular-monolith-architecture.md)); RLS is defense in depth, not a substitute for validating IDs.

## Consequences

- Policies must cover nested resources (items via node → role → user).
- Integration tests should try cross-user reads/writes and expect denial.
- Mapping Auth.js session → Postgres role/`user_id` must be explicit (JWT claims or server-only client with user context).

## Alternatives considered

| Option | Why not |
| --- | --- |
| App-layer filters only | One missed `WHERE` leaks data |
| Service-role from the browser | Bypasses RLS entirely |
| Org/RBAC complexity | Spec non-goal for MVP |
