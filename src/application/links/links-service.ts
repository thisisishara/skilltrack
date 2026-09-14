import "server-only"

import { requireOwnedNode } from "@/application/nodes/nodes-service"
import { getRoleForUser } from "@/application/roles/roles-service"
import { ApplicationError } from "@/domain/errors"
import {
  displayLinkLabel,
  isValidHttpUrl,
  normalizeLinkUrl,
} from "@/domain/links/url"
import * as linksRepository from "@/repositories/links/links-repository"

function requireLink(label: string, url: string) {
  const trimmedLabel = displayLinkLabel(label)
  const trimmedUrl = normalizeLinkUrl(url)

  if (!trimmedLabel) {
    throw new ApplicationError("validation", "Link label cannot be empty.")
  }

  if (!trimmedUrl || !isValidHttpUrl(trimmedUrl)) {
    throw new ApplicationError("validation", "Enter a valid http or https URL.")
  }

  return { label: trimmedLabel, url: trimmedUrl }
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
    label: string
    url: string
  }
) {
  await requireOwnedNode(userId, roleId, nodeId)
  const { label, url } = requireLink(input.label, input.url)
  return linksRepository.insert({ nodeId, label, url })
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
