"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
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

import { useTrackyWorkspace } from "@/components/tracky/tracky-workspace"
import { useRolesUi } from "@/components/roles/roles-workspace"
import { TrackyMarkdown } from "@/components/tracky/tracky-markdown"
import { TrackyActivityTrail } from "@/components/tracky/tracky-activity-trail"
import { useTrackyRefDrop } from "@/components/tracky/use-tracky-ref-drop"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Textarea } from "@/components/ui/textarea"
import { StickToBottom, useStickToBottomContext, type StickToBottomContext } from "use-stick-to-bottom"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  WithTooltip,
} from "@/components/ui/tooltip"
import { dropRefLabel, type TrackyDropRef } from "@/domain/tracky/drop-ref"
import { pendingProposals } from "@/domain/tracky/overlay"
import { toolActivitiesFromParts } from "@/domain/tracky/activity-trail"
import {
  proposalFocusNodeId,
  proposalFocusTaskId,
  proposalFocusFacet,
  proposalHeadline,
  proposalTopicId,
  toProposalIndex,
} from "@/domain/tracky/proposals"
import { cn } from "@/lib/utils"
import {
  buildStoredTrackySession,
  flushStoredTrackySession,
  mergeTrackyTranscript,
  readStoredTrackySession,
  scheduleStoredTrackySession,
  splitTrackyTranscript,
  takeOlderTrackyMessages,
} from "@/lib/tracky/session-storage"

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
      if (
        part.output &&
        typeof part.output === "object" &&
        "restored" in (part.output as object)
      ) {
        continue
      }
      outputs.push(part.output)
    }
  }
  return outputs
}

function TrackyNearTopLoader({
  onNearTop,
}: {
  onNearTop: (viewport: HTMLElement) => void
}) {
  const { scrollRef } = useStickToBottomContext()
  useEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const onScroll = () => {
      if (el.scrollTop < 64) {
        onNearTop(el)
      }
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [onNearTop, scrollRef])
  return null
}

