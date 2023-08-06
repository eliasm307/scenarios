/* eslint-disable no-console */

import { Card, CardBody, Grid, Text } from "@chakra-ui/react";
import type { ReactElement } from "react";

export type ChoiceConfig = {
  text?: string;
  content?: ReactElement;
  onSelect?: () => void;
  isSelected?: boolean;
};

export default function ChoiceGrid({ choices }: { choices: ChoiceConfig[] }): ReactElement {
  return (
    <Grid
      className='choice-grid'
      fontSize='2xl'
      templateColumns={{ base: "1fr", md: choices.length === 1 ? "1fr" : "1fr 1fr" }}
      width='100%'
      gap={6}
      p={3}
    >
      {choices.map((choiceConfig, i) => (
        <ChoiceCard
          // eslint-disable-next-line react/no-array-index-key -- they will always be in the same order
          key={`choice-card=${i}}`}
          {...choiceConfig}
        />
      ))}
    </Grid>
  );
}

function ChoiceCard({ text, onSelect, isSelected, content }: ChoiceConfig) {
  return (
    <Card
      className='choice-card'
      minHeight='10rem'
      shadow='xl'
      onClick={onSelect}
      _hover={onSelect ? { outline: "5px solid gray", cursor: "pointer" } : {}}
      style={isSelected ? { outline: "5px solid green" } : undefined}
      outline='1px solid rgba(0,0,0,0.1)'
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
