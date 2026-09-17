import { Skeleton } from "@/components/ui/skeleton"

const ROW_INDENTS = [0, 1, 1, 2, 1, 0, 1, 2]

export default function RoleRoadmapLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 w-full flex-1 flex-col border-r md:max-w-[420px]">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2.5">
            <Skeleton className="h-4 w-32" />
            <div className="flex shrink-0 items-center gap-1.5">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-7 w-16" />
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-2 overflow-hidden px-4 py-3">
            {ROW_INDENTS.map((indent, index) => (
              <Skeleton
                key={index}
                className="h-8 shrink-0"
                style={{
                  marginLeft: `${indent * 20}px`,
                  width: `calc(100% - ${indent * 20}px)`,
                }}
              />
            ))}
          </div>
        </div>
        <div className="hidden min-h-0 flex-1 flex-col gap-4 p-4 md:flex">
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-20 w-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="mt-2 flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      </div>
      <div className="flex h-7 shrink-0 items-center gap-2.5 border-t px-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-1 w-24 rounded-full" />
      </div>
    </div>
  )
}
