"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { DefaultChatTransport } from "ai"
import { useChat } from "@ai-sdk/react"
import {
  ArrowUp,
  CircleDot,
  ListChecks,
  ListTree,
  MessageSquare,
  RotateCcw,
  X,
} from "lucide-react"

import { useTrackWorkspace } from "@/components/track/track-workspace"
import { useRolesUi } from "@/components/roles/roles-workspace"
import { TrackMarkdown } from "@/components/track/track-markdown"
import { useTrackRefDrop } from "@/components/track/use-track-ref-drop"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { dropRefLabel, type TrackDropRef } from "@/domain/track/drop-ref"
import { pendingProposals } from "@/domain/track/overlay"
import {
  proposalFocusNodeId,
  proposalFocusTaskId,
  proposalHeadline,
  proposalTopicId,
  toProposalIndex,
} from "@/domain/track/proposals"
import { cn } from "@/lib/utils"

function textFromParts(parts: Array<{ type: string; text?: string }> | undefined) {
  return (parts ?? [])
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text)
    .join("\n")
}

function collectToolOutputs(parts: Array<Record<string, unknown>> | undefined) {
  const outputs: unknown[] = []
  for (const part of parts ?? []) {
    const type = String(part.type ?? "")
    if (!type.startsWith("tool-")) {
      continue
    }
    if (part.state === "output-available" && part.output !== undefined) {
      outputs.push(part.output)
    }
  }
  return outputs
}

