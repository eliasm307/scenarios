import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "../../types/supabase";

export const getSupabaseClient = () => {
  return createClientComponentClient<Database>({
    isSingleton: true,
    options: {
      realtime: {
        log_level: "debug",
        timeout: 15 * 60 * 1000,
        heartbeatIntervalMs: 1 * 60 * 1000,
      },
    },
  });
};
