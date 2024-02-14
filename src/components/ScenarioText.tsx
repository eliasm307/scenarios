/* eslint-disable no-console */
import { Flex, Heading } from "@chakra-ui/react";

export default function ScenarioText({ scenarioText }: { scenarioText: string }) {
  console.debug("ScenarioText render", { scenarioText });
  return (
    <Flex direction='column' gap={5}>
      {scenarioText
        // show spacing between paragraphs
        .split("\n")
        .filter((sentence) => sentence.trim())
        .map((sentence) => {
          return (
            <Heading key={sentence} as='p' fontSize='xl' fontWeight={400}>
              {sentence}
            </Heading>
          );
        })}
    </Flex>
  );
}
