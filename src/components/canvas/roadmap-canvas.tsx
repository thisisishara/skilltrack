"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  SelectionMode,
  useReactFlow,
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
import {
  CanvasToolbar,
  type CanvasInteractionTool,
} from "@/components/canvas/canvas-toolbar"
import { EmptyRoadmap } from "@/components/canvas/empty-roadmap"
import { LabelDialog, type LabelDialogMode } from "@/components/canvas/label-dialog"
import { LabelNodeCard, type LabelFlowNode } from "@/components/canvas/label-node"
import { DeleteNodeAlert } from "@/components/roadmap/delete-node-alert"
import { NodeConfigSheet } from "@/components/roadmap/node-config-sheet"
import { NodeDialog, type NodeDialogMode } from "@/components/roadmap/node-dialog"
import { ImportRoadmapDialog } from "@/components/roles/import-roadmap-dialog"
import { useJsonFileDrop } from "@/hooks/use-json-file-drop"
import {
  RoadmapNodeCard,
  type RoadmapFlowNode,
} from "@/components/canvas/roadmap-node"
import { RoadmapStatusBar } from "@/components/roadmap/roadmap-status-bar"
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
import { isEditableKeyboardTarget } from "@/lib/keyboard"
import { downloadTextFile } from "@/lib/roadmap/download"
import {
  incomingEdgeAppearance,
  DEFAULT_EDGE_STROKE,
  DEFAULT_EDGE_STROKE_WIDTH,
  nodeProgress,
  nodeStatusCounts,
  roadmapProgress,
  subtreeNodeIds,
  subtreeProgress,
} from "@/domain/progress/progress"
import { useDetailsPanelLayout } from "@/hooks/use-details-panel-layout"
import { readStoredViewport, writeStoredViewport } from "@/lib/canvas/viewport-storage"
import {
  DETAILS_PANEL_MAX_SIZE,
  DETAILS_PANEL_MIN_SIZE,
} from "@/lib/layout/details-panel-storage"

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
        connectable: false,
        zIndex: 0,
        data: { title: node.title },
      }
    }

    const progress = nodeProgress(items, node.id)
    return {
      id: node.id,
      type: "roadmap" as const,
      position: { x: node.positionX, y: node.positionY },
      zIndex: 2,
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
        zIndex: 1,
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
      zIndex: node.zIndex,
      connectable: node.connectable,
      position: previous.position,
      data: node.data,
    } as CanvasFlowNode
  })
}

function isValidConnectionForNodes(
  nodes: RoadmapNode[],
  connection: Connection | Edge
) {
  if (!connection.source) {
    return false
  }

  // React Flow calls this as a drag starts, before a target handle is hovered.
  // Returning false here aborts the connection entirely.
  if (!connection.target) {
    const source = nodes.find((node) => node.id === connection.source)
    return Boolean(
      source && isSkillNode(source) && nodeCanHaveChildren(source.handleKind)
    )
  }

  if (connection.source === connection.target) {
    return false
  }

  const source = nodes.find((node) => node.id === connection.source)
  const target = nodes.find((node) => node.id === connection.target)
  if (!source || !target || isLabelNode(source) || isLabelNode(target)) {
    return false
  }

  if (wouldCreateCycle(nodes, connection.target, connection.source)) {
    return false
  }

  return nodeCanHaveChildren(source.handleKind) && nodeCanHaveParent(target.handleKind)
}

function sameIds(left: string[], right: string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index])
}

function isSelectAllShortcut(event: KeyboardEvent) {
  return (
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === "a"
  )
}

function selectedRootIds(nodes: RoadmapNode[], selectedIds: string[]) {
  const selected = new Set(selectedIds)
  const byId = new Map(nodes.map((node) => [node.id, node]))

  return selectedIds.filter((id) => {
    let parentId = byId.get(id)?.parentId ?? null
    while (parentId) {
      if (selected.has(parentId)) {
        return false
      }
      parentId = byId.get(parentId)?.parentId ?? null
    }
    return true
  })
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
    accentColor: null,
    createdAt: now,
    updatedAt: now,
  }
}

