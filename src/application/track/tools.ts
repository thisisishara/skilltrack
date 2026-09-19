import "server-only"

import { tool, type ToolSet } from "ai"
import { z } from "zod"

import { explodeRoadmapDocument } from "@/domain/track/explode"
import type { TrackProposal } from "@/domain/track/proposals"
import { truncateJson } from "@/domain/track/context"
import {
  listChildSummaries,
  listRootSummaries,
  searchTopicSummaries,
  skillTopics,
  topicPath,
} from "@/domain/track/traverse"
import type { NodeLink } from "@/domain/links/types"
import type { ChecklistItem } from "@/domain/tasks/types"
import type { RoadmapNode } from "@/domain/topics/types"
import type { TrackToolId } from "@/domain/user-settings/types"

const uuid = z.string().uuid()

function proposal(partial: Omit<TrackProposal, "id" | "status">): TrackProposal {
  return {
    id: crypto.randomUUID(),
    status: "pending",
    ...partial,
  }
}

function topicTitleFor(nodes: RoadmapNode[], topicId: string | null) {
  if (!topicId) {
    return "Roadmap"
  }
  return skillTopics(nodes).find((node) => node.id === topicId)?.title ?? "Topic"
}

function proposalWithTopic(
  nodes: RoadmapNode[],
  partial: Omit<TrackProposal, "id" | "status">,
  topicId: string | null
) {
  return proposal({
    ...partial,
    payload: {
      ...partial.payload,
      topicTitle: topicTitleFor(nodes, topicId),
    },
  })
}

