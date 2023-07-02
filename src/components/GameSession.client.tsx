"use client";

import React, { useState } from "react";
import type { Message } from "ai";
import ScenarioSelector from "./ScenarioSelector.client";
import ScenarioChat from "./ScenarioChat.client";

type Props = {
  sessionId: string;
  existing?: {
    scenario?: string;
    messages?: Message[];
  };
  initial: {
    scenarioOptions: string[];
  };
};

export default function GameSession({ existing, initial }: Props): React.ReactElement {
  const [scenario, setScenario] = useState(
    existing?.scenario ??
      "" ??
      "You're a struggling artist and a wealthy collector offers to buy all your work for a sum that would solve all your financial problems. But he intends to destroy all the art after purchase. Do you sell your art to him?",
  );

  if (!scenario) {
    if (!initial.scenarioOptions.length) {
      throw new Error("No initial scenario options provided");
    }
    return (
      <ScenarioSelector
        onScenarioSelected={setScenario}
        initialScenarioOptions={initial.scenarioOptions}
      />
    );
  }

  return <ScenarioChat scenario={scenario} existing={existing} />;
}
