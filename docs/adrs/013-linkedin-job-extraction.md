# ADR-013: User-supplied LinkedIn HTML and rules-first job extraction

- **Status:** Accepted
- **Date:** 2026-09-20
- **Spec:** §3 Job Analytics, §18, §25, §32

## Context

Users want to collect real job postings against a career role. LinkedIn guest job HTML has no JSON-LD. Datacenter fetches of `linkedin.com/jobs/view/...` usually fail, and the browser cannot fetch LinkedIn due to CORS. A crawler would also fight LinkedIn’s terms.

Tracky already stores a BYOK key. Full job-to-roadmap matching remains a later slice ([ADR-010](./010-deterministic-job-to-roadmap-matching.md)).

## Decision

- Jobs belong to a **career role** (`job_descriptions.role_id`), not only to the user.
- The source of truth for import is **user-pasted page source or job text**. A LinkedIn URL is stored and may be fetched best-effort, then immediately fall back to paste.
- Do **not** store the full page HTML. Persist sanitized description text/HTML plus structured fields.
- **Rule-based extraction is the default** (CSS selectors on guest LinkedIn markup). Optional **Extract with AI** uses the Tracky BYOK model on sanitized HTML only, filling empty fields unless the user chooses replace.
- The app still works with zero LLM keys.
- A Chrome extension that posts HTML from an authenticated LinkedIn tab is backlog, not this slice.

## Consequences

- Extraction quality depends on LinkedIn’s guest markup remaining stable; tests pin a fixture.
- Users must copy page source when fetch fails.
- Matching/coverage UI is still deferred.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Server-side LinkedIn scraping | Unreliable and against typical ToS; authwall/bot wall |
| AI-only extraction | Breaks the zero-key core app |
| Store raw page source | Size, noise, and unnecessary retention of site chrome |
