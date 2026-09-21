# About SkillTrack

SkillTrack is a personal skill-roadmap tracker. You pick a career role, build a nested tree of skills, tick tasks as evidence that you can do them, and save job postings you care about under that same role.

Progress comes from completed tasks, not from a self-score. Roadmaps and jobs both live on the same role. They are not matched to each other.

---

## What you do in the app

1. Sign in with GitHub.
2. Wait for admin approval (unless you are the admin account).
3. Create a **role** (for example “Senior backend engineer”). Each role has one roadmap and its own jobs list.
4. Fill the tree: add topics by hand, import JSON, or ask Tracky to propose a full tree on an empty role.
5. Work the tree: topics, grouping labels, notes, links, tasks. Overall progress rolls up from completed tasks.
6. Save **jobs** you are interested in (paste LinkedIn page source or job text).
7. Optionally ask Tracky to propose roadmap edits. Nothing is saved until you accept.

Switching roles switches the whole working set: roadmap, jobs, and Tracky chat.

---

## Access and accounts

GitHub is the only sign-in. New accounts stay pending until the admin approves them in account settings → **Users**. Denied users cannot enter the dashboard. Pending users see an approval screen.

Each person only sees their own roles, topics, jobs, and settings. The admin role cannot be granted from the UI.

The dashboard is a collapsible sidebar plus a header: search, notifications, version changelog, Tracky, and the account menu (settings, sign out).

---

## Roles

A role is a named career target. Names are unique per account. Each role can have a description and notes (the roadmap overview).

**Create** from the role switcher:

- Empty roadmap
- Import SkillTrack roadmap JSON (paste or drop a file)
- **Tracky**: create the empty role and open the copilot to propose a full tree (Tracky must be on, with an API key)

The switcher searches roles. Ctrl/⌘ + ↑ / ↓ cycles the list without leaving the current screen. The last selected role is remembered in the browser.

**Role settings** (sidebar): rename (autosaves), export JSON, copy a prompt you can paste into an external LLM to generate import JSON, delete the role (tree, links, tasks, and jobs go with it).

---

## Roadmap

The roadmap is a **nested list of topics**, not a graph canvas. You expand and collapse rows, drag to nest or reorder (in Edit), and open a topic to see its details.

### View and Edit

The tree header menu switches **View** and **Edit**. View is for reading and ticking tasks. Edit unlocks add, drag, and structural changes. The choice is remembered per account.

From the header you can expand or collapse all topics, add a top-level topic (Edit), import JSON when the tree is empty, or export JSON when it is not. Dropping a `.json` file onto an empty tree also imports.

Clicking the role name in the header opens the **overview**: role description, notes, and role-level links.

### Topics

Each row is a topic. Two kinds:

- **Skill** (default) — counts toward progress
- **Label** — a grouping heading; does not count as a skill

Topics nest under other topics to any depth. Editing a title or icon does not reset its tasks. Each topic can have a title, description, notes, icon, and optional accent color.

### Tasks, links, notes

Selecting a topic opens a details panel (a sheet on small screens).

- **Tasks** are the evidence checklist. Completing them is how the app treats a skill as learned.
- **Links** are bookmarks on that topic, or on the role overview.
- **Notes** are one text field per topic, plus the role overview notes.

You can tick, add, edit, delete, and reorder tasks from the panel.

### Progress

A status bar at the bottom of the roadmap shows overall percent and task counts.

- A topic’s progress is completed tasks / tasks on that topic
- Parent and overall progress roll up **skill** topics only (labels are skipped)
- A topic is pending, in progress, or done from those counts

There is no separate skill-level score. The tree plus tasks are the record.

### Search

Header search finds roles, topics, and tasks. Opening a topic focuses it in the tree.

### Notifications

If notifications are on in account settings, roles with no updates for two weeks appear in the header bell so you can jump back in.

---

## Jobs

Jobs live under the active role (sidebar **Jobs**), not as a global board.

### Add a job

Paste the job page source or the job text. You can also paste a LinkedIn job URL; the app tries to fetch it and falls back to paste if that fails. LinkedIn usually blocks server fetches, so paste is the reliable path.

**Extract** (default) reads guest LinkedIn markup with rules. **Extract with AI** is optional (same API key as Tracky): it can fill empty fields or replace them. You can merge with a previous extract. Preview company, title, location, skills, and sections, then save.

The app stores the structured posting, not the raw page chrome.

### Fields you get

Company, title, location(s), seniority, employment type, workplace type, salary when present, posted date, description, about-the-job, minimum and preferred qualifications, skill chips, responsibilities, and extras such as travel, languages, and benefits.

**Analyze** (optional, same API key) rates the posting as an opportunity (poor through excellent) with a short summary, highlights, and concerns. That rating is about the posting, not about how well your roadmap covers it.

### List and detail

The jobs list filters and sorts by search text, company, location, employment, seniority, workplace, how recently it was posted, and skill chips. Open a job for the full write-up, edit, re-analyze, or delete.

---

## Tracky

Tracky is an optional **roadmap copilot**. You turn it on in account settings, pick a provider (Anthropic, OpenAI, Google, or OpenRouter), and paste your own API key. The rest of the app works without a key.

Chat is stored in the browser for the **active role**. Switching roles or Restart clears the conversation and any pending proposals.

Tracky only sees the current role’s roadmap. It asks for pieces of the tree as it works; it does not load everything up front. When it wants to change something, it **proposes** creates, updates, or deletes (topics, notes, tasks, links, role overview, or a full tree on an empty roadmap). Proposed rows show in the tree as pending. You accept or reject each one, or all of them.

You can drag a topic onto the composer to pin it for that message, turn individual tools off, raise or lower how much context it may use, and edit the system prompt. Admins can add extra models to the catalog.

Job extract and analyze use the same key when you opt in. Tracky chat does not read saved jobs.

---

## Account settings

Opened from the account menu:

- **General** — notifications on/off
- **Tracky** — enable, provider, model, API key, tools, prompts
- **Models** — extra model ids (admin)
- **Users** — approve or deny GitHub accounts (admin)
