import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client that does not depend on request scope (cookies).
 * Use this in generateStaticParams and other build-time contexts.
 *
 * Returns null if environment variables are not configured,
 * allowing builds to succeed without Supabase credentials.
 */
export function createStaticSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key);
}
