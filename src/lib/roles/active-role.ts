export const ACTIVE_ROLE_STORAGE_KEY = "skilltrack-active-role-id"

export function resolveActiveRoleId(
  roleIds: readonly string[],
  storedId: string | null
) {
  if (roleIds.length === 0) {
    return null
  }

  if (storedId && roleIds.includes(storedId)) {
    return storedId
  }

  return roleIds[0]
}

export function readStoredActiveRoleId() {
  if (typeof window === "undefined") {
    return null
  }

  return window.localStorage.getItem(ACTIVE_ROLE_STORAGE_KEY)
}

export function writeStoredActiveRoleId(roleId: string) {
  window.localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, roleId)
}

export function clearStoredActiveRoleId() {
  window.localStorage.removeItem(ACTIVE_ROLE_STORAGE_KEY)
}
