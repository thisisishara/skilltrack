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
  type OnNodeDrag,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { setChecklistItemCompletedAction } from "@/application/checklists/actions"
import {
  createNodeAction,
  deleteNodeAction,
  moveNodeAction,
  reparentNodeAction,
  updateNodeAction,
} from "@/application/nodes/actions"
import { CanvasToolbar } from "@/components/canvas/canvas-toolbar"
import { DeleteNodeAlert } from "@/components/canvas/delete-node-alert"
import { EmptyRoadmap } from "@/components/canvas/empty-roadmap"
import { NodeConfigSheet } from "@/components/canvas/node-config-sheet"
import { NodeDialog, type NodeDialogMode } from "@/components/canvas/node-dialog"
import {
  RoadmapNodeCard,
  type RoadmapFlowNode,
} from "@/components/canvas/roadmap-node"
import { RoadmapProgressCard } from "@/components/canvas/roadmap-progress-card"
import { applyChecklistCompletion } from "@/domain/checklists/completion"
import type { ChecklistItem } from "@/domain/checklists/types"
import type { NodeLink } from "@/domain/links/types"
import type { RoadmapNode } from "@/domain/nodes/types"
import {
  nodeProgress,
  nodeStatusCounts,
  roadmapProgress,
  subtreeProgress,
} from "@/domain/progress/progress"

const nodeTypes = {
  roadmap: RoadmapNodeCard,
}

function toFlowNodes(
  nodes: RoadmapNode[],
  items: ChecklistItem[]
): RoadmapFlowNode[] {
  return nodes.map((node) => {
    const progress = nodeProgress(items, node.id)
    return {
      id: node.id,
      type: "roadmap",
      position: { x: node.positionX, y: node.positionY },
      data: {
        title: node.title,
        description: node.description,
        icon: node.icon,
        percent: progress.percent,
        status: progress.status,
      },
    }
  })
}

