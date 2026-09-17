"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type UIEvent } from "react"
import { useRouter } from "next/navigation"
import { ChevronsDownUp, ChevronsUpDown, FileDown, FileUp, ListTree } from "lucide-react"
import { toast } from "sonner"

import {
  createChecklistItemAction,
  deleteChecklistItemAction,
  reorderChecklistItemsAction,
  setChecklistItemCompletedAction,
  updateChecklistItemAction,
} from "@/application/tasks/actions"
import {
  createNodeLinkAction,
  deleteNodeLinkAction,
  updateNodeLinkAction,
} from "@/application/links/actions"
import {
  exportRoadmapAction,
  importRoadmapAction,
} from "@/application/import-export/actions"
import {
  createNodeAction,
  deleteNodeAction,
  placeNodeAction,
  placeNodeAtRootAction,
  updateNodeAction,
} from "@/application/topics/actions"
import {
  updateRoleDescriptionAction,
  updateRoleNotesAction,
} from "@/application/roles/actions"
import { DeleteTopicAlert } from "@/components/roadmap/delete-topic-alert"
import {
  TaskDialog,
  type TopicTasksCopy,
} from "@/components/roadmap/topic-tasks-section"
import { NotesDialog, TopicConfigSheet } from "@/components/roadmap/topic-config-sheet"
import { LinkDialog } from "@/components/roadmap/topic-links-section"
import {
  TopicDialog,
  type TopicDialogCopy,
  type TopicDialogMode,
} from "@/components/roadmap/topic-dialog"
import {
  TopicRow,
  type TopicAddKind,
} from "@/components/roadmap/topic-row"
import { persistTreeLocation } from "@/components/roadmap/tree-location"
import {
  accentUpdatesForChange,
  hasNestedTopics,
} from "@/domain/topics/accent"
import { RoadmapStatusBar } from "@/components/roadmap/roadmap-status-bar"
import { ImportRoadmapDialog } from "@/components/roles/import-roadmap-dialog"
import { useRolesUi } from "@/components/roles/roles-workspace"
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
import { useJsonFileDrop } from "@/hooks/use-json-file-drop"
import { applyChecklistCompletion } from "@/domain/tasks/completion"
import { displayChecklistTitle } from "@/domain/tasks/title"
import type { ChecklistItem } from "@/domain/tasks/types"
import type { NodeLink } from "@/domain/links/types"
import {
  resolveLinkFields,
} from "@/domain/links/url"
import type { NodeHandleKind } from "@/domain/topics/handle"
import { nodeCanHaveChildren, nodeCanHaveParent } from "@/domain/topics/handle"
import { normalizeNodeIcon } from "@/domain/topics/icon"
import { isSkillNode } from "@/domain/topics/kind"
import { CHILD_OFFSET_Y, ROOT_OFFSET_X } from "@/domain/topics/layout"
import {
  applyPlacements,
  placementUpdates,
  rootPlacementUpdates,
  type TreeDropPosition,
} from "@/domain/topics/placement"
import { displayNodeTitle } from "@/domain/topics/title"
import type { RoadmapNode } from "@/domain/topics/types"
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
import { downloadTextFile } from "@/lib/roadmap/download"
import { readStoredEditMode, writeStoredEditMode } from "@/lib/roadmap/edit-mode-storage"
import { readExpandedIds, writeExpandedIds } from "@/lib/roadmap/expanded-storage"
import { cn } from "@/lib/utils"

const TASK_CHECKLIST_COPY: TopicTasksCopy = {
  emptyTitle: "No tasks yet",
  emptyDescription: "Add tasks to track what you need to learn here.",
  emptyAddLabel: "Add a task",
  addedToast: "Task added",
  titleFieldLabel: "Task",
  titlePlaceholder: "e.g. Understand CAP theorem",
  addButtonLabel: "Add task",
}

