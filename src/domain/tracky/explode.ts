import { parseRoadmapJson } from "@/domain/roadmap-json/parse"
import type { TrackyProposal } from "@/domain/tracky/proposals"

export function explodeRoadmapDocument(json: string): {
  documentTitle: string
  proposals: TrackyProposal[]
} {
  const document = parseRoadmapJson(json)
  const proposals: TrackyProposal[] = document.links.map((link) => ({
    id: crypto.randomUUID(),
    kind: "create",
    entity: "link",
    status: "pending",
    targetId: link.id,
    parentId: null,
    title: link.label,
    payload: {
      id: link.id,
      topicId: null,
      label: link.label,
      url: link.url,
    },
  }))

  for (const topic of document.topics) {
    proposals.push({
      id: crypto.randomUUID(),
      kind: "create",
      entity: "topic",
      status: "pending",
      targetId: topic.id,
      parentId: topic.parentId,
      title: topic.title,
      payload: {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        notes: topic.notes,
        icon: topic.icon,
        color: topic.color,
      },
    })
    for (const task of topic.tasks) {
      proposals.push({
        id: crypto.randomUUID(),
        kind: "create",
        entity: "task",
        status: "pending",
        targetId: task.id,
        parentId: topic.id,
        title: task.title,
        payload: {
          id: task.id,
          topicId: topic.id,
          title: task.title,
          description: task.description,
          completed: task.completed,
        },
      })
    }
    for (const link of topic.links) {
      proposals.push({
        id: crypto.randomUUID(),
        kind: "create",
        entity: "link",
        status: "pending",
        targetId: link.id,
        parentId: topic.id,
        title: link.label,
        payload: {
          id: link.id,
          topicId: topic.id,
          label: link.label,
          url: link.url,
        },
      })
    }
  }

  return { documentTitle: document.name, proposals }
}
