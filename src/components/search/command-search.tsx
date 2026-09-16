"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { toast } from "sonner"

import { getSearchIndexAction } from "@/application/search/actions"
import type { SearchIndex } from "@/application/search/search-service"
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

const emptyIndex: SearchIndex = { roles: [], nodes: [] }

export function CommandSearch() {
  const router = useRouter()
  const { activeRole } = useRolesUi()
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

  const noHits = query.trim().length > 0 && roles.length === 0 && nodes.length === 0
  const placeholder = activeRole
    ? `Search ${activeRole.name}…`
    : "Search roles and nodes…"
  const dialogDescription = activeRole
    ? `Search topics in ${activeRole.name}.`
    : "Search roles and roadmap nodes."

  function closeAnd(run: () => void) {
    setOpen(false)
    setQuery("")
    run()
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
                <CommandGroup heading="Nodes">
                  {nodes.map((node) => (
                    <CommandItem
                      key={node.id}
                      value={`node ${node.title} ${node.parentPath} ${node.roleName} ${node.id}`}
                      onSelect={() => {
                        closeAnd(() => {
                          router.push(`/dashboard/roles/${node.roleId}?node=${node.id}`)
                        })
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
            </CommandList>
          )}
        </Command>
      </CommandDialog>
    </>
  )
}
