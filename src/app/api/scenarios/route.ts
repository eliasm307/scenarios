import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import APIServer from "../../../utils/server/APIServer";

// IMPORTANT! Set the runtime to edge
export const runtime = "edge";

export type GetScenariosResponseBody = {
  scenarios: string[];
};

export async function GET() {
  // eslint-disable-next-line no-console
  console.log("GET /api/scenarios");
  const API = new APIServer(cookies);
  return NextResponse.json({
    scenarios: await API.ai.createScenarios(),
  } satisfies GetScenariosResponseBody);
}
