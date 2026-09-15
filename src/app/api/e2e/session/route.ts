import { cookies } from "next/headers"
import { encode } from "next-auth/jwt"

import { isE2eSessionEnabled } from "@/lib/e2e"

function notFound() {
  return new Response("Not found", { status: 404 })
}

export async function POST(request: Request) {
  if (!isE2eSessionEnabled()) {
    return notFound()
  }

  const expected = process.env.E2E_SECRET
  const provided = request.headers.get("x-e2e-secret")
  if (!expected || provided !== expected) {
    return new Response("Unauthorized", { status: 401 })
  }

  const secret = process.env.AUTH_SECRET
  if (!secret) {
    return new Response("Missing AUTH_SECRET", { status: 500 })
  }

  const secure = process.env.AUTH_URL?.startsWith("https://") ?? false
  const cookieName = secure ? "__Secure-authjs.session-token" : "authjs.session-token"
  const token = await encode({
    secret,
    salt: cookieName,
    token: {
      sub: "e2e-skilltrack",
      name: "E2E",
      githubUsername: "e2e-skilltrack",
      githubUserId: "e2e-github",
    },
  })

  const jar = await cookies()
  jar.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: 60 * 60,
  })

  return Response.json({ ok: true })
}
