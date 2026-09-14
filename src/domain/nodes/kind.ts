export type NodeKind = "skill" | "label"

export const DEFAULT_NODE_KIND: NodeKind = "skill"

const NODE_KINDS = new Set<NodeKind>(["skill", "label"])

export function normalizeNodeKind(value: string | null | undefined): NodeKind {
  if (value && NODE_KINDS.has(value as NodeKind)) {
    return value as NodeKind
  }

  return DEFAULT_NODE_KIND
}

export function isLabelNode(node: { kind: NodeKind }) {
  return node.kind === "label"
}

export function isSkillNode(node: { kind: NodeKind }) {
  return node.kind === "skill"
}
