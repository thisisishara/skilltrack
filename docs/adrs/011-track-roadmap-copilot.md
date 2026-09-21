# ADR-011: Tracky, the opt-in roadmap copilot

- **Status:** Accepted
- **Date:** 2026-09-19
- **Spec:** §3 Later Stages, §45, ADR-003, ADR-008

## Context

MVP shipped without in-app LLM calls ([ADR-008](./008-ai-features-deferred-from-mvp.md)). Users still needed a copilot that can read and propose edits to the **active** role only, without storing chats or silently mutating the tree.

## Decision

Ship **Tracky** as an account-level, **opt-in, BYOK** copilot:

- Keys and provider config live in `user_settings`, encrypted with `TRACKY_ENCRYPTION_KEY`.
- Domain modules stay vendor-free. Providers sit in `src/lib/ai`; orchestration in `src/application/tracky`.
- Context is a **stub working set** (role, topic count, focused topic id, pending proposals, scratchpad). Tracky **decides what to fetch** with read tools (`list_roots`, `list_children`, `search_topics`, `get_path`, `get_topic`, `get_notes`, `get_tasks`, `get_links`). Users control cost caps and which tools are on, not which fields are preloaded.
- Session memory is in-browser, per active role. Switching roles or Restart clears messages and pending proposals.
- Tools **propose** creates/updates/deletes. The tree shows ghosts; the user accepts or rejects each change. Writes go through existing topic/task/link services.
- Role Settings keep the copy-paste generation prompt for external models.

## Consequences

- The core app still works with zero LLM keys.
- Human confirmation from ADR-008 is preserved via staged proposals.
- Job extraction from **user-supplied** LinkedIn HTML now exists as rules-first import ([ADR-013](./013-linkedin-job-extraction.md)). Gap analysis and semantic matching remain deferred.
