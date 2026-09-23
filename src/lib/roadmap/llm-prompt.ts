export type RoadmapLlmPromptInput = {
  roleTitle: string
  extraGuidance?: string
}

export const SKILLTRACK_PRODUCT_BRIEF = `SkillTrack is an app for building a skill roadmap per career role. Each role is one nested topic tree. Topics group related skills; tasks under a topic are evidence the user checks off, and progress rolls up from those tasks. Topics can have notes, links, an icon, and a color.`

const SCHEMA_BLOCK = `{
  "roadmap": {
    "title": "Senior AI Engineer",
    "description": "Optional short summary",
    "notes": "Optional long-form notes",
    "links": [{ "id": "00000000-0000-4000-8000-000000000010", "label": "Docs", "url": "https://example.com" }]
  },
  "topics": [
    {
      "id": "00000000-0000-4000-8000-000000000001",
      "title": "Programming fundamentals",
      "icon": "python",
      "color": "#3b82f6",
      "description": "Optional",
      "notes": [
        {
          "id": "00000000-0000-4000-8000-000000000003",
          "title": "Short title",
          "body": "Markdown. Mermaid fences are allowed."
        }
      ],
      "tasks": [
        {
          "id": "00000000-0000-4000-8000-000000000002",
          "title": "Write idiomatic Python",
          "completed": false
        }
      ]
    }
  ]
}`

export function buildRoadmapImportPrompt(input: RoadmapLlmPromptInput) {
  const roleTitle = input.roleTitle.trim() || "the target role"
  const extra = input.extraGuidance?.trim()

  const extraBlock = extra
    ? `Additional authoring guidance from the user:\n${extra}`
    : "No extra guidance. Infer a practical, interview-and-on-the-job skill roadmap for this role."

  return `${SKILLTRACK_PRODUCT_BRIEF}

You are generating a SkillTrack roadmap JSON document for import.

Target role / roadmap title: ${roleTitle}

${extraBlock}

Return ONLY a single JSON object. No markdown, no code fences, no commentary before or after the JSON.

## Vocabulary

- Roadmap: the document. Has title and optional description, notes, and links. No icon, color, or tasks.
- Topic: a recursive tree row. Same shape at every depth. Nested rows are still topics.
- Task: a checkable leaf under a topic. Progress lives here.
- Link: { id, label, url } on the roadmap or a topic.

Use a topic only when it groups other topics or tasks. A skill with no children is a task, not a nested topic.

## Document shape

${SCHEMA_BLOCK}

Required keys: roadmap, topics, roadmap.title.
Topic required: id, title.
Task required: id, title, completed.
Link required: id, label, url.

Empty topics: [] is valid. Omit unused optional strings and empty arrays; missing arrays are treated as empty.

Unknown fields are rejected. Do not include parent_id, schema, nodes, checklist, accent_color, positions, kinds, or any canvas leftovers.

## IDs

- Every topic, task, link, and note needs a UUID (RFC-style: version 1–8, variant 8|9|a|b).
- IDs must be unique across the whole file. Topics, tasks, links, and notes share one uniqueness space — never reuse an id.
- Example: 00000000-0000-4000-8000-000000000001
- Prefer version-4 UUIDs. Do not use nil UUID 00000000-0000-0000-0000-000000000000.

## Field rules

- Titles and labels: non-empty after trim.
- completed: boolean true or false, never a string. Use false unless the user asked to import existing progress.
- Optional strings (description, roadmap notes): omit if unused. Task may include optional description.
- Topic notes are an array of { id, title, body }. title is a short label (80 characters or fewer). body is markdown and may include fenced mermaid diagrams. Omit notes when a topic has none. A legacy notes string still imports as one note titled Notes.
- icon: kebab-case Lucide name or brand id (brain, circle-dot, book-open, python, docker, kubernetes, react, typescript, github). Invalid or missing icons become circle-dot. Only put icon on topics.
- color: # plus 3 or 6 hex digits (#3b82f6 or #38f). Only on topics. Give each top-level topic a distinct color; children may omit color to inherit in the UI.
- url: http:// or https:// only. Prefer real, well-known documentation URLs. Omit a link rather than invent a fake or broken URL.

## Tree rules

- Nest children with topics on the parent. Array order is sibling order.
- Depth is unlimited, but keep the tree usable: typically 5–12 top-level topics, 2–4 levels deep unless the user asked for more.
- A topic may have both topics and tasks. The roadmap itself cannot have tasks.
- Do not create cycles.
- Do not add a topic whose title is the same as roadmap.title. That title is the document name. Role summary belongs in roadmap.description / roadmap.notes.

## Authoring checklist

1. One file = one role. Set roadmap.title to "${roleTitle}". Do not also create a topic with that title.
2. Top-level topics[] = major sections of the role.
3. Intermediate grouping rows = nested topics.
4. Atomic skills / evidence items = tasks with completed: false.
5. Cover fundamentals, core craft, tools, systems, and professional practice relevant to the role.
6. Keep task titles concrete and actionable (verbs or specific skills), not vague themes.
7. Output valid JSON only.`
}
