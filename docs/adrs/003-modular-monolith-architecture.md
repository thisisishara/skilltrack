# ADR-003: Modular monolith architecture

- **Status:** Accepted
- **Date:** 2026-09-13
- **Spec:** §4, §28, §37, §43, §45

## Context

SkillTrack is one Next.js 16 application. Domains include auth, users, roles, roadmaps, nodes, checklists, jobs, matching, and import/export. A microservice split would add operational cost before product-market fit. AI must be addable later without rewriting the core.

## Decision

Ship a **modular monolith**: one deployable Next.js app with internal module boundaries.

Suggested modules: `auth`, `users`, `roles`, `roadmaps`, `roadmap_nodes`, `checklists`, `job_descriptions`, `skill_matching`, `imports_exports`. Future AI is **another module**, not scattered SDKs.

Layering:

```text
UI
 ↓
Server Action / Route Handler
 ↓
Application Service
 ↓
Repository
 ↓
Supabase
```

- Services own domain rules (unique names, cycle checks, derived progress).
- Repositories own persistence; they do not own UI.
- Do not expose unrestricted database operations to the client.

## Consequences

- One Vercel project, one TypeScript codebase, shared types.
- Directory layout in spec §43 is a starting point, not a requirement to create empty folders on day one.
- Extracting a service later is possible if module boundaries stay clean.
- AI providers must sit behind a future `AIService` ([ADR-008](./008-ai-features-deferred-from-mvp.md)).

## Alternatives considered

| Option | Why not for MVP |
| --- | --- |
| Microservices | Ops overhead; one user, one app |
| UI talking straight to Supabase | Bypasses domain rules; easy to skip authz |
| Hexagonal ports with many adapters | Over-structure before modules exist |
