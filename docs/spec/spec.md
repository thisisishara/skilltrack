# SkillTrack Technical Specification

## 1. Document Status

- **Project:** SkillTrack
- **Repository:** `skilltrack`
- **Status:** MVP Technical Specification
- **Primary goal:** A personal and eventually multi-user application for building role-specific skill roadmaps, tracking evidence-based progress, and comparing skills against job descriptions.
- **MVP principle:** Roadmap management and progress tracking come first. AI-assisted analysis and recommendations are explicitly deferred to later stages.

---

# 2. Product Scope

SkillTrack lets users:

1. Authenticate with GitHub.
2. Create and manage multiple career/engineering roles.
3. Build an arbitrarily deep skill roadmap for each role.
4. Represent roadmaps as a graph/tree of nodes.
5. Configure evidence-based completion checklists for each node.
6. Track checklist completion and derive:
   - node progress
   - parent-node progress
   - roadmap progress
7. Add notes and links to roadmap nodes.
8. Assign a Lucide icon to each node, with a default fallback icon (`circle-dot`).
9. Refactor roadmap structure without losing node identity or progress.
10. Import a roadmap from JSON only while creating a new role.
11. Export a roadmap as JSON.
12. Store application data in Supabase.
13. Manage job descriptions and associate required skills with roadmap skills.
14. Keep future AI features architecturally isolated so they can be added later.

---

# 3. MVP vs Later Stages

## MVP

### Authentication
- GitHub OAuth.
- Only the configured GitHub username may access the application.
- GitHub username is configurable through environment variables.
- Authentication must work on localhost and Vercel.
- Logout support.

### Roadmaps
- Create, rename, select, and delete roles.
- A role is always selected when the user has at least one role.
- Role switcher with search (not a full role list in the sidebar).
- With a role selected, the first view is that role's roadmap.
- Role settings (rename/delete) live on a per-role Settings screen.
- Collapsible sidebar.
- Infinite/pannable roadmap canvas.
- Arbitrarily deep node hierarchy.
- Create, edit, move, branch, and delete nodes.
- Node Lucide icons.
- Node notes.
- Node links.
- Evidence checklist per node.
- Node progress.
- Parent progress.
- Overall roadmap progress.
- Import/export JSON.
- Import allowed only during creation of a new roadmap.
- Unique roadmap names per user.

### Job Analytics
- Add job descriptions manually.
- Store company, role title, source, URL if available, and dates.
- Store extracted/manual skill requirements.
- Compare job requirements against roadmap nodes.
- Show basic deterministic skill coverage/gaps.

### Data
- Supabase PostgreSQL.
- Supabase Auth is not the primary identity mechanism; GitHub OAuth/Auth.js handles application authentication.
- Supabase stores application data.
- Row Level Security must isolate users' data.

## Later Stages

AI features are explicitly **not part of the MVP**.

Potential future capabilities:

- LLM-assisted job description skill extraction.
- LLM-assisted roadmap gap analysis.
- Roadmap improvement suggestions.
- Industry trend analysis.
- Role-specific learning recommendations.
- Automatic evidence suggestions.
- Semantic matching between job requirements and roadmap nodes.
- AI-generated roadmap branches.
- Multi-provider LLM support:
  - OpenAI
  - Anthropic/Claude
  - Google Gemini
  - OpenRouter
- Provider abstraction so AI features do not couple the domain layer to one model vendor.

---

# 4. Architecture

## 4.1 High-Level Architecture

```text
                         ┌──────────────────────┐
                         │       GitHub         │
                         │      OAuth           │
                         └──────────┬───────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────┐
│                    Next.js 16 Application               │
│                                                         │
│  ┌───────────────┐   ┌──────────────────────────────┐  │
│  │ Presentation  │   │ Server/API/Application Layer │  │
│  │               │   │                              │  │
│  │ Canvas        │   │ Roadmaps                     │  │
│  │ Sidebar       │   │ Nodes                        │  │
│  │ Node Panel    │   │ Checklists                   │  │
│  │ Job Views     │   │ Import/Export                 │  │
│  └───────────────┘   │ Job Analytics                │  │
│                      └──────────────┬───────────────┘  │
│                                     │                  │
│                      ┌──────────────▼───────────────┐  │
│                      │       Repository Layer       │  │
│                      └──────────────┬───────────────┘  │
└─────────────────────────────────────┼───────────────────┘
                                      │
                                      ▼
                         ┌──────────────────────┐
                         │       Supabase       │
                         │      PostgreSQL      │
                         │      + RLS           │
                         └──────────────────────┘
```

The application should be implemented as a modular monolith initially.

Suggested modules:

```text
auth
users
roles
roadmaps
roadmap_nodes
checklists
job_descriptions
skill_matching
imports_exports
```

Future AI functionality should be another module rather than being embedded throughout these modules.

---

# 5. Technology Stack

## Frontend / Application

- Next.js 16
- React
- TypeScript
- Tailwind CSS
- shadcn/ui (Radix primitives, copied into the project via the shadcn CLI)
- Inter as the only UI typeface (`next/font/google`, CSS variable `--font-sans`)
- Lucide as the only icon library (`lucide-react`)
- A suitable canvas/graph library such as React Flow
- Server Components where appropriate
- Client Components only where interactivity requires them

## UI System

The product UI must be composed from **valid shadcn/ui components**. Do not invent custom empty-state layouts, custom toast systems, custom callouts, custom badges, or ad-hoc form chrome that duplicates a registry component.

### Typography

- UI font: **Inter**.
- Load with `next/font/google` (`Inter`) and apply the generated class on the root layout so `--font-sans` / `font-sans` resolve to Inter.
- Do not mix in Geist, system-ui stacks as the primary face, or a second display font for chrome.
- Use semantic typography tokens already provided by shadcn (`text-foreground`, `text-muted-foreground`, `text-sm`, Card/Empty titles). Do not introduce a parallel type scale.

### Icons

