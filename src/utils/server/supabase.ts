import "server-only";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Database } from "../../types/supabase";

let supabaseServer: ReturnType<typeof createServerComponentClient<Database>>;

export const getSupabaseServer = () => {
  return supabaseServer || (supabaseServer = createServerComponentClient<Database>({ cookies }));
};
