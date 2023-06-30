"use client";

import { Button, Center, Heading, Spinner, VStack } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import APIClient from "../utils/client/APIClient";
import type { ChoiceConfig } from "./ChoiceCard.client";
import ChoiceGrid from "./ChoiceCard.client";

type Props = {
  onScenarioSelected: (scenario: string) => void;
};

// todo rename to scenario generator
export default function ScenarioSelector({ onScenarioSelected }: Props): React.ReactElement {
  const [scenarios, setScenarios] = useState<string[]>([
    "You discover a magical book that can grant any wish, but each wish shortens your life by five years. Would you use the book?",
    "You're a scientist who has discovered a cure for a rare, deadly disease. However, the cure involves a procedure that is considered highly unethical. Do you proceed to save lives?",
    "You're a struggling artist and a wealthy collector offers to buy all your work for a sum that would solve all your financial problems. But he intends to destroy all the art after purchase. Do you sell your art to him?",
  ]);
  const [state, setState] = useState<"idle" | "loading">("idle");

  const generateScenarios = useCallback(async (abortSignal?: AbortSignal) => {
    setState("loading");
    const response = await APIClient.getScenarios(abortSignal);
    setScenarios(response.scenarios);
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
      <ChoiceGrid
        choices={[
          ...scenarios.map(
            (scenarioText): ChoiceConfig => ({
              text: scenarioText,
              onSelect: () => onScenarioSelected(scenarioText),
            }),
          ),
          {
            text: "🆕 Vote to generate new scenarios",
            onSelect: generateScenarios,
          },
        ]}
      />
    </VStack>
  );
}
