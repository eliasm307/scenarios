import type { GetScenariosResponseBody } from "../../app/api/scenarios/route";

const APIClient = {
  getScenarios: async (signal?: AbortSignal): Promise<GetScenariosResponseBody> => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return {
      scenarios: [
        "You're an accomplished artist whose work has caught the eye of a wealthy buyer. They offer you a massive sum of money for your art, but they also want to buy all future rights to your work, meaning you can no longer sell or display it under your own name. Do you accept their offer?",
        "You're a successful entrepreneur with a bustling café. A big corporation offers to buy your business for a hefty sum, but they plan to change everything that makes your café special. You could retire comfortably with the money, but you'd be selling out your dream. What do you do?",
        "You're a renowned chef with the opportunity to host a cooking show on a popular network. However, the show's producers want you to use only processed and unhealthy ingredients, contrary to your philosophy of using fresh and organic produce. The show promises fame and fortune, but at the cost of your principles. Do you take the offer?",
      ],
    };

    // todo fetch from server
    const response = await fetch("/api/scenarios", { signal });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return response.json() as Promise<GetScenariosResponseBody>;
  },
};

export default APIClient;
