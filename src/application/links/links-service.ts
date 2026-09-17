import "server-only"

import { requireOwnedNode } from "@/application/topics/topics-service"
import { getRoleForUser } from "@/application/roles/roles-service"
import { ApplicationError } from "@/domain/errors"
import { isLabelNode } from "@/domain/topics/kind"
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
  topicId: string | null,
  input: {
    id?: string
    label: string
    url: string
  }
) {
  if (topicId) {
    const node = await requireOwnedNode(userId, roleId, topicId)
    if (isLabelNode(node)) {
      throw new ApplicationError("validation", "Labels cannot have links.")
    }
  } else {
    await requireOwnedRole(userId, roleId)
  }
  const { label, url } = requireLink(input.label, input.url)
  return linksRepository.insert({
    id: input.id,
    roleId,
    topicId,
    label,
    url,
  })
}

export async function updateNodeLink(
  userId: string,
  roleId: string,
  topicId: string | null,
  linkId: string,
  input: {
    label: string
    url: string
  }
) {
  if (topicId) {
    await requireOwnedNode(userId, roleId, topicId)
  } else {
    await requireOwnedRole(userId, roleId)
  }
  const { label, url } = requireLink(input.label, input.url)
  return linksRepository.update(roleId, topicId, linkId, { label, url })
}

export async function deleteNodeLink(
  userId: string,
  roleId: string,
  topicId: string | null,
  linkId: string
) {
  if (topicId) {
    await requireOwnedNode(userId, roleId, topicId)
  } else {
    await requireOwnedRole(userId, roleId)
  }
  await linksRepository.deleteLink(roleId, topicId, linkId)
}