function toFlowEdges(nodes: RoadmapNode[]): Edge[] {
  return nodes
    .filter((node) => node.parentId)
    .map((node) => ({
      id: `${node.parentId}->${node.id}`,
      source: node.parentId as string,
      target: node.id,
    }))
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
  const [items, setItems] = useState<ChecklistItem[]>(serverItems ?? [])
  const [flowNodes, setFlowNodes] = useState<RoadmapFlowNode[]>(() =>
    toFlowNodes(serverNodes, serverItems)
  )
  const [edges, setEdges] = useState<Edge[]>(() => toFlowEdges(serverNodes))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<NodeDialogMode | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    setItems(serverItems)
  }, [serverItems])

  useEffect(() => {
    setFlowNodes(toFlowNodes(serverNodes, items))
    setEdges(toFlowEdges(serverNodes))
  }, [serverNodes, items])

  const selectedNode = useMemo(
    () => serverNodes.find((node) => node.id === selectedId) ?? null,
    [serverNodes, selectedId]
  )

  const selectedItems = useMemo(
    () => items.filter((item) => item.nodeId === selectedId),
    [items, selectedId]
  )

  const selectedLinks = useMemo(
    () => serverLinks.filter((link) => link.nodeId === selectedId),
    [serverLinks, selectedId]
  )

  const overallProgress = useMemo(() => roadmapProgress(items), [items])
  const statusCounts = useMemo(
    () => nodeStatusCounts(serverNodes, items),
    [serverNodes, items]
  )
  const selectedNodeProgress = useMemo(
    () => (selectedId ? nodeProgress(items, selectedId) : nodeProgress([], "")),
    [items, selectedId]
  )
  const selectedSubtreeProgress = useMemo(
    () =>
      selectedId
        ? subtreeProgress(serverNodes, items, selectedId)
        : nodeProgress([], ""),
    [items, selectedId, serverNodes]
  )

  const onNodesChange = useCallback((changes: NodeChange<RoadmapFlowNode>[]) => {
    setFlowNodes((current) => applyNodeChanges(changes, current))
  }, [])

  const persistPosition: OnNodeDrag<RoadmapFlowNode> = useCallback(
    async (_event, node) => {
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
    async (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return
      }

      const result = await reparentNodeAction({
        roleId,
        nodeId: connection.target,
        parentId: connection.source,
      })

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      setEdges((current) => {
        const withoutIncoming = current.filter((edge) => edge.target !== connection.target)
        return addEdge(connection, withoutIncoming)
      })
      toast.success("Node moved in the tree")
      router.refresh()
    },
    [roleId, router]
  )

  const onEdgesDelete: OnEdgesDelete = useCallback(
    async (deleted) => {
      for (const edge of deleted) {
        const result = await reparentNodeAction({
          roleId,
          nodeId: edge.target,
          parentId: null,
        })

        if (!result.ok) {
          toast.error(result.message)
          router.refresh()
          return
        }
      }

      toast.success("Node is now a root")
      router.refresh()
    },
    [roleId, router]
  )

  function openCreate(parentId: string | null) {
    setDialogMode({ kind: "create", parentId })
    setDialogOpen(true)
  }

  function openSheet(nodeId: string) {
    setSelectedId(nodeId)
    setSheetOpen(true)
  }

  async function handleDialogSubmit(input: {
    title: string
    description: string
    icon: string
  }) {
    if (!dialogMode || dialogMode.kind !== "create") {
      return { ok: false as const, code: "unexpected" as const, message: "Nothing to save." }
    }

    const result = await createNodeAction({
      roleId,
      parentId: dialogMode.parentId,
      title: input.title,
      description: input.description,
      icon: input.icon,
    })

    if (result.ok && "node" in result) {
      toast.success("Node created")
      setDialogOpen(false)
      router.refresh()
    }

    return result
  }

  async function handleSaveDetails(input: {
    title: string
    description: string
    icon: string
    notes: string
  }) {
    if (!selectedNode) {
      return { ok: false as const, code: "unexpected" as const, message: "Select a node first." }
    }

    const result = await updateNodeAction({
      roleId,
      nodeId: selectedNode.id,
      title: input.title,
      description: input.description,
      icon: input.icon,
      notes: input.notes,
    })

    if (result.ok) {
      router.refresh()
    }

    return result
  }

  async function handleParentChange(parentId: string | null) {
    if (!selectedNode) {
      return
    }

    const result = await reparentNodeAction({
      roleId,
      nodeId: selectedNode.id,
      parentId,
    })

    if (!result.ok) {
      toast.error(result.message)
      return
    }

    toast.success(parentId ? "Parent updated" : "Node is now a root")
    router.refresh()
  }

  async function handleToggleChecklist(itemId: string, isCompleted: boolean) {
    const previous = items
    setItems((current) =>
      current.map((item) =>
        item.id === itemId ? applyChecklistCompletion(item, isCompleted) : item
      )
    )

    const result = await setChecklistItemCompletedAction({
      roleId,
      nodeId: selectedId ?? "",
      itemId,
      isCompleted,
    })

    if (!result.ok) {
      setItems(previous)
      toast.error(result.message)
      router.refresh()
    }
  }

  async function handleDelete() {
    if (!selectedNode) {
      return
    }

    const result = await deleteNodeAction({
      roleId,
      nodeId: selectedNode.id,
    })

    if (!result.ok) {
      toast.error(result.message)
      return
    }

    toast.success("Node deleted")
    setDeleteOpen(false)
    setSheetOpen(false)
    setSelectedId(null)
    router.refresh()
  }

  return (
    <div className="relative min-h-0 flex-1">
      <ReactFlow
        nodes={flowNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={(changes: EdgeChange[]) => {
          setEdges((current) => applyEdgeChanges(changes, current))
        }}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onBeforeDelete={async ({ nodes: deletingNodes }) => {
          if (deletingNodes.length === 0) {
            return true
          }

          const first = deletingNodes[0]
          if (first) {
            setSelectedId(first.id)
            setDeleteOpen(true)
          }

          return false
        }}
        onNodeDragStop={persistPosition}
        onNodeClick={(_event, node) => {
          openSheet(node.id)
        }}
        onNodeDoubleClick={(_event, node) => {
          openSheet(node.id)
        }}
        onPaneClick={() => {
          setSheetOpen(false)
        }}
        onSelectionChange={({ nodes: selected }) => {
          setSelectedId(selected[0]?.id ?? null)
        }}
        isValidConnection={(connection) =>
          Boolean(connection.source) &&
          Boolean(connection.target) &&
          connection.source !== connection.target
        }
        fitView={serverNodes.length > 0}
        deleteKeyCode={["Backspace", "Delete"]}
        colorMode={resolvedTheme === "dark" ? "dark" : "light"}
        minZoom={0.2}
        maxZoom={1.75}
        className="h-full bg-background"
      >
        <Background gap={20} size={1} />
      </ReactFlow>
      <CanvasToolbar
        hasSelection={Boolean(selectedNode)}
        onAddRoot={() => openCreate(null)}
        onAddChild={() => selectedNode && openCreate(selectedNode.id)}
        onEdit={() => selectedNode && openSheet(selectedNode.id)}
        onDelete={() => selectedNode && setDeleteOpen(true)}
      />
      {serverNodes.length > 0 ? (
        <div className="pointer-events-none absolute top-3 right-3 z-10">
          <RoadmapProgressCard
            roleName={roleName}
            progress={overallProgress}
            counts={statusCounts}
          />
        </div>
      ) : null}
      {serverNodes.length === 0 ? (
        <EmptyRoadmap onCreate={() => openCreate(null)} />
      ) : null}
      <NodeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        onSubmit={handleDialogSubmit}
      />
      <NodeConfigSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        roleId={roleId}
        node={selectedNode}
        nodes={serverNodes}
        checklistItems={selectedItems}
        links={selectedLinks}
        nodeProgress={selectedNodeProgress}
        subtreeProgress={selectedSubtreeProgress}
        onSaveDetails={handleSaveDetails}
        onParentChange={handleParentChange}
        onToggleChecklist={handleToggleChecklist}
        onRefresh={() => router.refresh()}
      />
      <DeleteNodeAlert
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        nodeTitle={selectedNode?.title ?? ""}
        onConfirm={handleDelete}
      />
    </div>
  )
}

export function RoadmapCanvas({
  roleId,
  roleName,
  nodes,
  checklistItems = [],
  links = [],
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
