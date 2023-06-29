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
};

export default function Session({ sessionId, existing }: Props) {
  const [scenario, setScenario] = useState(
    existing?.scenario ??
      "" ??
      "You're a struggling artist and a wealthy collector offers to buy all your work for a sum that would solve all your financial problems. But he intends to destroy all the art after purchase. Do you sell your art to him?",
  );

  if (!sessionId) {
    return (
      <div>
        <h1>Session</h1>
        <p>Session not found</p>
      </div>
    );
  }

  if (!scenario) {
    return <ScenarioSelector onScenarioSelected={setScenario} />;
  }

  return <ScenarioChat scenario={scenario} existing={existing} />;
}
