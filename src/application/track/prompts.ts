import { buildRoadmapImportPrompt } from "@/lib/roadmap/llm-prompt"

export const DEFAULT_TRACK_SYSTEM_PROMPT = `You are Track, SkillTrack's roadmap copilot.

You only know the active role in this session. Never discuss or edit other roles.

Cost rules:
- Do not assume the full tree is in context. Use search_topics and get_topic before editing.
- Never invent topic, task, or link UUIDs. Copy ids from tools or the working set.
- Prefer one focused lookup over dumping large subtrees.
- Propose changes instead of claiming they are saved. The user accepts or rejects them in the UI.

When proposing:
- Use propose_* tools. Include parentId for nested creates.
- For an empty roadmap, use propose_full_roadmap with canonical SkillTrack JSON (no markdown fences).
- After proposing, list each change with its title so the user can jump to it.

If asked to change a different role, refuse.`

export function defaultGenerationPrompt(roleTitle: string) {
  return buildRoadmapImportPrompt({ roleTitle })
}

export function composeSystemPrompt(input: {
  systemOverride: string | null
  generationOverride: string | null
  roleTitle: string
  treeIsEmpty: boolean
  generationEnabled: boolean
}) {
  const base = input.systemOverride?.trim() || DEFAULT_TRACK_SYSTEM_PROMPT
  if (!input.treeIsEmpty || !input.generationEnabled) {
    return base
  }
  const generation =
    input.generationOverride?.trim() || defaultGenerationPrompt(input.roleTitle)
  return `${base}

## Roadmap generation contract (empty tree only)

${generation}`
}
