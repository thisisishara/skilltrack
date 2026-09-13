import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <main className="flex flex-1 flex-col items-center gap-4 p-6">
      <Skeleton className="size-12 rounded-lg" />
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-80" />
    </main>
  )
}
