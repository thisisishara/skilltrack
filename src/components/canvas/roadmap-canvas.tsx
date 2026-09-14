"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import {
  Background,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type OnConnect,
  type OnEdgesDelete,
  type OnMoveEnd,
  type OnNodeDrag,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import {
  createChecklistItemAction,
  deleteChecklistItemAction,
  reorderChecklistItemsAction,
  setChecklistItemCompletedAction,
  updateChecklistItemAction,
} from "@/application/checklists/actions"
import {
  createNodeLinkAction,
  deleteNodeLinkAction,
  updateNodeLinkAction,
} from "@/application/links/actions"
import {
  createNodeAction,
  deleteNodeAction,
  moveNodeAction,
  reparentNodeAction,
  updateNodeAction,
} from "@/application/nodes/actions"
import { exportRoadmapAction, importRoadmapAction } from "@/application/import-export/actions"
import { CanvasToolbar } from "@/components/canvas/canvas-toolbar"
import { DeleteNodeAlert } from "@/components/canvas/delete-node-alert"
import { EmptyRoadmap } from "@/components/canvas/empty-roadmap"
import { LabelDialog, type LabelDialogMode } from "@/components/canvas/label-dialog"
import { LabelNodeCard, type LabelFlowNode } from "@/components/canvas/label-node"
import { NodeConfigSheet } from "@/components/canvas/node-config-sheet"
import { NodeDialog, type NodeDialogMode } from "@/components/canvas/node-dialog"
import { ImportRoadmapDialog } from "@/components/roles/import-roadmap-dialog"
import {
  RoadmapNodeCard,
  type RoadmapFlowNode,
} from "@/components/canvas/roadmap-node"
import { RoadmapProgressCard } from "@/components/canvas/roadmap-progress-card"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { applyChecklistCompletion } from "@/domain/checklists/completion"
import { displayChecklistTitle } from "@/domain/checklists/title"
import type { ChecklistItem } from "@/domain/checklists/types"
import type { NodeLink } from "@/domain/links/types"
import {
  displayLinkLabel,
  isValidHttpUrl,
  normalizeLinkUrl,
} from "@/domain/links/url"
import {
  nodeCanHaveChildren,
  nodeCanHaveParent,
  type NodeHandleKind,
} from "@/domain/nodes/handle"
import { wouldCreateCycle } from "@/domain/nodes/hierarchy"
import { DEFAULT_NODE_ICON, normalizeNodeIcon } from "@/domain/nodes/icon"
import { isLabelNode, isSkillNode } from "@/domain/nodes/kind"
import {
  CHILD_OFFSET_Y,
  LABEL_OFFSET_X,
  LABEL_ORIGIN_Y,
  ROOT_OFFSET_X,
} from "@/domain/nodes/layout"
import { displayNodeTitle } from "@/domain/nodes/title"
import type { RoadmapNode } from "@/domain/nodes/types"
import { downloadTextFile } from "@/lib/roadmap/download"
import {
  incomingEdgeAppearance,
  nodeProgress,
  nodeStatusCounts,
  roadmapProgress,
  subtreeNodeIds,
  subtreeProgress,
} from "@/domain/progress/progress"
import { readStoredViewport, writeStoredViewport } from "@/lib/canvas/viewport-storage"

export type CanvasFlowNode = RoadmapFlowNode | LabelFlowNode

const nodeTypes = {
  roadmap: RoadmapNodeCard,
  label: LabelNodeCard,
}

function mergeById<T extends { id: string }>(server: T[], local: T[]): T[] {
  const serverIds = new Set(server.map((item) => item.id))
  return [...server, ...local.filter((item) => !serverIds.has(item.id))]
}

function mergeNodes(server: RoadmapNode[], local: RoadmapNode[]): RoadmapNode[] {
  const localById = new Map(local.map((node) => [node.id, node]))
  const serverIds = new Set(server.map((node) => node.id))
  const merged = server.map((node) => {
    const current = localById.get(node.id)
    if (!current) {
      return node
    }

    return {
      ...node,
      positionX: current.positionX,
      positionY: current.positionY,
    }
  })

  for (const node of local) {
    if (!serverIds.has(node.id)) {
      merged.push(node)
    }
  }

  return merged
}