- Icon library: **Lucide** via `lucide-react`.
- Import Lucide icons as React components (for example `Brain`, `Code`, `Search`).
- Inside shadcn components, do not add sizing classes on icons (`size-4`, `w-4 h-4`). Components size icons.
- On `Button`, set `data-icon="inline-start"` or `data-icon="inline-end"` on the Lucide icon.
- Persist node icons as Lucide kebab-case identifiers (see §12). Resolve those identifiers to Lucide components at the UI boundary.
- **App mark:** a pixel-art lightning bolt in the spirit of Lucide [`zap`](https://lucide.dev/icons/zap). Source art: `public/skilltrack-icon.png`. Browser/PWA icons live in `public/favicon/` (`favicon.ico`, 16/32 PNG, apple-touch, 192/512 chrome). In-app chrome may use Lucide `Zap` where a vector mark is needed.

### Required shadcn/ui usage

| Need | Use |
| --- | --- |
| Buttons / actions | `Button` (compose loading with `Spinner` + `disabled`; no `isLoading` prop) |
| Forms | `FieldGroup`, `Field`, `FieldLabel`, `FieldDescription`, `FieldSet` |
| Text entry | `Input`, `Textarea`, `InputGroup` / `InputGroupInput` / `InputGroupAddon` |
| Option sets (2–7 choices) | `ToggleGroup` + `ToggleGroupItem` |
| Selects / search pickers | `Select` (items inside `SelectGroup`), `Combobox`, `Command` |
| Layout chrome | `Sidebar`, `Separator`, `ScrollArea`, `Card` (`CardHeader` / `CardTitle` / `CardDescription` / `CardContent` / `CardFooter`) |
| Node configuration panel | `Sheet` with `SheetTitle` (required) |
| Create / import flows | `Dialog` with `DialogTitle` |
| Role rename | inline `Field` on the role Settings screen |
| Destructive confirmations | `AlertDialog` |
| Empty states | `Empty` (`EmptyHeader`, `EmptyMedia`, `EmptyTitle`, `EmptyDescription`, `EmptyContent`) |
| Inline warnings / errors | `Alert` (`AlertTitle`, `AlertDescription`) |
| Toasts | `sonner` (`toast()`) |
| Loading placeholders | `Skeleton` |
| In-button / inline pending | `Spinner` |
| Status chips | `Badge` |
| User identity | `Avatar` with `AvatarFallback` |
| Navigation within a view | `Tabs` (`TabsTrigger` inside `TabsList`), `Breadcrumb` |
| Progress | `Progress` |
| Hover / overflow labels | `Tooltip` |
| Icon picker / command search | `Command` inside `Popover` or `Dialog` |
| Lists of jobs / requirements | `Table` or `Item`/`Card` lists — not custom table markup |
| Menus | `DropdownMenu` (`DropdownMenuItem` inside `DropdownMenuGroup`) |

### Empty states

Every empty surface must use the shadcn `Empty` component. Do not build custom centered copy, dashed drop-zones, or illustrated placeholders from raw `div`s.

Required `Empty` compositions:

| Surface | `EmptyTitle` (example) | Primary action in `EmptyContent` |
| --- | --- | --- |
| No roles yet | Create a role to continue | `Button` to open create-role `Dialog` |
| Role with no nodes | This roadmap is empty | `Button` to create the first node |
| No checklist items on a node | No evidence items | `Button` to add a checklist item |
| No notes on a node | No notes | `Button` or focus the notes `Textarea` |
| No links on a node | No links | `Button` to add a link |
| No job descriptions | No job descriptions | `Button` to create a job |
| Job with no requirements | No skill requirements | `Button` to add a requirement |
| Search with no matches | No results | Clear-search `Button` |
| Icon picker with no matches | No icons found | Clear-search `Button` |
| Import file not chosen / empty list | No file selected | `Button` to choose JSON |
| Filtered jobs/roles with no matches | Nothing matches | Clear-filters `Button` |

`EmptyMedia` must use `variant="icon"` with a Lucide icon (for example `FolderIcon`, `MapIcon`, `BriefcaseIcon`, `SearchIcon`). Optional actions stay in `EmptyContent` as `Button`s.

### Feedback and overlays

- Success/failure of mutations: `sonner`, not custom snackbars.
- Form/field validation: `data-invalid` on `Field`, `aria-invalid` on the control, `FieldDescription` for the message.
- Page-level recoverable errors: `Alert`.
- Delete role, delete node, discard unsaved import: `AlertDialog`.
- Right-hand node editor: `Sheet`, not a custom drawer.
- Login and dashboard loading: `Skeleton` (and `Spinner` only for in-flight button actions).

### What is not a shadcn component

The infinite roadmap **canvas** (React Flow or equivalent) is the only primary surface that is not a shadcn primitive. Canvas chrome still uses shadcn: zoom/fit `Button`s, node `Badge` progress, Lucide node icons, `Sheet` for configuration, `Empty` when the roadmap has no nodes, `Command` for node search.

## Authentication

- Auth.js / NextAuth
- GitHub OAuth

The GitHub OAuth configuration supplied in the PRD is considered final.

Required environment variables:

```env
AUTH_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
ALLOWED_GITHUB_USERNAMES=thisisishara,dinushiTJ
```

The exact production redirect/proxy configuration should follow the chosen Auth.js deployment configuration for Vercel.

## Database

- Supabase
- PostgreSQL
- Row Level Security
- Supabase migrations

## Hosting

- Vercel free tier for the application
- Supabase free tier for the database

## Export

- Native JSON
- No Notion dependency

---

# 6. Authentication and Authorization

## 6.1 Authentication Flow

```text
Browser
   │
   ▼
SkillTrack login
   │
   ▼
GitHub OAuth
   │
   ▼
GitHub profile
   │
   ▼
Validate GitHub username
   │
   ├── Not allowed → reject
   │
   └── Allowed
          │
          ▼
      Create/load
      application user
          │
          ▼
       Dashboard
```

The unauthenticated login screen is a shadcn `Card` with Inter typography, Lucide icons, and a GitHub sign-in `Button`. Unauthorized users after OAuth see `Alert` (not a custom error page). Session restore uses `Skeleton`.

## 6.2 Allowed User

The MVP uses an allow-list of configured GitHub usernames. If a wildcard `*` is present, any account is allowed.

```env
ALLOWED_GITHUB_USERNAMES=thisisishara,dinushiTJ
```

The application must never rely on a client-provided username for authorization.

The authenticated identity must be obtained from the server-side session.

## 6.3 Multi-User Design

Although the MVP can be restricted to one GitHub account, database models must support multiple users.

Every user-owned entity must ultimately be scoped through `user_id`.

Example:

```text
users
  │
  ├── roles
  │     └── roadmap nodes
  │
  └── job descriptions
```

---

# 7. Core Domain Model

The central domain is:

```text
User
 └── Role
      └── Roadmap
           └── Node
                ├── Checklist Items
                ├── Notes
                └── Links
```

A role represents the target capability/profile.

Examples:

```text
Senior AI Engineer
Senior Software Engineer
Staff AI Engineer
ML Platform Engineer
```

The roadmap represents the knowledge/capability graph for that role.

---

# 8. Roles

## Role Properties

```text
id
user_id
name
description
created_at
updated_at
```

Constraints:

- `user_id + name` must be unique (exact match after trim; case-sensitive).
- Role names cannot be empty.
- Renaming a role must not alter its node IDs.

## Active Role

When the user has one or more roles, one role is always selected. There is no “no roadmap selected” idle state.

Selection resolution:

1. If `localStorage` key `skilltrack-active-role-id` matches a role the user owns, use it.
2. Otherwise use the first role for that user (`created_at` ascending).
3. Write the resolved id back to `localStorage`.

The selected role is also reflected in the URL (`/dashboard/roles/[roleId]`). Visiting `/dashboard` redirects to that role. Creating a role selects it. Deleting the active role selects the first remaining role, or the create-role gate if none remain.

If the user has **no roles**, they must create one before using the rest of the app. The dashboard shows `Empty` with a create action; the role switcher still offers **Create Role**.

---

# 9. Roadmap Nodes

A node is the fundamental unit of the roadmap.

## Required Properties

```text
id
roadmap_id
parent_id
title
description
icon
position_x
position_y
sort_order
created_at
updated_at
```

## Node Identity

Every node has a stable UUID.

Node IDs must not be regenerated when:

- the node is renamed
- its parent changes
- its position changes
- its icon changes
- its checklist changes

This is important for imports, exports, references, and progress history.

## Arbitrary Depth

There is no fixed maximum roadmap depth.

Example:

```text
AI Engineering
└── LLM Engineering
    └── RAG
        └── Retrieval
            └── Hybrid Retrieval
                └── BM25
                    └── Scoring
                        └── BM25 parameter tuning
```

The database must support arbitrary parent-child depth.

---

# 10. Graph Representation

The primary structure is a tree:

```text
parent_id → child nodes
```

Every node except a root node has one parent.

A roadmap may have multiple root nodes.

Future versions may support arbitrary graph edges, but MVP should keep the semantic hierarchy tree-based.

If the canvas library requires explicit edges, edges can be derived from `parent_id`.

---

# 11. Node Configuration

Clicking a node opens a right-side configuration panel implemented as a shadcn `Sheet` with a visible `SheetTitle` (the node title).

The panel must allow editing, using shadcn form primitives (`FieldGroup`, `Field`, `Input`, `Textarea`, `Select`/`Combobox`, `Checkbox`):

- title
- description
- icon (Lucide picker; see §12)
- parent
- position where appropriate
- notes
- links
- checklist items

The panel also displays:

- node progress (`Progress` + numeric label)
- checklist status (`Badge` and/or checklist `Checkbox` list)
- child progress
- completion state (`Badge`)

Empty notes, links, and checklists in this panel use `Empty` as specified in §5.

---

# 12. Icons

Each node may have an icon.

Icons are **Lucide** icons. Persist a stable Lucide identifier (kebab-case name as published by Lucide / `lucide-react`), never raw SVG or HTML.

Example:

```json
{
  "icon": "brain"
}
```

That identifier maps to the `Brain` component from `lucide-react`.

Required behavior:

- Icon picker is a searchable Lucide catalog composed from shadcn `Command` (typically inside `Popover` or `Dialog`). No-match state uses `Empty`.
- Default icon when none is selected: `circle-dot` (`CircleDot`).
- Store Lucide identifiers, not rendered markup.
- Unknown or removed identifiers fall back to `circle-dot`.
- The allowed set is the Lucide icon set bundled with the application (`lucide-react`). Do not mix Tabler, Heroicons, or custom SVG packs.

Example identifiers (must be valid Lucide names):

```text
brain
code
database
cloud
shield
network
bot
search
book
server
terminal
flask-conical
chart-column
users
lock
box
circle-dot
```

---

# 13. Evidence-Based Completion

This is a core SkillTrack feature.

A node is not simply marked "done".

Instead, each node may define a set of evidence checklist items.

Example:

```text
Distributed Systems

☐ Understand CAP theorem
☐ Understand consistency models
☐ Implement a queue-based worker system
☐ Understand idempotency
☐ Understand leases
☐ Design retry/dead-letter strategies
☐ Explain the architecture to another engineer
```

Checklist items are configurable when creating the node and remain editable through the right-side node panel.

---

# 14. Checklist Data Model

```text
checklist_items
----------------
id
node_id
title
description
is_completed
sort_order
created_at
updated_at
completed_at
```

Optional future fields:

```text
evidence_type
evidence_url
evidence_note
```

MVP can initially use:

```text
title
description
is_completed
```

---

# 15. Progress Calculation

Progress must be deterministic.

## 15.1 Node Progress

If a node has checklist items:

```text
node_progress =
    completed_checklist_items / total_checklist_items
```

If a node has no checklist items:

- A leaf node without checklist items should be considered `0%` until explicitly configured.
- Alternatively, the UI may require at least one checklist item before allowing a node to become trackable.

Recommended MVP behavior:

**Require at least one checklist item for progress tracking.**

## 15.2 Parent Progress

A parent node's progress is derived from its own checklist plus descendants.

Recommended recursive model:

```text
subtree_progress =
    completed checklist items in subtree
    /
    total checklist items in subtree
```

This avoids giving an empty parent artificial 100% completion.

Example:

```text
AI Engineering
├── Python       5/5
├── LLMs         3/5
└── RAG          2/4
```

Total:

```text
10 / 14 = 71.43%
```

Parent progress = `71.43%`.

## 15.3 Roadmap Progress

Roadmap progress is:

```text
all completed checklist items
--------------------------------
all checklist items
```

across the entire roadmap.

## 15.4 Completion State

Derived state:

```text
0%       → pending
1-99%    → in_progress
100%     → done
```

This state should generally be derived rather than independently stored.

---

# 16. Checklist Editing

The right-side panel supports (checklist items as `Checkbox` + `Field` / `Input`; add via `Button`; delete via `Button` or `AlertDialog` if destructive; empty list uses `Empty`):

- add checklist item
- edit checklist item
- delete checklist item
- reorder checklist items
- check/uncheck checklist item

When an item changes:

1. Persist the change.
2. Recalculate affected node progress.
3. Recalculate ancestor progress.
4. Update roadmap progress.
5. Update UI optimistically where safe.

Progress should not require manually marking parent nodes as done.

---

# 17. Notes

Each node can contain a free-form note.

MVP representation:

```text
notes: text
```

Future versions may support rich text.

Notes are displayed in the node configuration panel as a `Textarea` inside `Field`. An empty note uses `Empty` until the user starts editing.

---

# 18. Links

Each node can contain zero or more links.

Model:

```text
node_links
----------
id
node_id
label
url
created_at
updated_at
```

Examples:

```text
Official documentation
Paper
GitHub repository
Course
Tutorial
Blog post
Video
Personal notes
```

URLs must be validated before persistence. An empty link list uses `Empty`. Add/edit uses `Field` + `Input`; persist/cancel uses `Button`.

---

# 19. Roadmap Canvas

The main roadmap view is an infinite/pannable canvas.

Required interactions:

- pan
- zoom
- select node
- create node
- edit node
- delete node
- connect/branch node
- move node
- fit roadmap to view
- search nodes

The UI should remain clean even for large roadmaps. Canvas toolbars use shadcn `Button`, `Tooltip`, and Lucide icons. A roadmap with zero nodes shows `Empty` over the canvas (create-first-node action).

Canvas **labels** are free-floating annotations (`kind = label`). They can be placed and moved on the canvas. They are not skills: no handles, no parent, no checklist progress, and they do not participate in the tree.

Node position is persisted:

```text
position_x
position_y
```

Position does not affect the semantic parent-child relationship.

---

# 20. Sidebar

The application chrome uses the shadcn `Sidebar` (collapsible). Icons in the sidebar are Lucide. The signed-in GitHub user uses `Avatar` + `AvatarFallback` in a footer `DropdownMenu`. Role switching uses `Popover` + `Command` (searchable list), not a stacked list of every role.

The sidebar contains:

```text
[icon] Senior AI Engineer   ▾     ← role switcher (header)
       Role

────────────
Roadmap                         ← only when a role is selected
Settings                        ← only when a role is selected

────────────
[avatar] GitHub User        ▾     ← footer; menu opens upward
         thisisishara
```

The role switcher popover opens **below** the header trigger. It contains:

```text
Find Role…
  Senior AI Engineer          ✓
  Senior Software Engineer
  ML Engineer
────────────
+ Create Role
```

Zero search hits use `CommandEmpty` (“No roles found.”). **Create Role** stays pinned at the bottom of the popover and opens the create `Dialog`. Rename and delete are **not** in this menu.

With a role selected, the first destination is the **roadmap** view (`/dashboard/roles/[roleId]`). Sidebar nav, in order:

1. **Roadmap** — canvas for the active role
2. **Settings** — per-role settings (`/dashboard/roles/[roleId]/settings`)

Job Analytics is **role-specific** and must not appear as global chrome. It is added to this nav later, after Roadmap, when that feature is scoped to the active role.

The footer account menu opens **above** the trigger and includes Logout. It is not user “settings” for the role.

Requirements:

- collapsible shadcn `Sidebar`
- role switcher with search (`Command` in `Popover`)
- create role (`Dialog` from the switcher)
- Roadmap and Settings nav items only when a role is selected (Roadmap first)
- rename role: inline `Field` on the role Settings screen
- delete role: `AlertDialog` from the role Settings screen
- no roles: blocking `Empty` plus Create Role in the switcher

---

# 21. Role Creation

Creating a role is a shadcn `Dialog` (`DialogTitle` required). The create-vs-import choice is a `ToggleGroup` (or two `Button`s). File/JSON input uses `Input` / `Textarea` inside `Field`. Validation errors use `Field` invalid state and/or `Alert`.

Creating a role provides two options:

```text
Create empty roadmap
Import JSON
```

Importing is allowed while creating a role, and onto an **existing role that has zero nodes** (including labels). That is not a merge: there is no graph to overwrite.

Once the role has any node:

- Existing role cannot be overwritten through import.
- Import must not silently merge data.

Export is always available.

This prevents accidental destruction of an existing roadmap.

---

# 22. JSON Import/Export

SkillTrack uses a canonical JSON format.

The exported format must contain:

- schema version
- roadmap metadata
- nodes (skills and canvas labels)
- node kind
- handle kind and incoming-edge animation for skill nodes
- checklist items
- links
- notes
- layout positions (`position.x` / `position.y`)

Edges are not stored. They are derived from `parent_id` (labels never participate).

The exported JSON must not contain:

- authentication tokens
- GitHub OAuth secrets
- Supabase credentials
- internal session data
- other users' information
- React Flow runtime fields (`selected`, `dragging`, `measured`, internals, edge objects)
- canvas viewport / camera (session chrome, not roadmap content)

---

# 23. JSON Schema Rules

The canonical JSON schema is versioned.

Current version:

```text
skilltrack.roadmap.v1
```

Top-level structure:

```json
{
  "schema": "skilltrack.roadmap.v1",
  "roadmap": {},
  "nodes": []
}
```

## Rules

### Top-level

Required:

- `schema`
- `roadmap`
- `nodes`

`schema` must equal:

```text
skilltrack.roadmap.v1
```

### Roadmap

Required:

- `name`

Optional:

- `description`

### Node

Required:

- `id`
- `title`

Optional:

- `kind` (`skill` | `label`; omitted `kind` is `skill`)
- `parent_id`
- `description`
- `icon`
- `handle_kind` (`regular` | `input` | `output`; default `regular`; skill nodes only)
- `incoming_edge_animated` (boolean; default `false`; skill nodes only)
- `position`
- `checklist`
- `notes`
- `links`

### Labels

Nodes with `kind = label` are canvas annotations:

- `parent_id` must be omitted or `null`.
- Must not be referenced as a parent.
- Must not include `checklist`, `links`, `notes`, `description`, `icon`, `handle_kind`, or `incoming_edge_animated`.

### Node ID

- UUID string.
- Unique within the imported document.
- Parent references must reference an existing **skill** node or be `null`.

### Parent Rules

- Root skill or label: `parent_id = null`
- Child skill: `parent_id` references another skill node.
- No self-parenting.
- No circular parent relationships.
- `output` nodes cannot have a parent.
- `input` nodes cannot have children.
- Labels are excluded from the skill tree.

### Checklist

Every checklist item requires:

```text
id
title
completed
```

Optional:

```text
description
```

Checklist IDs must be unique within the document.

### Links

Every link requires:

```text
id
label
url
```

URLs must be valid HTTP(S) URLs.

### Positions

```json
{
  "x": 100,
  "y": 200
}
```

Both values must be finite numbers.

### Unknown Fields

The published schema sets `additionalProperties` to `false`. Unknown keys and malformed required fields fail validation.

---

# 24. Canonical JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://skilltrack.app/schemas/roadmap.v1.json",
  "title": "SkillTrack Roadmap",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema", "roadmap", "nodes"],
  "properties": {
    "schema": {
      "const": "skilltrack.roadmap.v1"
    },
    "roadmap": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name"],
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1
        },
        "description": {
          "type": "string"
        }
      }
    },
    "nodes": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/node"
      }
    }
  },
  "$defs": {
    "position": {
      "type": "object",
      "additionalProperties": false,
      "required": ["x", "y"],
      "properties": {
        "x": {
          "type": "number"
        },
        "y": {
          "type": "number"
        }
      }
    },
    "checklistItem": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "title", "completed"],
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "title": {
          "type": "string",
          "minLength": 1
        },
        "description": {
          "type": "string"
        },
        "completed": {
          "type": "boolean"
        }
      }
    },
    "link": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "label", "url"],
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "label": {
          "type": "string",
          "minLength": 1
        },
        "url": {
          "type": "string",
          "format": "uri"
        }
      }
    },
    "node": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "title"],
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "title": {
          "type": "string",
          "minLength": 1
        },
        "parent_id": {
          "type": ["string", "null"],
          "format": "uuid"
        },
        "description": {
          "type": "string"
        },
        "kind": {
          "type": "string",
          "enum": ["skill", "label"]
        },
        "icon": {
          "type": "string",
          "description": "Lucide kebab-case icon name (e.g. brain, circle-dot). Unknown values fall back to circle-dot."
        },
        "handle_kind": {
          "type": "string",
          "enum": ["regular", "input", "output"]
        },
        "incoming_edge_animated": {
          "type": "boolean"
        },
        "position": {
          "$ref": "#/$defs/position"
        },
        "checklist": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/checklistItem"
          }
        },
        "notes": {
          "type": "string"
        },
        "links": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/link"
          }
        }
      }
    }
  }
}
```

Implementation note: JSON Schema validators differ in how they interpret `format` for nullable values. Application-level validation must explicitly validate `parent_id` when it is non-null, plus label and handle-kind invariants.

---

# 25. Supabase Data Model

## users

```sql
users
-----
id uuid primary key
github_user_id text unique not null
github_username text unique not null
display_name text
avatar_url text
created_at timestamptz not null
updated_at timestamptz not null
```

The application user ID is independent of the GitHub username.

---

## roles

```sql
roles
-----
id uuid primary key
user_id uuid not null references users(id) on delete cascade
name text not null
description text
created_at timestamptz not null
updated_at timestamptz not null
```

Constraint:

```text
unique(user_id, name)
```

---

## roadmap_nodes

```sql
roadmap_nodes
-------------
id uuid primary key
role_id uuid not null references roles(id) on delete cascade
parent_id uuid references roadmap_nodes(id) on delete cascade
kind text not null default 'skill'  -- skill | label
title text not null
description text
icon text
position_x double precision not null default 0
position_y double precision not null default 0
sort_order integer not null default 0
created_at timestamptz not null
updated_at timestamptz not null
```

Indexes:

```text
(role_id)
(parent_id)
(role_id, parent_id)
```

---

## checklist_items

```sql
checklist_items
---------------
id uuid primary key
node_id uuid not null references roadmap_nodes(id) on delete cascade
title text not null
description text
is_completed boolean not null default false
sort_order integer not null default 0
created_at timestamptz not null
updated_at timestamptz not null
completed_at timestamptz
```

Indexes:

```text
(node_id)
(node_id, sort_order)
```

---

## node_links

```sql
node_links
----------
id uuid primary key
node_id uuid not null references roadmap_nodes(id) on delete cascade
label text not null
url text not null
created_at timestamptz not null
updated_at timestamptz not null
```

Index:

```text
(node_id)
```

---

## job_descriptions

```sql
job_descriptions
----------------
id uuid primary key
user_id uuid not null references users(id) on delete cascade
company_name text not null
role_title text not null
source text
source_url text
description text not null
posted_at date
captured_at timestamptz not null
created_at timestamptz not null
updated_at timestamptz not null
```

---

## job_requirements

```sql
job_requirements
----------------
id uuid primary key
job_description_id uuid not null
skill_name text not null
importance text
notes text
created_at timestamptz not null
```

Foreign key:

```text
job_description_id → job_descriptions.id
```

Recommended `importance` values:

```text
required
preferred
unknown
```

---

# 26. Future Skill Mapping Model

The MVP can initially perform deterministic matching.

Future architecture should introduce:

```text
job_requirement
      │
      ▼
