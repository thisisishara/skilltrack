export function isE2eSessionEnabled() {
  return Boolean(process.env.E2E_SECRET) && process.env.VERCEL_ENV !== "production"
}
