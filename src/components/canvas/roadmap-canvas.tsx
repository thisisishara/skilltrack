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
import { NodeDialog, type NodeDialogMode } from "@/components/canvas/node-dialog"
import {
  RoadmapNodeCard,
  type RoadmapFlowNode,
} from "@/components/canvas/roadmap-node"
import type { RoadmapNode } from "@/domain/nodes/types"

const nodeTypes = {
  roadmap: RoadmapNodeCard,
}

function toFlowNodes(nodes: RoadmapNode[]): RoadmapFlowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: "roadmap",
    position: { x: node.positionX, y: node.positionY },
    data: {
      title: node.title,
      description: node.description,
      icon: node.icon,
    },
  }))
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
  nodes: serverNodes,
}: {
  roleId: string
  nodes: RoadmapNode[]
}) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [flowNodes, setFlowNodes] = useState<RoadmapFlowNode[]>(() =>
    toFlowNodes(serverNodes)
  )
  const [edges, setEdges] = useState<Edge[]>(() => toFlowEdges(serverNodes))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialogMode, setDialogMode] = useState<NodeDialogMode | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    setFlowNodes(toFlowNodes(serverNodes))
    setEdges(toFlowEdges(serverNodes))
  }, [serverNodes])

  const selectedNode = useMemo(
    () => serverNodes.find((node) => node.id === selectedId) ?? null,
    [serverNodes, selectedId]
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

  function openEdit() {
    if (!selectedNode) {
      return
    }

    setDialogMode({
      kind: "edit",
      nodeId: selectedNode.id,
      title: selectedNode.title,
      description: selectedNode.description,
      icon: selectedNode.icon,
    })
    setDialogOpen(true)
  }

  async function handleDialogSubmit(input: {
    title: string
    description: string
    icon: string
  }) {
    if (!dialogMode) {
      return { ok: false as const, code: "unexpected" as const, message: "Nothing to save." }
    }

    const result =
      dialogMode.kind === "create"
        ? await createNodeAction({
            roleId,
            parentId: dialogMode.parentId,
            title: input.title,
            description: input.description,
            icon: input.icon,
          })
        : await updateNodeAction({
            roleId,
            nodeId: dialogMode.nodeId,
            title: input.title,
            description: input.description,
            icon: input.icon,
          })

    if (result.ok && "node" in result) {
      toast.success(dialogMode.kind === "create" ? "Node created" : "Node updated")
      setDialogOpen(false)
      router.refresh()
    }

    return result
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
        onNodeDoubleClick={(_event, node) => {
          const match = serverNodes.find((item) => item.id === node.id)
          if (!match) {
            return
          }
          setSelectedId(match.id)
          setDialogMode({
            kind: "edit",
            nodeId: match.id,
            title: match.title,
            description: match.description,
            icon: match.icon,
          })
          setDialogOpen(true)
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
        onEdit={openEdit}
        onDelete={() => selectedNode && setDeleteOpen(true)}
      />
      {serverNodes.length === 0 ? (
        <EmptyRoadmap onCreate={() => openCreate(null)} />
      ) : null}
      <NodeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        onSubmit={handleDialogSubmit}
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
  nodes,
}: {
  roleId: string
  nodes: RoadmapNode[]
}) {
  return (
    <ReactFlowProvider>
      <RoadmapCanvasInner roleId={roleId} nodes={nodes} />
    </ReactFlowProvider>
  )
}
