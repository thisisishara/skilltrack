"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ListTree, SlidersHorizontal } from "lucide-react"
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
  reparentNodeAction,
  updateNodeAction,
} from "@/application/nodes/actions"
import { DeleteNodeAlert } from "@/components/canvas/delete-node-alert"
import type { NodeChecklistCopy } from "@/components/canvas/node-checklist-section"
import { NodeConfigSheet } from "@/components/canvas/node-config-sheet"
import {
  NodeDialog,
  type NodeDialogCopy,
  type NodeDialogMode,
} from "@/components/canvas/node-dialog"
import { RoadmapStatusBar } from "@/components/canvas/roadmap-status-bar"
import { TreeNodeRow } from "@/components/tree/tree-node-row"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
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
import { wouldCreateCycle } from "@/domain/nodes/hierarchy"
import { normalizeNodeIcon } from "@/domain/nodes/icon"
import { isSkillNode } from "@/domain/nodes/kind"
import { CHILD_OFFSET_Y, ROOT_OFFSET_X } from "@/domain/nodes/layout"
import { displayNodeTitle } from "@/domain/nodes/title"
import type { RoadmapNode } from "@/domain/nodes/types"
import {
  nodeProgress,
  nodeStatusCounts,
  roadmapProgress,
  subtreeNodeIds,
  subtreeProgress,
} from "@/domain/progress/progress"
import { readExpandedIds, writeExpandedIds } from "@/lib/tree/expanded-storage"

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
  createTitle: "Add topic",
  createDescription: "Add a top-level topic to this roadmap.",
  childTitle: "Add sub-topic",
  childDescription: "Create a sub-topic nested under the selected topic.",
  editTitle: "Edit topic",
  editDescription: "Update this topic without changing its progress.",
  titlePlaceholder: "System design",
  descriptionPlaceholder: "Optional notes about this topic",
  submitCreateLabel: "Add topic",
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
    handleKind: input.handleKind,
    incomingEdgeAnimated: false,
    positionX: input.positionX,
    positionY: input.positionY,
    sortOrder: input.sortOrder,
    createdAt: now,
    updatedAt: now,
  }
}

export function RoadmapTree({
  roleId,
  roleName,
  nodes: serverNodes,
  checklistItems: serverItems,
  links: serverLinks,
  focusNodeId,
}: {
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
  const focusedRef = useRef<string | null>(null)

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

  const configNode = useMemo(
    () => nodes.find((node) => node.id === configNodeId) ?? null,
    [nodes, configNodeId]
  )
  const sheetOpen = Boolean(configNode)
  const selectedItems = useMemo(
    () => items.filter((item) => item.nodeId === configNodeId),
    [items, configNodeId]
  )
  const selectedLinks = useMemo(
    () => links.filter((link) => link.nodeId === configNodeId),
    [links, configNodeId]
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
  const deleteNodes = useMemo(
    () => nodes.filter((node) => deleteIds.includes(node.id)),
    [deleteIds, nodes]
  )

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

  function openCreate(parentId: string | null) {
    setDialogMode({ kind: "create", parentId })
    setDialogOpen(true)
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
    toast.success("Topic added")

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
    handleKind: NodeHandleKind
  }) {
    if (!configNode) {
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
      toast.error("A topic cannot be its own ancestor.")
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
      toast.success(parentId ? "Parent updated" : "Topic moved to the top level")
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
      return "Select a topic first."
    }

    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const link: NodeLink = { id, nodeId: configNodeId, label, url, createdAt: now, updatedAt: now }
    setLinks((current) => [...current, link])

    void createNodeLinkAction({ id, roleId, nodeId: configNodeId, label, url }).then((result) => {
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

    void deleteNodeLinkAction({ roleId, nodeId: configNodeId ?? "", linkId }).then((result) => {
      if (!result.ok) {
        setLinks(previous)
        toast.error(result.message)
      }
    })
  }

  const list = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-1">
          <p className="truncate text-sm font-medium">{roleName}</p>
          {singleRoot ? (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="size-6 shrink-0 text-muted-foreground"
              aria-label="Roadmap details"
              onClick={() => setConfigNodeId(singleRoot.id)}
            >
              <SlidersHorizontal className="size-3.5" />
            </Button>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => openCreate(primaryParentId)}
        >
          Add topic
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
          {!expandedHydrated ? null : visibleRoots.length === 0 ? (
            <Empty className="my-6">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ListTree />
                </EmptyMedia>
                <EmptyTitle>No topics yet</EmptyTitle>
                <EmptyDescription>
                  {singleRoot
                    ? "Add a topic to start filling in this roadmap."
                    : "Add your first topic to start mapping this roadmap."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button type="button" size="sm" onClick={() => openCreate(primaryParentId)}>
                  Add topic
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <ul className="flex flex-col">
              {visibleRoots.map((node) => (
                <TreeNodeRow
                  key={node.id}
                  node={node}
                  depth={0}
                  childrenByParent={childrenByParent}
                  items={items}
                  expandedIds={expandedIds}
                  onToggleExpand={toggleExpand}
                  selectedNodeId={configNodeId}
                  onSelect={setConfigNodeId}
                  onAddChild={openCreate}
                  onDelete={openDelete}
                  getChecklistHandlers={getChecklistHandlers}
                  subtreeProgressFor={subtreeProgressFor}
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
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        <ResizablePanel id="roadmap-tree" defaultSize="70%" minSize="40%">
          {list}
        </ResizablePanel>
        {sheetOpen ? (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel id="tree-node-config" defaultSize="30%" minSize="22%" maxSize="48%">
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
                  showHandleKind={false}
                  subtitle="Configure details, tasks, and links for this topic."
                  checklistHeading="Tasks"
                  checklistCopy={TASK_CHECKLIST_COPY}
                  onSaveDetails={async (input) => handleSaveDetails(input)}
                  onParentChange={async (parentId) => handleParentChange(parentId)}
                  onToggleChecklist={configChecklistHandlers.onToggle}
                  onCreateChecklist={configChecklistHandlers.onCreate}
                  onUpdateChecklist={configChecklistHandlers.onUpdate}
                  onDeleteChecklist={configChecklistHandlers.onDelete}
                  onReorderChecklist={configChecklistHandlers.onReorder}
                  onCreateLink={handleCreateLink}
                  onUpdateLink={handleUpdateLink}
                  onDeleteLink={handleDeleteLink}
                />
              </div>
            </ResizablePanel>
          </>
        ) : null}
      </ResizablePanelGroup>
      <RoadmapStatusBar roleName={roleName} progress={overallProgress} counts={statusCounts} />
      <NodeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        onSubmit={async (input) => handleDialogSubmit(input)}
        copy={TOPIC_DIALOG_COPY}
      />
      <DeleteNodeAlert
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        count={deleteIds.length}
        nodeTitle={deleteNodes[0]?.title ?? ""}
        noun="topic"
        childNoun="sub-topics"
        onConfirm={async () => {
          handleDelete()
        }}
      />
    </div>
  )
}
