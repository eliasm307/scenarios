import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "../../types/supabase";

let supabaseClient: ReturnType<typeof createClientComponentClient<Database>>;

export const getSupabaseClient = () => {
  return supabaseClient || (supabaseClient = createClientComponentClient<Database>());
};
