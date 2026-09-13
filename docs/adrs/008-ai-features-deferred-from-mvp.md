# ADR-008: AI features deferred from MVP

- **Status:** Accepted
- **Date:** 2026-09-13
- **Spec:** §3 Later Stages, §26, §45–§47, §50 Phase 9+, §48.5

## Context

The product vision includes LLM job extraction, gap analysis, recommendations, semantic matching, and multi-provider models. Those capabilities must not delay a usable tracker. The core app must work with zero LLM keys.

## Decision

**Do not implement AI in MVP.** Keep domain modules free of vendor SDKs.

Deferred (non-exhaustive): LLM JD skill extraction, LLM gap analysis, roadmap suggestions, industry trends, evidence suggestions, semantic matching, AI-generated branches, OpenAI/Anthropic/Gemini/OpenRouter.

When AI arrives:

- Add an `AIService` with provider adapters; domain services call `AIService`, not SDKs.
- Human confirmation is required for any AI-proposed roadmap change. AI never silently mutates the tree.
- Semantic/`ai` match types belong on a future `skill_mappings` table, not in MVP matching ([ADR-010](./010-deterministic-job-to-roadmap-matching.md)).

## Consequences

- Job analytics ship with manual requirements and deterministic coverage.
- Architecture stays a modular monolith with a reserved AI module slot ([ADR-003](./003-modular-monolith-architecture.md)).
- Backlog epic E13 stays out of MVP phases 1–8.

## Alternatives considered

| Option | Why not |
| --- | --- |
| LLM extraction in MVP | Couples launch to model quality/cost |
| Embedding a single vendor in domain code | Blocks multi-provider later |
