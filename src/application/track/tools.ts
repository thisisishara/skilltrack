import "server-only"

import { tool, type ToolSet } from "ai"
import { z } from "zod"

import { explodeRoadmapDocument } from "@/domain/track/explode"
import type { TrackProposal } from "@/domain/track/proposals"
import { truncateJson } from "@/domain/track/context"
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

export function createTrackTools(input: {
  enabled: TrackToolId[]
  nodes: RoadmapNode[]
  tasks: ChecklistItem[]
  links: NodeLink[]
  treeIsEmpty: boolean
  maxToolResultChars: number
  includeDescriptions: boolean
  includeNotes: boolean
  includeTasks: boolean
  includeLinks: boolean
}) {
  const enabled = new Set(input.enabled)
  const tools: ToolSet = {}

  const clip = (value: unknown) => truncateJson(value, input.maxToolResultChars)

  if (enabled.has("search_topics")) {
    tools.search_topics = tool({
      description:
        "Search topics in the active roadmap by title. Returns id, title, parentId only.",
      inputSchema: z.object({
        query: z.string().min(1).max(120),
      }),
      execute: async ({ query }) => {
        const needle = query.trim().toLowerCase()
        const matches = input.nodes
          .filter(
            (node) =>
              node.kind !== "label" && node.title.toLowerCase().includes(needle)
          )
          .slice(0, 20)
          .map((node) => ({
            id: node.id,
            title: node.title,
            parentId: node.parentId,
          }))
        return clip({ matches })
      },
    })
  }

  if (enabled.has("get_topic")) {
    tools.get_topic = tool({
      description: "Load one topic by id. Children are titles only.",
      inputSchema: z.object({ topicId: uuid }),
      execute: async ({ topicId }) => {
        const node = input.nodes.find((item) => item.id === topicId)
        if (!node) {
          return { error: "Topic not found in this role." }
        }
        const payload: Record<string, unknown> = {
          id: node.id,
          parentId: node.parentId,
          title: node.title,
          children: input.nodes
            .filter((child) => child.parentId === node.id)
            .map((child) => ({ id: child.id, title: child.title })),
        }
        if (input.includeDescriptions) payload.description = node.description
        if (input.includeNotes) payload.notes = node.notes
        if (input.includeTasks) {
          payload.tasks = input.tasks
            .filter((task) => task.topicId === node.id)
            .map((task) => ({
              id: task.id,
              title: task.title,
              completed: task.completed,
            }))
        }
        if (input.includeLinks) {
          payload.links = input.links
            .filter((link) => link.topicId === node.id)
            .map((link) => ({ id: link.id, label: link.label, url: link.url }))
        }
        return clip(payload)
      },
    })
  }

  if (enabled.has("get_links")) {
    tools.get_links = tool({
      description: "List links on the roadmap or a topic.",
      inputSchema: z.object({
        topicId: uuid.nullable().optional(),
      }),
      execute: async ({ topicId }) => {
        const rows = input.links
          .filter((link) =>
            topicId === undefined
              ? true
              : topicId === null
                ? link.topicId === null
                : link.topicId === topicId
          )
          .map((link) => ({
            id: link.id,
            topicId: link.topicId,
            label: link.label,
            url: link.url,
          }))
        return clip({ links: rows })
      },
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
        return proposal({
          kind: "create",
          entity: "task",
          targetId: id,
          parentId: fields.topicId,
          title: fields.title,
          payload: { ...fields, id },
        })
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
        return proposal({
          kind: "update",
          entity: "task",
          targetId: task.id,
          parentId: task.topicId,
          title: fields.title ?? task.title,
          payload: fields,
        })
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
        return proposal({
          kind: "delete",
          entity: "task",
          targetId: task.id,
          parentId: task.topicId,
          title: task.title,
          payload: { taskId },
        })
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
        return proposal({
          kind: "create",
          entity: "link",
          targetId: id,
          parentId: fields.topicId,
          title: fields.label,
          payload: { ...fields, id },
        })
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
        return proposal({
          kind: "update",
          entity: "link",
          targetId: link.id,
          parentId: link.topicId,
          title: fields.label ?? link.label,
          payload: fields,
        })
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
        return proposal({
          kind: "delete",
          entity: "link",
          targetId: link.id,
          parentId: link.topicId,
          title: link.label,
          payload: { linkId },
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
