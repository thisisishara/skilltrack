import Link from "next/link"
import { ShieldX } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const description =
    error === "Configuration"
      ? "Authentication is not configured. Check AUTH_SECRET and GitHub OAuth environment variables."
      : "Sign-in could not be completed. Try again with GitHub."

  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-1 flex-col justify-center gap-4 p-6">
      <Alert variant="destructive">
        <ShieldX />
        <AlertTitle>Access denied</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href="/login" />}
      >
        Back to login
      </Button>
    </main>
  )
}
