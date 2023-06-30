import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "../../types/supabase";

export const getSupabaseClient = () => createClientComponentClient<Database>();
