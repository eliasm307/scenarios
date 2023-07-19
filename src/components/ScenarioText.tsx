import { Flex, Heading } from "@chakra-ui/react";

export default function ScenarioText({ scenarioText }: { scenarioText: string }) {
  return (
    <Flex direction='column' gap={5}>
      {scenarioText
        .replaceAll(/[.?]\s/g, (match) => `${match}\n`)
        .split("\n")
        .filter((sentence) => sentence.trim())
        .map((sentence) => {
          return (
            <Heading fontSize='xl' key={sentence} as='p'>
              {sentence}
            </Heading>
          );
        })}
    </Flex>
  );
}