export function createTrackTools(input: {
  enabled: TrackToolId[]
  role: { id: string; description: string | null; notes: string | null }
  nodes: RoadmapNode[]
  tasks: ChecklistItem[]
  links: NodeLink[]
  treeIsEmpty: boolean
  maxToolResultChars: number
}) {
  const enabled = new Set(input.enabled)
  const tools: ToolSet = {}

  const clip = (value: unknown) => truncateJson(value, input.maxToolResultChars)

  if (enabled.has("list_roots")) {
    tools.list_roots = tool({
      description:
        "List top-level topics only (id, title, childCount, hasNotes, taskCount, linkCount). Do not call this on every turn if search_topics already found the node. Never follow with list_children on every root.",
      inputSchema: z.object({}),
      execute: async () =>
        clip(listRootSummaries(input.nodes, input.tasks, input.links)),
    })
  }

  if (enabled.has("list_children")) {
    tools.list_children = tool({
      description:
        "List direct children of one topic. Not recursive. Call once on the matching node after search_topics or list_roots. Do not walk the whole tree.",
      inputSchema: z.object({ topicId: uuid }),
      execute: async ({ topicId }) =>
        clip(listChildSummaries(input.nodes, input.tasks, input.links, topicId)),
    })
  }

  if (enabled.has("search_topics")) {
    tools.search_topics = tool({
      description:
        "Search topics by title. Returns summaries plus ancestor path. Prefer this over listing the whole tree when the user named a skill.",
      inputSchema: z.object({
        query: z.string().min(1).max(120),
      }),
      execute: async ({ query }) =>
        clip(searchTopicSummaries(input.nodes, input.tasks, input.links, query)),
    })
  }

  if (enabled.has("get_topic")) {
    tools.get_topic = tool({
      description:
        "Load one topic card: id, parentId, title, description, icon, color. No notes, tasks, links, or children. Use list_children / get_notes / get_tasks / get_links for those.",
      inputSchema: z.object({ topicId: uuid }),
      execute: async ({ topicId }) => {
        const node = skillTopics(input.nodes).find((item) => item.id === topicId)
        if (!node) {
          return { error: "Topic not found in this role." }
        }
        return clip({
          id: node.id,
          parentId: node.parentId,
          title: node.title,
          description: node.description,
          icon: node.icon,
          color: node.color,
        })
      },
    })
  }

  if (enabled.has("get_path")) {
    tools.get_path = tool({
      description:
        "Return ancestors from the root to this topic (id and title). Use instead of walking list_children upward.",
      inputSchema: z.object({ topicId: uuid }),
      execute: async ({ topicId }) => {
        const path = topicPath(input.nodes, topicId)
        if (!path) {
          return { error: "Topic not found in this role." }
        }
        return clip({ path })
      },
    })
  }

  if (enabled.has("get_notes")) {
    tools.get_notes = tool({
      description:
        "Load notes for one topic. Call only when hasNotes is true and you will quote or edit them.",
      inputSchema: z.object({ topicId: uuid }),
      execute: async ({ topicId }) => {
        const node = skillTopics(input.nodes).find((item) => item.id === topicId)
        if (!node) {
          return { error: "Topic not found in this role." }
        }
        return clip({ topicId: node.id, notes: node.notes })
      },
    })
  }

  if (enabled.has("get_tasks")) {
    tools.get_tasks = tool({
      description:
        "Load tasks for one topic. Call only when taskCount > 0 and you will quote or edit them.",
      inputSchema: z.object({ topicId: uuid }),
      execute: async ({ topicId }) => {
        const node = skillTopics(input.nodes).find((item) => item.id === topicId)
        if (!node) {
          return { error: "Topic not found in this role." }
        }
        return clip({
          topicId: node.id,
          tasks: input.tasks
            .filter((task) => task.topicId === node.id)
            .map((task) => ({
              id: task.id,
              title: task.title,
              completed: task.completed,
              description: task.description,
            })),
        })
      },
    })
  }

  if (enabled.has("get_links")) {
    tools.get_links = tool({
      description:
        "Load links for one topic, or pass topicId null for roadmap-level links. Does not dump every link in the role.",
      inputSchema: z.object({
        topicId: uuid.nullable(),
      }),
      execute: async ({ topicId }) => {
        if (topicId !== null) {
          const node = skillTopics(input.nodes).find((item) => item.id === topicId)
          if (!node) {
            return { error: "Topic not found in this role." }
          }
        }
        const rows = input.links
          .filter((link) =>
            topicId === null ? link.topicId === null : link.topicId === topicId
          )
          .map((link) => ({
            id: link.id,
            topicId: link.topicId,
            label: link.label,
            url: link.url,
          }))
        return clip({ topicId, links: rows })
      },
    })
  }

  if (enabled.has("get_role")) {
    tools.get_role = tool({
      description:
        "Load this role's description and notes (roadmap overview, not a topic). Use when the user talks about the roadmap note or description, or when those working-set fields are truncated.",
      inputSchema: z.object({}),
      execute: async () =>
        clip({
          roleId: input.role.id,
          description: input.role.description,
          notes: input.role.notes,
        }),
    })
  }

  if (enabled.has("propose_create_topic")) {
    tools.propose_create_topic = tool({
      description: "Propose a new topic. Does not save until the user accepts.",
      inputSchema: z.object({
        parentId: uuid.nullable(),
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        notes: z.string().max(4000).optional(),
        icon: z.string().max(64).optional(),
        color: z.string().max(16).optional(),
      }),
      execute: async (fields) => {
        const id = crypto.randomUUID()
        return proposal({
          kind: "create",
          entity: "topic",
          targetId: id,
          parentId: fields.parentId,
          title: fields.title,
          payload: { ...fields, id },
        })
      },
    })
  }

  if (enabled.has("propose_update_topic")) {
    tools.propose_update_topic = tool({
      description: "Propose updates to an existing topic. Look it up first.",
      inputSchema: z.object({
        topicId: uuid,
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).nullable().optional(),
        notes: z.string().max(4000).nullable().optional(),
        icon: z.string().max(64).optional(),
        color: z.string().max(16).nullable().optional(),
      }),
      execute: async (fields) => {
        const node = input.nodes.find((item) => item.id === fields.topicId)
        if (!node) {
          return { error: "Unknown topic id. Use search_topics or get_topic." }
        }
        return proposal({
          kind: "update",
          entity: "topic",
          targetId: node.id,
          parentId: node.parentId,
          title: fields.title ?? node.title,
          payload: fields,
        })
      },
    })
  }

  if (enabled.has("propose_delete_topic")) {
    tools.propose_delete_topic = tool({
      description: "Propose deleting a topic and its subtree.",
      inputSchema: z.object({ topicId: uuid }),
      execute: async ({ topicId }) => {
        const node = input.nodes.find((item) => item.id === topicId)
        if (!node) {
          return { error: "Unknown topic id." }
        }
        return proposal({
          kind: "delete",
          entity: "topic",
          targetId: node.id,
          parentId: node.parentId,
          title: node.title,
          payload: { topicId },
        })
      },
    })
  }

  if (enabled.has("propose_create_notes")) {
    tools.propose_create_notes = tool({
      description:
        "Propose adding notes on a topic that has none. Notes are a single text field on the topic, not a list. Use propose_update_notes if notes already exist.",
      inputSchema: z.object({
        topicId: uuid,
        notes: z.string().min(1).max(4000),
      }),
      execute: async ({ topicId, notes }) => {
        const node = skillTopics(input.nodes).find((item) => item.id === topicId)
        if (!node) {
          return { error: "Unknown topic id. Use search_topics or list_children." }
        }
        if (node.notes?.trim()) {
          return { error: "This topic already has notes. Use propose_update_notes." }
        }
        return proposalWithTopic(
          input.nodes,
          {
            kind: "update",
            entity: "topic",
            targetId: node.id,
            parentId: node.parentId,
            title: node.title,
            payload: {
              topicId: node.id,
              title: node.title,
              notes,
              facet: "notes",
              notesAction: "create",
            },
          },
          node.id
        )
      },
    })
  }

  if (enabled.has("propose_update_notes")) {
    tools.propose_update_notes = tool({
      description:
        "Propose replacing notes on a topic. Call get_notes first. Use propose_create_notes if the topic has no notes yet.",
      inputSchema: z.object({
        topicId: uuid,
        notes: z.string().min(1).max(4000),
      }),
      execute: async ({ topicId, notes }) => {
        const node = skillTopics(input.nodes).find((item) => item.id === topicId)
        if (!node) {
          return { error: "Unknown topic id. Use search_topics or get_notes." }
        }
        if (!node.notes?.trim()) {
          return { error: "This topic has no notes. Use propose_create_notes." }
        }
        return proposalWithTopic(
          input.nodes,
          {
            kind: "update",
            entity: "topic",
            targetId: node.id,
            parentId: node.parentId,
            title: node.title,
            payload: {
              topicId: node.id,
              title: node.title,
              notes,
              facet: "notes",
              notesAction: "update",
            },
          },
          node.id
        )
      },
    })
  }

  if (enabled.has("propose_delete_notes")) {
    tools.propose_delete_notes = tool({
      description:
        "Propose clearing notes on a topic. Does not delete the topic.",
      inputSchema: z.object({ topicId: uuid }),
      execute: async ({ topicId }) => {
        const node = skillTopics(input.nodes).find((item) => item.id === topicId)
        if (!node) {
          return { error: "Unknown topic id." }
        }
        if (!node.notes?.trim()) {
          return { error: "This topic has no notes to delete." }
        }
        return proposalWithTopic(
          input.nodes,
          {
            kind: "update",
            entity: "topic",
            targetId: node.id,
            parentId: node.parentId,
            title: node.title,
            payload: {
              topicId: node.id,
              title: node.title,
              notes: null,
              facet: "notes",
              notesAction: "delete",
            },
          },
          node.id
        )
      },
    })
  }

  if (enabled.has("propose_create_task")) {
    tools.propose_create_task = tool({
      description: "Propose a new task under a topic.",
      inputSchema: z.object({
        topicId: uuid,
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
      }),
      execute: async (fields) => {
        const id = crypto.randomUUID()
        return proposalWithTopic(
          input.nodes,
          {
            kind: "create",
            entity: "task",
            targetId: id,
            parentId: fields.topicId,
            title: fields.title,
            payload: { ...fields, id },
          },
          fields.topicId
        )
      },
    })
  }

  if (enabled.has("propose_update_task")) {
    tools.propose_update_task = tool({
      description: "Propose renaming or editing a task.",
      inputSchema: z.object({
        taskId: uuid,
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).nullable().optional(),
        completed: z.boolean().optional(),
      }),
      execute: async (fields) => {
        const task = input.tasks.find((item) => item.id === fields.taskId)
        if (!task) {
          return { error: "Unknown task id." }
        }
        return proposalWithTopic(
          input.nodes,
          {
            kind: "update",
            entity: "task",
            targetId: task.id,
            parentId: task.topicId,
            title: fields.title ?? task.title,
            payload: fields,
          },
          task.topicId
        )
      },
    })
  }

  if (enabled.has("propose_delete_task")) {
    tools.propose_delete_task = tool({
      description: "Propose deleting a task.",
      inputSchema: z.object({ taskId: uuid }),
      execute: async ({ taskId }) => {
        const task = input.tasks.find((item) => item.id === taskId)
        if (!task) {
          return { error: "Unknown task id." }
        }
        return proposalWithTopic(
          input.nodes,
          {
            kind: "delete",
            entity: "task",
            targetId: task.id,
            parentId: task.topicId,
            title: task.title,
            payload: { taskId },
          },
          task.topicId
        )
      },
    })
  }

  if (enabled.has("propose_create_link")) {
    tools.propose_create_link = tool({
      description: "Propose a link on the roadmap or a topic.",
      inputSchema: z.object({
        topicId: uuid.nullable(),
        label: z.string().min(1).max(120),
        url: z.string().url(),
      }),
      execute: async (fields) => {
        const id = crypto.randomUUID()
        return proposalWithTopic(
          input.nodes,
          {
            kind: "create",
            entity: "link",
            targetId: id,
            parentId: fields.topicId,
            title: fields.label,
            payload: { ...fields, id },
          },
          fields.topicId
        )
      },
    })
  }

  if (enabled.has("propose_update_link")) {
    tools.propose_update_link = tool({
      description: "Propose editing a link.",
      inputSchema: z.object({
        linkId: uuid,
        label: z.string().min(1).max(120).optional(),
        url: z.string().url().optional(),
      }),
      execute: async (fields) => {
        const link = input.links.find((item) => item.id === fields.linkId)
        if (!link) {
          return { error: "Unknown link id." }
        }
        return proposalWithTopic(
          input.nodes,
          {
            kind: "update",
            entity: "link",
            targetId: link.id,
            parentId: link.topicId,
            title: fields.label ?? link.label,
            payload: fields,
          },
          link.topicId
        )
      },
    })
  }

  if (enabled.has("propose_delete_link")) {
    tools.propose_delete_link = tool({
      description: "Propose deleting a link.",
      inputSchema: z.object({ linkId: uuid }),
      execute: async ({ linkId }) => {
        const link = input.links.find((item) => item.id === linkId)
        if (!link) {
          return { error: "Unknown link id." }
        }
        return proposalWithTopic(
          input.nodes,
          {
            kind: "delete",
            entity: "link",
            targetId: link.id,
            parentId: link.topicId,
            title: link.label,
            payload: { linkId },
          },
          link.topicId
        )
      },
    })
  }

  if (enabled.has("propose_update_role")) {
    tools.propose_update_role = tool({
      description:
        "Propose an edit to this role's description and/or notes (roadmap overview). Use for 'the note on this roadmap'. Does not save until the user accepts.",
      inputSchema: z.object({
        description: z.string().max(2000).nullable().optional(),
        notes: z.string().max(4000).nullable().optional(),
      }),
      execute: async (fields) => {
        if (fields.description === undefined && fields.notes === undefined) {
          return { error: "Set description, notes, or both." }
        }
        const title =
          fields.notes !== undefined && fields.description === undefined
            ? "Roadmap notes"
            : fields.description !== undefined && fields.notes === undefined
              ? "Roadmap description"
              : "Roadmap overview"
        return proposal({
          kind: "update",
          entity: "roadmap",
          targetId: null,
          parentId: null,
          title,
          payload: {
            ...fields,
            facet: "role",
          },
        })
      },
    })
  }

  if (enabled.has("propose_full_roadmap") && input.treeIsEmpty) {
    tools.propose_full_roadmap = tool({
      description:
        "Propose a full canonical SkillTrack roadmap JSON for an empty role. User must accept.",
      inputSchema: z.object({
        json: z.string().min(20).describe("Canonical SkillTrack JSON object as a string"),
      }),
      execute: async ({ json }) => {
        try {
          const exploded = explodeRoadmapDocument(json)
          return {
            kind: "batch" as const,
            title: exploded.documentTitle,
            proposals: exploded.proposals,
          }
        } catch (error) {
          return {
            error:
              error instanceof Error
                ? error.message
                : "Roadmap JSON did not match the SkillTrack schema.",
          }
        }
      },
    })
  }

  return tools
}
