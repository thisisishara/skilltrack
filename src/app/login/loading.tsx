import { Skeleton } from "@/components/ui/skeleton"

export default function LoginLoading() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-xl border px-4 py-6">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="size-16 rounded-xl" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-full" />
      </div>
    </main>
  )
}
