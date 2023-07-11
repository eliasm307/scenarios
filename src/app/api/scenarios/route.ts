import { NextResponse } from "next/server";
import { generateScenarios } from "../../../utils/server/openai";

// IMPORTANT! Set the runtime to edge
export const runtime = "edge";

export type GetScenariosResponseBody = {
  scenarios: string[];
};

export async function GET() {
  // eslint-disable-next-line no-console
  console.log("GET /api/scenarios");
  return NextResponse.json({
    scenarios: await generateScenarios(),
  } satisfies GetScenariosResponseBody);
}
