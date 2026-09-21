"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type UIEvent } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Eye,
  FileDown,
  FileUp,
  ListTree,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
} from "lucide-react"
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
  clearRoadmapAction,
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
import { TrackyPanel } from "@/components/tracky/tracky-panel"
import { useTrackyWorkspaceOptional } from "@/components/tracky/tracky-workspace"
import { useIsLgUp } from "@/hooks/use-mobile"
import {
  applyAcceptedProposal,
  overlayGhostLinks,
  overlayGhostTasks,
  overlayGhostTopics,
  overlayRoleNotes,
  type RoadmapSnapshot,
} from "@/domain/tracky/overlay"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
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

function mergeById<T extends { id: string; updatedAt?: string }>(
  server: T[],
  local: T[]
): T[] {
  const localById = new Map(local.map((item) => [item.id, item]))
  const merged = server.map((item) => {
    const ours = localById.get(item.id)
    if (!ours?.updatedAt) {
      return item
    }
    if (!item.updatedAt || ours.updatedAt > item.updatedAt) {
      return ours
    }
    return item
  })
  const serverIds = new Set(server.map((item) => item.id))
  return [...merged, ...local.filter((item) => !serverIds.has(item.id))]
}

function sameById<T extends { id: string; updatedAt?: string }>(
  left: T[],
  right: T[]
) {
  return (
    left.length === right.length &&
    left.every(
      (item, index) =>
        item.id === right[index]?.id && item.updatedAt === right[index]?.updatedAt
    )
  )
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
  line: number,
  smooth = false
) {
  const nextTop = viewport.scrollTop + (target.getBoundingClientRect().top - line)
  const max = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
  const top = Math.max(0, Math.min(nextTop, max))
  if (!smooth || Math.abs(viewport.scrollTop - top) < 2) {
    viewport.scrollTop = top
    return
  }
  viewport.scrollTo({ top, behavior: "smooth" })
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

export type RoadmapViewProps = {
  userId: string
  roleId: string
  roleName: string
  roleDescription: string | null
  roleNotes: string | null
  nodes: RoadmapNode[]
  checklistItems: ChecklistItem[]
  links: NodeLink[]
  focusNodeId?: string
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
}: RoadmapViewProps) {
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
  const revealRetryRef = useRef(0)
  const [revealTick, setRevealTick] = useState(0)
  const [flashNodeId, setFlashNodeId] = useState<string | null>(null)
  const [flashTaskId, setFlashTaskId] = useState<string | null>(null)
  const [flashFading, setFlashFading] = useState(false)
  const flashFadeTimerRef = useRef(0)
  const flashClearTimerRef = useRef(0)
  const pendingFlashTaskRef = useRef<string | null>(null)
  const pendingFlashFacetRef = useRef<"notes" | "description" | null>(null)
  const [detailsHighlight, setDetailsHighlight] = useState<
    "notes" | "description" | null
  >(null)
  const detailsHighlightTimerRef = useRef(0)
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
  const track = useTrackyWorkspaceOptional()
  const lgUp = useIsLgUp()
  const appliedAcceptedRef = useRef(new Set<string>())
  const snapshotRef = useRef({
    nodes,
    items,
    links,
    roleDescription: overviewDescription,
    roleNotes: overviewNotes,
  })
  snapshotRef.current = {
    nodes,
    items,
    links,
    roleDescription: overviewDescription,
    roleNotes: overviewNotes,
  }
  const displayNodes = useMemo(
    () => overlayGhostTopics(nodes, track?.proposals ?? [], roleId),
    [nodes, roleId, track?.proposals]
  )
  const displayItems = useMemo(
    () => overlayGhostTasks(items, track?.proposals ?? []),
    [items, track?.proposals]
  )
  const displayLinks = useMemo(
    () => overlayGhostLinks(links, track?.proposals ?? [], roleId),
    [links, roleId, track?.proposals]
  )
  const {
    groupKey,
    mainDefaultSize,
    detailsDefaultSize,
    onLayoutChanged,
  } = useDetailsPanelLayout(userId)

  function lockTreeLayout(holdMs = 400) {
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
    }, holdMs)
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
    setNodes((current) => {
      const next = mergeById(serverNodes, current)
      return sameById(next, current) ? current : next
    })
  }, [serverNodes])

  useEffect(() => {
    setItems((current) => {
      const next = mergeById(serverItems, current)
      return sameById(next, current) ? current : next
    })
  }, [serverItems])

  useEffect(() => {
    setLinks((current) => {
      const next = mergeById(serverLinks, current)
      return sameById(next, current) ? current : next
    })
  }, [serverLinks])

  useEffect(() => {
    const accepted = (track?.proposals ?? []).filter(
      (proposal) =>
        proposal.status === "accepted" &&
        !appliedAcceptedRef.current.has(proposal.id)
    )
    if (accepted.length === 0) {
      return
    }
    for (const proposal of accepted) {
      appliedAcceptedRef.current.add(proposal.id)
    }
    let next: RoadmapSnapshot = { roleId, ...snapshotRef.current }
    for (const proposal of accepted) {
      next = applyAcceptedProposal(next, proposal)
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNodes(next.nodes)
    setItems(next.items)
    setLinks(next.links)
    if (next.roleDescription !== undefined) {
      setOverviewDescription(next.roleDescription ?? "")
    }
    if (next.roleNotes !== undefined) {
      setOverviewNotes(next.roleNotes ?? "")
    }
  }, [roleId, track?.proposals])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOverviewDescription(roleDescription ?? "")
    setOverviewNotes(roleNotes ?? "")
  }, [roleDescription, roleNotes])

  useEffect(() => {
    // Expanded state is per-role and lives in localStorage; hydrate once
    // after mount so SSR output doesn't depend on it. Nodes are collapsed
    // by default so opening a large roadmap stays instant.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedIds(readExpandedIds(roleId))
    setExpandedHydrated(true)
    focusedRef.current = null
    appliedFocusNonceRef.current = 0
    appliedAcceptedRef.current = new Set()
    pendingRevealRef.current = focusNodeFromUrlRef.current ?? null
    window.clearTimeout(flashFadeTimerRef.current)
    window.clearTimeout(flashClearTimerRef.current)
    setFlashNodeId(null)
    setFlashTaskId(null)
    setFlashFading(false)
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
      window.clearTimeout(flashFadeTimerRef.current)
      window.clearTimeout(flashClearTimerRef.current)
      window.clearTimeout(detailsHighlightTimerRef.current)
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
      revealRetryRef.current = 0
      pendingFlashTaskRef.current = treeFocusRequest.taskId ?? null
      pendingFlashFacetRef.current = treeFocusRequest.facet ?? null
    }

    const nodeId = pendingRevealRef.current
    const highlightFacet = pendingFlashFacetRef.current
    if (treeFocusRequest?.roleId === roleId && nodeId === null && highlightFacet) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConfigNodeId(null)
      setDetailsHighlight(highlightFacet)
      window.clearTimeout(detailsHighlightTimerRef.current)
      detailsHighlightTimerRef.current = window.setTimeout(() => {
        setDetailsHighlight(null)
      }, 1600)
      if (track && !track.detailsPanelOpen) {
        track.setDetailsPanelOpen(true)
      }
      pendingFlashFacetRef.current = null
      return
    }
    if (!nodeId || !expandedHydrated) {
      return
    }

    const node = displayNodes.find((item) => item.id === nodeId)
    if (!node) {
      pendingRevealRef.current = null
      return
    }

    const idsToExpand = [...ancestorIds(displayNodes, nodeId), nodeId]
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
      if (revealRetryRef.current >= 30) {
        return
      }
      revealRetryRef.current += 1
      const frame = window.requestAnimationFrame(() => {
        setRevealTick((tick) => tick + 1)
      })
      return () => window.cancelAnimationFrame(frame)
    }

    const fromTrackFocus =
      treeFocusRequest?.roleId === roleId &&
      treeFocusRequest.nodeId === nodeId &&
      treeFocusRequest.nonce === appliedFocusNonceRef.current
    lockTreeLayout(fromTrackFocus ? 700 : 400)
    const toolbar =
      listRef.current?.querySelector<HTMLElement>("[data-tree-toolbar]") ?? null
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    scrollToReadingLine(
      viewport,
      target,
      readingLineY(toolbar, viewport),
      fromTrackFocus && !reduceMotion
    )
    focusedRef.current = nodeId
    pendingRevealRef.current = null
    revealRetryRef.current = 0
    window.clearTimeout(flashFadeTimerRef.current)
    window.clearTimeout(flashClearTimerRef.current)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlashNodeId(pendingFlashTaskRef.current ? null : nodeId)
    setFlashTaskId(pendingFlashTaskRef.current)
    setFlashFading(false)
    flashFadeTimerRef.current = window.setTimeout(() => {
      setFlashFading(true)
    }, 200)
    flashClearTimerRef.current = window.setTimeout(() => {
      setFlashNodeId(null)
      setFlashTaskId(null)
      setFlashFading(false)
    }, 1200)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfigNodeId(nodeId)
    const facet = pendingFlashFacetRef.current
    pendingFlashFacetRef.current = null
    if (facet) {
      setDetailsHighlight(facet)
      window.clearTimeout(detailsHighlightTimerRef.current)
      detailsHighlightTimerRef.current = window.setTimeout(() => {
        setDetailsHighlight(null)
      }, 1600)
      if (track && !track.detailsPanelOpen) {
        track.setDetailsPanelOpen(true)
      }
    } else if (!fromTrackFocus) {
      setDetailsHighlight(null)
    }
  }, [displayNodes, expandedHydrated, expandedIds, revealTick, roleId, track, treeFocusRequest])

  const skillNodes = useMemo(() => displayNodes.filter(isSkillNode), [displayNodes])
  const topicTitles = useMemo(
    () => Object.fromEntries(skillNodes.map((node) => [node.id, node.title])),
    [skillNodes]
  )

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
    try {
      const result = await toast
        .promise(exportRoadmapAction(roleId), {
          loading: "Exporting roadmap…",
          success: (value) => (value.ok ? "Roadmap exported" : "Export failed"),
          error: "Export failed",
        })
        .unwrap()

      if (!result.ok) {
        return
      }
      downloadTextFile(result.filename, result.json)
    } finally {
      setExportPending(false)
    }
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
        if (result.ok && "role" in result) {
          setOverviewDescription(result.role.description ?? "")
          setOverviewNotes(result.role.notes ?? "")
          toast.success("Roadmap imported")
          router.refresh()
          return
        }

        if (!result.ok) {
          setImportSeedJson(text)
          setImportSeedError(result.message)
          setImportOpen(true)
        }
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

  const displayOverviewNotes = overlayRoleNotes(
    overviewNotes,
    track?.proposals ?? []
  )
  const isOverview = !configNodeId
  const configNode = useMemo(
    () => displayNodes.find((node) => node.id === configNodeId) ?? null,
    [configNodeId, displayNodes]
  )
  const panelNode = isOverview ? null : configNode
  const selectedItems = useMemo(
    () =>
      !isOverview && configNodeId
        ? displayItems.filter((item) => item.topicId === configNodeId)
        : [],
    [configNodeId, displayItems, isOverview]
  )
  const selectedLinks = useMemo(
    () =>
      isOverview
        ? displayLinks.filter((link) => link.topicId === null)
        : panelNode
          ? displayLinks.filter((link) => link.topicId === panelNode.id)
          : [],
    [displayLinks, isOverview, panelNode]
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

  async function handleClearRoadmap() {
    const previousNodes = nodes
    const previousItems = items
    const previousLinks = links
    const previousNotes = overviewNotes
    setNodes([])
    setItems([])
    setLinks([])
    setOverviewNotes("")
    setConfigNodeId(null)

    const result = await clearRoadmapAction({ roleId })
    if (!result.ok) {
      setNodes(previousNodes)
      setItems(previousItems)
      setLinks(previousLinks)
      setOverviewNotes(previousNotes)
      toast.error(result.message)
      return
    }

    toast.success("Roadmap deleted")
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
        <div className="flex shrink-0 items-center gap-1">
          {editMode ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    aria-label="Add topic"
                    onClick={(event) => {
                      event.stopPropagation()
                      openCreate(primaryParentId, true)
                    }}
                  />
                }
              >
                <Plus />
              </TooltipTrigger>
              <TooltipContent>Add topic</TooltipContent>
            </Tooltip>
          ) : null}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Expand all"
                  onClick={(event) => {
                    event.stopPropagation()
                    expandAll()
                  }}
                />
              }
            >
              <ChevronsUpDown />
            </TooltipTrigger>
            <TooltipContent>Expand all</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Collapse all"
                  onClick={(event) => {
                    event.stopPropagation()
                    collapseAll()
                  }}
                />
              }
            >
              <ChevronsDownUp />
            </TooltipTrigger>
            <TooltipContent>Collapse all</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Roadmap options"
                        onClick={(event) => event.stopPropagation()}
                      />
                    }
                  />
                }
              >
                <MoreHorizontal />
              </TooltipTrigger>
              <TooltipContent>More</TooltipContent>
            </Tooltip>
            <DropdownMenuContent
              align="end"
              className="min-w-44 w-auto"
              onClick={(event) => event.stopPropagation()}
            >
              <DropdownMenuRadioGroup
                value={editMode ? "edit" : "view"}
                onValueChange={(value) => {
                  const next = value === "edit"
                  setEditMode(next)
                  writeStoredEditMode(userId, next)
                }}
              >
                <DropdownMenuRadioItem value="view">
                  <Eye />
                  View
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="edit">
                  <Pencil />
                  Edit
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {canImport ? (
                  <DropdownMenuItem onClick={openImport}>
                    <FileUp />
                    Import JSON
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    disabled={exportPending}
                    onClick={() => void handleExport()}
                  >
                    <FileDown />
                    {exportPending ? "Exporting…" : "Export JSON"}
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
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
              {canImport || editMode || track?.settings.trackyEnabled ? (
              <EmptyContent>
                {track?.settings.trackyEnabled ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => track.setTrackyPanelOpen(true)}
                  >
                    <MessageSquare data-icon="inline-start" />
                    Ask Tracky
                  </Button>
                ) : null}
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
                  items={displayItems}
                  nodes={skillNodes}
                  expandedIds={expandedIds}
                  onToggleExpand={toggleExpand}
                  selectedNodeId={isOverview ? null : configNodeId}
                  onSelect={handleSelectNode}
                  onAddItem={handleAddItem}
                  getChecklistHandlers={getChecklistHandlers}
                  editMode={editMode}
                  focusedTaskId={flashTaskId}
                  flashNodeId={flashNodeId}
                  flashFading={flashFading}
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

  const trackOpen = Boolean(track?.settings.trackyEnabled && track.trackyPanelOpen)
  const detailsOpen = track?.detailsPanelOpen ?? true
  const listDefaultSize = detailsOpen
    ? trackOpen
      ? "44%"
      : mainDefaultSize
    : trackOpen
      ? "72%"
      : "100%"

  const details = (
    <TopicConfigSheet
      open
      onOpenChange={(open) => {
        if (!open) {
          if (lgUp) {
            setConfigNodeId(null)
            return
          }
          track?.setDetailsPanelOpen(false)
        }
      }}
      node={panelNode}
      checklistItems={selectedItems}
      links={selectedLinks}
      nodeProgress={selectedNodeProgress}
      subtreeProgress={selectedSubtreeProgress}
      mode={isOverview ? "overview" : "topic"}
      showClose={!lgUp}
      showChecklist={!isOverview}
      showIcon={Boolean(panelNode?.parentId)}
      showProgressBar
      editMode={editMode}
      fallbackTitle={roleName}
      overviewDescription={overviewDescription}
      overviewNotes={displayOverviewNotes}
      highlightFacet={detailsHighlight}
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
      canClearRoadmap={
        Boolean(
          isOverview &&
            (nodes.length > 0 ||
              links.length > 0 ||
              Boolean(overviewNotes.trim()))
        )
      }
      onClearRoadmap={handleClearRoadmap}
    />
  )

  const trackPanel = (
    <TrackyPanel
      roleId={roleId}
      focusedTopicId={isOverview ? null : configNodeId}
      topicTitles={topicTitles}
      className={lgUp ? undefined : "border-l-0"}
      onRequestClose={lgUp ? undefined : () => track?.setTrackyPanelOpen(false)}
    />
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {lgUp ? (
      <ResizablePanelGroup
        key={`${groupKey}-${detailsOpen ? "details" : "nodetails"}-${trackOpen ? "track" : "notrack"}`}
        orientation="horizontal"
        className="min-h-0 flex-1"
        onLayoutChanged={onLayoutChanged}
      >
        <ResizablePanel
          id="roadmap-list"
          defaultSize={listDefaultSize}
          minSize={detailsOpen || trackOpen ? "30%" : "100%"}
        >
          {list}
        </ResizablePanel>
        {detailsOpen ? (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel
              id="roadmap-details"
              defaultSize={trackOpen ? "28%" : detailsDefaultSize}
              minSize={`${DETAILS_PANEL_MIN_SIZE}%`}
              maxSize={`${DETAILS_PANEL_MAX_SIZE}%`}
            >
          <div className="h-full min-h-0 overflow-hidden">
            {details}
          </div>
            </ResizablePanel>
          </>
        ) : null}
        {trackOpen ? (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel id="track-chat" defaultSize="28%" minSize="18%">
              {trackPanel}
            </ResizablePanel>
          </>
        ) : null}
      </ResizablePanelGroup>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden">{list}</div>
      )}
      <RoadmapStatusBar roleName={roleName} progress={overallProgress} counts={statusCounts} />
      {!lgUp ? (
        <>
          <Sheet
            open={detailsOpen}
            onOpenChange={(open) => track?.setDetailsPanelOpen(open)}
          >
            <SheetContent
              side="right"
              showCloseButton={false}
              className="h-full min-h-0 w-full max-w-none gap-0 p-0 pb-[env(safe-area-inset-bottom)] data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:max-w-md"
            >
              <SheetTitle className="sr-only">Details</SheetTitle>
              <SheetDescription className="sr-only">
                Topic details, tasks, notes, and links.
              </SheetDescription>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {detailsOpen ? details : null}
              </div>
            </SheetContent>
          </Sheet>
          {track?.settings.trackyEnabled ? (
            <Sheet
              open={trackOpen}
              onOpenChange={(open) => track.setTrackyPanelOpen(open)}
            >
              <SheetContent
                side="right"
                showCloseButton={false}
                className="h-full min-h-0 w-full max-w-none gap-0 p-0 pb-[env(safe-area-inset-bottom)] data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:max-w-lg"
              >
                <SheetTitle className="sr-only">Tracky</SheetTitle>
                <SheetDescription className="sr-only">
                  Chat with Tracky about this roadmap.
                </SheetDescription>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  {trackOpen ? trackPanel : null}
                </div>
              </SheetContent>
            </Sheet>
          ) : null}
        </>
      ) : null}
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
            setOverviewDescription(result.role.description ?? "")
            setOverviewNotes(result.role.notes ?? "")
            toast.success("Roadmap imported")
            router.refresh()
          }
          return result
        }}
      />
    </div>
  )
}
