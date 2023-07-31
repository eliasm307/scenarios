/* eslint-disable no-console */

"use client";

import { Card, CardBody, Grid, Text } from "@chakra-ui/react";
import type { ReactElement } from "react";

export type ChoiceConfig = {
  text?: string;
  content?: ReactElement;
  onSelect: () => void;
  isSelected?: boolean;
};

export default function ChoiceGrid({ choices }: { choices: ChoiceConfig[] }): ReactElement {
  return (
    <Grid
      className='choice-grid'
      fontSize='2xl'
      templateColumns={{ base: "1fr", md: "1fr 1fr" }}
      gap={3}
      p={3}
    >
      {choices.map((choiceConfig) => (
        <ChoiceCard key={choiceConfig.text + String(choiceConfig.isSelected)} {...choiceConfig} />
      ))}
    </Grid>
  );
}

function ChoiceCard({ text, onSelect, isSelected, content }: ChoiceConfig) {
  return (
    <Card
      className='choice-card'
      minHeight='10rem'
      shadow='lg'
      onClick={() => {
        console.log("clicked", text);
        onSelect();
      }}
      _hover={{ outline: "5px solid gray", cursor: "pointer" }}
      style={isSelected ? { outline: "5px solid green" } : undefined}
    >
      <CardBody
        className='card-body'
        display='grid'
        gridTemplateRows='1fr'
        gridTemplateColumns='1fr'
        placeContent='center'
      >
        {content ?? (
          <Text align='center' margin='auto' display='block'>
            {text}
          </Text>
        )}
      </CardBody>
    </Card>
  );
}
