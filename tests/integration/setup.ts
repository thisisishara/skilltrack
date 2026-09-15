import { loadEnvConfig } from "@next/env"

loadEnvConfig(process.cwd())

export function hasLiveSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ""
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ""
  return Boolean(url && service && !url.includes("example.supabase.co"))
}
