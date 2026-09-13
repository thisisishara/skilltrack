import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { signOutAction } from "@/lib/auth/actions"

export function SignOutButton({ collapsed }: { collapsed?: boolean }) {
  return (
    <form action={signOutAction}>
      <Button
        type="submit"
        variant="ghost"
        className={collapsed ? "w-full" : "w-full justify-start"}
        aria-label="Logout"
      >
        <LogOut data-icon="inline-start" />
        {collapsed ? null : "Logout"}
      </Button>
    </form>
  )
}
