"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronsDownUp, ChevronsUpDown, ListTree } from "lucide-react"
import { toast } from "sonner"

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
  placeNodeAction,
  updateNodeAction,
} from "@/application/nodes/actions"
import { DeleteNodeAlert } from "@/components/roadmap/delete-node-alert"
import {
  TaskDialog,
  type NodeChecklistCopy,
} from "@/components/roadmap/node-checklist-section"
import { NotesDialog, NodeConfigSheet } from "@/components/roadmap/node-config-sheet"
import { LinkDialog } from "@/components/roadmap/node-links-section"
import {
  NodeDialog,
  type NodeDialogCopy,
  type NodeDialogMode,
} from "@/components/roadmap/node-dialog"
import {
  RoadmapNodeRow,
  type TopicAddKind,
} from "@/components/roadmap/roadmap-node-row"
import { RoadmapStatusBar } from "@/components/roadmap/roadmap-status-bar"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useDetailsPanelLayout } from "@/hooks/use-details-panel-layout"
import { applyChecklistCompletion } from "@/domain/checklists/completion"
import { displayChecklistTitle } from "@/domain/checklists/title"
import type { ChecklistItem } from "@/domain/checklists/types"
import type { NodeLink } from "@/domain/links/types"
import {
  displayLinkLabel,
  isValidHttpUrl,
  normalizeLinkUrl,
} from "@/domain/links/url"
import type { NodeHandleKind } from "@/domain/nodes/handle"
import { nodeCanHaveChildren, nodeCanHaveParent } from "@/domain/nodes/handle"
import { normalizeNodeIcon } from "@/domain/nodes/icon"
import { isSkillNode } from "@/domain/nodes/kind"
import { CHILD_OFFSET_Y, ROOT_OFFSET_X } from "@/domain/nodes/layout"
import {
  applyPlacements,
  placementUpdates,
  type TreeDropPosition,
} from "@/domain/nodes/placement"
import { displayNodeTitle } from "@/domain/nodes/title"
import type { RoadmapNode } from "@/domain/nodes/types"
import {
  nodeProgress,
  nodeStatusCounts,
  roadmapProgress,
  subtreeNodeIds,
  subtreeProgress,
} from "@/domain/progress/progress"
import {
  DETAILS_PANEL_MAX_SIZE,
  DETAILS_PANEL_MIN_SIZE,
} from "@/lib/layout/details-panel-storage"
import { readExpandedIds, writeExpandedIds } from "@/lib/roadmap/expanded-storage"

const TASK_CHECKLIST_COPY: NodeChecklistCopy = {
  emptyTitle: "No tasks yet",
  emptyDescription: "Add tasks to track what you need to learn here.",
  emptyAddLabel: "Add a task",
  addedToast: "Task added",
  titleFieldLabel: "Task",
  titlePlaceholder: "e.g. Understand CAP theorem",
  addButtonLabel: "Add task",
}

const TOPIC_DIALOG_COPY: NodeDialogCopy = {
  createTitle: "Add topic group",
  createDescription: "Add a top-level topic group to this roadmap.",
  childTitle: "Add sub-topic",
  childDescription: "Create a sub-topic nested under the selected topic.",
  editTitle: "Edit topic",
  editDescription: "Update this topic without changing its progress.",
  titlePlaceholder: "System design",
  descriptionPlaceholder: "Optional notes about this topic",
  submitCreateLabel: "Add topic group",
  submitChildLabel: "Add sub-topic",
}

function mergeById<T extends { id: string }>(server: T[], local: T[]): T[] {
  const serverIds = new Set(server.map((item) => item.id))
  return [...server, ...local.filter((item) => !serverIds.has(item.id))]
}

function ancestorIds(nodes: RoadmapNode[], nodeId: string): string[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const ids: string[] = []
  let current = byId.get(nodeId)?.parentId ?? null
  const seen = new Set<string>()

  while (current && !seen.has(current)) {
    seen.add(current)
    ids.push(current)
    current = byId.get(current)?.parentId ?? null
  }

  return ids
}