function RoadmapCanvasInner({
  userId,
  roleId,
  roleName,
  nodes: serverNodes,
  checklistItems: serverItems,
  links: serverLinks,
  focusNodeId,
}: {
  userId: string
  roleId: string
  roleName: string
  nodes: RoadmapNode[]
  checklistItems: ChecklistItem[]
  links: NodeLink[]
  focusNodeId?: string
}) {
  const router = useRouter()
  const { getNodes, fitView } = useReactFlow()
  const { resolvedTheme } = useTheme()
  const {
    groupKey,
    mainDefaultSize,
    detailsDefaultSize,
    onLayoutChanged,
  } = useDetailsPanelLayout(userId)
  const [themeReady, setThemeReady] = useState(false)
  const [nodes, setNodes] = useState<RoadmapNode[]>(serverNodes)
  const [items, setItems] = useState<ChecklistItem[]>(serverItems ?? [])
  const [links, setLinks] = useState<NodeLink[]>(serverLinks ?? [])
  const [initialViewport] = useState(() => readStoredViewport(roleId))
  const [flowNodes, setFlowNodes] = useState<CanvasFlowNode[]>(() =>
    toFlowNodes(serverNodes, serverItems)
  )
  const [edges, setEdges] = useState<Edge[]>(() => toFlowEdges(serverNodes, serverItems))
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [configNodeId, setConfigNodeId] = useState<string | null>(null)
  const [canvasTool, setCanvasTool] = useState<CanvasInteractionTool>("pointer")
  const [deleteIds, setDeleteIds] = useState<string[]>([])
  const [dialogMode, setDialogMode] = useState<NodeDialogMode | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [labelMode, setLabelMode] = useState<LabelDialogMode | null>(null)
  const [labelOpen, setLabelOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importSeedJson, setImportSeedJson] = useState("")
  const [importSeedError, setImportSeedError] = useState<string | null>(null)
  const importDropLock = useRef(false)
  const focusedNodeRef = useRef<string | null>(null)

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

  const selectedId = selectedIds[0] ?? null
  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedId) ?? null,
    [nodes, selectedId]
  )
  const singleSelection = selectedIds.length === 1
  const deleteNodes = useMemo(
    () => nodes.filter((node) => deleteIds.includes(node.id)),
    [deleteIds, nodes]
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

  useEffect(() => {
    if (!focusNodeId || focusedNodeRef.current === focusNodeId) {
      return
    }

    const node = nodes.find((item) => item.id === focusNodeId)
    if (!node) {
      return
    }

    focusedNodeRef.current = focusNodeId

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIds([focusNodeId])
    setFlowNodes((current) =>
      current.map((item) => ({ ...item, selected: item.id === focusNodeId }))
    )
    setConfigNodeId(isSkillNode(node) ? focusNodeId : null)

    const frame = requestAnimationFrame(() => {
      void fitView({
        nodes: [{ id: focusNodeId }],
        padding: 0.45,
        duration: 250,
      })
    })

    return () => cancelAnimationFrame(frame)
  }, [fitView, focusNodeId, nodes])

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

  const handleDroppedJson = useCallback(
    (text: string) => {
      if (nodes.length > 0) {
        toast.error("Import only works on an empty roadmap.")
        return
      }

      if (importDropLock.current) {
        return
      }
      importDropLock.current = true

      void importRoadmapAction({ json: text, roleId }).then((result) => {
        importDropLock.current = false
        if (result.ok) {
          toast.success("Roadmap imported")
          router.refresh()
          return
        }

        setImportSeedJson(text)
        setImportSeedError(result.message)
        setImportOpen(true)
      })
    },
    [nodes.length, roleId, router]
  )
  const { isOver: isJsonFileOver, dropProps: jsonDropProps } =
    useJsonFileDrop(handleDroppedJson)

  const onNodesChange = useCallback((changes: NodeChange<CanvasFlowNode>[]) => {
    setFlowNodes((current) => applyNodeChanges(changes, current))
  }, [])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((current) => applyEdgeChanges(changes, current))
  }, [])

  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: CanvasFlowNode[] }) => {
      const nextIds = selected.map((node) => node.id)
      setSelectedIds((current) => (sameIds(current, nextIds) ? current : nextIds))
      if (nextIds.length !== 1) {
        setConfigNodeId(null)
      }
    },
    []
  )

  const selectAllNodes = useCallback(() => {
    setFlowNodes((current) => {
      if (current.length === 0) {
        return current
      }

      const nextIds = current.map((node) => node.id)
      setSelectedIds((ids) => (sameIds(ids, nextIds) ? ids : nextIds))
      if (nextIds.length !== 1) {
        setConfigNodeId(null)
      }

      let changed = false
      const next = current.map((node) => {
        if (node.selected) {
          return node
        }
        changed = true
        return { ...node, selected: true }
      })
      return changed ? next : current
    })
    setEdges((current) => {
      let changed = false
      const next = current.map((edge) => {
        if (!edge.selected) {
          return edge
        }
        changed = true
        return { ...edge, selected: false }
      })
      return changed ? next : current
    })
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!isSelectAllShortcut(event) || event.repeat) {
        return
      }
      if (isEditableKeyboardTarget(event.target)) {
        return
      }
      if (dialogOpen || labelOpen || deleteOpen || importOpen) {
        return
      }

      event.preventDefault()
      selectAllNodes()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [deleteOpen, dialogOpen, importOpen, labelOpen, selectAllNodes])

  const onNodeClick = useCallback(
    (event: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }, node: CanvasFlowNode) => {
      if (
        canvasTool === "select" ||
        event.shiftKey ||
        event.metaKey ||
        event.ctrlKey
      ) {
        if (node.type === "label") {
          setConfigNodeId(null)
        }
        return
      }

      if (node.type === "label") {
        setConfigNodeId(null)
        return
      }
      setConfigNodeId(node.id)
    },
    [canvasTool]
  )

  const onNodeDoubleClick = useCallback(
    (_event: unknown, node: CanvasFlowNode) => {
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

  function openDelete(ids: string[]) {
    if (ids.length === 0) {
      return
    }
    setDeleteIds(ids)
    setDeleteOpen(true)
  }

  const onBeforeDelete = useCallback(
    async ({ nodes: deletingNodes }: { nodes: { id: string }[] }) => {
      if (deletingNodes.length === 0) {
        return false
      }

      setDeleteIds(deletingNodes.map((node) => node.id))
      setDeleteOpen(true)
      return false
    },
    []
  )

  const persistPosition: OnNodeDrag<CanvasFlowNode> = useCallback(
    async (_event, node) => {
      const selected = getNodes().filter((item) => item.selected)
      const moved = selected.length > 0 ? selected : [node]
      const positions = new Map(moved.map((item) => [item.id, item.position]))

      setNodes((current) =>
        current.map((item) => {
          const position = positions.get(item.id)
          return position
            ? { ...item, positionX: position.x, positionY: position.y }
            : item
        })
      )

      const results = await Promise.all(
        moved.map((item) =>
          moveNodeAction({
            roleId,
            nodeId: item.id,
            positionX: item.position.x,
            positionY: item.position.y,
          })
        )
      )
      const failed = results.find((result) => !result.ok)
      if (failed && !failed.ok) {
        toast.error(failed.message)
        router.refresh()
      }
    },
    [getNodes, roleId, router]
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
            zIndex: 1,
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
    setSelectedIds([nodeId])
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
    accentColor: string | null
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
      accentColor: input.accentColor,
    }
    setNodes((current) => current.map((node) => (node.id === next.id ? next : node)))

    void updateNodeAction({
      roleId,
      nodeId: next.id,
      title: next.title,
      description: next.description,
      icon: next.icon,
      notes: next.notes,
      accentColor: next.accentColor,
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
    if (deleteIds.length === 0) {
      return
    }

    const roots = selectedRootIds(nodes, deleteIds)
    const removing = new Set<string>()
    for (const id of roots) {
      for (const childId of subtreeNodeIds(nodes, id)) {
        removing.add(childId)
      }
    }

    const previousNodes = nodes
    const previousItems = items
    const previousLinks = links
    const deleteCount = deleteIds.length
    const onlyLabel =
      deleteNodes.length === 1 && deleteNodes[0] && isLabelNode(deleteNodes[0])
    setNodes((current) => current.filter((node) => !removing.has(node.id)))
    setItems((current) => current.filter((item) => !removing.has(item.nodeId)))
    setLinks((current) => current.filter((link) => !removing.has(link.nodeId)))
    setDeleteOpen(false)
    setConfigNodeId(null)
    setSelectedIds([])
    setDeleteIds([])
    toast.success(
      onlyLabel ? "Label deleted" : deleteCount > 1 ? "Items deleted" : "Node deleted"
    )

    void Promise.all(
      roots.map((nodeId) => deleteNodeAction({ roleId, nodeId }))
    ).then((results) => {
      const failed = results.find((result) => !result.ok)
      if (failed && !failed.ok) {
        setNodes(previousNodes)
        setItems(previousItems)
        setLinks(previousLinks)
        toast.error(failed.message)
      }
    })
  }

  const canvas = (
    <div className="relative h-full min-h-0 overflow-hidden" {...jsonDropProps}>
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
        selectionOnDrag={canvasTool === "select"}
        panOnDrag={canvasTool === "select" ? [1, 2] : true}
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode="Shift"
        connectionLineStyle={{
          stroke: DEFAULT_EDGE_STROKE,
          strokeWidth: DEFAULT_EDGE_STROKE_WIDTH,
        }}
        defaultEdgeOptions={{
          zIndex: 1,
          style: {
            stroke: DEFAULT_EDGE_STROKE,
            strokeWidth: DEFAULT_EDGE_STROKE_WIDTH,
          },
        }}
        defaultViewport={initialViewport ?? undefined}
        fitView={nodes.length > 0 && !initialViewport}
        deleteKeyCode={["Backspace", "Delete"]}
        colorMode={themeReady && resolvedTheme === "dark" ? "dark" : "light"}
        minZoom={0.2}
        maxZoom={1.75}
        className={
          canvasTool === "select"
            ? "h-full cursor-crosshair bg-background"
            : "h-full bg-background"
        }
      >
        <Background gap={20} size={1} />
      </ReactFlow>
      <CanvasToolbar
        tool={canvasTool}
        onToolChange={setCanvasTool}
        hasSelection={selectedIds.length > 0}
        canEdit={singleSelection}
        canAddChild={Boolean(
          singleSelection &&
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
          if (!selectedNode || !singleSelection) {
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
        onDelete={() => openDelete(selectedIds)}
        onExport={() => void handleExport()}
      />
      {nodes.length === 0 ? (
        <EmptyRoadmap
          onCreate={() => openCreate(null)}
          onImport={() => {
            setImportSeedJson("")
            setImportSeedError(null)
            setImportOpen(true)
          }}
        />
      ) : null}
      {isJsonFileOver ? (
        <div className="pointer-events-none absolute inset-3 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-ring bg-background/55">
          <p className="rounded-lg bg-background/95 px-4 py-2 text-sm font-medium shadow-sm">
            {nodes.length > 0
              ? "Import only works on an empty roadmap"
              : "Drop JSON to import"}
          </p>
        </div>
      ) : null}
    </div>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ResizablePanelGroup
        key={groupKey}
        orientation="horizontal"
        className="min-h-0 flex-1"
        onLayoutChanged={onLayoutChanged}
      >
        <ResizablePanel id="roadmap-canvas" defaultSize={mainDefaultSize} minSize="40%">
          {canvas}
        </ResizablePanel>
        {sheetOpen ? (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel
              id="node-config"
              defaultSize={detailsDefaultSize}
              minSize={`${DETAILS_PANEL_MIN_SIZE}%`}
              maxSize={`${DETAILS_PANEL_MAX_SIZE}%`}
            >
              <div className="h-full min-h-0 overflow-hidden">
                <NodeConfigSheet
                  open={sheetOpen}
                  onOpenChange={(open) => {
                    if (!open) {
                      setConfigNodeId(null)
                    }
                  }}
                  node={configNode}
                  checklistItems={selectedItems}
                  links={selectedLinks}
                  nodeProgress={selectedNodeProgress}
                  subtreeProgress={selectedSubtreeProgress}
                  onSaveDetails={async (input) => handleSaveDetails(input)}
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
      <RoadmapStatusBar
        roleName={roleName}
        progress={overallProgress}
        counts={statusCounts}
      />
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
        count={deleteIds.length}
        nodeTitle={deleteNodes[0]?.title ?? ""}
        onConfirm={async () => {
          handleDelete()
        }}
      />
      <ImportRoadmapDialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open)
          if (!open) {
            setImportSeedJson("")
            setImportSeedError(null)
          }
        }}
        initialJson={importSeedJson}
        initialError={importSeedError}
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
  userId,
  roleId,
  roleName,
  nodes,
  checklistItems,
  links,
  focusNodeId,
}: {
  userId: string
  roleId: string
  roleName: string
  nodes: RoadmapNode[]
  checklistItems: ChecklistItem[]
  links: NodeLink[]
  focusNodeId?: string
}) {
  return (
    <ReactFlowProvider>
      <RoadmapCanvasInner
        userId={userId}
        roleId={roleId}
        roleName={roleName}
        nodes={nodes}
        checklistItems={checklistItems}
        links={links}
        focusNodeId={focusNodeId}
      />
    </ReactFlowProvider>
  )
}
