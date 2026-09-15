export function adjacentRoleId(
  roleIds: string[],
  currentId: string | null | undefined,
  direction: 1 | -1
): string | null {
  if (roleIds.length === 0) {
    return null
  }

  const index = currentId ? roleIds.indexOf(currentId) : -1
  if (index === -1) {
    return direction === 1 ? roleIds[0] : roleIds[roleIds.length - 1]
  }

  if (roleIds.length === 1) {
    return null
  }

  return roleIds[(index + direction + roleIds.length) % roleIds.length]
}

export function roleHrefForCurrentView(
  roleId: string,
  pathname: string,
  currentRoleId?: string | null
): string {
  const base = `/dashboard/roles/${roleId}`
  if (!currentRoleId) {
    return base
  }

  const prefix = `/dashboard/roles/${currentRoleId}`
  if (!pathname.startsWith(prefix)) {
    return base
  }

  const rest = pathname.slice(prefix.length)
  if (rest === "/tree" || rest === "/settings") {
    return `${base}${rest}`
  }

  return base
}
