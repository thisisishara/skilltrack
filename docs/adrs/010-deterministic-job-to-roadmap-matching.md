# ADR-010: Deterministic job-to-roadmap matching for MVP

- **Status:** Accepted
- **Date:** 2026-09-13
- **Spec:** §3 Job Analytics, §26, §32–§33, §50 Phase 6

## Context

Users paste job descriptions, store company/role/source/dates, and associate required skills with roadmap nodes. Coverage/gaps must work without an LLM. Future aliases and semantic/AI matches should not force a schema rewrite if we keep matching explicit.

## Decision

MVP matching is **deterministic and mostly manual**, with a simple automatic assist:

- Users add job descriptions and skill requirements by hand.
- Users may associate requirements with roadmap nodes.
- Automatic compare: **normalize requirement names vs node titles** (e.g. `"Distributed systems"` ↔ `"Distributed Systems"` → exact match).
- Metrics: matched / unmatched requirements, roadmap coverage, completed vs in-progress vs missing skills.
- Do **not** implement alias tables, embeddings, or LLM matching in MVP.
- Leave room for `skill_mappings` (`exact` | `alias` | `semantic` | `manual` | `ai`) later.

## Consequences

- Job Analytics is useful with zero model cost ([ADR-008](./008-ai-features-deferred-from-mvp.md)).
- False negatives (K8s vs Kubernetes) are acceptable until aliases ship.
- UI uses `Table`/`Card`, `Badge`, `Progress` — not custom charts.

## Alternatives considered

| Option | Why not for MVP |
| --- | --- |
| LLM extraction + semantic match | Deferred AI |
| Only automatic title match, no manual links | Too brittle for real JDs |
| Full ontology / skill graph | Overbuild |
