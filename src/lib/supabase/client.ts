 // src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

// Singleton instance
let client: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  // 1. If client already exists, return it (Fast!)
  if (client) {
    return client
  }

  // 2. Create new client only once
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  return client
}