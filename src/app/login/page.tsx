import { SignInButton } from "@/components/auth/sign-in-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>SkillTrack</CardTitle>
          <CardDescription>
            Sign in with GitHub to manage role-specific skill roadmaps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignInButton />
        </CardContent>
      </Card>
    </main>
  )
}
