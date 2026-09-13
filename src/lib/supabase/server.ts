import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase/database"
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/supabase/env"

let client: SupabaseClient<Database> | null = null

export function getSupabaseServerClient() {
  if (!client) {
    client = createClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  }

  return client
}