skill mapping
      │
      ▼
roadmap node
```

Potential future table:

```text
skill_mappings
--------------
id
job_requirement_id
node_id
match_type
confidence
created_at
```

Possible match types:

```text
exact
alias
semantic
manual
ai
```

Do not implement semantic/LLM matching in MVP.

---

# 27. Row Level Security

Supabase RLS is mandatory.

Core rule:

> A user may only read or mutate records belonging to their own application user.

Examples:

```text
users
  user can access own row

roles
  user_id = authenticated application user

roadmap_nodes
  role belongs to authenticated user

checklist_items
  node belongs to authenticated user's role

node_links
  node belongs to authenticated user's role

job_descriptions
  user_id = authenticated application user
```

The application must not trust:

```text
user_id
role_id
node_id
```

supplied by the browser without authorization checks.

---

# 28. Repository / Service Boundaries

The application should keep database access behind repositories.

Example:

```text
RoadmapService
    ↓
RoadmapRepository
    ↓
Supabase
```

The service layer owns application rules.

Examples:

### RoadmapService

- create roadmap
- rename roadmap
- delete roadmap
- import roadmap
- export roadmap

### NodeService

- create node
- update node
- move node
- delete node
- reparent node
- validate hierarchy

### ChecklistService

- add item
- update item
- complete item
- reorder item
- calculate progress

Repositories should not contain UI behavior.

---

# 29. Domain Rules

The following rules belong in application/domain logic rather than UI-only validation:

1. Role names must be unique per user.
2. Node IDs must be unique.
3. Node cannot be its own parent.
4. Parent changes cannot create cycles.
5. Checklist IDs must be unique.
6. A node must belong to the same role as its parent.
7. Links must be valid URLs.
8. Imported data must conform to the supported schema.
9. Users cannot access another user's role.
10. Imported roadmaps cannot overwrite a role that already has nodes.
11. Progress is derived from checklist state.

---

# 30. Import Algorithm

```text
1. Parse uploaded JSON
2. Validate JSON syntax
3. Validate schema version
4. Validate JSON Schema
5. Validate UUID uniqueness
6. Validate parent references, labels, and handle kinds
7. Validate no cycles
8. Validate links
9. If creating a role: validate roadmap name and check name collision
10. If importing onto an existing role: require zero nodes (including labels); do not rename
11. Remap all document IDs if any collide with existing rows
12. Create role (create path) or keep the empty role
13. Create nodes (parents before children)
14. Create checklist items
15. Create links
16. On any write failure, roll back so no partial roadmap remains
17. Return the role
```

Import must be transactional.

If any step fails:

```text
no partial roadmap should remain
```

---

# 31. Export Algorithm

```text
1. Authenticate user
2. Load role
3. Verify ownership
4. Load nodes
5. Load checklist items
6. Load links
7. Build canonical JSON
8. Validate generated JSON
9. Return downloadable file
```

Export should produce deterministic structure where practical, especially for easier Git/version-control comparison.

---

# 32. Job Analytics MVP

A separate application area should provide:

```text
Job Analytics
```

This area is built from shadcn `Card`, `Table` (or card list), `Badge` for coverage, `Progress` for match rate, `Dialog`/`Sheet` for create/edit, `AlertDialog` for delete, and `Empty` when there are no jobs or no requirements.

A user can:

- create a job entry
- paste a job description
- record company
- record role
- record source
- record posting/capture dates
- manually associate skills with roadmap nodes

Example:

```text
Company: Example AI
Role: Senior AI Engineer

