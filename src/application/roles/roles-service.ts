import "server-only"

import { ApplicationError } from "@/domain/errors"
import { displayRoleName } from "@/domain/roles/name"
import * as rolesRepository from "@/repositories/roles/roles-repository"

function requireName(name: string) {
  const trimmed = displayRoleName(name)

  if (!trimmed) {
    throw new ApplicationError("validation", "Role name cannot be empty.")
  }

  return trimmed
}

export async function listRoles(userId: string) {
  return rolesRepository.listByUserId(userId)
}

export async function getRoleForUser(userId: string, roleId: string) {
  return rolesRepository.getByIdForUser(userId, roleId)
}

export async function createEmptyRole(
  userId: string,
  name: string,
  description: string | null = null
) {
  return rolesRepository.insert(userId, requireName(name), description)
}

export async function renameRole(userId: string, roleId: string, name: string) {
  return rolesRepository.updateName(userId, roleId, requireName(name))
}

export async function updateRoleDescription(
  userId: string,
  roleId: string,
  description: string | null
) {
  return rolesRepository.updateDescription(userId, roleId, description)
}

export async function deleteRole(userId: string, roleId: string) {
  await rolesRepository.deleteForUser(userId, roleId)
}