export function TrackPanel({
  roleId,
  focusedTopicId,
  topicTitles,
}: {
  roleId: string
  focusedTopicId: string | null
  topicTitles: Record<string, string>
}) {
  const {
    settings,
    sessionEpoch,
    proposals,
    ingestProposals,
    acceptProposal,
    rejectProposal,
    acceptAll,
    rejectAll,
    restartSession,
    seedPrompt,
    setSeedPrompt,
    scratchpad,
    setScratchpad,
    pinnedRefs,
    pinTrackRef,
    unpinTrackRef,
  } = useTrackWorkspace()
  const { focusTree } = useRolesUi()
  const [input, setInput] = useState("")
  const pending = pendingProposals(proposals)
  const { isOver, dropProps } = useTrackRefDrop(pinTrackRef)
  const bodyRef = useRef({
    roleId,
    focusedTopicId,
    pinned: pinnedRefs,
    pendingProposals: pending.map(toProposalIndex),
    scratchpad,
  })
  bodyRef.current = {
    roleId,
    focusedTopicId,
    pinned: pinnedRefs,
    pendingProposals: pending.map(toProposalIndex),
    scratchpad,
  }

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/track/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages,
            ...bodyRef.current,
          },
        }),
      }),
    [sessionEpoch, roleId]
  )

  const { messages, sendMessage, setMessages, status, error } = useChat({
    id: `${roleId}:${sessionEpoch}`,
    transport,
  })

  useEffect(() => {
    const outputs = messages.flatMap((message) =>
      collectToolOutputs(message.parts as Array<Record<string, unknown>> | undefined)
    )
    if (outputs.length > 0) {
      ingestProposals(outputs)
    }
  }, [ingestProposals, messages])

  useEffect(() => {
    if (!seedPrompt) {
      return
    }
    const text = seedPrompt
    setSeedPrompt(null)
    void sendMessage({ text })
  }, [seedPrompt, sendMessage, setSeedPrompt])

  useEffect(() => {
    const lastUser = [...messages].reverse().find((message) => message.role === "user")
    const goal = textFromParts(lastUser?.parts).slice(0, 400)
    const ids = pending
      .slice(0, 12)
      .map((item) => `${item.entity}:${item.title}`)
      .join(", ")
    const pins = pinnedRefs
      .slice(0, 8)
      .map((item) => `${item.kind}:${item.title}`)
      .join(", ")
    setScratchpad(
      [
        goal && `Goal: ${goal}`,
        ids && `Pending: ${ids}`,
        pins && `Pinned: ${pins}`,
        focusedTopicId && `Focus: ${focusedTopicId}`,
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 3000)
    )
  }, [focusedTopicId, messages, pending, pinnedRefs, setScratchpad])

  const busy = status === "submitted" || status === "streaming"
  const canSend = Boolean(input.trim()) && !busy && settings.trackEnabled

  function submit() {
    const text = input.trim()
    if (!text || busy || !settings.trackEnabled) {
      return
    }
    setInput("")
    void sendMessage({ text })
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col border-l bg-background",
        isOver && "ring-2 ring-inset ring-primary/60"
      )}
      {...dropProps}
    >
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 px-2">
        <p className="px-1 text-sm font-medium">Track</p>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Restart"
                onClick={() => {
                  setMessages([])
                  restartSession()
                }}
              />
            }
          >
            <RotateCcw />
          </TooltipTrigger>
          <TooltipContent>Restart</TooltipContent>
        </Tooltip>
      </div>
      {messages.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <Empty className="min-h-0 flex-1 border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessageSquare />
              </EmptyMedia>
              <EmptyTitle>Ask Track</EmptyTitle>
              <EmptyDescription>
                Ask about this role’s roadmap. Changes stay proposed until you
                accept them. Drop a topic or task here to pin it.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
          {error ? (
            <p className="px-3 pb-2 text-center text-sm text-destructive">
              {error.message}
            </p>
          ) : null}
        </div>
      ) : (
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 px-3 py-2">
          {messages.map((message) => {
            const text = textFromParts(message.parts)
            if (!text.trim() && message.role === "assistant" && busy) {
              return (
                <div key={message.id} className="px-1 text-sm text-muted-foreground">
                  <Spinner />
                </div>
              )
            }
            if (!text.trim()) {
              return null
            }
            if (message.role === "user") {
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[92%] rounded-2xl bg-muted px-3 py-2 text-sm leading-relaxed">
                    <p className="whitespace-pre-wrap">{text}</p>
                  </div>
                </div>
              )
            }
            return (
              <div key={message.id} className="px-1 text-sm leading-relaxed">
                <TrackMarkdown
                  isAnimating={
                    busy && message.id === messages[messages.length - 1]?.id
                  }
                >
                  {text}
                </TrackMarkdown>
              </div>
            )
          })}
          {error ? (
            <p className="px-1 text-sm text-destructive">{error.message}</p>
          ) : null}
        </div>
      </ScrollArea>
      )}
      {pending.length > 0 ? (
        <div className="flex flex-col gap-1.5 px-2 pb-1">
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="text-xs text-muted-foreground">
              {pending.length} proposed
            </p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => void acceptAll(roleId)}
              >
                Accept all
              </Button>
              <Button type="button" size="xs" variant="ghost" onClick={rejectAll}>
                Reject all
              </Button>
            </div>
          </div>
          <div className="flex max-h-36 flex-col gap-1 overflow-y-auto">
            {pending.map((proposal) => (
              <div
                key={proposal.id}
                className="flex items-center gap-1 rounded-lg bg-muted/60 px-2 py-1"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-xs hover:underline"
                  onClick={() => {
                    const nodeId = proposalFocusNodeId(proposal)
                    if (nodeId) {
                      focusTree({
                        roleId,
                        nodeId,
                        taskId: proposalFocusTaskId(proposal),
                      })
                    }
                  }}
                >
                  {proposalHeadline(
                    proposal,
                    topicTitles[proposalTopicId(proposal) ?? ""] ?? null
                  )}
                </button>
                <Button
                  type="button"
                  size="xs"
                  onClick={() => void acceptProposal(roleId, proposal.id)}
                >
                  Accept
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => rejectProposal(proposal.id)}
                >
                  Reject
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <form
        className="p-2"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <InputGroup className="h-auto rounded-xl bg-muted/40 dark:bg-input/20">
          {pinnedRefs.length > 0 ? (
            <InputGroupAddon align="block-start" className="flex-wrap gap-1">
              {pinnedRefs.map((ref) => (
                <PinnedRefChip
                  key={`${ref.kind}:${ref.id}`}
                  refItem={ref}
                  onFocus={() => {
                    const nodeId = ref.topicId
                    if (nodeId) {
                      focusTree({
                        roleId,
                        nodeId,
                        taskId: ref.kind === "task" ? ref.id : null,
                      })
                    }
                  }}
                  onRemove={() => unpinTrackRef(ref)}
                />
              ))}
            </InputGroupAddon>
          ) : null}
          <InputGroupTextarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask Track…"
            className="min-h-16 md:text-sm"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                submit()
              }
            }}
          />
          <InputGroupAddon align="block-end" className="justify-end">
            <InputGroupButton
              type="submit"
              variant="default"
              size="icon-xs"
              className="rounded-full"
              disabled={!canSend}
              aria-label="Send"
            >
              {busy ? <Spinner /> : <ArrowUp />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </div>
  )
}

function pinIcon(kind: TrackDropRef["kind"]) {
  if (kind === "group") {
    return <ListTree />
  }
  if (kind === "task") {
    return <ListChecks />
  }
  return <CircleDot />
}

function PinnedRefChip({
  refItem,
  onFocus,
  onRemove,
}: {
  refItem: TrackDropRef
  onFocus: () => void
  onRemove: () => void
}) {
  return (
    <Badge variant="outline" className="h-6 max-w-full gap-1 bg-background pr-0.5">
      {pinIcon(refItem.kind)}
      <button
        type="button"
        className="min-w-0 truncate"
        onClick={onFocus}
        title={refItem.path.join(" / ")}
      >
        {dropRefLabel(refItem)}
      </button>
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        className="size-5"
        aria-label={`Unpin ${refItem.title}`}
        onClick={onRemove}
      >
        <X />
      </Button>
    </Badge>
  )
}