const TOPIC_DIALOG_COPY: TopicDialogCopy = {
  createTitle: "Add topic",
  createDescription: "Add a top-level topic to this roadmap.",
  childTitle: "Add subtopic",
  childDescription: "Create a subtopic nested under the selected topic.",
  editTitle: "Edit topic",
  editDescription: "Update this topic without changing its progress.",
  titlePlaceholder: "System design",
  descriptionPlaceholder: "Optional notes about this topic",
  submitCreateLabel: "Add topic",
  submitChildLabel: "Add subtopic",
}

function mergeById<T extends { id: string }>(server: T[], local: T[]): T[] {
  const serverIds = new Set(server.map((item) => item.id))
  return [...server, ...local.filter((item) => !serverIds.has(item.id))]
}

const TREE_READING_GAP = 8

function readingLineY(toolbar: HTMLElement | null, viewport: HTMLElement) {
  const top = toolbar
    ? toolbar.getBoundingClientRect().bottom
    : viewport.getBoundingClientRect().top
  return top + TREE_READING_GAP
}

function scrollToReadingLine(
  viewport: HTMLElement,
  target: HTMLElement,
  line: number
) {
  viewport.scrollTop += target.getBoundingClientRect().top - line
}

function locationFromViewport(
  viewport: HTMLElement,
  line: number
): string | null {
  let best: { top: number; nodeId: string } | null = null

  for (const el of viewport.querySelectorAll<HTMLElement>("[data-tree-topic]")) {
    const top = el.getBoundingClientRect().top
    const nodeId = el.dataset.treeTopic
    if (!nodeId || top > line) {
      continue
    }
    if (!best || top >= best.top) {
      best = { top, nodeId }
    }
  }

  return best?.nodeId ?? null
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
    color: null,
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
  roleDescription,
  roleNotes,
  nodes: serverNodes,
  checklistItems: serverItems,
  links: serverLinks,
  focusNodeId: focusNodeIdFromServer,
}: {
  userId: string
  roleId: string
  roleName: string
  roleDescription: string | null
  roleNotes: string | null
  nodes: RoadmapNode[]
  checklistItems: ChecklistItem[]
  links: NodeLink[]
  focusNodeId?: string
}) {
  const [nodes, setNodes] = useState<RoadmapNode[]>(serverNodes)
  const [items, setItems] = useState<ChecklistItem[]>(serverItems ?? [])
  const [links, setLinks] = useState<NodeLink[]>(serverLinks ?? [])
  const [overviewDescription, setOverviewDescription] = useState(roleDescription ?? "")
  const [overviewNotes, setOverviewNotes] = useState(roleNotes ?? "")
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const [expandedHydrated, setExpandedHydrated] = useState(false)
  const [configNodeId, setConfigNodeId] = useState<string | null>(null)
  const [dialogMode, setDialogMode] = useState<TopicDialogMode | null>(null)
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
  const [headerDropActive, setHeaderDropActive] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importSeedJson, setImportSeedJson] = useState("")
  const [importSeedError, setImportSeedError] = useState<string | null>(null)
  const [exportPending, setExportPending] = useState(false)
  const router = useRouter()
  const importDropLock = useRef(false)
  const focusedRef = useRef<string | null>(null)
  const appliedFocusNonceRef = useRef(0)
  const pendingRevealRef = useRef<string | null>(
    focusNodeIdFromServer ?? null
  )
  const focusNodeFromUrlRef = useRef(focusNodeIdFromServer)
  focusNodeFromUrlRef.current = focusNodeIdFromServer
  const draggedIdRef = useRef<string | null>(null)
  const programmaticScrollRef = useRef(false)
  const programmaticScrollTimerRef = useRef(0)
  const scrollPersistTimerRef = useRef(0)
  const listRef = useRef<HTMLDivElement>(null)
  const { treeFocusRequest } = useRolesUi()
  const {
    groupKey,
    mainDefaultSize,
    detailsDefaultSize,
    onLayoutChanged,
  } = useDetailsPanelLayout(userId)

  function lockTreeLayout() {
    programmaticScrollRef.current = true
    window.clearTimeout(programmaticScrollTimerRef.current)
    programmaticScrollTimerRef.current = window.setTimeout(() => {
      programmaticScrollRef.current = false
      const viewport = listRef.current?.querySelector<HTMLElement>(
        "[data-slot=scroll-area-viewport]"
      )
      if (!viewport) {
        return
      }
      const toolbar =
        listRef.current?.querySelector<HTMLElement>("[data-tree-toolbar]") ?? null
      persistTreeLocation(
        locationFromViewport(viewport, readingLineY(toolbar, viewport))
      )
    }, 400)
  }

  function setDragging(nodeId: string | null) {
    draggedIdRef.current = nodeId
    setDraggedId(nodeId)
    if (!nodeId) {
      setDropHint(null)
      setHeaderDropActive(false)
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
    focusedRef.current = null
    appliedFocusNonceRef.current = 0
    pendingRevealRef.current = focusNodeFromUrlRef.current ?? null
  }, [roleId])

  useEffect(() => {
    // View/Edit is a chrome preference. Hydrate after mount so SSR markup
    // does not depend on localStorage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditMode(readStoredEditMode(userId))
  }, [userId])

  useEffect(() => {
    return () => {
      window.clearTimeout(programmaticScrollTimerRef.current)
      window.clearTimeout(scrollPersistTimerRef.current)
    }
  }, [])

  useLayoutEffect(() => {
    if (
      treeFocusRequest &&
      treeFocusRequest.roleId === roleId &&
      treeFocusRequest.nonce !== appliedFocusNonceRef.current
    ) {
      appliedFocusNonceRef.current = treeFocusRequest.nonce
      pendingRevealRef.current = treeFocusRequest.nodeId
      focusedRef.current = null
    }

    const nodeId = pendingRevealRef.current
    if (!nodeId || !expandedHydrated) {
      return
    }

    const node = nodes.find((item) => item.id === nodeId)
    if (!node) {
      pendingRevealRef.current = null
      return
    }

    const idsToExpand = ancestorIds(nodes, nodeId)
    const missing = idsToExpand.filter((id) => !expandedIds.has(id))
    if (missing.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedIds((current) => {
        const next = new Set(current)
        let changed = false
        for (const id of idsToExpand) {
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
      return
    }

    const target = document.getElementById(`tree-topic-${nodeId}`)
    const viewport = listRef.current?.querySelector<HTMLElement>(
      "[data-slot=scroll-area-viewport]"
    )
    if (!target || !viewport) {
      pendingRevealRef.current = null
      return
    }

    lockTreeLayout()
    const toolbar =
      listRef.current?.querySelector<HTMLElement>("[data-tree-toolbar]") ?? null
    scrollToReadingLine(viewport, target, readingLineY(toolbar, viewport))
    focusedRef.current = nodeId
    pendingRevealRef.current = null
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfigNodeId(nodeId)
  }, [expandedHydrated, expandedIds, nodes, roleId, treeFocusRequest])

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
  const visibleRoots = roots
  const primaryParentId = null

  const overallProgress = useMemo(() => {
    const skillIds = new Set(skillNodes.map((node) => node.id))
    return roadmapProgress(items.filter((item) => skillIds.has(item.topicId)))
  }, [items, skillNodes])
  const statusCounts = useMemo(
    () => nodeStatusCounts(skillNodes, items),
    [skillNodes, items]
  )
  const canImport = nodes.length === 0

  async function handleExport() {
    setExportPending(true)
    const result = await exportRoadmapAction(roleId)
    setExportPending(false)
    if (!result.ok) {
      toast.error(result.message)
      return
    }

    downloadTextFile(result.filename, result.json)
    toast.success("Roadmap exported")
  }

  function openImport() {
    setImportSeedJson("")
    setImportSeedError(null)
    setImportOpen(true)
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
    useJsonFileDrop(handleDroppedJson, canImport)

  const subtreeProgressFor = useCallback(
    (nodeId: string) => subtreeProgress(skillNodes, items, nodeId),
    [skillNodes, items]
  )

  const isOverview = !configNodeId
  const configNode = useMemo(
    () => nodes.find((node) => node.id === configNodeId) ?? null,
    [nodes, configNodeId]
  )
  const panelNode = isOverview ? null : configNode
  const selectedItems = useMemo(
    () =>
      !isOverview && configNodeId
        ? items.filter((item) => item.topicId === configNodeId)
        : [],
    [configNodeId, isOverview, items]
  )
  const selectedLinks = useMemo(
    () =>
      isOverview
        ? links.filter((link) => link.topicId === null)
        : panelNode
          ? links.filter((link) => link.topicId === panelNode.id)
          : [],
    [isOverview, links, panelNode]
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

  function persistVisibleLocation(nodeId: string | null) {
    persistTreeLocation(nodeId)
  }

  function handleSelectNode(nodeId: string) {
    setConfigNodeId(nodeId)
    persistVisibleLocation(nodeId)
  }

  function showOverview() {
    setConfigNodeId(null)
    persistVisibleLocation(null)
  }

  function handleTreeScroll(event: UIEvent<HTMLDivElement>) {
    if (programmaticScrollRef.current) {
      return
    }

    const viewport = event.currentTarget
    window.clearTimeout(scrollPersistTimerRef.current)
    scrollPersistTimerRef.current = window.setTimeout(() => {
      if (programmaticScrollRef.current) {
        return
      }
      const toolbar =
        listRef.current?.querySelector<HTMLElement>("[data-tree-toolbar]") ?? null
      persistVisibleLocation(
        locationFromViewport(viewport, readingLineY(toolbar, viewport))
      )
    }, 180)
  }

  function expandAll() {
    lockTreeLayout()
    const next = new Set(
      skillNodes
        .filter((node) => {
          const hasChildren = (childrenByParent.get(node.id) ?? []).length > 0
          const hasTasks = items.some((item) => item.topicId === node.id)
          return hasChildren || hasTasks || Boolean(node.description?.trim())
        })
        .map((node) => node.id)
    )
    setExpandedIds(next)
    writeExpandedIds(roleId, next)
    setConfigNodeId(null)
  }

  function collapseAll() {
    lockTreeLayout()
    const next = new Set<string>()
    setExpandedIds(next)
    writeExpandedIds(roleId, next)
    setConfigNodeId(null)
  }

  function toggleExpand(nodeId: string) {
    lockTreeLayout()
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

  function handlePlaceAtRoot() {
    const currentDraggedId = draggedIdRef.current
    setHeaderDropActive(false)
    if (!currentDraggedId || !editMode) {
      setDragging(null)
      return
    }

    const updates = rootPlacementUpdates(nodes, currentDraggedId)
    setDragging(null)
    if (!updates) {
      return
    }

    const previous = nodes
    setNodes((current) => applyPlacements(current, updates))
    setConfigNodeId(currentDraggedId)

    void placeNodeAtRootAction({
      roleId,
      nodeId: currentDraggedId,
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
    toast.success(dialogMode.asGroup ? "Topic added" : "Subtopic added")

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
    nestedAccents?: "keep" | "apply"
  }) {
    if (isOverview) {
      const nextDescription = input.description.trim() || null
      const nextNotes = input.notes.trim() || null
      const previousDescription = overviewDescription
      const previousNotes = overviewNotes
      setOverviewDescription(nextDescription ?? "")
      setOverviewNotes(nextNotes ?? "")

      void Promise.all([
        updateRoleDescriptionAction(roleId, nextDescription),
        updateRoleNotesAction(roleId, nextNotes),
      ]).then((results) => {
        const failed = results.find((result) => !result.ok)
        if (failed && !failed.ok) {
          setOverviewDescription(previousDescription)
          setOverviewNotes(previousNotes)
          toast.error(failed.message)
        }
      })

      return { ok: true as const, node: createLocalNode({
        id: roleId,
        roleId,
        parentId: null,
        title: roleName,
        description: nextDescription,
        icon: "circle-dot",
        handleKind: "regular",
        positionX: 0,
        positionY: 0,
        sortOrder: 0,
      }) }
    }

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

    const next: RoadmapNode = {
      ...panelNode,
      title,
      description: input.description.trim() || null,
      icon: normalizeNodeIcon(input.icon),
      notes: input.notes.trim() || null,
      color: input.accentColor,
    }
    const previous = nodes
    const accentUpdates =
      input.nestedAccents && input.accentColor !== panelNode.color
        ? accentUpdatesForChange(
            nodes,
            panelNode.id,
            input.accentColor,
            input.nestedAccents
          )
        : [{ id: next.id, color: next.color }]
    const accentsById = new Map(
      accentUpdates.map((update) => [update.id, update.color])
    )
    setNodes((current) =>
      current.map((node) => {
        if (node.id === next.id) {
          return next
        }
        const accent = accentsById.get(node.id)
        return accent !== undefined ? { ...node, color: accent } : node
      })
    )

    void updateNodeAction({
      roleId,
      nodeId: next.id,
      title: next.title,
      description: next.description,
      icon: next.icon,
      notes: next.notes,
      color: next.color,
      nestedAccents: input.nestedAccents,
      handleKind: next.handleKind,
    }).then((result) => {
      if (!result.ok) {
        setNodes(previous)
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
      color: next.color,
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
    setItems((current) => current.filter((item) => !removing.has(item.topicId)))
    setLinks((current) =>
      current.filter((link) => !link.topicId || !removing.has(link.topicId))
    )
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
          return { ok: false as const, message: "Task title cannot be empty." }
        }

        const siblings = items.filter((item) => item.topicId === nodeId)
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        const sortOrder =
          siblings.length === 0 ? 0 : Math.max(...siblings.map((item) => item.sortOrder)) + 1
        const item: ChecklistItem = {
          id,
          topicId: nodeId,
          title,
          description: input.description.trim() || null,
          completed: false,
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
          toast.error("Task title cannot be empty.")
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
          nodeId: item.topicId,
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
    topicId: string | null = isOverview ? null : panelNode?.id ?? null
  ) {
    const resolved = resolveLinkFields(input.label, input.url)
    if (!resolved.ok) {
      return resolved.message
    }
    if (!isOverview && !topicId) {
      return "Select a topic first."
    }

    const { label, url } = resolved
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const link: NodeLink = {
      id,
      roleId,
      topicId,
      label,
      url,
      createdAt: now,
      updatedAt: now,
    }
    setLinks((current) => [...current, link])

    void createNodeLinkAction({ id, roleId, nodeId: topicId, label, url }).then((result) => {
      if (!result.ok) {
        setLinks((current) => current.filter((entry) => entry.id !== id))
        toast.error(result.message)
      }
    })

    return null
  }

  function handleUpdateLink(link: NodeLink, label: string, url: string) {
    const resolved = resolveLinkFields(label, url)
    if (!resolved.ok) {
      return resolved.message
    }

    const previous = link
    setLinks((current) =>
      current.map((entry) =>
        entry.id === link.id
          ? { ...entry, label: resolved.label, url: resolved.url }
          : entry
      )
    )

    void updateNodeLinkAction({
      roleId,
      nodeId: link.topicId,
      linkId: link.id,
      label: resolved.label,
      url: resolved.url,
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

    void deleteNodeLinkAction({ roleId, nodeId: panelNode?.id ?? null, linkId }).then((result) => {
      if (!result.ok) {
        setLinks(previous)
        toast.error(result.message)
      }
    })
  }

  const list = (
    <div
      ref={listRef}
      className={cn(
        "relative flex h-full min-h-0 flex-col",
        isJsonFileOver && "outline-2 -outline-offset-8 outline-dashed outline-ring"
      )}
      {...jsonDropProps}
    >
      <div
        data-tree-toolbar
        className={cn(
          "flex shrink-0 cursor-pointer items-center justify-between gap-2 border-b px-4 py-2.5",
          headerDropActive && "bg-accent ring-2 ring-ring ring-inset"
        )}
        onClick={showOverview}
        onDragOver={(event) => {
          if (!editMode || !draggedIdRef.current) {
            return
          }
          event.preventDefault()
          event.stopPropagation()
          setHeaderDropActive(true)
        }}
        onDragLeave={(event) => {
          const next = event.relatedTarget
          if (next instanceof Node && event.currentTarget.contains(next)) {
            return
          }
          setHeaderDropActive(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          event.stopPropagation()
          handlePlaceAtRoot()
        }}
      >
        <p className="min-w-0 truncate text-left text-sm font-medium">
          {roleName}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {canImport ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(event) => {
                event.stopPropagation()
                openImport()
              }}
            >
              <FileUp data-icon="inline-start" />
              Import JSON
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={exportPending}
              onClick={(event) => {
                event.stopPropagation()
                void handleExport()
              }}
            >
              <FileDown data-icon="inline-start" />
              {exportPending ? "Exporting…" : "Export JSON"}
            </Button>
          )}
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
                Add topic
              </TooltipTrigger>
              <TooltipContent>Add topic</TooltipContent>
            </Tooltip>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation()
              expandAll()
            }}
          >
            <ChevronsUpDown data-icon="inline-start" />
            Expand all
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation()
              collapseAll()
            }}
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
              onCheckedChange={(checked) => {
                const next = checked === true
                setEditMode(next)
                writeStoredEditMode(userId, next)
              }}
              aria-label="Edit mode"
            />
            <Label htmlFor="roadmap-edit-mode">Edit</Label>
          </div>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1" onViewportScroll={handleTreeScroll}>
        <div className="px-4 py-3">
          {!expandedHydrated ? null : visibleRoots.length === 0 ? (
            <Empty className="my-6">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ListTree />
                </EmptyMedia>
                <EmptyTitle>No topics yet</EmptyTitle>
                <EmptyDescription>
                  {canImport
                    ? editMode
                      ? "Add a topic, import a roadmap, or drop a .json file here."
                      : "Import a roadmap, or switch to Edit to add a topic."
                    : editMode
                      ? "Add your first topic to start mapping this roadmap."
                      : "Switch to Edit to add a topic."}
                </EmptyDescription>
              </EmptyHeader>
              {canImport || editMode ? (
              <EmptyContent>
                {canImport ? (
                  <Button type="button" size="sm" variant="outline" onClick={openImport}>
                    <FileUp data-icon="inline-start" />
                    Import JSON
                  </Button>
                ) : null}
                {editMode ? (
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
                      Add topic
                    </TooltipTrigger>
                    <TooltipContent>Add topic</TooltipContent>
                  </Tooltip>
                ) : null}
              </EmptyContent>
              ) : null}
            </Empty>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {visibleRoots.map((node) => (
                <TopicRow
                  key={node.id}
                  node={node}
                  depth={0}
                  childrenByParent={childrenByParent}
                  items={items}
                  nodes={skillNodes}
                  expandedIds={expandedIds}
                  onToggleExpand={toggleExpand}
                  selectedNodeId={isOverview ? null : configNodeId}
                  onSelect={handleSelectNode}
                  onAddItem={handleAddItem}
                  getChecklistHandlers={getChecklistHandlers}
                  editMode={editMode}
                  focusedTaskId={null}
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
            <TopicConfigSheet
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
              showIcon={Boolean(panelNode?.parentId)}
              showProgressBar
              editMode={editMode}
              fallbackTitle={roleName}
              overviewDescription={overviewDescription}
              overviewNotes={overviewNotes}
              canInheritAccent={Boolean(panelNode?.parentId)}
              subtitle={
                isOverview
                  ? editMode
                    ? "Edit this roadmap’s description, notes, and links."
                    : "Overview of this roadmap."
                  : editMode
                    ? "Configure details, tasks, and links for this topic."
                    : "Progress, notes, and links for this topic."
              }
              checklistHeading="Tasks"
              checklistCopy={TASK_CHECKLIST_COPY}
              deleteLabel="Delete topic"
              hasNestedTopics={
                Boolean(panelNode && hasNestedTopics(skillNodes, panelNode.id))
              }
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
      <TopicDialog
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
      <DeleteTopicAlert
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        count={deleteIds.length}
        nodeTitle={deleteNodes[0]?.title ?? ""}
        noun="topic"
        childNoun="subtopics"
        childNames={deleteChildNames}
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
