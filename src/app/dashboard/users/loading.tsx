import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function UsersLoading() {
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-80" />
      </div>

      {[0, 1].map((section) => (
        <Card key={section}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 shrink-0" />
                <Skeleton className="h-8 w-20 shrink-0" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </main>
  )
}
