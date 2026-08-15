import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Resolve the authenticated user once per Server Component render request.
 *
 * Multiple parts of the same route (for example Header + page) need the user.
 * React cache deduplicates the Supabase Auth network request for that render,
 * while middleware remains responsible for refreshing/guarding the session.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});
