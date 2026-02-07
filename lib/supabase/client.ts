import { useSession } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { useMemo } from "react";

export function useClerkSupabaseClient() {
  const { session } = useSession();
    
  const client = useMemo(() => {
    function createClerkSupabaseClient() {
      return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
          async accessToken() {
            return session?.getToken() ?? null;
          },
        },
      );
    }
    return createClerkSupabaseClient();
  }, [session]);

  return client;
}

  // export async function createClerkSupabaseClient() {
  //   return createClient(
  //     process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //     process.env.NEXT_PUBLIC_SUPABASE_KEY!,
  //     {
  //       global: {
  //         // Get the custom Supabase token from Clerk
  //         fetch: async (url, options = {}) => {
  //           const clerkToken = await clerk.session?.getToken({
  //             template: 'supabase',
  //           })

  //           // Insert the Clerk Supabase token into the headers
  //           const headers = new Headers(options?.headers)
  //           headers.set('Authorization', `Bearer ${clerkToken}`)

  //           // Call the default fetch
  //           return fetch(url, {
  //             ...options,
  //             headers,
  //           })
  //         },
  //       },
  //     },
  //   )
  // }