function nextSortOrder(nodes: RoadmapNode[], parentId: string | null) {
  const siblings = nodes.filter((node) => node.parentId === parentId)
  if (siblings.length === 0) {
    return 0
  }

  return Math.max(...siblings.map((node) => node.sortOrder)) + 1
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

function createLocalNode(input: {
  id: string
  roleId: string
  parentId: string | null
  title: string
  description: string | null
  icon: string
  handleKind: NodeHandleKind
  positionX: number
  positionY: number
  sortOrder: number
}): RoadmapNode {
  const now = new Date().toISOString()
  return {
    id: input.id,
    roleId: input.roleId,
    parentId: input.parentId,
    kind: "skill",
    title: input.title,
    description: input.description,
    notes: null,
    icon: input.icon,
    accentColor: null,
    handleKind: input.handleKind,
    incomingEdgeAnimated: false,
    positionX: input.positionX,
    positionY: input.positionY,
    sortOrder: input.sortOrder,
    createdAt: now,
    updatedAt: now,
  }
}

export function Roadmap({
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
  const [nodes, setNodes] = useState<RoadmapNode[]>(serverNodes)
  const [items, setItems] = useState<ChecklistItem[]>(serverItems ?? [])
  const [links, setLinks] = useState<NodeLink[]>(serverLinks ?? [])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const [expandedHydrated, setExpandedHydrated] = useState(false)
  const [configNodeId, setConfigNodeId] = useState<string | null>(null)
  const [dialogMode, setDialogMode] = useState<NodeDialogMode | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteIds, setDeleteIds] = useState<string[]>([])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [compose, setCompose] = useState<{
    type: "task" | "link" | "notes"
    nodeId: string
  } | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropHint, setDropHint] = useState<{
    nodeId: string
    position: TreeDropPosition
  } | null>(null)
  const focusedRef = useRef<string | null>(null)
  const draggedIdRef = useRef<string | null>(null)
  const {
    groupKey,
    mainDefaultSize,
    detailsDefaultSize,
    onLayoutChanged,
  } = useDetailsPanelLayout(userId)

  function setDragging(nodeId: string | null) {
    draggedIdRef.current = nodeId
    setDraggedId(nodeId)
    if (!nodeId) {
      setDropHint(null)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNodes((current) => mergeById(serverNodes, current))
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
    // Expanded state is per-role and lives in localStorage; hydrate once
    // after mount so SSR output doesn't depend on it. Nodes are collapsed
    // by default so opening a large roadmap stays instant.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedIds(readExpandedIds(roleId))
    setExpandedHydrated(true)
  }, [roleId])

  useEffect(() => {
    if (!focusNodeId || !expandedHydrated || focusedRef.current === focusNodeId) {
      return
    }

    const node = nodes.find((item) => item.id === focusNodeId)
    if (!node) {
      return
    }

    focusedRef.current = focusNodeId
    const ancestors = ancestorIds(nodes, focusNodeId)

    if (ancestors.length > 0) {
      // Deep-linking into a nested topic needs its ancestors expanded so it's
      // actually visible; this only runs once per distinct focusNodeId.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedIds((current) => {
        let changed = false
        const next = new Set(current)
        for (const id of ancestors) {
          if (!next.has(id)) {
            next.add(id)
            changed = true
          }
        }
        if (changed) {
          writeExpandedIds(roleId, next)
        }
        return changed ? next : current
      })
    }

    setConfigNodeId(focusNodeId)

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document
          .getElementById(`tree-topic-${focusNodeId}`)
          ?.scrollIntoView({ block: "center", behavior: "smooth" })
      })
    })

    return () => cancelAnimationFrame(frame)
  }, [expandedHydrated, focusNodeId, nodes, roleId])

  const skillNodes = useMemo(() => nodes.filter(isSkillNode), [nodes])

  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, RoadmapNode[]>()
    for (const node of skillNodes) {
      const siblings = map.get(node.parentId) ?? []
      siblings.push(node)
      map.set(node.parentId, siblings)
    }
    for (const siblings of map.values()) {
      siblings.sort((a, b) => a.sortOrder - b.sortOrder)
    }
    return map
  }, [skillNodes])

  const roots = childrenByParent.get(null) ?? []
  // When the whole roadmap hangs off a single top-level topic (the common
  // case — that topic usually just restates the role name), showing it as
  // its own collapsible row is redundant. Hoist its children up to the
  // top level instead and surface the role name as the page heading; the
  // hidden topic's own details/checklist stay reachable via the header.
  const singleRoot = roots.length === 1 ? (roots[0] ?? null) : null
  const visibleRoots = singleRoot ? childrenByParent.get(singleRoot.id) ?? [] : roots
  const primaryParentId = singleRoot?.id ?? null

  const overallProgress = useMemo(() => {
    const skillIds = new Set(skillNodes.map((node) => node.id))
    return roadmapProgress(items.filter((item) => skillIds.has(item.nodeId)))
  }, [items, skillNodes])
  const statusCounts = useMemo(
    () => nodeStatusCounts(skillNodes, items),
    [skillNodes, items]
  )

  const subtreeProgressFor = useCallback(
    (nodeId: string) => subtreeProgress(skillNodes, items, nodeId),
    [skillNodes, items]
  )

  const isOverview =
    !configNodeId || Boolean(singleRoot && configNodeId === singleRoot.id)
  const configNode = useMemo(
    () => nodes.find((node) => node.id === configNodeId) ?? null,
    [nodes, configNodeId]
  )
  const panelNode = isOverview ? singleRoot : configNode
  const isPanelSubgroup = Boolean(
    panelNode && visibleRoots.some((node) => node.id === panelNode.id)
  )
  const selectedItems = useMemo(
    () =>
      !isOverview && configNodeId
        ? items.filter((item) => item.nodeId === configNodeId)
        : [],
    [configNodeId, isOverview, items]
  )
  const selectedLinks = useMemo(
    () => (panelNode ? links.filter((link) => link.nodeId === panelNode.id) : []),
    [links, panelNode]
  )
  const selectedNodeProgress = useMemo(
    () =>
      !isOverview && configNodeId
        ? nodeProgress(items, configNodeId)
        : nodeProgress([], ""),
    [configNodeId, isOverview, items]
  )
  const selectedSubtreeProgress = useMemo(() => {
    if (isOverview) {
      return overallProgress
    }
    return configNodeId
      ? subtreeProgress(skillNodes, items, configNodeId)
      : nodeProgress([], "")
  }, [configNodeId, isOverview, items, overallProgress, skillNodes])
  const deleteNodes = useMemo(
    () => nodes.filter((node) => deleteIds.includes(node.id)),
    [deleteIds, nodes]
  )
  const deleteChildNames = useMemo(
    () =>
      deleteNodes.flatMap((node) =>
        (childrenByParent.get(node.id) ?? []).map((child) => child.title)
      ),
    [childrenByParent, deleteNodes]
  )

  function expandAll() {
    const next = new Set(
      skillNodes
        .filter((node) => {
          const hasChildren = (childrenByParent.get(node.id) ?? []).length > 0
          const hasTasks = items.some((item) => item.nodeId === node.id)
          return hasChildren || hasTasks || Boolean(node.description?.trim())
        })
        .map((node) => node.id)
    )
    setExpandedIds(next)
    writeExpandedIds(roleId, next)
    setConfigNodeId(null)
  }

  function collapseAll() {
    const next = new Set<string>()
    setExpandedIds(next)
    writeExpandedIds(roleId, next)
    setConfigNodeId(null)
  }

  function toggleExpand(nodeId: string) {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      writeExpandedIds(roleId, next)
      return next
    })
  }

  function canDropOn(targetId: string, position: TreeDropPosition) {
    const currentDraggedId = draggedIdRef.current
    if (!currentDraggedId) {
      return false
    }

    const dragged = nodes.find((node) => node.id === currentDraggedId)
    const target = nodes.find((node) => node.id === targetId)
    if (!dragged || !target) {
      return false
    }

    const nextParentId = position === "inside" ? targetId : target.parentId
    if (nextParentId && !nodeCanHaveParent(dragged.handleKind)) {
      return false
    }
    if (position === "inside" && !nodeCanHaveChildren(target.handleKind)) {
      return false
    }

    return placementUpdates(nodes, currentDraggedId, targetId, position) !== null
  }

  function handlePlace(targetId: string, position: TreeDropPosition) {
    const currentDraggedId = draggedIdRef.current
    if (!currentDraggedId) {
      return
    }

    const updates = placementUpdates(nodes, currentDraggedId, targetId, position)
    setDragging(null)
    if (!updates) {
      return
    }

    const previous = nodes
    setNodes((current) => applyPlacements(current, updates))
    if (position === "inside") {
      setExpandedIds((current) => {
        if (current.has(targetId)) {
          return current
        }
        const next = new Set(current)
        next.add(targetId)
        writeExpandedIds(roleId, next)
        return next
      })
    }
    setConfigNodeId(currentDraggedId)

    void placeNodeAction({
      roleId,
      nodeId: currentDraggedId,
      targetId,
      position,
    }).then((result) => {
      if (!result.ok) {
        setNodes(previous)
        toast.error(result.message)
        return
      }
      toast.success("Topic moved")
    })
  }

  function expandNode(nodeId: string) {
    setExpandedIds((current) => {
      if (current.has(nodeId)) {
        return current
      }
      const next = new Set(current)
      next.add(nodeId)
      writeExpandedIds(roleId, next)
      return next
    })
  }

  function openCreate(parentId: string | null, asGroup = false) {
    setDialogMode({ kind: "create", parentId, asGroup })
    setDialogOpen(true)
  }

  function handleAddItem(nodeId: string, kind: TopicAddKind) {
    setConfigNodeId(nodeId)
    expandNode(nodeId)
    if (kind === "subtopic") {
      openCreate(nodeId)
      return
    }
    setCompose({ type: kind, nodeId })
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
        message: "Topic title cannot be empty.",
      }
    }

    const parentId = dialogMode.parentId
    const parent = parentId ? nodes.find((node) => node.id === parentId) : null
    const id = crypto.randomUUID()
    const positionX = parent ? parent.positionX : skillNodes.length * ROOT_OFFSET_X
    const positionY = parent ? parent.positionY + CHILD_OFFSET_Y : 0
    const node = createLocalNode({
      id,
      roleId,
      parentId,
      title,
      description: input.description.trim() || null,
      icon: normalizeNodeIcon(input.icon),
      handleKind: input.handleKind,
      positionX,
      positionY,
      sortOrder: nextSortOrder(nodes, parentId),
    })

    setNodes((current) => [...current, node])
    setDialogOpen(false)
    if (parentId) {
      // Expand the parent so the freshly created child is visible right away.
      setExpandedIds((current) => {
        if (current.has(parentId)) {
          return current
        }
        const next = new Set(current)
        next.add(parentId)
        writeExpandedIds(roleId, next)
        return next
      })
    }
    toast.success(dialogMode.asGroup ? "Topic group added" : "Sub-topic added")

    void createNodeAction({
      id,
      roleId,
      parentId,
      kind: "skill",
      title,
      description: node.description,
      icon: node.icon,
      handleKind: node.handleKind,
      incomingEdgeAnimated: false,
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
    if (!panelNode) {
      return {
        ok: false as const,
        code: "unexpected" as const,
        message: "Select a topic first.",
      }
    }

    const title = displayNodeTitle(input.title)
    if (!title) {
      return {
        ok: false as const,
        code: "validation" as const,
        message: "Topic title cannot be empty.",
      }
    }

    const previous = panelNode
    const next: RoadmapNode = {
      ...panelNode,
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

  function handleSaveNotes(nodeId: string, notes: string) {
    const target = nodes.find((node) => node.id === nodeId)
    if (!target) {
      return
    }

    const previous = target
    const next: RoadmapNode = {
      ...target,
      notes: notes.trim() || null,
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
  }

  function openDelete(nodeId: string) {
    setDeleteIds([nodeId])
    setDeleteOpen(true)
  }

  function handleDelete() {
    if (deleteIds.length === 0) {
      return
    }

    const deleteRoots = selectedRootIds(nodes, deleteIds)
    const removing = new Set<string>()
    for (const id of deleteRoots) {
      for (const childId of subtreeNodeIds(nodes, id)) {
        removing.add(childId)
      }
    }

    const previousNodes = nodes
    const previousItems = items
    const previousLinks = links
    setNodes((current) => current.filter((node) => !removing.has(node.id)))
    setItems((current) => current.filter((item) => !removing.has(item.nodeId)))
    setLinks((current) => current.filter((link) => !removing.has(link.nodeId)))
    setDeleteOpen(false)
    if (configNodeId && removing.has(configNodeId)) {
      setConfigNodeId(null)
    }
    setDeleteIds([])
    toast.success("Topic deleted")

    void Promise.all(deleteRoots.map((nodeId) => deleteNodeAction({ roleId, nodeId }))).then(
      (results) => {
        const failed = results.find((result) => !result.ok)
        if (failed && !failed.ok) {
          setNodes(previousNodes)
          setItems(previousItems)
          setLinks(previousLinks)
          toast.error(failed.message)
        }
      }
    )
  }

  const getChecklistHandlers = useCallback(
    (nodeId: string) => ({
      onToggle: async (itemId: string, isCompleted: boolean) => {
        const previous = items
        setItems((current) =>
          current.map((item) =>
            item.id === itemId ? applyChecklistCompletion(item, isCompleted) : item
          )
        )

        const result = await setChecklistItemCompletedAction({
          roleId,
          nodeId,
          itemId,
          isCompleted,
        })
        if (!result.ok) {
          setItems(previous)
          toast.error(result.message)
        }
      },
      onCreate: (input: { title: string; description: string }) => {
        const title = displayChecklistTitle(input.title)
        if (!title) {
          return { ok: false as const, message: "Checklist title cannot be empty." }
        }

        const siblings = items.filter((item) => item.nodeId === nodeId)
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        const sortOrder =
          siblings.length === 0 ? 0 : Math.max(...siblings.map((item) => item.sortOrder)) + 1
        const item: ChecklistItem = {
          id,
          nodeId,
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
          nodeId,
          title,
          description: item.description,
        }).then((result) => {
          if (!result.ok) {
            setItems((current) => current.filter((entry) => entry.id !== id))
            toast.error(result.message)
          }
        })

        return { ok: true as const }
      },
      onUpdate: (item: ChecklistItem, title: string, description: string) => {
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
      },
      onDelete: (itemId: string) => {
        const previous = items
        setItems((current) => current.filter((item) => item.id !== itemId))

        void deleteChecklistItemAction({ roleId, nodeId, itemId }).then((result) => {
          if (!result.ok) {
            setItems(previous)
            toast.error(result.message)
          }
        })
      },
      onReorder: (orderedIds: string[]) => {
        const previous = items
        setItems((current) =>
          current.map((item) => {
            const index = orderedIds.indexOf(item.id)
            return index >= 0 ? { ...item, sortOrder: index } : item
          })
        )

        void reorderChecklistItemsAction({ roleId, nodeId, orderedIds }).then((result) => {
          if (!result.ok) {
            setItems(previous)
            toast.error(result.message)
          }
        })
      },
    }),
    [items, roleId]
  )

  const configChecklistHandlers = useMemo(
    () => getChecklistHandlers(configNodeId ?? ""),
    [getChecklistHandlers, configNodeId]
  )

  function handleCreateLink(
    input: { label: string; url: string },
    nodeId = panelNode?.id
  ) {
    const label = displayLinkLabel(input.label)
    const url = normalizeLinkUrl(input.url)
    if (!label) {
      return "Link label cannot be empty."
    }
    if (!url || !isValidHttpUrl(url)) {
      return "Enter a valid http or https URL."
    }
    if (!nodeId) {
      return "Select a topic first."
    }

    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const link: NodeLink = { id, nodeId, label, url, createdAt: now, updatedAt: now }
    setLinks((current) => [...current, link])

    void createNodeLinkAction({ id, roleId, nodeId, label, url }).then((result) => {
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

    void deleteNodeLinkAction({ roleId, nodeId: panelNode?.id ?? "", linkId }).then((result) => {
      if (!result.ok) {
        setLinks(previous)
        toast.error(result.message)
      }
    })
  }

  const list = (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="flex shrink-0 cursor-pointer items-center justify-between gap-2 border-b px-4 py-2.5"
        onClick={() => setConfigNodeId(null)}
      >
        <p className="min-w-0 truncate text-left text-sm font-medium">
          {roleName}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {editMode ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation()
                      openCreate(primaryParentId, true)
                    }}
                  />
                }
              >
                Add Topic Group
              </TooltipTrigger>
              <TooltipContent>Add Topic Group</TooltipContent>
            </Tooltip>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={expandAll}
          >
            <ChevronsUpDown data-icon="inline-start" />
            Expand all
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={collapseAll}
          >
            <ChevronsDownUp data-icon="inline-start" />
            Collapse all
          </Button>
          <div
            className="flex shrink-0 items-center gap-2"
            onClick={(event) => event.stopPropagation()}
          >
            <Label
              htmlFor="roadmap-edit-mode"
              className="text-muted-foreground"
            >
              View
            </Label>
            <Switch
              id="roadmap-edit-mode"
              size="sm"
              checked={editMode}
              onCheckedChange={(checked) => setEditMode(checked === true)}
              aria-label="Edit mode"
            />
            <Label htmlFor="roadmap-edit-mode">Edit</Label>
          </div>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 py-3">
          {!expandedHydrated ? null : visibleRoots.length === 0 ? (
            <Empty className="my-6">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ListTree />
                </EmptyMedia>
                <EmptyTitle>No topic groups yet</EmptyTitle>
                <EmptyDescription>
                  {editMode
                    ? singleRoot
                      ? "Add a topic group to start filling in this roadmap."
                      : "Add your first topic group to start mapping this roadmap."
                    : "Switch to Edit to add a topic group."}
                </EmptyDescription>
              </EmptyHeader>
              {editMode ? (
              <EmptyContent>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => openCreate(primaryParentId, true)}
                      />
                    }
                  >
                    Add Topic Group
                  </TooltipTrigger>
                  <TooltipContent>Add Topic Group</TooltipContent>
                </Tooltip>
              </EmptyContent>
              ) : null}
            </Empty>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {visibleRoots.map((node) => (
                <RoadmapNodeRow
                  key={node.id}
                  node={node}
                  depth={0}
                  childrenByParent={childrenByParent}
                  items={items}
                  nodes={skillNodes}
                  expandedIds={expandedIds}
                  onToggleExpand={toggleExpand}
                  selectedNodeId={isOverview ? null : configNodeId}
                  onSelect={setConfigNodeId}
                  onAddItem={handleAddItem}
                  getChecklistHandlers={getChecklistHandlers}
                  editMode={editMode}
                  subtreeProgressFor={subtreeProgressFor}
                  draggedId={draggedId}
                  dropHint={dropHint}
                  onDragStartNode={setDragging}
                  onDragOverNode={(nodeId, position) => {
                    setDropHint({ nodeId, position })
                  }}
                  onDropNode={handlePlace}
                  onDragEndNode={() => setDragging(null)}
                  getDraggedId={() => draggedIdRef.current}
                  canDropOn={canDropOn}
                />
              ))}
            </ul>
          )}
        </div>
      </ScrollArea>
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
        <ResizablePanel id="roadmap-list" defaultSize={mainDefaultSize} minSize="40%">
          {list}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel
          id="roadmap-details"
          defaultSize={detailsDefaultSize}
          minSize={`${DETAILS_PANEL_MIN_SIZE}%`}
          maxSize={`${DETAILS_PANEL_MAX_SIZE}%`}
        >
          <div className="h-full min-h-0 overflow-hidden">
            <NodeConfigSheet
              open
              onOpenChange={() => {
                setConfigNodeId(null)
              }}
              node={panelNode}
              checklistItems={selectedItems}
              links={selectedLinks}
              nodeProgress={selectedNodeProgress}
              subtreeProgress={selectedSubtreeProgress}
              mode={isOverview ? "overview" : "topic"}
              showClose={false}
              showChecklist={!isOverview}
              showIcon={!isPanelSubgroup}
              showProgressBar
              editMode={editMode}
              fallbackTitle={roleName}
              subtitle={
                editMode
                  ? "Configure details, tasks, and links for this topic."
                  : "Progress, notes, and links for this topic."
              }
              checklistHeading="Tasks"
              checklistCopy={TASK_CHECKLIST_COPY}
              deleteLabel={isPanelSubgroup ? "Delete subgroup" : "Delete topic"}
              onSaveDetails={async (input) => handleSaveDetails(input)}
              onToggleChecklist={configChecklistHandlers.onToggle}
              onCreateChecklist={configChecklistHandlers.onCreate}
              onUpdateChecklist={configChecklistHandlers.onUpdate}
              onDeleteChecklist={configChecklistHandlers.onDelete}
              onReorderChecklist={configChecklistHandlers.onReorder}
              onCreateLink={handleCreateLink}
              onUpdateLink={handleUpdateLink}
              onDeleteLink={handleDeleteLink}
              onDelete={
                editMode && !isOverview && panelNode
                  ? () => {
                      const nodeId = panelNode.id
                      openDelete(nodeId)
                    }
                  : undefined
              }
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      <RoadmapStatusBar roleName={roleName} progress={overallProgress} counts={statusCounts} />
      <NodeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        onSubmit={async (input) => handleDialogSubmit(input)}
        copy={TOPIC_DIALOG_COPY}
      />
      <TaskDialog
        open={compose?.type === "task"}
        item={null}
        titleFieldLabel="Task"
        titlePlaceholder="e.g. Understand CAP theorem"
        onOpenChange={(open) => {
          if (!open) {
            setCompose(null)
          }
        }}
        onCreate={(input) => {
          if (!compose || compose.type !== "task") {
            return false
          }
          const result = getChecklistHandlers(compose.nodeId).onCreate(input)
          return result.ok
        }}
        onUpdate={() => undefined}
      />
      <LinkDialog
        open={compose?.type === "link"}
        link={null}
        onOpenChange={(open) => {
          if (!open) {
            setCompose(null)
          }
        }}
        onCreate={(label, url) => {
          if (!compose || compose.type !== "link") {
            return "Select a topic first."
          }
          const message = handleCreateLink({ label, url }, compose.nodeId)
          if (!message) {
            toast.success("Link added")
          }
          return message
        }}
        onUpdate={() => null}
      />
      <NotesDialog
        open={compose?.type === "notes"}
        notes={
          compose?.type === "notes"
            ? (nodes.find((node) => node.id === compose.nodeId)?.notes ?? "")
            : ""
        }
        onOpenChange={(open) => {
          if (!open) {
            setCompose(null)
          }
        }}
        onSave={(notes) => {
          if (!compose || compose.type !== "notes") {
            return
          }
          handleSaveNotes(compose.nodeId, notes)
          setCompose(null)
        }}
      />
      <DeleteNodeAlert
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        count={deleteIds.length}
        nodeTitle={deleteNodes[0]?.title ?? ""}
        noun={
          deleteNodes[0] && visibleRoots.some((node) => node.id === deleteNodes[0].id)
            ? "subgroup"
            : "topic"
        }
        childNoun="sub-topics"
        childNames={deleteChildNames}
        onConfirm={async () => {
          handleDelete()
        }}
      />
    </div>
  )
}
