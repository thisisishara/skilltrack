# ADR-011: Inter, Lucide, and shadcn/ui as the exclusive UI system

- **Status:** Accepted
- **Date:** 2026-09-13
- **Spec:** §5 UI System, §11–§12, §19–§21, §34–§35, §38, §49

## Context

Inconsistent chrome (custom empty states, ad-hoc toasts, mixed icon packs, extra typefaces) would fragment the MVP and fight the shadcn registry. The canvas is the one exception ([ADR-009](./009-react-flow-canvas.md)).

## Decision

The product UI is **only**:

1. **Typeface:** Inter via `next/font/google`, class on the root layout so `--font-sans` / `font-sans` resolve to Inter. No Geist, system-ui as primary, or second display font for chrome. Use shadcn semantic type tokens; no parallel type scale.
2. **Icons:** Lucide (`lucide-react`) for application chrome. Node topic icons persist kebab-case ids (default `circle-dot`) and resolve to Lucide or a curated Simple Icons brand allowlist. Unknown ids fall back to `circle-dot`. Do not mix Tabler/Heroicons/ad-hoc SVG packs. App mark: pixel-art zap in `public/skilltrack-icon.png`; Lucide `Zap` where a vector mark is needed. Inside shadcn components, do not add icon sizing classes; on `Button` use `data-icon="inline-start"` / `inline-end`.
3. **Components:** Valid shadcn/ui (Radix, CLI-copied into `components/ui`). Map needs to registry components as in spec §5 (including `Empty` for every empty surface, `Sheet` for node config, `sonner` for mutation toasts, `AlertDialog` for destructive confirms, `Sidebar` for chrome).

Do not invent custom empty layouts, toast systems, callouts, badges, or form chrome that duplicate registry pieces.

## Consequences

- New screens start from the §5 mapping table, not from raw `div` kits.
- Icon pickers are `Command` in `Popover`/`Dialog`.
- UX polish (Phase 8) is an audit against this ADR, not a redesign.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Geist / system fonts | Spec: Inter only |
| Mixed icon sets | Breaks persisted node ids |
| Headless-only custom UI | Duplicates shadcn and empty/toast rules |
