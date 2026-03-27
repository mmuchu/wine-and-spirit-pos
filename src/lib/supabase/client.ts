 // src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

// Singleton pattern to prevent "Lock" errors in React Strict Mode
let client: ReturnType<typeof createBrowserClient> | undefined;

export const createClient = () => {
  if (client) return client;
  
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  return client;
};