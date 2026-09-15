export { auth as proxy } from "@/auth"

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon/|skilltrack-icon.png|api/auth|api/e2e).*)",
  ],
}
