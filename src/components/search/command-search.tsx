"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { toast } from "sonner"

import { getSearchIndexAction } from "@/application/search/actions"
import type { SearchIndex } from "@/application/search/search-service"
import { persistTreeLocation } from "@/components/roadmap/tree-location"
import { useRolesUi } from "@/components/roles/roles-workspace"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { matchesSearch } from "@/domain/search/query"

const emptyIndex: SearchIndex = { roles: [], nodes: [], tasks: [] }

export function CommandSearch() {
  const router = useRouter()
  const { activeRole, focusTree } = useRolesUi()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [index, setIndex] = useState<SearchIndex>(emptyIndex)

  // Scope search to the role currently open, so switching into a role's
  // roadmap never surfaces another role's nodes. With no active role (e.g.
  // the bare /dashboard screen) we fall back to a global roles+nodes search.

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") {
        return
      }
      event.preventDefault()
      setOpen((current) => !current)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    void getSearchIndexAction().then((result) => {
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      setIndex(result.index)
    })
  }, [open])

  const roles = useMemo(
    () =>
      activeRole
        ? []
        : index.roles.filter((role) => matchesSearch(role.name, query)),
    [activeRole, index.roles, query]
  )
  const nodes = useMemo(
    () =>
      index.nodes
        .filter((node) => {
          if (activeRole && node.roleId !== activeRole.id) {
            return false
          }
          // The roadmap view only renders skill nodes, so a label result
          // would be a dead end when clicked.
          if (node.kind === "label") {
            return false
          }
          return (
            matchesSearch(node.title, query) ||
            matchesSearch(node.parentPath, query) ||
            matchesSearch(node.roleName, query)
          )
        })
        .slice(0, 40),
    [activeRole, index.nodes, query]
  )

  const tasks = useMemo(
    () =>
      index.tasks
        .filter((task) => {
          if (activeRole && task.roleId !== activeRole.id) {
            return false
          }
          return (
            matchesSearch(task.title, query) ||
            matchesSearch(task.description ?? "", query) ||
            matchesSearch(task.parentPath, query) ||
            matchesSearch(task.roleName, query)
          )
        })
        .slice(0, 40),
    [activeRole, index.tasks, query]
  )

  const noHits =
    query.trim().length > 0 &&
    roles.length === 0 &&
    nodes.length === 0 &&
    tasks.length === 0
  const placeholder = activeRole
    ? `Search ${activeRole.name}…`
    : "Search roles, topics, and tasks…"
  const dialogDescription = activeRole
    ? `Search topics and tasks in ${activeRole.name}.`
    : "Search roles, topics, and tasks."

  function closeAnd(run: () => void) {
    setOpen(false)
    setQuery("")
    run()
  }

  function revealInTree(roleId: string, nodeId: string) {
    closeAnd(() => {
      if (activeRole?.id === roleId) {
        persistTreeLocation(nodeId)
        focusTree({ roleId, nodeId })
        return
      }

      router.push(`/dashboard/roles/${roleId}?node=${nodeId}`, { scroll: false })
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search data-icon="inline-start" />
        Search
        <CommandShortcut className="hidden sm:inline">⌘K</CommandShortcut>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) {
            setQuery("")
          }
        }}
        title="Search"
        description={dialogDescription}
      >
        <Command shouldFilter={false}>
          <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} />
          {noHits ? (
            <Empty className="border-0 py-8">
              <EmptyHeader>
                <EmptyTitle>No matches</EmptyTitle>
                <EmptyDescription>
                  Nothing matches “{query.trim()}”.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button type="button" variant="outline" size="sm" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <CommandList>
              {roles.length > 0 ? (
                <CommandGroup heading="Roles">
                  {roles.map((role) => (
                    <CommandItem
                      key={role.id}
                      value={`role ${role.name} ${role.id}`}
                      onSelect={() => {
                        closeAnd(() => {
                          router.push(`/dashboard/roles/${role.id}`)
                        })
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate">{role.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {nodes.length > 0 ? (
                <CommandGroup heading="Topics">
                  {nodes.map((node) => (
                    <CommandItem
                      key={node.id}
                      value={`node ${node.title} ${node.parentPath} ${node.roleName} ${node.id}`}
                      onSelect={() => {
                        revealInTree(node.roleId, node.id)
                      }}
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate">{node.title}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {[node.roleName, node.parentPath].filter(Boolean).join(" / ")}
                        </span>
                      </span>
                      {node.percent === null ? (
                        <span className="text-xs text-muted-foreground">Label</span>
                      ) : (
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {node.percent}%
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {tasks.length > 0 ? (
                <CommandGroup heading="Tasks">
                  {tasks.map((task) => (
                    <CommandItem
                      key={task.id}
                      value={`task ${task.title} ${task.description ?? ""} ${task.parentPath} ${task.roleName} ${task.id}`}
                      onSelect={() => {
                        revealInTree(task.roleId, task.nodeId)
                      }}
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate">{task.title}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {[task.roleName, task.parentPath].filter(Boolean).join(" / ")}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {task.isCompleted ? "Done" : "Open"}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          )}
        </Command>
      </CommandDialog>
    </>
  )
}