Requirements:
✓ Python
✓ LLMs
✓ RAG
✓ AWS
✓ Kubernetes
✓ Distributed Systems
```

The system can calculate:

```text
Matched requirements
Unmatched requirements
Roadmap coverage
Completed skill coverage
In-progress skill coverage
Missing skills
```

No LLM is required for this MVP.

---

# 33. Job-to-Roadmap Coverage

A basic deterministic algorithm can compare normalized requirement names against node titles.

Example:

```text
Requirement:
"Distributed systems"

Roadmap:
"Distributed Systems"
```

→ exact match.

Later, aliases and semantic matching can improve this.

Example future aliases:

```text
PostgreSQL ↔ Postgres
LLM evaluation ↔ LLM evals
Kubernetes ↔ K8s
```

---

# 34. Progress Dashboard

The main roadmap view should expose a compact shadcn `Card` (or header row of `Badge` + `Progress`) rather than a custom dashboard widget kit:

```text
Role: Senior AI Engineer

Overall Progress
████████████░░░░ 72%

Completed: 128
In Progress: 31
Pending: 44
```

Render overall progress with `Progress`. Counts use `Badge` or labeled text in `CardContent`. Do not use raw colored bars outside shadcn `Progress`.

Possible additional metrics:

- number of completed nodes
- checklist completion
- branches completed
- recently completed skills
- stale/inactive areas
- job-market coverage

The MVP should keep this visually useful without turning the application into a dashboard-heavy product.

---

# 35. Search

Search UI uses shadcn `Command` (command palette, role switcher, and/or filter fields). Zero hits in a `Command` list use `CommandEmpty`. Full-page or collection filters use `Empty`.

Search should support:

- role search (in the sidebar role switcher; see §20)
- roadmap node search
- job description search

Node search should return:

```text
Node
Parent path
Progress
```

Example:

```text
Hybrid Retrieval
AI Engineering / LLM Engineering / RAG / Retrieval
67%
```

Clicking a result should focus the canvas on the node and open its configuration panel.

---

# 36. Concurrency and Data Integrity

MVP is primarily single-user, but database design must support multiple users.

Use:

- PostgreSQL transactions
- foreign keys
- unique constraints
- RLS
- server-side authorization

For edits:

- `updated_at` should be updated on every mutation.

Future optimistic concurrency can use:

```text
updated_at
```

or an explicit version field.

---

# 37. API / Server Actions

Next.js Server Actions and Route Handlers may be used.

Guideline:

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

Do not expose direct unrestricted database operations to the client.

Client-side Supabase access must not bypass RLS.

---

# 38. Error Handling

The UI should distinguish:

```text
validation error
authorization error
not found
conflict
database failure
unexpected server error
```

Presentation:

- Field-level validation: shadcn `Field` (`data-invalid`) + `FieldDescription`.
- Form/page callouts: `Alert`.
- Mutation success/failure: `sonner`.
- Missing resource or empty collection: `Empty` (not a bespoke 404 card).
- Destructive failure that needs a choice: `AlertDialog` or `Dialog`.

Examples:

```text
"Roadmap name already exists."
"That node no longer exists."
"You do not have access to this roadmap."
"Import contains a circular node hierarchy."
```

Internal database errors must not expose secrets or implementation details.

---

# 39. Security Requirements

## Authentication

- GitHub OAuth.
- Server-side session validation.
- Allow-list GitHub username.
- Secure cookies.
- No credentials in client-side bundles.

## Authorization

- RLS.
- Server-side ownership checks.
- Never trust user/role/node IDs supplied by client.

## Input Validation

Validate:

- roadmap names
- node titles
- checklist text
- URLs
- imported JSON
- job descriptions

## Secrets

Never store:

- GitHub client secret
- Auth secret
- Supabase service-role key

in the repository.

`.env.local` must be ignored by Git.

## Supabase

The Supabase service-role key must never be exposed to browser code.

Prefer the anon/publishable key with RLS for client-side access.

---

# 40. Observability

MVP does not require a full distributed observability platform.

At minimum:

- structured server-side errors
- request/error logging
- import failures
- authentication failures
- important database operation failures

Future:

- OpenTelemetry
- distributed tracing
- application metrics
- performance monitoring

---

# 41. Testing Strategy

## Unit Tests

Test:

- progress calculations
- hierarchy validation
- cycle detection
- import validation
- name normalization
- skill matching
- domain rules

Example:

```text
5 / 10 checklist items → 50%
```

## Integration Tests

Test:

- authentication flow boundaries
- repository/database operations
- RLS policies
- roadmap creation
- node creation
- checklist persistence
- import transaction rollback
- export consistency

## End-to-End Tests

Test critical flows:

```text
GitHub login
→ dashboard
→ create role
→ create node
→ configure checklist
→ complete checklist
→ progress updates
→ reload
→ progress remains correct
```

Import:

```text
create role
→ import JSON
→ roadmap appears
→ hierarchy preserved
→ checklist preserved
→ progress preserved
```

---

# 42. CI/CD

Recommended pipeline:

```text
Pull Request
    │
    ├── lint
    ├── typecheck
    ├── unit tests
    ├── integration tests
    └── build
             │
             ▼
         merge/main
             │
             ▼
          Vercel
