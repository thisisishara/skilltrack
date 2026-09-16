export function treeLocationHref(nodeId: string | null, taskId: string | null) {
  const url = new URL(window.location.href)
  if (nodeId) {
    url.searchParams.set("node", nodeId)
  } else {
    url.searchParams.delete("node")
  }
  if (nodeId && taskId) {
    url.searchParams.set("task", taskId)
  } else {
    url.searchParams.delete("task")
  }
  return `${url.pathname}${url.search}${url.hash}`
}

export function persistTreeLocation(nodeId: string | null, taskId: string | null) {
  const href = treeLocationHref(nodeId, taskId)
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (href === current) {
    return
  }
  window.history.replaceState(window.history.state, "", href)
}
