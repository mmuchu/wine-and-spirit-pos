 // src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database' // Optional: if you have types generated

// Singleton pattern to prevent multiple instances in Strict Mode
let client: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  // If client already exists, return it
  if (client) {
    return client;
  }

  // Create new client
  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}