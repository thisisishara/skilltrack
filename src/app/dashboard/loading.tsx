import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="flex min-h-full flex-1">
      <div className="flex w-64 flex-col gap-4 border-r p-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <div className="mt-auto flex items-center gap-2">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-8 flex-1" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="mx-auto h-12 w-12 rounded-lg" />
        <Skeleton className="mx-auto h-6 w-48" />
        <Skeleton className="mx-auto h-4 w-80" />
      </div>
    </div>
  )
}
