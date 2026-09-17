export type NodeHandleKind = "regular" | "input" | "output"

export const DEFAULT_NODE_HANDLE_KIND: NodeHandleKind = "regular"

const HANDLE_KINDS = new Set<NodeHandleKind>(["regular", "input", "output"])

export function normalizeNodeHandleKind(value: string | null | undefined): NodeHandleKind {
  if (value && HANDLE_KINDS.has(value as NodeHandleKind)) {
    return value as NodeHandleKind
  }

  return DEFAULT_NODE_HANDLE_KIND
}

export function nodeCanHaveParent(kind: NodeHandleKind) {
  return kind !== "output"
}

export function nodeCanHaveChildren(kind: NodeHandleKind) {
  return kind !== "input"
}

export function parentLinkError(
  childKind: NodeHandleKind,
  parentKind: NodeHandleKind | null,
  parentId: string | null
) {
  if (!parentId) {
    return null
  }

  if (!nodeCanHaveParent(childKind)) {
    return "This topic cannot nest under another topic."
  }

  if (parentKind && !nodeCanHaveChildren(parentKind)) {
    return "This topic cannot have subtopics."
  }

  return null
}

export function childrenLinkError(kind: NodeHandleKind, childCount: number) {
  if (childCount > 0 && !nodeCanHaveChildren(kind)) {
    return "This topic cannot have subtopics."
  }

  return null
}