export function TrackyPanel({
  roleId,
  focusedTopicId,
  topicTitles,
  className,
  onRequestClose,
}: {
  roleId: string
  focusedTopicId: string | null
  topicTitles: Record<string, string>
  className?: string
  onRequestClose?: () => void
}) {
  const {
    userId,
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
    focusedRoleId,
    pinnedRefs,
    pinTrackyRef,
    unpinTrackyRef,
    clearPinnedRefs,
    composerFocusNonce,
  } = useTrackyWorkspace()
  const { focusTree } = useRolesUi()
  const [input, setInput] = useState("")
  const [messageContext, setMessageContext] = useState<Record<string, TrackyDropRef[]>>(
    {}
  )
  const pending = pendingProposals(proposals)
  const { isOver, dropProps } = useTrackyRefDrop(pinTrackyRef)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const pinnedForSendRef = useRef<TrackyDropRef[]>([])
  const pendingMessageContextRef = useRef<{
    text: string
    pins: TrackyDropRef[]
  } | null>(null)
  const bodyRef = useRef({
    roleId,
    focusedTopicId,
    pinned: pinnedRefs,
    pendingProposals: pending.map(toProposalIndex),
    scratchpad,
  })
  // eslint-disable-next-line react-hooks/refs
  bodyRef.current = {
    roleId,
    focusedTopicId,
    pinned: pinnedRefs,
    pendingProposals: pending.map(toProposalIndex),
    scratchpad,
  }
  const olderMessagesRef = useRef<Array<{ id: string; role: string; parts: unknown[] }>>(
    []
  )

  /* eslint-disable react-hooks/refs */
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/tracky/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages: mergeTrackyTranscript(olderMessagesRef.current, messages),
            ...bodyRef.current,
            pinned: pinnedForSendRef.current,
          },
        }),
      }),
    [sessionEpoch, roleId]
  )
  /* eslint-enable react-hooks/refs */

  const { messages, sendMessage, setMessages, status, error } = useChat({
    id: `${roleId}:${sessionEpoch}`,
    transport,
  })
  const turnStartedAtRef = useRef<number | null>(null)
  const elapsedByMessageRef = useRef<Record<string, number>>({})
  const skipPersistRef = useRef(true)
  const loadingOlderRef = useRef(false)
  const stickContextRef = useRef<StickToBottomContext>(null)
  const [olderCount, setOlderCount] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useLayoutEffect(() => {
    skipPersistRef.current = true
    const snapshot = readStoredTrackySession(userId, roleId)
    const { older, visible } = splitTrackyTranscript(snapshot?.messages ?? [])
    olderMessagesRef.current = older
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOlderCount(older.length)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages((visible as typeof messages | undefined) ?? [])
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessageContext(snapshot?.messageContext ?? {})
    turnStartedAtRef.current = null
    elapsedByMessageRef.current = snapshot?.elapsedByMessage ?? {}
  }, [roleId, sessionEpoch, setMessages, userId])

  useEffect(() => {
    if (status !== "submitted" && status !== "streaming") {
      return
    }
    if (turnStartedAtRef.current === null) {
      turnStartedAtRef.current = Date.now()
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [status])

  useEffect(() => {
    if (status === "submitted" || status === "streaming") {
      return
    }
    const started = turnStartedAtRef.current
    if (started === null) {
      return
    }
    const lastAssistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant")
    if (lastAssistant) {
      elapsedByMessageRef.current[lastAssistant.id] = Date.now() - started
    }
    turnStartedAtRef.current = null
  }, [messages, status])

  useEffect(() => {
    if (composerFocusNonce === 0) {
      return
    }
    const focusComposer = () => inputRef.current?.focus()
    const frame = window.requestAnimationFrame(focusComposer)
    const timer = window.setTimeout(focusComposer, 50)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [composerFocusNonce])

  useEffect(() => {
    const pendingContext = pendingMessageContextRef.current
    if (!pendingContext) {
      return
    }
    const lastUser = [...messages].reverse().find((message) => message.role === "user")
    if (
      !lastUser ||
      messageContext[lastUser.id] ||
      textFromParts(lastUser.parts) !== pendingContext.text
    ) {
      return
    }
    pendingMessageContextRef.current = null
    if (pendingContext.pins.length === 0) {
      return
    }
    setMessageContext((current) => ({
      ...current,
      [lastUser.id]: pendingContext.pins,
    }))
  }, [messageContext, messages])

  function takeComposerContext(text: string) {
    const pins = pinnedRefs
    pinnedForSendRef.current = pins
    pendingMessageContextRef.current = { text, pins }
    bodyRef.current = { ...bodyRef.current, pinned: pins }
    if (pins.length > 0) {
      clearPinnedRefs()
    }
  }

  useEffect(() => {
    if (focusedRoleId !== roleId) {
      return
    }
    const outputs = messages.flatMap((message) =>
      collectToolOutputs(message.parts as Array<Record<string, unknown>> | undefined)
    )
    if (outputs.length > 0) {
      ingestProposals(outputs)
    }
  }, [focusedRoleId, ingestProposals, messages, roleId])

  useEffect(() => {
    if (!seedPrompt) {
      return
    }
    const text = seedPrompt
    setSeedPrompt(null)
    takeComposerContext(text)
    void sendMessage({ text })
    void stickContextRef.current?.scrollToBottom()
  }, [seedPrompt, sendMessage, setSeedPrompt])

  useEffect(() => {
    if (focusedRoleId !== roleId) {
      return
    }
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
    const next = [
      goal && `Goal: ${goal}`,
      ids && `Pending: ${ids}`,
      pins && `Pinned: ${pins}`,
      focusedTopicId && `Focus: ${focusedTopicId}`,
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 3000)
    if (scratchpad !== next) {
      setScratchpad(next)
    }
  }, [focusedRoleId, focusedTopicId, messages, pending, pinnedRefs, roleId, scratchpad, setScratchpad])

  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false
      return
    }
    if (focusedRoleId !== roleId) {
      return
    }
    const session = buildStoredTrackySession({
      messages: mergeTrackyTranscript(olderMessagesRef.current, messages),
      messageContext,
      proposals,
      scratchpad,
      pinnedRefs,
      elapsedByMessage: elapsedByMessageRef.current,
    })
    scheduleStoredTrackySession(userId, roleId, session)
    return () => {
      flushStoredTrackySession(userId, roleId, session)
    }
  }, [
    focusedRoleId,
    messageContext,
    messages,
    pinnedRefs,
    proposals,
    roleId,
    scratchpad,
    userId,
  ])

  const busy = status === "submitted" || status === "streaming"
  const canSend = Boolean(input.trim()) && !busy && settings.trackyEnabled

  function submit() {
    const text = input.trim()
    if (!text || busy || !settings.trackyEnabled) {
      return
    }
    setInput("")
    takeComposerContext(text)
    void sendMessage({ text })
    void stickContextRef.current?.scrollToBottom()
  }

  const revealOlder = useCallback(
    (viewport?: HTMLElement | null, depth = 0) => {
      if (loadingOlderRef.current || olderMessagesRef.current.length === 0) {
        return
      }
      loadingOlderRef.current = true
      const scroller = viewport ?? stickContextRef.current?.scrollRef.current
      const previousHeight = scroller?.scrollHeight ?? 0
      const { older, batch } = takeOlderTrackyMessages(olderMessagesRef.current)
      olderMessagesRef.current = older
      setOlderCount(older.length)
      setMessages((current) => [...(batch as typeof current), ...current])
      window.requestAnimationFrame(() => {
        if (scroller) {
          scroller.scrollTop += scroller.scrollHeight - previousHeight
        }
        loadingOlderRef.current = false
        if (
          depth < 3 &&
          scroller &&
          scroller.scrollTop < 64 &&
          olderMessagesRef.current.length > 0
        ) {
          // eslint-disable-next-line react-hooks/immutability
          revealOlder(scroller, depth + 1)
        }
      })
    },
    [setMessages]
  )

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col border-l bg-background",
        className
      )}
      {...dropProps}
    >
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 px-2">
        <p className="px-1 text-sm font-medium">Tracky</p>
        <div className="flex items-center">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Restart"
                onClick={() => {
                  olderMessagesRef.current = []
                  setOlderCount(0)
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
        {onRequestClose ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Close Tracky"
                  onClick={onRequestClose}
                />
              }
            >
              <X />
            </TooltipTrigger>
            <TooltipContent>Close</TooltipContent>
          </Tooltip>
        ) : null}
        </div>
      </div>
      {messages.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <Empty className="min-h-0 flex-1 border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessageSquare />
              </EmptyMedia>
              <EmptyTitle>Ask Tracky</EmptyTitle>
              <EmptyDescription>
                Ask about this role’s roadmap. Changes stay proposed until you
                accept them. Drop a topic or task here to attach it to your next
                message.
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
      <StickToBottom
        className="relative min-h-0 flex-1 overflow-hidden"
        resize="smooth"
        initial="instant"
        contextRef={stickContextRef}
      >
        <TrackyNearTopLoader onNearTop={revealOlder} />
        <StickToBottom.Content
          className="flex flex-col gap-4 px-3 py-2"
          scrollClassName="h-full"
        >
          {olderCount > 0 ? (
            <button
              type="button"
              className="self-center text-xs text-muted-foreground hover:text-foreground"
              onClick={() => revealOlder()}
            >
              Earlier messages
            </button>
          ) : null}
          {/* eslint-disable-next-line react-hooks/refs */}
          {messages.map((message, index) => {
            const text = textFromParts(message.parts)
            const activities = toolActivitiesFromParts(
              message.parts as Array<Record<string, unknown>> | undefined
            )
            const isLive =
              busy &&
              message.role === "assistant" &&
              index === messages.length - 1
            const elapsedMs = isLive
              ? turnStartedAtRef.current
                ? now - turnStartedAtRef.current
                : 0
              : (elapsedByMessageRef.current[message.id] ?? null)
            if (message.role === "assistant" && !text.trim() && activities.length === 0 && !isLive) {
              return null
            }
            if (message.role === "user") {
              if (!text.trim()) {
                return null
              }
              const attached = messageContext[message.id] ?? []
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[92%] rounded-2xl bg-muted px-3 py-2 text-sm leading-relaxed">
                    {attached.length > 0 ? (
                      <div className="mb-1.5 flex flex-wrap justify-end gap-1">
                        {attached.map((ref) => (
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
                          />
                        ))}
                      </div>
                    ) : null}
                    <p className="whitespace-pre-wrap">{text}</p>
                  </div>
                </div>
              )
            }
            return (
              <div key={message.id} className="px-1 text-sm leading-relaxed">
                <TrackyActivityTrail
                  activities={activities}
                  busy={isLive}
                  elapsedMs={elapsedMs}
                  hasText={Boolean(text.trim())}
                />
                {text.trim() ? (
                  <TrackyMarkdown
                    isAnimating={
                      busy && message.id === messages[messages.length - 1]?.id
                    }
                  >
                    {text}
                  </TrackyMarkdown>
                ) : isLive && activities.length === 0 ? (
                  <Spinner />
                ) : null}
              </div>
            )
          })}
          {error ? (
            <p className="px-1 text-sm text-destructive">{error.message}</p>
          ) : null}
        </StickToBottom.Content>
      </StickToBottom>
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
                    const facet = proposalFocusFacet(proposal)
                    if (proposal.entity === "roadmap" || nodeId) {
                      focusTree({
                        roleId,
                        nodeId,
                        taskId: proposalFocusTaskId(proposal),
                        facet,
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
        <div
          className={cn(
            "relative rounded-xl border border-border/70 transition-colors",
            isOver
              ? "bg-primary/10"
              : "bg-muted/40 focus-within:border-ring"
          )}
          onMouseDown={(event) => {
            if ((event.target as HTMLElement).closest("button, textarea")) {
              return
            }
            event.preventDefault()
            inputRef.current?.focus()
          }}
        >
          {pinnedRefs.length > 0 ? (
            <div className="flex flex-wrap gap-1 px-2.5 pt-2">
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
                  onRemove={() => unpinTrackyRef(ref)}
                />
              ))}
            </div>
          ) : null}
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask Tracky…"
            style={{ backgroundColor: "transparent" }}
            className="min-h-16 rounded-none border-0 bg-transparent px-2.5 py-2 pb-9 shadow-none outline-none ring-0 focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent md:text-sm"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                submit()
              }
            }}
          />
          <WithTooltip label="Send">
            <Button
              type="submit"
              variant="default"
              size="icon-xs"
              className="absolute right-1.5 bottom-1.5 rounded-full"
              disabled={!canSend}
              aria-label="Send"
            >
              {busy ? <Spinner /> : <ArrowUp />}
            </Button>
          </WithTooltip>
        </div>
      </form>
    </div>
  )
}

function pinIcon(kind: TrackyDropRef["kind"]) {
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
  refItem: TrackyDropRef
  onFocus: () => void
  onRemove?: () => void
}) {
  const label = dropRefLabel(refItem)
  const labelRef = useRef<HTMLSpanElement>(null)
  const [truncated, setTruncated] = useState(false)

  useLayoutEffect(() => {
    const el = labelRef.current
    if (!el) {
      return
    }
    const update = () => {
      setTruncated(el.scrollWidth > el.clientWidth + 1)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [label])

  const nameButton = (
    <button type="button" className="min-w-0" onClick={onFocus}>
      <span ref={labelRef} className="block truncate">
        {label}
      </span>
    </button>
  )

  return (
    <Badge
      variant="secondary"
      className="h-6 max-w-full gap-1 rounded-md border-0 pr-0.5 font-normal"
    >
      {pinIcon(refItem.kind)}
      {truncated ? <WithTooltip label={label}>{nameButton}</WithTooltip> : nameButton}
      {onRemove ? (
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className="size-5"
          aria-label={`Remove ${refItem.title}`}
          onClick={onRemove}
        >
          <X />
        </Button>
      ) : null}
    </Badge>
  )
}