```

Supabase schema changes should use migrations committed to the repository.

---

# 43. Suggested Repository Structure

```text
skilltrack/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── auth/
│   │   ├── dashboard/
│   │   ├── jobs/
│   │   ├── roles/
│   │   ├── page.tsx
│   │   └── layout.tsx
│   │
│   ├── components/
│   │   ├── ui/          # shadcn/ui primitives (CLI-managed)
│   │   ├── auth/
│   │   ├── canvas/
│   │   ├── checklist/
│   │   ├── jobs/
│   │   ├── layout/
│   │   └── roles/
│   │
│   ├── domain/
│   │   ├── roles/
│   │   ├── roadmaps/
│   │   ├── nodes/
│   │   ├── checklists/
│   │   └── jobs/
│   │
│   ├── application/
│   │   ├── roles/
│   │   ├── roadmaps/
│   │   ├── nodes/
│   │   ├── checklists/
│   │   └── jobs/
│   │
│   ├── repositories/
│   │   ├── roles/
│   │   ├── roadmaps/
│   │   ├── nodes/
│   │   ├── checklists/
│   │   └── jobs/
│   │
│   ├── lib/
│   │   ├── auth/
│   │   ├── supabase/
│   │   ├── validation/
│   │   └── json/
│   │
│   ├── schemas/
│   │   └── roadmap-v1.ts
│   │
│   └── auth.ts
│
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── config.toml
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── public/
│   └── favicon/
│
├── docs/
│   ├── PRD.md
│   ├── TECH_SPEC.md
│   └── ADR/
│
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

