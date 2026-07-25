import { createBrowserClient } from "@supabase/ssr";

// NOTE: intentionally untyped (no <Database> generic). The installed
// @supabase/postgrest-js version mis-resolves query result types to `never`
// for any selected column ending in "_id" (e.g. user_id, contact_id),
// which is a foreign-key naming convention this schema relies on
// throughout. Row shapes are instead described by the hand-written
// interfaces in ./types and applied at each call site.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
