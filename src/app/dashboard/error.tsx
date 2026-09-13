"use client"

import { CircleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function DashboardError() {
  return (
    <main className="flex flex-1 flex-col p-6">
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>
          The dashboard could not be loaded. Try again, or sign out and sign
          back in.
        </AlertDescription>
      </Alert>
    </main>
  )
}
