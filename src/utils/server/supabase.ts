import "server-only";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import type { Database } from "../../types/supabase";

// ! utility is for producing a typed client but the cookies need to come from the respective RSC file to work
export const getSupabaseServer = (cookies: () => ReadonlyRequestCookies) => {
  return createServerComponentClient<Database>({ cookies }, {});
};
