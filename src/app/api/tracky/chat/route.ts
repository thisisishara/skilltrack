import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai"

import { loadTrackyRuntime } from "@/application/tracky/runtime"
import type { TrackyProposalIndex } from "@/domain/tracky/proposals"
import { isApplicationError } from "@/domain/errors"
import { isTrackyDropRef, type TrackyDropRef } from "@/domain/tracky/drop-ref"
import { requireApprovedSession } from "@/lib/auth/session"

export const maxDuration = 60

export async function POST(req: Request) {
  const { applicationUser } = await requireApprovedSession()
  const body = (await req.json()) as {
    messages?: UIMessage[]
    roleId?: string
    focusedTopicId?: string | null
    pinned?: unknown[]
    pendingProposals?: TrackyProposalIndex[]
    scratchpad?: string
  }

  if (!body.roleId || !Array.isArray(body.messages)) {
    return Response.json({ error: "Invalid Tracky request." }, { status: 400 })
  }

  try {
    const runtime = await loadTrackyRuntime({
      userId: applicationUser.id,
      roleId: body.roleId,
      focusedTopicId: body.focusedTopicId ?? null,
      pinned: (body.pinned ?? []).filter(isTrackyDropRef) as TrackyDropRef[],
      pendingProposals: body.pendingProposals ?? [],
      scratchpad: body.scratchpad ?? "",
    })

    const compacted = runtime.compactMessages(
      body.messages,
      runtime.maxChatTurns
    )

    const result = streamText({
      model: runtime.model,
      system: runtime.system,
      messages: await convertToModelMessages(compacted),
      tools: runtime.tools,
      stopWhen: stepCountIs(runtime.maxSteps),
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    const message = isApplicationError(error)
      ? error.message
      : "Tracky could not complete that request."
    const status = isApplicationError(error) && error.code === "authorization" ? 403 : 400
    return Response.json({ error: message }, { status })
  }
}