function toFlowNodes(
  nodes: RoadmapNode[],
  items: ChecklistItem[]
): CanvasFlowNode[] {
  return nodes.map((node) => {
    if (isLabelNode(node)) {
      return {
        id: node.id,
        type: "label" as const,
        position: { x: node.positionX, y: node.positionY },
        data: { title: node.title },
      }
    }

    const progress = nodeProgress(items, node.id)
    return {
      id: node.id,
      type: "roadmap" as const,
      position: { x: node.positionX, y: node.positionY },
      data: {
        title: node.title,
        description: node.description,
        icon: node.icon,
        handleKind: node.handleKind,
        percent: progress.percent,
        total: progress.total,
        status: progress.status,
      },
    }
  })
}

function toFlowEdges(nodes: RoadmapNode[], items: ChecklistItem[]): Edge[] {
  return nodes
    .filter((node) => node.parentId && isSkillNode(node))
    .map((node) => {
      const appearance = incomingEdgeAppearance(nodeProgress(items, node.id).status)
      return {
        id: `${node.parentId}->${node.id}`,
        source: node.parentId as string,
        target: node.id,
        animated: appearance.animated,
        style: appearance.style,
      }
    })
}

function mergeFlowNodes(
  current: CanvasFlowNode[],
  next: CanvasFlowNode[]
): CanvasFlowNode[] {
  const currentById = new Map(current.map((node) => [node.id, node]))

  return next.map((node) => {
    const previous = currentById.get(node.id)
    if (!previous) {
      return node
    }

    return {
      ...previous,
      type: node.type,
      position: previous.position,
      data: node.data,
    } as CanvasFlowNode
  })
}

function isValidConnectionForNodes(
  nodes: RoadmapNode[],
  connection: Connection | Edge
) {
  if (
    !connection.source ||
    !connection.target ||
    connection.source === connection.target
  ) {
    return false
  }

  const source = nodes.find((node) => node.id === connection.source)
  const target = nodes.find((node) => node.id === connection.target)
  if (!source || !target || isLabelNode(source) || isLabelNode(target)) {
    return false
  }

  return nodeCanHaveChildren(source.handleKind) && nodeCanHaveParent(target.handleKind)
}

function nextSortOrder(nodes: RoadmapNode[], parentId: string | null) {
  const siblings = nodes.filter((node) => node.parentId === parentId)
  if (siblings.length === 0) {
    return 0
  }

  return Math.max(...siblings.map((node) => node.sortOrder)) + 1
}

function createLocalNode(input: {
  id: string
  roleId: string
  parentId: string | null
  kind: RoadmapNode["kind"]
  title: string
  description: string | null
  icon: string
  handleKind: NodeHandleKind
  incomingEdgeAnimated: boolean
  positionX: number
  positionY: number
  sortOrder: number
}): RoadmapNode {
  const now = new Date().toISOString()
  return {
    ...input,
    notes: null,
    createdAt: now,
    updatedAt: now,
  }
}

