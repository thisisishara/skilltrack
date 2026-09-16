import "server-only"

import { requireOwnedNode } from "@/application/nodes/nodes-service"
import { getRoleForUser } from "@/application/roles/roles-service"
import { ApplicationError } from "@/domain/errors"
import { isLabelNode } from "@/domain/nodes/kind"
import { resolveLinkFields } from "@/domain/links/url"
import * as linksRepository from "@/repositories/links/links-repository"

function requireLink(label: string, url: string) {
  const resolved = resolveLinkFields(label, url)
  if (!resolved.ok) {
    throw new ApplicationError("validation", resolved.message)
  }

  return { label: resolved.label, url: resolved.url }
}

async function requireOwnedRole(userId: string, roleId: string) {
  const role = await getRoleForUser(userId, roleId)

  if (!role) {
    throw new ApplicationError("not_found", "That role no longer exists.")
  }

  return role
}

export async function listLinksForRole(userId: string, roleId: string) {
  await requireOwnedRole(userId, roleId)
  return linksRepository.listByRoleId(roleId)
}

export async function createNodeLink(
  userId: string,
  roleId: string,
  nodeId: string,
  input: {
    id?: string
    label: string
    url: string
  }
) {
  const node = await requireOwnedNode(userId, roleId, nodeId)
  if (isLabelNode(node)) {
    throw new ApplicationError("validation", "Labels cannot have links.")
  }
  const { label, url } = requireLink(input.label, input.url)
  return linksRepository.insert({ id: input.id, nodeId, label, url })
}

export async function updateNodeLink(
  userId: string,
  roleId: string,
  nodeId: string,
  linkId: string,
  input: {
    label: string
    url: string
  }
) {
  await requireOwnedNode(userId, roleId, nodeId)
  const { label, url } = requireLink(input.label, input.url)
  return linksRepository.update(nodeId, linkId, { label, url })
}

export async function deleteNodeLink(
  userId: string,
  roleId: string,
  nodeId: string,
  linkId: string
) {
  await requireOwnedNode(userId, roleId, nodeId)
  await linksRepository.deleteForNode(nodeId, linkId)
}
