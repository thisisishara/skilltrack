import { version } from "../../package.json"

export const APP_VERSION = version

export type ChangelogGroup = {
  title: string
  items: string[]
}

export type ChangelogRelease = {
  version: string
  date: string
  groups: ChangelogGroup[]
}

export const CHANGELOG: ChangelogRelease[] = [
  {
    version: "0.1.0",
    date: "2026-09-15",
    groups: [
      {
        title: "Added",
        items: [
          "GitHub OAuth sign-in and a dashboard shell with a collapsible sidebar.",
          "Role CRUD, a searchable role switcher, and a persisted active role.",
          "Ctrl/⌘ + ↑ / ↓ cycles the role list while keeping canvas, tree, or settings.",
          "React Flow skill roadmaps with nodes, labels, hierarchy, and Lucide icons.",
          "Evidence checklists, links, notes, and derived node and roadmap progress.",
          "Canonical skilltrack.roadmap.v1 JSON import and export, including file drop.",
          "Input and output handle kinds with progress-styled parent edges.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Node configuration is a resizable side panel instead of an overlay sheet.",
          "Overall progress sits in a bottom status bar; the canvas toolbar is vertical.",
          "Canvas edits save optimistically. Compact UI chrome uses JetBrains Mono.",
        ],
      },
    ],
  },
]
