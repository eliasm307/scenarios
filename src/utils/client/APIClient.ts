import type { GetScenariosResponseBody } from "../../app/api/scenarios/route";

const APIClient = {
  getScenarios: async (signal?: AbortSignal) => {
    const response = await fetch("/api/scenarios", { signal });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return response.json() as Promise<GetScenariosResponseBody>;
  },
};

export default APIClient;
