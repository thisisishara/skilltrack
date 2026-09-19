import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai"

import { loadTrackRuntime } from "@/application/track/runtime"
import type { TrackProposalIndex } from "@/domain/track/proposals"
import { isApplicationError } from "@/domain/errors"
import { requireApprovedSession } from "@/lib/auth/session"

export const maxDuration = 60

export async function POST(req: Request) {
  const { applicationUser } = await requireApprovedSession()
  const body = (await req.json()) as {
    messages?: UIMessage[]
    roleId?: string
    focusedTopicId?: string | null
    pendingProposals?: TrackProposalIndex[]
    scratchpad?: string
  }

  if (!body.roleId || !Array.isArray(body.messages)) {
    return Response.json({ error: "Invalid Track request." }, { status: 400 })
  }

  try {
    const runtime = await loadTrackRuntime({
      userId: applicationUser.id,
      roleId: body.roleId,
      focusedTopicId: body.focusedTopicId ?? null,
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
      stopWhen: stepCountIs(8),
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    const message = isApplicationError(error)
      ? error.message
      : "Track could not complete that request."
    const status = isApplicationError(error) && error.code === "authorization" ? 403 : 400
    return Response.json({ error: message }, { status })
  }
}
