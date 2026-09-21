import { describe, expect, it } from "vitest"

import {
  listChildSummaries,
  listRootSummaries,
  searchTopicSummaries,
  topicPath,
} from "@/domain/tracky/traverse"
import type { NodeLink } from "@/domain/links/types"
import type { ChecklistItem } from "@/domain/tasks/types"
import type { RoadmapNode } from "@/domain/topics/types"

function node(id: string, parentId: string | null, title: string, notes: string | null = null): RoadmapNode {
  const now = "2026-09-19T00:00:00.000Z"
  return {
    id,
    roleId: "role-1",
    parentId,
    kind: "skill",
    title,
    description: null,
    notes,
    icon: "circle-dot",
    color: null,
    handleKind: "regular",
    incomingEdgeAnimated: false,
    positionX: 0,
    positionY: 0,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  }
}

function task(id: string, topicId: string, title: string): ChecklistItem {
  const now = "2026-09-19T00:00:00.000Z"
  return {
    id,
    topicId,
    title,
    description: null,
    completed: false,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  }
}

function link(id: string, topicId: string | null, label: string): NodeLink {
  const now = "2026-09-19T00:00:00.000Z"
  return {
    id,
    roleId: "role-1",
    topicId,
    label,
    url: "https://example.com",
    createdAt: now,
    updatedAt: now,
  }
}

const roots = node("root", null, "Foundations")
const child = node("child", "root", "Python", "study notes")
const leaf = node("leaf", "child", "Async")
const nodes = [roots, child, leaf]
const tasks = [task("t1", "child", "Write a generator")]
const links = [link("l1", "child", "Docs")]

describe("track traversal", () => {
  it("lists only top-level topics with counts", () => {
    const result = listRootSummaries(nodes, tasks, links)
    expect(result.truncated).toBe(false)
    expect(result.topics).toEqual([
      {
        id: "root",
        title: "Foundations",
        childCount: 1,
        hasNotes: false,
        taskCount: 0,
        linkCount: 0,
      },
    ])
  })

  it("lists direct children only", () => {
    const result = listChildSummaries(nodes, tasks, links, "root")
    expect("error" in result).toBe(false)
    if ("error" in result) {
      return
    }
    expect(result.topics).toHaveLength(1)
    expect(result.topics[0]).toMatchObject({
      id: "child",
      childCount: 1,
      hasNotes: true,
      taskCount: 1,
      linkCount: 1,
    })
  })

  it("search includes ancestor path", () => {
    const result = searchTopicSummaries(nodes, tasks, links, "async")
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0].path.map((entry) => entry.title)).toEqual([
      "Foundations",
      "Python",
      "Async",
    ])
  })

  it("get path walks to the root", () => {
    expect(topicPath(nodes, "leaf")?.map((entry) => entry.id)).toEqual([
      "root",
      "child",
      "leaf",
    ])
    expect(topicPath(nodes, "missing")).toBeNull()
  })
})
