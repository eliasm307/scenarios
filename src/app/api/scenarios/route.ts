import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import APIServer from "../../../utils/server/APIServer";

// IMPORTANT! Set the runtime to edge
export const runtime = "edge";

export type GetScenariosResponseBody = {
  scenarios: string[];
};

export async function GET({ cookies }: NextRequest) {
  // eslint-disable-next-line no-console
  console.log("GET /api/scenarios");
  // using next/header cookies breaks things here when using the API client
  const API = new APIServer(() => cookies as any);
  return NextResponse.json({
    scenarios: await API.ai.createScenarios(),
  } satisfies GetScenariosResponseBody);
}
