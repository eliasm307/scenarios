"use client";

import React, { useState } from "react";
import ScenarioSelector from "./ScenarioSelector.client";

type Props = {
  sessionId: string;
  existing?: {
    scenario?: string;
  };
};

export default function Session({ sessionId, existing }: Props) {
  const [scenario, setScenario] = useState(existing?.scenario);

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

  return (
    <div>
      <h1>Session</h1>
    </div>
  );
}
