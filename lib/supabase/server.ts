import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { proxyFetch } from "@/lib/proxy";

export async function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      async accessToken() {
        return (await auth()).getToken();
      },
      // Route Supabase requests through the configured proxy (if any) so
      // supabase.co is reachable from networks where it's otherwise blocked.
      global: { fetch: proxyFetch },
    },
  );
}
