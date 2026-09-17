import "server-only"

import { listRoles } from "@/application/roles/roles-service"
import { isLabelNode } from "@/domain/topics/kind"
import { nodeProgress } from "@/domain/progress/progress"
import { ancestorTitlePath } from "@/domain/search/query"
import * as tasksRepository from "@/repositories/tasks/tasks-repository"
import * as topicsRepository from "@/repositories/topics/topics-repository"

export type SearchRoleHit = {
  id: string
  name: string
}

export type SearchNodeHit = {
  id: string
  roleId: string
  roleName: string
  title: string
  parentPath: string
  percent: number | null
  kind: "skill" | "label"
}

export type SearchTaskHit = {
  id: string
  nodeId: string
  roleId: string
  roleName: string
  title: string
  description: string | null
  parentPath: string
  isCompleted: boolean
}

export type SearchIndex = {
  roles: SearchRoleHit[]
  nodes: SearchNodeHit[]
  tasks: SearchTaskHit[]
}

export async function getSearchIndex(userId: string): Promise<SearchIndex> {
  const roles = await listRoles(userId)
  const graphs = await Promise.all(
    roles.map(async (role) => {
      const [nodes, items] = await Promise.all([
        topicsRepository.listByRoleId(role.id),
        tasksRepository.listByRoleId(role.id),
      ])
      return { role, nodes, items }
    })
  )

  return {
    roles: roles.map((role) => ({ id: role.id, name: role.name })),
    nodes: graphs.flatMap(({ role, nodes, items }) =>
      nodes.map((node) => {
        const label = isLabelNode(node)
        return {
          id: node.id,
          roleId: role.id,
          roleName: role.name,
          title: node.title,
          parentPath: ancestorTitlePath(nodes, node.id),
          percent: label ? null : nodeProgress(items, node.id).percent,
          kind: label ? "label" : "skill",
        }
      })
    ),
    tasks: graphs.flatMap(({ role, nodes, items }) => {
      const byId = new Map(nodes.map((node) => [node.id, node]))
      return items.flatMap((item) => {
        const node = byId.get(item.topicId)
        if (!node || isLabelNode(node)) {
          return []
        }
        const ancestors = ancestorTitlePath(nodes, node.id)
        const parentPath = ancestors ? `${ancestors} / ${node.title}` : node.title
        return [
          {
            id: item.id,
            nodeId: node.id,
            roleId: role.id,
            roleName: role.name,
            title: item.title,
            description: item.description,
            parentPath,
            isCompleted: item.completed,
          },
        ]
      })
    }),
  }
}
