"use client";

import { Button, Center, Heading, Spinner, VStack } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import APIClient from "../utils/client/APIClient";
import type { ChoiceConfig } from "./ChoiceCard.client";
import ChoiceGrid from "./ChoiceCard.client";

type Props = {
  onScenarioSelected: (scenario: string) => void;
  initialScenarioOptions: string[];
};

type ScenarioOption = {
  text: string;
  id: string;
};

function scenarioTextToOption(scenarioText: string, id: number): ScenarioOption {
  return {
    id: String(id),
    text: scenarioText,
  };
}

export default function ScenarioSelector({
  onScenarioSelected,
  initialScenarioOptions,
}: Props): React.ReactElement {
  const [scenarios, setScenarios] = useState<{ text: string; id: string }[]>(() => {
    return initialScenarioOptions.map(scenarioTextToOption);
  });
  const [state, setState] = useState<"idle" | "loading">("idle");

  const generateScenarios = useCallback(async (abortSignal?: AbortSignal) => {
    setState("loading");
    const response = await APIClient.getScenarios(abortSignal);
    setScenarios(response.scenarios.map(scenarioTextToOption));
    setState("idle");
  }, []);

  if (state === "loading") {
    return (
      <Center as='section' height='100%'>
        <Spinner />
      </Center>
    );
  }

  if (!scenarios.length) {
    return (
      <VStack as='section' mx={3}>
        <Button onClick={() => generateScenarios()}>Generate New Scenarios</Button>
      </VStack>
    );
  }

  return (
    <VStack as='section' mx={3}>
      <Heading>Vote for a Scenario to Play!</Heading>
      {/* todo this should be a scenario voting component */}
      <ChoiceGrid
        choices={[
          ...scenarios.map(
            (scenario): ChoiceConfig => ({
              ...scenario,
              onSelect: () => onScenarioSelected(scenario.text),
            }),
          ),
          {
            id: "re-generate",
            text: "🆕 Vote to generate new scenarios",
            onSelect: generateScenarios,
          },
        ]}
      />
    </VStack>
  );
}
