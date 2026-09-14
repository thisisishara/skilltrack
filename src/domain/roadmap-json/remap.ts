import type { NormalizedRoadmapDocument } from "@/domain/roadmap-json/types"

export function remapRoadmapDocument(
  document: NormalizedRoadmapDocument,
  nextId: () => string = () => crypto.randomUUID()
): NormalizedRoadmapDocument {
  const nodeIds = new Map<string, string>()
  const otherIds = new Map<string, string>()

  function mapped(source: string, store: Map<string, string>) {
    const existing = store.get(source)
    if (existing) {
      return existing
    }

    const created = nextId()
    store.set(source, created)
    return created
  }

  return {
    ...document,
    nodes: document.nodes.map((node) => ({
      ...node,
      id: mapped(node.id, nodeIds),
      parentId: node.parentId ? mapped(node.parentId, nodeIds) : null,
      checklist: node.checklist.map((item) => ({
        ...item,
        id: mapped(item.id, otherIds),
      })),
      links: node.links.map((link) => ({
        ...link,
        id: mapped(link.id, otherIds),
      })),
    })),
  }
}

export function collectDocumentIds(document: NormalizedRoadmapDocument) {
  const ids: string[] = []

  for (const node of document.nodes) {
    ids.push(node.id)
    for (const item of node.checklist) {
      ids.push(item.id)
    }
    for (const link of node.links) {
      ids.push(link.id)
    }
  }

  return ids
}
