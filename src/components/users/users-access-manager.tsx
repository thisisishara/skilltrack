"use client"

import { useState, useTransition } from "react"
import { ShieldAlert } from "lucide-react"

import {
  approveUserAction,
  denyUserAction,
} from "@/application/users/actions"
import type { ApplicationUser } from "@/domain/users/types"
import { isFixedAdminUsername } from "@/lib/auth/access"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function statusLabel(status: ApplicationUser["approvalStatus"]) {
  if (status === "approved") return "Approved"
  if (status === "denied") return "Denied"
  return "Pending"
}

function statusVariant(status: ApplicationUser["approvalStatus"]) {
  if (status === "approved") return "secondary" as const
  if (status === "denied") return "destructive" as const
  return "outline" as const
}

function formatWhen(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleString()
}

export function UsersAccessManager({ users }: { users: ApplicationUser[] }) {
  const pending = users.filter((user) => user.approvalStatus === "pending")
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function run(
    userId: string,
    action: typeof approveUserAction | typeof denyUserAction
  ) {
    setError(null)
    setPendingId(userId)
    startTransition(async () => {
      const result = await action(userId)
      if (!result.ok) {
        setError(result.message)
      }
      setPendingId(null)
    })
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
      <div>
        <h1 className="text-lg font-medium">Users</h1>
        <p className="text-sm text-muted-foreground">
          Approve or deny GitHub sign-in requests. Admin access is fixed in the
          database.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Pending approvals</CardTitle>
          <CardDescription>
            These accounts signed in with GitHub and are waiting for access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <Empty className="border py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShieldAlert />
                </EmptyMedia>
                <EmptyTitle>No pending requests</EmptyTitle>
                <EmptyDescription>
                  New GitHub users will appear here after they try to sign in.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <UserTable
              users={pending}
              busyId={isPending ? pendingId : null}
              onApprove={(id) => run(id, approveUserAction)}
              onDeny={(id) => run(id, denyUserAction)}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Everyone</CardTitle>
          <CardDescription>
            Approved users can use SkillTrack. Denied users see that approval is
            still required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserTable
            users={users}
            busyId={isPending ? pendingId : null}
            onApprove={(id) => run(id, approveUserAction)}
            onDeny={(id) => run(id, denyUserAction)}
          />
        </CardContent>
      </Card>
    </main>
  )
}

function UserTable({
  users,
  busyId,
  onApprove,
  onDeny,
}: {
  users: ApplicationUser[]
  busyId: string | null
  onApprove: (userId: string) => void
  onDeny: (userId: string) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>GitHub</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const locked = isFixedAdminUsername(user.githubUsername)
          const busy = busyId === user.id
          return (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {user.displayName ?? user.githubUsername}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {user.githubUsername}
                  </span>
                </div>
              </TableCell>
              <TableCell className="capitalize">{user.role}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(user.approvalStatus)}>
                  {statusLabel(user.approvalStatus)}
                </Badge>
              </TableCell>
              <TableCell>{formatWhen(user.createdAt)}</TableCell>
              <TableCell className="text-right">
                {locked ? (
                  <span className="text-xs text-muted-foreground">Fixed</span>
                ) : (
                  <div className="flex justify-end gap-2">
                    {user.approvalStatus !== "approved" ? (
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => onApprove(user.id)}
                      >
                        Approve
                      </Button>
                    ) : null}
                    {user.approvalStatus !== "denied" ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() => onDeny(user.id)}
                      >
                        Deny
                      </Button>
                    ) : null}
                  </div>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
