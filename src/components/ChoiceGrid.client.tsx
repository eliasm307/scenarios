/* eslint-disable no-console */

"use client";

import { Card, CardBody, Grid, Text } from "@chakra-ui/react";
import type { ReactElement } from "react";

export type ChoiceConfig = {
  /** Used to refer to this choice */
  id: string;
  text: string;
  content?: ReactElement;
  onSelect: () => void;
  isSelected?: boolean;
};

export default function ChoiceGrid({ choices }: { choices: ChoiceConfig[] }): ReactElement {
  return (
    <Grid fontSize='2xl' templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={3} p={3}>
      {choices.map((choiceConfig) => (
        <ChoiceCard key={choiceConfig.text} {...choiceConfig} />
      ))}
    </Grid>
  );
}

function ChoiceCard({ text, onSelect, isSelected, content }: ChoiceConfig) {
  return (
    <Card
      minHeight='10rem'
      onClick={() => {
        console.log("clicked", text);
        onSelect();
      }}
      _hover={{ outline: "5px solid green", cursor: "pointer" }}
      style={isSelected ? { outline: "5px solid green" } : undefined}
    >
      <CardBody display='grid' placeContent='center'>
        {content ?? (
          <Text align='center' marginTop='auto' display='block'>
            {text}
          </Text>
        )}
      </CardBody>
    </Card>
  );
}
