import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";
import type { Database } from "../../../src/types/supabase.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL env var is not set");
}

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY env var is not set");
}

// Create a Supabase client with the Auth context of the logged in user.
// see default env variables here https://supabase.com/docs/guides/functions/secrets#default-secrets
export const supabaseAdminClient = createClient<Database>(
  // Supabase API URL - env var exported by default.
  SUPABASE_URL,
  // Supabase API ANON KEY - env var exported by default.
  SUPABASE_SERVICE_ROLE_KEY,
  // Create client with Auth context of the user that called the function.
  // This way your row-level-security (RLS) policies are applied.
  // { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
);

export function isRequestAuthorised(req: Request) {
  return req.headers.get("Authorization") === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
}