This is a starting structure, not a requirement to create every directory immediately.

---

# 44. Sample Complete Roadmap JSON

The following is a deliberately substantial starter roadmap for the target role **Senior AI Engineer**. It is intended to be directly importable after implementation.

```json
{
  "schema": "skilltrack.roadmap.v1",
  "roadmap": {
    "name": "Senior AI Engineer",
    "description": "Comprehensive roadmap covering software engineering, AI/ML engineering, LLM systems, distributed systems, cloud, security, observability, testing, architecture, leadership, product thinking, and AI-assisted development."
  },
  "nodes": [
    {
      "id": "00000000-0000-4000-8000-000000000001",
      "title": "Software Engineering",
      "icon": "code",
      "position": { "x": 0, "y": 0 },
      "checklist": [
        { "id": "10000000-0000-4000-8000-000000000001", "title": "Write production-quality Python", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000002", "title": "Understand clean code and maintainability", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000003", "title": "Apply SOLID principles pragmatically", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000004", "title": "Use dependency injection effectively", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000005", "title": "Understand common design patterns", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000006", "title": "Design maintainable Python package structures", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000007", "title": "Write unit and integration tests", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000008", "title": "Understand async programming and event loops", "completed": false }
      ]
    },
    {
      "id": "00000000-0000-4000-8000-000000000002",
      "title": "Python Engineering",
      "parent_id": "00000000-0000-4000-8000-000000000001",
      "icon": "terminal",
      "position": { "x": 280, "y": -180 },
      "checklist": [
        { "id": "10000000-0000-4000-8000-000000000009", "title": "Type hints and modern Python typing", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000010", "title": "Context managers and resource lifecycle", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000011", "title": "Generators and iterators", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000012", "title": "Concurrency with asyncio", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000013", "title": "Packaging with pyproject.toml", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000014", "title": "Dependency management and reproducible environments", "completed": false }
      ]
    },
    {
      "id": "00000000-0000-4000-8000-000000000003",
      "title": "Architecture & Design",
      "parent_id": "00000000-0000-4000-8000-000000000001",
      "icon": "network",
      "position": { "x": 280, "y": 0 },
      "checklist": [
        { "id": "10000000-0000-4000-8000-000000000015", "title": "Understand modular monolith architecture", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000016", "title": "Understand microservices tradeoffs", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000017", "title": "Understand layered architecture", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000018", "title": "Understand hexagonal/ports-and-adapters architecture", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000019", "title": "Use ADRs for important decisions", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000020", "title": "Create architecture diagrams", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000021", "title": "Perform architecture tradeoff analysis", "completed": false }
      ]
    },
    {
      "id": "00000000-0000-4000-8000-000000000004",
      "title": "APIs & Backend Engineering",
      "parent_id": "00000000-0000-4000-8000-000000000001",
      "icon": "server",
      "position": { "x": 280, "y": 180 },
      "checklist": [
        { "id": "10000000-0000-4000-8000-000000000022", "title": "Design REST APIs", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000023", "title": "API versioning", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000024", "title": "Authentication and authorization", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000025", "title": "Input validation and API contracts", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000026", "title": "Rate limiting", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000027", "title": "Idempotency", "completed": false }
      ]
    },
    {
      "id": "00000000-0000-4000-8000-000000000005",
      "title": "Databases",
      "icon": "database",
      "position": { "x": 0, "y": 320 },
      "checklist": [
        { "id": "10000000-0000-4000-8000-000000000028", "title": "Relational database fundamentals", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000029", "title": "SQL", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000030", "title": "Indexes and query planning", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000031", "title": "Transactions and isolation levels", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000032", "title": "Constraints and referential integrity", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000033", "title": "Connection pooling", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000034", "title": "Caching strategies", "completed": false }
      ]
    },
    {
      "id": "00000000-0000-4000-8000-000000000006",
      "title": "Distributed Systems",
      "icon": "network",
      "position": { "x": 0, "y": 640 },
      "checklist": [
        { "id": "10000000-0000-4000-8000-000000000035", "title": "Understand CAP theorem", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000036", "title": "Understand consistency models", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000037", "title": "Queues and asynchronous processing", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000038", "title": "At-least-once delivery", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000039", "title": "Retries and exponential backoff", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000040", "title": "Dead-letter queues", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000041", "title": "Leases and visibility timeouts", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000042", "title": "Distributed locking", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000043", "title": "Idempotent consumers", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000044", "title": "Circuit breakers", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000045", "title": "Backpressure", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000046", "title": "Failure isolation", "completed": false }
      ]
    },
    {
      "id": "00000000-0000-4000-8000-000000000007",
      "title": "Cloud Engineering",
      "icon": "cloud",
      "position": { "x": 0, "y": 960 },
      "checklist": [
        { "id": "10000000-0000-4000-8000-000000000047", "title": "AWS fundamentals", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000048", "title": "Azure fundamentals", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000049", "title": "IAM", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000050", "title": "Object storage", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000051", "title": "Serverless compute", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000052", "title": "Containers", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000053", "title": "Infrastructure as code", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000054", "title": "Cloud networking", "completed": false }
      ]
    },
    {
      "id": "00000000-0000-4000-8000-000000000008",
      "title": "Docker & Deployment",
      "parent_id": "00000000-0000-4000-8000-000000000007",
      "icon": "box",
      "position": { "x": 280, "y": 820 },
      "checklist": [
        { "id": "10000000-0000-4000-8000-000000000055", "title": "Build production Docker images", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000056", "title": "Multi-stage builds", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000057", "title": "Container security", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000058", "title": "Health checks", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000059", "title": "CI/CD deployment pipelines", "completed": false }
      ]
    },
    {
      "id": "00000000-0000-4000-8000-000000000009",
      "title": "Security",
      "icon": "shield",
      "position": { "x": 640, "y": 0 },
      "checklist": [
        { "id": "10000000-0000-4000-8000-000000000060", "title": "OWASP Top 10", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000061", "title": "OWASP API Security Top 10", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000062", "title": "Authentication vs authorization", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000063", "title": "JWT security", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000064", "title": "Secrets management", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000065", "title": "Least privilege", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000066", "title": "Tenant isolation", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000067", "title": "Data encryption at rest and in transit", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000068", "title": "Prompt injection and LLM security", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000069", "title": "Supply-chain security", "completed": false }
      ]
    },
    {
      "id": "00000000-0000-4000-8000-000000000010",
      "title": "Testing & Quality",
      "icon": "flask-conical",
      "position": { "x": 640, "y": 320 },
      "checklist": [
        { "id": "10000000-0000-4000-8000-000000000070", "title": "Unit testing", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000071", "title": "Integration testing", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000072", "title": "End-to-end testing", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000073", "title": "Contract testing", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000074", "title": "Load testing", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000075", "title": "Failure injection", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000076", "title": "Regression testing", "completed": false }
      ]
    },
    {
      "id": "00000000-0000-4000-8000-000000000011",
      "title": "Observability",
      "icon": "chart-column",
      "position": { "x": 640, "y": 640 },
      "checklist": [
        { "id": "10000000-0000-4000-8000-000000000077", "title": "Structured logging", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000078", "title": "Metrics", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000079", "title": "Distributed tracing", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000080", "title": "Correlation IDs", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000081", "title": "Trace IDs and spans", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000082", "title": "SLIs, SLOs and SLAs", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000083", "title": "Alerting", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000084", "title": "Production debugging", "completed": false }
      ]
    },
    {
      "id": "00000000-0000-4000-8000-000000000012",
      "title": "Machine Learning Engineering",
      "icon": "brain",
      "position": { "x": 1000, "y": 0 },
      "checklist": [
        { "id": "10000000-0000-4000-8000-000000000085", "title": "Supervised learning fundamentals", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000086", "title": "Evaluation metrics", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000087", "title": "Train/validation/test methodology", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000088", "title": "Data leakage", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000089", "title": "Model deployment", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000090", "title": "Model monitoring", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000091", "title": "Experiment tracking", "completed": false }
      ]
    },
    {
      "id": "00000000-0000-4000-8000-000000000013",
      "title": "LLM Engineering",
      "parent_id": "00000000-0000-4000-8000-000000000012",
      "icon": "bot",
      "position": { "x": 1280, "y": 0 },
      "checklist": [
        { "id": "10000000-0000-4000-8000-000000000092", "title": "Transformer architecture", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000093", "title": "Tokenization", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000094", "title": "Inference parameters", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000095", "title": "Prompt engineering", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000096", "title": "Structured outputs", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000097", "title": "Function/tool calling", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000098", "title": "Fine-tuning and LoRA/QLoRA", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000099", "title": "Model selection and routing", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000100", "title": "LLM cost and latency optimization", "completed": false }
      ]
    },
    {
      "id": "00000000-0000-4000-8000-000000000014",
      "title": "RAG",
      "parent_id": "00000000-0000-4000-8000-000000000013",
      "icon": "search",
      "position": { "x": 1560, "y": 0 },
      "checklist": [
        { "id": "10000000-0000-4000-8000-000000000101", "title": "Document ingestion", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000102", "title": "Chunking strategies", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000103", "title": "Embedding models", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000104", "title": "Vector databases", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000105", "title": "Similarity search", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000106", "title": "Hybrid retrieval", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000107", "title": "Reranking", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000108", "title": "Retrieval evaluation", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000109", "title": "RAG observability", "completed": false }
      ]
    },
    {
      "id": "00000000-0000-4000-8000-000000000015",
      "title": "AI Evaluation",
      "parent_id": "00000000-0000-4000-8000-000000000013",
      "icon": "chart-column",
      "position": { "x": 1560, "y": 320 },
      "checklist": [
        { "id": "10000000-0000-4000-8000-000000000110", "title": "Define task-specific metrics", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000111", "title": "Build representative evaluation datasets", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000112", "title": "Regression evaluation", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000113", "title": "LLM-as-judge limitations", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000114", "title": "Error analysis", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000115", "title": "Cost/quality/latency tradeoffs", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000116", "title": "Production feedback loops", "completed": false }
      ]
    },
    {
      "id": "00000000-0000-4000-8000-000000000016",
      "title": "Agentic AI",
      "parent_id": "00000000-0000-4000-8000-000000000013",
      "icon": "bot",
      "position": { "x": 1560, "y": 640 },
      "checklist": [
        { "id": "10000000-0000-4000-8000-000000000117", "title": "Tool use", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000118", "title": "Agent state", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000119", "title": "Planning and reasoning patterns", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000120", "title": "Human-in-the-loop systems", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000121", "title": "Agent evaluation", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000122", "title": "Agent security", "completed": false }
      ]
    },
    {
      "id": "00000000-0000-4000-8000-000000000017",
      "title": "MLOps & AI Infrastructure",
      "icon": "server",
      "position": { "x": 1000, "y": 720 },
      "checklist": [
        { "id": "10000000-0000-4000-8000-000000000123", "title": "Model serving", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000124", "title": "GPU inference basics", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000125", "title": "Batch vs online inference", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000126", "title": "Model versioning", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000127", "title": "Feature/data pipelines", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000128", "title": "Drift and monitoring", "completed": false }
      ]
    },
    {
      "id": "00000000-0000-4000-8000-000000000018",
      "title": "Product & Business Thinking",
      "icon": "chart-column",
      "position": { "x": 1000, "y": 1040 },
      "checklist": [
        { "id": "10000000-0000-4000-8000-000000000129", "title": "Translate product requirements into technical requirements", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000130", "title": "Define measurable success criteria", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000131", "title": "Understand ROI", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000132", "title": "Cost/quality tradeoffs", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000133", "title": "Prioritization", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000134", "title": "Communicate technical tradeoffs to non-engineers", "completed": false }
      ]
    },
    {
      "id": "00000000-0000-4000-8000-000000000019",
      "title": "Leadership & Team Engineering",
      "icon": "users",
      "position": { "x": 1000, "y": 1360 },
      "checklist": [
        { "id": "10000000-0000-4000-8000-000000000135", "title": "Conduct effective code reviews", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000136", "title": "Mentor engineers", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000137", "title": "Delegate effectively", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000138", "title": "Resolve technical disagreements", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000139", "title": "Run technical design discussions", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000140", "title": "Give actionable feedback", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000141", "title": "Manage delivery risk", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000142", "title": "Lead incident reviews", "completed": false }
      ]
    },
    {
      "id": "00000000-0000-4000-8000-000000000020",
      "title": "Technical Communication",
      "icon": "book",
      "position": { "x": 1000, "y": 1680 },
      "checklist": [
        { "id": "10000000-0000-4000-8000-000000000143", "title": "Write technical specifications", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000144", "title": "Write ADRs", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000145", "title": "Document architecture decisions", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000146", "title": "Explain complex systems clearly", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000147", "title": "Write useful incident reports", "completed": false }
      ]
    },
    {
      "id": "00000000-0000-4000-8000-000000000021",
      "title": "AI-Assisted Development",
      "icon": "bot",
      "position": { "x": 1360, "y": 1360 },
      "checklist": [
        { "id": "10000000-0000-4000-8000-000000000148", "title": "Use coding agents effectively", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000149", "title": "Write implementation-ready specifications", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000150", "title": "Use repository-level context effectively", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000151", "title": "Review AI-generated code critically", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000152", "title": "Use AI for test generation and analysis", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000153", "title": "Use AI for debugging without surrendering system understanding", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000154", "title": "Establish AI coding policies and guardrails", "completed": false }
      ]
    },
    {
      "id": "00000000-0000-4000-8000-000000000022",
      "title": "Career & Engineering Growth",
      "icon": "chart-column",
      "position": { "x": 1360, "y": 1680 },
      "checklist": [
        { "id": "10000000-0000-4000-8000-000000000155", "title": "Understand senior engineer expectations", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000156", "title": "Build evidence of technical ownership", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000157", "title": "Build evidence of mentoring", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000158", "title": "Build evidence of architecture ownership", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000159", "title": "Build evidence of production ownership", "completed": false },
        { "id": "10000000-0000-4000-8000-000000000160", "title": "Analyze senior job descriptions", "completed": false }
      ]
    }
  ]
}
```

