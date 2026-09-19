"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { DefaultChatTransport } from "ai"
import { useChat } from "@ai-sdk/react"
import { RotateCcw, Sparkles } from "lucide-react"

import { useTrackWorkspace } from "@/components/track/track-workspace"
import { useRolesUi } from "@/components/roles/roles-workspace"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { toProposalIndex } from "@/domain/track/proposals"
import { pendingProposals } from "@/domain/track/overlay"
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
}: {
  roleId: string
  focusedTopicId: string | null
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
  } = useTrackWorkspace()
  const { focusTree } = useRolesUi()
  const [input, setInput] = useState("")
  const pending = pendingProposals(proposals)
  const bodyRef = useRef({
    roleId,
    focusedTopicId,
    pendingProposals: pending.map(toProposalIndex),
    scratchpad,
  })
  bodyRef.current = {
    roleId,
    focusedTopicId,
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
    setScratchpad(
      [goal && `Goal: ${goal}`, ids && `Pending: ${ids}`, focusedTopicId && `Focus: ${focusedTopicId}`]
        .filter(Boolean)
        .join("\n")
        .slice(0, 3000)
    )
  }, [focusedTopicId, messages, pending, setScratchpad])

  const busy = status === "submitted" || status === "streaming"

  return (
    <div className="flex h-full min-h-0 flex-col border-l bg-background">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4" />
          Track
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setMessages([])
            restartSession()
          }}
        >
          <RotateCcw data-icon="inline-start" />
          Restart
        </Button>
      </div>
      {pending.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
          <span className="text-xs text-muted-foreground">
            {pending.length} proposed
          </span>
          <Button type="button" size="sm" onClick={() => void acceptAll(roleId)}>
            Accept all
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={rejectAll}>
            Reject all
          </Button>
        </div>
      ) : null}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 p-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ask Track about this role’s roadmap. Changes stay proposed until you accept them.
            </p>
          ) : null}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                message.role === "user"
                  ? "bg-muted"
                  : "border bg-card"
              )}
            >
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {message.role === "user" ? "You" : "Track"}
              </p>
              <div className="whitespace-pre-wrap">
                {textFromParts(message.parts)}
              </div>
            </div>
          ))}
          {pending.map((proposal) => (
            <div
              key={proposal.id}
              className="flex flex-col gap-2 rounded-lg border border-dashed px-3 py-2 text-sm"
            >
              <button
                type="button"
                className="text-left font-medium underline-offset-2 hover:underline"
                onClick={() => {
                  const nodeId = proposal.targetId ?? proposal.parentId
                  if (nodeId) {
                    focusTree({ roleId, nodeId })
                  }
                }}
              >
                {proposal.kind} {proposal.entity}: {proposal.title}
              </button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void acceptProposal(roleId, proposal.id)}
                >
                  Accept
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => rejectProposal(proposal.id)}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
          {error ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : null}
        </div>
      </ScrollArea>
      <form
        className="border-t p-3"
        onSubmit={(event) => {
          event.preventDefault()
          const text = input.trim()
          if (!text || busy || !settings.trackEnabled) {
            return
          }
          setInput("")
          void sendMessage({ text })
        }}
      >
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask Track…"
          className="min-h-20"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
        />
        <div className="mt-2 flex justify-end">
          <Button type="submit" size="sm" disabled={busy || !input.trim()}>
            Send
          </Button>
        </div>
      </form>
    </div>
  )
}
