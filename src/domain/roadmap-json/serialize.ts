import type { TopicNote } from "@/domain/notes/types"
import type { Task } from "@/domain/tasks/types"
import type { Link } from "@/domain/links/types"
import { isLabelNode } from "@/domain/topics/kind"
import type { Topic } from "@/domain/topics/types"
import type { Role } from "@/domain/roles/types"

import { parseRoadmapJson } from "@/domain/roadmap-json/parse"

function sortedSiblings(topics: Topic[], parentId: string | null) {
  return topics
    .filter((topic) => topic.parentId === parentId && !isLabelNode(topic))
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder
      }

      return left.createdAt.localeCompare(right.createdAt)
    })
}

function serializeTopic(
  topic: Topic,
  allTopics: Topic[],
  tasksByTopic: Map<string, Task[]>,
  linksByTopic: Map<string, Link[]>,
  notesByTopic: Map<string, TopicNote[]>
): Record<string, unknown> {
  const tasks = (tasksByTopic.get(topic.id) ?? [])
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((item) => ({
      id: item.id,
      title: item.title,
      ...(item.description ? { description: item.description } : {}),
      completed: item.completed,
    }))

  const links = (linksByTopic.get(topic.id) ?? []).map((link) => ({
    id: link.id,
    label: link.label,
    url: link.url,
  }))

  const notes = (notesByTopic.get(topic.id) ?? [])
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((note) => ({
      id: note.id,
      title: note.title,
      body: note.body,
    }))

  const children = sortedSiblings(allTopics, topic.id).map((child) =>
    serializeTopic(child, allTopics, tasksByTopic, linksByTopic, notesByTopic)
  )

  return {
    id: topic.id,
    title: topic.title,
    ...(topic.description ? { description: topic.description } : {}),
    icon: topic.icon,
    ...(topic.color ? { color: topic.color } : {}),
    ...(notes.length > 0 ? { notes } : {}),
    ...(tasks.length > 0 ? { tasks } : {}),
    ...(links.length > 0 ? { links } : {}),
    ...(children.length > 0 ? { topics: children } : {}),
  }
}

export function serializeRoadmapDocument(
  role: Pick<Role, "name" | "description" | "notes">,
  topics: Topic[],
  tasks: Task[],
  links: Link[],
  notes: TopicNote[] = []
) {
  const tasksByTopic = new Map<string, Task[]>()
  for (const task of tasks) {
    const list = tasksByTopic.get(task.topicId) ?? []
    list.push(task)
    tasksByTopic.set(task.topicId, list)
  }

  const notesByTopic = new Map<string, TopicNote[]>()
  for (const note of notes) {
    const list = notesByTopic.get(note.topicId) ?? []
    list.push(note)
    notesByTopic.set(note.topicId, list)
  }

  const linksByTopic = new Map<string, Link[]>()
  const roadmapLinks: Link[] = []
  for (const link of links) {
    if (!link.topicId) {
      roadmapLinks.push(link)
      continue
    }
    const list = linksByTopic.get(link.topicId) ?? []
    list.push(link)
    linksByTopic.set(link.topicId, list)
  }

  const document = {
    roadmap: {
      title: role.name,
      ...(role.description ? { description: role.description } : {}),
      ...(role.notes ? { notes: role.notes } : {}),
      ...(roadmapLinks.length > 0
        ? {
            links: roadmapLinks.map((link) => ({
              id: link.id,
              label: link.label,
              url: link.url,
            })),
          }
        : {}),
    },
    topics: sortedSiblings(topics, null).map((topic) =>
      serializeTopic(topic, topics, tasksByTopic, linksByTopic, notesByTopic)
    ),
  }

  const json = `${JSON.stringify(document, null, 2)}\n`
  parseRoadmapJson(json)
  return json
}

export function exportFileName(roleName: string) {
  const slug = roleName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return `skilltrack-${slug || "roadmap"}.json`
}