---

# 45. Future AI Architecture

AI must be an optional capability.

Recommended future abstraction:

```text
AIService
    │
    ├── OpenAIProvider
    ├── AnthropicProvider
    ├── GeminiProvider
    └── OpenRouterProvider
```

The domain must not depend directly on SDK-specific classes.

Example:

```text
JobAnalysisService
        │
        ▼
      AIService
        │
        ▼
    AI Provider
```

Potential AI capabilities:

### Job Analysis

```text
Raw JD
 ↓
LLM
 ↓
Structured requirements
 ↓
Roadmap matching
 ↓
Gap analysis
```

### Roadmap Improvement

```text
Current roadmap
+
target role
+
recent industry signals
        ↓
AI analysis
        ↓
suggested nodes
        ↓
human approval
```

AI must never silently modify the user's roadmap.

All AI-generated changes should require explicit user confirmation.

---

# 46. Future Industry Trend Analysis

Later versions may ingest:

- job descriptions
- public job-market data
- manually added jobs
- technology trends

and identify:

```text
Emerging skill
Increasing demand
Decreasing demand
Role-specific skill
Missing roadmap area
```

This is explicitly outside MVP.

---

# 47. Non-Goals

The MVP will not include:

- Notion
- automatic LinkedIn scraping
- automatic job-board scraping
- LLM-powered roadmap generation
- LLM-powered skill extraction
- social networking
- public user profiles
- collaborative editing
- paid subscriptions
- enterprise organizations
- complex permissions
- arbitrary graph relationships
- real-time multi-user canvas collaboration