function RoadmapCanvasInner({
  roleId,
  roleName,
  nodes: serverNodes,
  checklistItems: serverItems,
  links: serverLinks,
}: {
  roleId: string
  roleName: string
  nodes: RoadmapNode[]
  checklistItems: ChecklistItem[]
  links: NodeLink[]
}) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [themeReady, setThemeReady] = useState(false)
  const [nodes, setNodes] = useState<RoadmapNode[]>(serverNodes)
  const [items, setItems] = useState<ChecklistItem[]>(serverItems ?? [])
  const [links, setLinks] = useState<NodeLink[]>(serverLinks ?? [])
  const [initialViewport] = useState(() => readStoredViewport(roleId))
  const [flowNodes, setFlowNodes] = useState<CanvasFlowNode[]>(() =>
    toFlowNodes(serverNodes, serverItems)
  )
  const [edges, setEdges] = useState<Edge[]>(() => toFlowEdges(serverNodes, serverItems))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [configNodeId, setConfigNodeId] = useState<string | null>(null)
  const [dialogMode, setDialogMode] = useState<NodeDialogMode | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [labelMode, setLabelMode] = useState<LabelDialogMode | null>(null)
  const [labelOpen, setLabelOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    // Theme is read after mount so SSR and the first client paint match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeReady(true)
  }, [])

  useEffect(() => {
    // Merge server snapshots into the optimistic canvas session.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNodes((current) => mergeNodes(serverNodes, current))
  }, [serverNodes])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems((current) => mergeById(serverItems, current))
  }, [serverItems])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLinks((current) => mergeById(serverLinks, current))
  }, [serverLinks])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlowNodes((current) => mergeFlowNodes(current, toFlowNodes(nodes, items)))
    setEdges(toFlowEdges(nodes, items))
  }, [nodes, items])

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedId) ?? null,
    [nodes, selectedId]
  )

  const configNode = useMemo(() => {
    const node = nodes.find((item) => item.id === configNodeId) ?? null
    if (!node || isLabelNode(node)) {
      return null
    }
    return node
  }, [nodes, configNodeId])
  const sheetOpen = Boolean(configNode)

  useEffect(() => {
    if (configNodeId && !configNode) {
      const selected = nodes.find((node) => node.id === configNodeId)
      if (!selected || isSkillNode(selected)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setConfigNodeId(null)
      }
    }
  }, [configNode, configNodeId, nodes])

  const selectedItems = useMemo(
    () => items.filter((item) => item.nodeId === configNodeId),
    [items, configNodeId]
  )

  const selectedLinks = useMemo(
    () => links.filter((link) => link.nodeId === configNodeId),
    [links, configNodeId]
  )

  const skillNodes = useMemo(() => nodes.filter(isSkillNode), [nodes])
  const overallProgress = useMemo(() => {
    const skillIds = new Set(skillNodes.map((node) => node.id))
    return roadmapProgress(items.filter((item) => skillIds.has(item.nodeId)))
  }, [items, skillNodes])
  const statusCounts = useMemo(
    () => nodeStatusCounts(skillNodes, items),
    [skillNodes, items]
  )
  const selectedNodeProgress = useMemo(
    () => (configNodeId ? nodeProgress(items, configNodeId) : nodeProgress([], "")),
    [items, configNodeId]
  )
  const selectedSubtreeProgress = useMemo(
    () =>
      configNodeId
        ? subtreeProgress(skillNodes, items, configNodeId)
        : nodeProgress([], ""),
    [items, configNodeId, skillNodes]
  )

  async function handleExport() {
    const result = await exportRoadmapAction(roleId)
    if (!result.ok) {
      toast.error(result.message)
      return
    }

    downloadTextFile(result.filename, result.json)
    toast.success("Roadmap exported")
  }

  const onNodesChange = useCallback((changes: NodeChange<CanvasFlowNode>[]) => {
    setFlowNodes((current) => applyNodeChanges(changes, current))
  }, [])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((current) => applyEdgeChanges(changes, current))
  }, [])

  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: CanvasFlowNode[] }) => {
      const nextId = selected[0]?.id ?? null
      setSelectedId((current) => (current === nextId ? current : nextId))
    },
    []
  )

  const onNodeClick = useCallback((_event: unknown, node: CanvasFlowNode) => {
    setSelectedId(node.id)
    if (node.type === "label") {
      setConfigNodeId(null)
      return
    }
    setConfigNodeId(node.id)
  }, [])

  const onNodeDoubleClick = useCallback(
    (_event: unknown, node: CanvasFlowNode) => {
      setSelectedId(node.id)
      if (node.type === "label") {
        const label = nodes.find((item) => item.id === node.id)
        if (!label) {
          return
        }
        setConfigNodeId(null)
        setLabelMode({ kind: "edit", nodeId: label.id, title: label.title })
        setLabelOpen(true)
        return
      }
      setConfigNodeId(node.id)
    },
    [nodes]
  )

  const onBeforeDelete = useCallback(
    async ({ nodes: deletingNodes }: { nodes: { id: string }[] }) => {
      if (deletingNodes.length === 0) {
        return false
      }

      const first = deletingNodes[0]
      if (first) {
        setSelectedId(first.id)
        setDeleteOpen(true)
      }

      return false
    },
    []
  )

  const persistPosition: OnNodeDrag<CanvasFlowNode> = useCallback(
    async (_event, node) => {
      setNodes((current) =>
        current.map((item) =>
          item.id === node.id
            ? { ...item, positionX: node.position.x, positionY: node.position.y }
            : item
        )
      )

      const result = await moveNodeAction({
        roleId,
        nodeId: node.id,
        positionX: node.position.x,
        positionY: node.position.y,
      })

      if (!result.ok) {
        toast.error(result.message)
        router.refresh()
      }
    },
    [roleId, router]
  )

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return
      }

      if (!isValidConnectionForNodes(nodes, connection)) {
        return
      }

      const previous = nodes
      const sortOrder = nextSortOrder(nodes, connection.source)
      setNodes((current) =>
        current.map((node) =>
          node.id === connection.target
            ? { ...node, parentId: connection.source, sortOrder }
            : node
        )
      )
      setEdges((current) => {
        const withoutIncoming = current.filter((edge) => edge.target !== connection.target)
        const appearance = incomingEdgeAppearance(
          nodeProgress(items, connection.target).status
        )
        return addEdge(
          {
            ...connection,
            animated: appearance.animated,
            style: appearance.style,
          },
          withoutIncoming
        )
      })

      void reparentNodeAction({
        roleId,
        nodeId: connection.target,
        parentId: connection.source,
      }).then((result) => {
        if (!result.ok) {
          setNodes(previous)
          toast.error(result.message)
        }
      })
    },
    [nodes, items, roleId]
  )

  const onEdgesDelete: OnEdgesDelete = useCallback(
    (deleted) => {
      const previous = nodes
      const deletedTargets = new Set(deleted.map((edge) => edge.target))
      setNodes((current) =>
        current.map((node) =>
          deletedTargets.has(node.id) ? { ...node, parentId: null } : node
        )
      )

      void (async () => {
        for (const edge of deleted) {
          const result = await reparentNodeAction({
            roleId,
            nodeId: edge.target,
            parentId: null,
          })
          if (!result.ok) {
            setNodes(previous)
            toast.error(result.message)
            return
          }
        }
      })()
    },
    [nodes, roleId]
  )

  const onValidConnection = useCallback(
    (connection: Connection | Edge) => isValidConnectionForNodes(nodes, connection),
    [nodes]
  )

  const onMoveEnd: OnMoveEnd = useCallback(
    (_event, viewport) => {
      writeStoredViewport(roleId, viewport)
    },
    [roleId]
  )

  function openCreate(parentId: string | null) {
    setDialogMode({ kind: "create", parentId })
    setDialogOpen(true)
  }

  function openSheet(nodeId: string) {
    setSelectedId(nodeId)
    setConfigNodeId(nodeId)
  }

  function handleDialogSubmit(input: {
    title: string
    description: string
    icon: string
    handleKind: NodeHandleKind
  }) {
    if (!dialogMode || dialogMode.kind !== "create") {
      return { ok: false as const, code: "unexpected" as const, message: "Nothing to save." }
    }

    const title = displayNodeTitle(input.title)
    if (!title) {
      return {
        ok: false as const,
        code: "validation" as const,
        message: "Node title cannot be empty.",
      }
    }

    const parentId = dialogMode.parentId
    const parent = parentId ? nodes.find((node) => node.id === parentId) : null
    const id = crypto.randomUUID()
    const positionX = parent
      ? parent.positionX
      : skillNodes.length * ROOT_OFFSET_X
    const positionY = parent ? parent.positionY + CHILD_OFFSET_Y : 0
    const node = createLocalNode({
      id,
      roleId,
      parentId,
      kind: "skill",
      title,
      description: input.description.trim() || null,
      icon: normalizeNodeIcon(input.icon),
      handleKind: input.handleKind,
      incomingEdgeAnimated: false,
      positionX,
      positionY,
      sortOrder: nextSortOrder(nodes, parentId),
    })

    setNodes((current) => [...current, node])
    setDialogOpen(false)
    toast.success("Node created")

    void createNodeAction({
      id,
      roleId,
      parentId,
      kind: "skill",
      title,
      description: node.description,
      icon: node.icon,
      handleKind: node.handleKind,
      incomingEdgeAnimated: node.incomingEdgeAnimated,
      positionX,
      positionY,
    }).then((result) => {
      if (!result.ok) {
        setNodes((current) => current.filter((item) => item.id !== id))
        toast.error(result.message)
      }
    })

    return { ok: true as const, node }
  }

  function handleSaveDetails(input: {
    title: string
    description: string
    icon: string
    notes: string
    handleKind: NodeHandleKind
  }) {
    if (!configNode) {
      return {
        ok: false as const,
        code: "unexpected" as const,
        message: "Select a node first.",
      }
    }

    const title = displayNodeTitle(input.title)
    if (!title) {
      return {
        ok: false as const,
        code: "validation" as const,
        message: "Node title cannot be empty.",
      }
    }

    const previous = configNode
    const next: RoadmapNode = {
      ...configNode,
      title,
      description: input.description.trim() || null,
      icon: normalizeNodeIcon(input.icon),
      notes: input.notes.trim() || null,
      handleKind: input.handleKind,
    }
    setNodes((current) => current.map((node) => (node.id === next.id ? next : node)))

    void updateNodeAction({
      roleId,
      nodeId: next.id,
      title: next.title,
      description: next.description,
      icon: next.icon,
      notes: next.notes,
      handleKind: next.handleKind,
    }).then((result) => {
      if (!result.ok) {
        setNodes((current) =>
          current.map((node) => (node.id === previous.id ? previous : node))
        )
        toast.error(result.message)
      }
    })

    return { ok: true as const, node: next }
  }

  function handleParentChange(parentId: string | null) {
    if (!configNode) {
      return
    }

    if (parentId && wouldCreateCycle(nodes, configNode.id, parentId)) {
      toast.error("A node cannot be its own ancestor.")
      return
    }

    const previous = nodes
    const sortOrder = nextSortOrder(nodes, parentId)
    setNodes((current) =>
      current.map((node) =>
        node.id === configNode.id ? { ...node, parentId, sortOrder } : node
      )
    )

    void reparentNodeAction({
      roleId,
      nodeId: configNode.id,
      parentId,
    }).then((result) => {
      if (!result.ok) {
        setNodes(previous)
        toast.error(result.message)
        return
      }
      toast.success(parentId ? "Parent updated" : "Node is now a root")
    })
  }

  function handleToggleChecklist(itemId: string, isCompleted: boolean) {
    const previous = items
    setItems((current) =>
      current.map((item) =>
        item.id === itemId ? applyChecklistCompletion(item, isCompleted) : item
      )
    )

    void setChecklistItemCompletedAction({
      roleId,
      nodeId: configNodeId ?? "",
      itemId,
      isCompleted,
    }).then((result) => {
      if (!result.ok) {
        setItems(previous)
        toast.error(result.message)
      }
    })
  }

  function handleCreateChecklist(input: { title: string; description: string }) {
    const title = displayChecklistTitle(input.title)
    if (!title || !configNodeId) {
      return { ok: false as const, message: "Checklist title cannot be empty." }
    }

    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const sortOrder =
      selectedItems.length === 0
        ? 0
        : Math.max(...selectedItems.map((item) => item.sortOrder)) + 1
    const item: ChecklistItem = {
      id,
      nodeId: configNodeId,
      title,
      description: input.description.trim() || null,
      isCompleted: false,
      sortOrder,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    }
    setItems((current) => [...current, item])

    void createChecklistItemAction({
      id,
      roleId,
      nodeId: configNodeId,
      title,
      description: item.description,
    }).then((result) => {
      if (!result.ok) {
        setItems((current) => current.filter((entry) => entry.id !== id))
        toast.error(result.message)
      }
    })

    return { ok: true as const }
  }

  function handleUpdateChecklist(item: ChecklistItem, title: string, description: string) {
    const nextTitle = displayChecklistTitle(title)
    if (!nextTitle) {
      toast.error("Checklist title cannot be empty.")
      return
    }

    const previous = item
    const nextDescription = description.trim() || null
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id
          ? { ...entry, title: nextTitle, description: nextDescription }
          : entry
      )
    )

    void updateChecklistItemAction({
      roleId,
      nodeId: item.nodeId,
      itemId: item.id,
      title: nextTitle,
      description: nextDescription,
    }).then((result) => {
      if (!result.ok) {
        setItems((current) =>
          current.map((entry) => (entry.id === previous.id ? previous : entry))
        )
        toast.error(result.message)
      }
    })
  }

  function handleDeleteChecklist(itemId: string) {
    const previous = items
    setItems((current) => current.filter((item) => item.id !== itemId))

    void deleteChecklistItemAction({
      roleId,
      nodeId: configNodeId ?? "",
      itemId,
    }).then((result) => {
      if (!result.ok) {
        setItems(previous)
        toast.error(result.message)
      }
    })
  }

  function handleReorderChecklist(orderedIds: string[]) {
    const previous = items
    setItems((current) =>
      current.map((item) => {
        const index = orderedIds.indexOf(item.id)
        return index >= 0 ? { ...item, sortOrder: index } : item
      })
    )

    void reorderChecklistItemsAction({
      roleId,
      nodeId: configNodeId ?? "",
      orderedIds,
    }).then((result) => {
      if (!result.ok) {
        setItems(previous)
        toast.error(result.message)
      }
    })
  }

  function handleCreateLink(input: { label: string; url: string }) {
    const label = displayLinkLabel(input.label)
    const url = normalizeLinkUrl(input.url)
    if (!label) {
      return "Link label cannot be empty."
    }
    if (!url || !isValidHttpUrl(url)) {
      return "Enter a valid http or https URL."
    }
    if (!configNodeId) {
      return "Select a node first."
    }

    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const link: NodeLink = {
      id,
      nodeId: configNodeId,
      label,
      url,
      createdAt: now,
      updatedAt: now,
    }
    setLinks((current) => [...current, link])

    void createNodeLinkAction({
      id,
      roleId,
      nodeId: configNodeId,
      label,
      url,
    }).then((result) => {
      if (!result.ok) {
        setLinks((current) => current.filter((entry) => entry.id !== id))
        toast.error(result.message)
      }
    })

    return null
  }

  function handleUpdateLink(link: NodeLink, label: string, url: string) {
    const nextLabel = displayLinkLabel(label)
    const nextUrl = normalizeLinkUrl(url)
    if (!nextLabel) {
      return "Link label cannot be empty."
    }
    if (!nextUrl || !isValidHttpUrl(nextUrl)) {
      return "Enter a valid http or https URL."
    }

    const previous = link
    setLinks((current) =>
      current.map((entry) =>
        entry.id === link.id ? { ...entry, label: nextLabel, url: nextUrl } : entry
      )
    )

    void updateNodeLinkAction({
      roleId,
      nodeId: link.nodeId,
      linkId: link.id,
      label: nextLabel,
      url: nextUrl,
    }).then((result) => {
      if (!result.ok) {
        setLinks((current) =>
          current.map((entry) => (entry.id === previous.id ? previous : entry))
        )
        toast.error(result.message)
      }
    })

    return null
  }

  function handleDeleteLink(linkId: string) {
    const previous = links
    setLinks((current) => current.filter((link) => link.id !== linkId))

    void deleteNodeLinkAction({
      roleId,
      nodeId: configNodeId ?? "",
      linkId,
    }).then((result) => {
      if (!result.ok) {
        setLinks(previous)
        toast.error(result.message)
      }
    })
  }

  function handleLabelSubmit(title: string) {
    const text = displayNodeTitle(title)
    if (!text) {
      return { ok: false as const, message: "Label text cannot be empty." }
    }

    if (!labelMode) {
      return { ok: false as const, message: "Nothing to save." }
    }

    if (labelMode.kind === "edit") {
      const previous = nodes.find((node) => node.id === labelMode.nodeId)
      if (!previous) {
        return { ok: false as const, message: "That label no longer exists." }
      }

      setNodes((current) =>
        current.map((node) => (node.id === previous.id ? { ...node, title: text } : node))
      )
      setLabelOpen(false)

      void updateNodeAction({
        roleId,
        nodeId: previous.id,
        title: text,
        description: previous.description,
        icon: previous.icon,
        notes: previous.notes,
        handleKind: previous.handleKind,
        incomingEdgeAnimated: previous.incomingEdgeAnimated,
      }).then((result) => {
        if (!result.ok) {
          setNodes((current) =>
            current.map((node) => (node.id === previous.id ? previous : node))
          )
          toast.error(result.message)
        }
      })

      return { ok: true as const }
    }

    const id = crypto.randomUUID()
    const labels = nodes.filter(isLabelNode)
    const node = createLocalNode({
      id,
      roleId,
      parentId: null,
      kind: "label",
      title: text,
      description: null,
      icon: DEFAULT_NODE_ICON,
      handleKind: "regular",
      incomingEdgeAnimated: false,
      positionX: labels.length * LABEL_OFFSET_X,
      positionY: LABEL_ORIGIN_Y,
      sortOrder: nextSortOrder(nodes, null),
    })
    setNodes((current) => [...current, node])
    setLabelOpen(false)
    toast.success("Label added")

    void createNodeAction({
      id,
      roleId,
      parentId: null,
      kind: "label",
      title: text,
      positionX: node.positionX,
      positionY: node.positionY,
    }).then((result) => {
      if (!result.ok) {
        setNodes((current) => current.filter((item) => item.id !== id))
        toast.error(result.message)
      }
    })

    return { ok: true as const }
  }

  function handleDelete() {
    if (!selectedNode) {
      return
    }

    const removing = subtreeNodeIds(nodes, selectedNode.id)
    const previousNodes = nodes
    const previousItems = items
    const previousLinks = links
    setNodes((current) => current.filter((node) => !removing.has(node.id)))
    setItems((current) => current.filter((item) => !removing.has(item.nodeId)))
    setLinks((current) => current.filter((link) => !removing.has(link.nodeId)))
    setDeleteOpen(false)
    setConfigNodeId(null)
    setSelectedId(null)
    toast.success(isLabelNode(selectedNode) ? "Label deleted" : "Node deleted")

    void deleteNodeAction({
      roleId,
      nodeId: selectedNode.id,
    }).then((result) => {
      if (!result.ok) {
        setNodes(previousNodes)
        setItems(previousItems)
        setLinks(previousLinks)
        toast.error(result.message)
      }
    })
  }

  const canvas = (
    <div className="relative h-full min-h-0 overflow-hidden">
      <ReactFlow
        nodes={flowNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onBeforeDelete={onBeforeDelete}
        onNodeDragStop={persistPosition}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onSelectionChange={onSelectionChange}
        onMoveEnd={onMoveEnd}
        isValidConnection={onValidConnection}
        defaultViewport={initialViewport ?? undefined}
        fitView={nodes.length > 0 && !initialViewport}
        deleteKeyCode={["Backspace", "Delete"]}
        colorMode={themeReady && resolvedTheme === "dark" ? "dark" : "light"}
        minZoom={0.2}
        maxZoom={1.75}
        className="h-full bg-background"
      >
        <Background gap={20} size={1} />
      </ReactFlow>
      <CanvasToolbar
        hasSelection={Boolean(selectedNode)}
        canAddChild={Boolean(
          selectedNode &&
            isSkillNode(selectedNode) &&
            nodeCanHaveChildren(selectedNode.handleKind)
        )}
        onAddRoot={() => openCreate(null)}
        onAddLabel={() => {
          setLabelMode({ kind: "create" })
          setLabelOpen(true)
        }}
        onAddChild={() => selectedNode && isSkillNode(selectedNode) && openCreate(selectedNode.id)}
        onEdit={() => {
          if (!selectedNode) {
            return
          }
          if (isLabelNode(selectedNode)) {
            setLabelMode({
              kind: "edit",
              nodeId: selectedNode.id,
              title: selectedNode.title,
            })
            setLabelOpen(true)
            return
          }
          openSheet(selectedNode.id)
        }}
        onDelete={() => selectedNode && setDeleteOpen(true)}
        onExport={() => void handleExport()}
      />
      {skillNodes.length > 0 ? (
        <div className="pointer-events-none absolute top-3 right-3 z-10">
          <RoadmapProgressCard
            roleName={roleName}
            progress={overallProgress}
            counts={statusCounts}
          />
        </div>
      ) : null}
      {nodes.length === 0 ? (
        <EmptyRoadmap
          onCreate={() => openCreate(null)}
          onImport={() => setImportOpen(true)}
        />
      ) : null}
    </div>
  )

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <ResizablePanelGroup orientation="horizontal" className="min-h-0">
        <ResizablePanel id="roadmap-canvas" defaultSize="70%" minSize="40%">
          {canvas}
        </ResizablePanel>
        {sheetOpen ? (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel id="node-config" defaultSize="30%" minSize="22%" maxSize="48%">
              <div className="h-full min-h-0 overflow-hidden">
                <NodeConfigSheet
                  open={sheetOpen}
                  onOpenChange={(open) => {
                    if (!open) {
                      setConfigNodeId(null)
                    }
                  }}
                  node={configNode}
                  nodes={skillNodes}
                  checklistItems={selectedItems}
                  links={selectedLinks}
                  nodeProgress={selectedNodeProgress}
                  subtreeProgress={selectedSubtreeProgress}
                  onSaveDetails={async (input) => handleSaveDetails(input)}
                  onParentChange={async (parentId) => handleParentChange(parentId)}
                  onToggleChecklist={async (itemId, isCompleted) =>
                    handleToggleChecklist(itemId, isCompleted)
                  }
                  onCreateChecklist={handleCreateChecklist}
                  onUpdateChecklist={handleUpdateChecklist}
                  onDeleteChecklist={handleDeleteChecklist}
                  onReorderChecklist={handleReorderChecklist}
                  onCreateLink={handleCreateLink}
                  onUpdateLink={handleUpdateLink}
                  onDeleteLink={handleDeleteLink}
                />
              </div>
            </ResizablePanel>
          </>
        ) : null}
      </ResizablePanelGroup>
      <NodeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        onSubmit={async (input) => handleDialogSubmit(input)}
      />
      <LabelDialog
        open={labelOpen}
        onOpenChange={setLabelOpen}
        mode={labelMode}
        onSubmit={handleLabelSubmit}
      />
      <DeleteNodeAlert
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        nodeTitle={selectedNode?.title ?? configNode?.title ?? ""}
        onConfirm={async () => {
          handleDelete()
        }}
      />
      <ImportRoadmapDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={async (json) => {
          const result = await importRoadmapAction({ json, roleId })
          if (result.ok && "role" in result) {
            toast.success("Roadmap imported")
            router.refresh()
          }
          return result
        }}
      />
    </div>
  )
}

export function RoadmapCanvas({
  roleId,
  roleName,
  nodes,
  checklistItems,
  links,
}: {
  roleId: string
  roleName: string
  nodes: RoadmapNode[]
  checklistItems: ChecklistItem[]
  links: NodeLink[]
}) {
  return (
    <ReactFlowProvider>
      <RoadmapCanvasInner
        roleId={roleId}
        roleName={roleName}
        nodes={nodes}
        checklistItems={checklistItems}
        links={links}
      />
    </ReactFlowProvider>
  )
}
