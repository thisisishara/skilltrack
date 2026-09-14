# Changelog

All notable changes to SkillTrack are documented here and shown in the app when you click the version in the dashboard top bar.

Versioning is **manual SemVer**. When you ship:

1. Bump `version` in `package.json`.
2. Add a matching `## [x.y.z] - YYYY-MM-DD` section below.
3. Add the same release to `src/lib/app-release.ts` so the in-app changelog stays in sync.

## [0.1.0] - 2026-09-15

### Added

- GitHub OAuth sign-in and a dashboard shell with a collapsible sidebar.
- Role CRUD, a searchable role switcher, and a persisted active role.
- React Flow skill roadmaps with nodes, labels, hierarchy, and Lucide icons.
- Evidence checklists, links, notes, and derived node and roadmap progress.
- Canonical skilltrack.roadmap.v1 JSON import and export, including file drop.
- Input and output handle kinds with progress-styled parent edges.

### Changed

- Node configuration is a resizable side panel instead of an overlay sheet.
- Overall progress sits in a bottom status bar; the canvas toolbar is vertical.
- Canvas edits save optimistically. Compact UI chrome uses JetBrains Mono.