These may be considered later.

---

# 48. Design Principles

## 1. Progress is evidence-based

Do not make the application a checkbox toy.

A completed skill should ideally represent demonstrated understanding or capability.

## 2. Stable identity

Nodes have stable IDs independent of their names and visual position.

## 3. Derived state

Avoid duplicating state where it can be calculated.

Progress is derived from checklist completion.

## 4. Security by architecture

User isolation should be enforced at the database layer, not only through frontend code.

## 5. AI is optional

The core application must remain useful without an LLM.

## 6. Simple first

Use a modular monolith.

Do not introduce microservices unless a real requirement emerges.

## 7. Exportability

Users own their roadmap data and can export it as JSON.

## 8. Human-controlled AI

Future AI suggestions must be reviewable and explicitly accepted.

## 9. Composed UI, not custom chrome

The application chrome uses **Inter**, **Lucide**, and **shadcn/ui**. Empty states use `Empty`. Toasts use `sonner`. Callouts use `Alert`. The canvas is the only primary non-shadcn surface.

---

# 49. MVP Acceptance Criteria

SkillTrack MVP is complete when a user can:

### Authentication

- Sign in with GitHub.
- Be rejected when their username is not allowed.
- Sign out.
- Access the same application locally and on Vercel.

### Roadmap

- Create `Senior AI Engineer`.
- Search/select it in the sidebar role switcher.
- Land on that role’s roadmap view (sidebar **Roadmap** before **Settings**).
- See an infinite canvas.
- Create nested nodes to arbitrary depth.
- Move nodes.
- Select Lucide icons.
- Configure notes and links.
- Add evidence checklist items.
- Check/uncheck checklist items.
- See node progress update.
- See parent progress update.
- See roadmap progress update.

### Persistence

- Refresh the page without losing changes.
- Close/reopen the application without losing changes.
- Ensure users cannot access another user's data.

### Import

- Create a new roadmap from valid JSON.
- Import onto an existing role only when it has zero nodes (including labels).
- Reject invalid JSON.
- Reject invalid schema.
- Reject duplicate roadmap names (create path).
- Reject cycles.
- Reject invalid parent references, labels-with-parents, and illegal handle wiring.
- Reject malformed links.
- Roll back failed imports.

### Export

- Export a complete roadmap.
- Re-import the exported JSON into a new roadmap.
- Preserve hierarchy.
- Preserve canvas labels (text and positions; still parentless).
- Preserve handle kind and incoming-edge animation.
- Preserve checklist state.
- Preserve notes.
- Preserve links.
- Preserve icons.
- Preserve positions.

### Job Analytics

- Add a job description.
- Add required skills.
- Associate skills with roadmap nodes.
- Show basic skill coverage and gaps.

### UI system

- Render Inter as the UI typeface.
- Render Lucide icons (including node icons and chrome).
- Compose screens from shadcn/ui; empty collections use `Empty`.
- Open node configuration in a `Sheet`.
- Use `sonner` for mutation toasts.

---

# 50. Initial Implementation Order

Recommended implementation sequence:

```text
Phase 1
├── Next.js 16 project
├── TypeScript
├── Tailwind
├── Inter (next/font) + lucide-react
├── shadcn/ui init (Empty, Sidebar, Sheet, Dialog, Button, …)
├── GitHub OAuth
└── protected dashboard

Phase 2
├── Supabase
├── migrations
├── users
├── roles
└── RLS

Phase 3
├── roadmap canvas
├── nodes
├── hierarchy
├── positions
└── icons

Phase 4
├── node configuration panel
├── checklist
├── notes
├── links
└── progress calculation

Phase 5
├── JSON schema
├── import
├── export
└── validation

Phase 6
├── job descriptions
├── requirements
└── deterministic roadmap matching

Phase 7
├── unit tests
├── integration tests
├── E2E tests
└── security testing

Phase 8
├── Vercel deployment
├── production configuration
└── final UX polish

Phase 9+
└── AI capabilities
```

---

# 51. Architectural Decision Records to Create

Before or during implementation, create ADRs for:

1. **ADR-001:** Supabase as application database.
2. **ADR-002:** GitHub OAuth with Auth.js.
3. **ADR-003:** Modular monolith architecture.
4. **ADR-004:** Tree hierarchy using `parent_id`.
5. **ADR-005:** Evidence-based progress calculation.
6. **ADR-006:** Canonical versioned JSON format.
7. **ADR-007:** RLS-based tenant/user isolation.
8. **ADR-008:** AI features deferred from MVP.
9. **ADR-009:** React Flow or selected canvas implementation.
10. **ADR-010:** Deterministic job-to-roadmap matching for MVP.
11. **ADR-011:** Inter typeface, Lucide icons, and shadcn/ui as the exclusive UI system.

---

# 52. Definition of Done for a Roadmap Node

A node is considered fully complete only when:

```text
Every required evidence checklist item
        ↓
is checked
        ↓
node progress = 100%
        ↓
parent/subtree progress recalculates
        ↓
roadmap progress recalculates
```

The system must never require manually updating three separate progress fields.

The checklist is the source of truth.

---

# 53. Long-Term Product Direction

SkillTrack should eventually become more than a roadmap tracker.

The long-term model is:

```text
                     ┌──────────────┐
                     │ Target Role  │
                     └──────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Roadmap     │
                    └───────┬───────┘
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
        Knowledge        Evidence       Progress
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                    ┌───────────────┐
                    │ Job Market    │
                    │ Requirements  │
                    └───────┬───────┘
                            │
                            ▼
                     Skill Gap Analysis
                            │
                            ▼
                    Future AI Guidance
```

The core principle remains:

> **SkillTrack should tell the user not merely what they want to learn, but what capability they have demonstrated, what the target role requires, and where the evidence-based gaps are.**

