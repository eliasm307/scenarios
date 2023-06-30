/* eslint-disable no-console */

"use client";

import { Card, CardBody, Grid, Text } from "@chakra-ui/react";
import type { ReactElement } from "react";

export type ChoiceConfig = {
  text: string;
  onSelect: () => void;
};

export default function ChoiceGrid({ choices }: { choices: ChoiceConfig[] }): ReactElement {
  return (
    <Grid fontSize='2xl' templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={3} p={3}>
      {choices.map(({ text, onSelect }) => (
        <ChoiceCard key={text} text={text} onSelect={onSelect} />
      ))}
    </Grid>
  );
}

function ChoiceCard({ text, onSelect }: { text: string; onSelect: () => void }) {
  return (
    <Card
      minHeight='10rem'
      onClick={onSelect}
      _hover={{ outline: "5px solid green", cursor: "pointer" }}
    >
      <CardBody display='grid' placeContent='center'>
        <Text align='center' marginTop='auto' display='block'>
          {text}
        </Text>
      </CardBody>
    </Card>
  );
}
