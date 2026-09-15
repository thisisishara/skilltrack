import Image from "next/image"

import { SignInButton } from "@/components/auth/sign-in-button"
import { ModeToggle } from "@/components/layout/mode-toggle"
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"

export default function LoginPage() {
  return (
    <main className="relative flex min-h-full flex-1 items-center justify-center p-6">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <Card className="w-full max-w-sm gap-6 py-6">
        <CardContent className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <Image
              src="/skilltrack-icon.png"
              alt=""
              width={1254}
              height={1254}
              priority
              sizes="64px"
              className="size-16 rounded-xl"
            />
            <div className="flex flex-col items-center gap-1">
              <CardTitle className="text-lg">SkillTrack</CardTitle>
              <CardDescription>
                Sign in with GitHub to manage role-specific skill roadmaps.
              </CardDescription>
            </div>
          </div>
          <div className="w-full">
            <SignInButton />
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
