/* eslint-disable react/no-unused-prop-types */

"use client";

import {
  Badge,
  Box,
  Button,
  Center,
  Divider,
  HStack,
  Heading,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import type { ChoiceConfig } from "../ChoiceGrid.client";
import ChoiceGrid from "../ChoiceGrid.client";
import type { SessionRow, SessionUser } from "../../types";
import ScenarioText from "../ScenarioText";
import ReadOutLoudButton from "../ReadOutLoudButton";
import type { ScenarioSelectorViewProps } from "./ScenarioSelector.container";

export default function ScenarioSelector({
  isLoading,
  users,
  currentUser,
  optionVotes,
  scenarioOptions,
  handleVote: persistChoice,
}: ScenarioSelectorViewProps): React.ReactElement {
  const [localSelectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const hasPersistedSelection = typeof optionVotes[currentUser.id] === "number";

  if (isLoading) {
    return (
      <Center as='section' height='100%' display='flex' flexDirection='column' gap={3}>
        <Spinner fontSize='2xl' />
        <Heading>Loading...</Heading>
      </Center>
    );
  }

  return (
    <VStack as='section' m={3} height='100%'>
      <Heading textAlign='center'>Vote for a Scenario to Play!</Heading>
      <HStack wrap='wrap'>
        <span>Users waiting to vote: </span>
        {users
          .filter((user) => {
            const hasNotVoted = typeof optionVotes[user.id] === "undefined";
            return hasNotVoted;
          })
          .map((user) => (
            <Badge key={user.id} colorScheme={user.isCurrentUser ? "green" : "gray"}>
              {user.isCurrentUser ? "Me" : user.name}
            </Badge>
          ))}
      </HStack>
      <VStack key={scenarioOptions.join("+")} overflow='auto' pb={6} flex={1} gap={4}>
        <ChoiceGrid
          choices={[
            ...scenarioOptions.map((text, optionId): ChoiceConfig => {
              const isSelected = optionVotes[currentUser.id] === optionId;
              return {
                text,
                isSelected,
                content: (
                  <Box key={`${text.trim() || optionId}-container`}>
                    {text.trim() ? (
                      <OptionContent
                        key={text + optionId}
                        optionId={optionId}
                        optionVotes={optionVotes}
                        text={text}
                        users={users}
                        handleSelect={() => setSelectedOptionId(optionId)}
                        isSelected={isSelected}
                      />
                    ) : (
                      <Center
                        key={`${optionId}-loading`}
                        as='section'
                        height='100%'
                        display='flex'
                        flexDirection='column'
                        gap={3}
                      >
                        <Spinner />
                        <Heading fontSize='xl'>Loading scenario...</Heading>
                      </Center>
                    )}
                  </Box>
                ),
              };
            }),
            {
              content: (
                <OptionContent
                  key='new'
                  optionId={-1}
                  optionVotes={optionVotes}
                  notReadable
                  text='🆕 Vote to generate new scenarios'
                  users={users}
                  handleSelect={() => setSelectedOptionId(-1)}
                  isSelected={optionVotes[currentUser.id] === -1}
                />
              ),
              isSelected: optionVotes[currentUser.id] === -1,
            },
          ]}
        />
        {hasPersistedSelection ? (
          <Button p={5} colorScheme='gray' isDisabled>
            Waiting for Other Players to Vote...
          </Button>
        ) : (
          <Button
            p={5}
            colorScheme={hasPersistedSelection ? "gray" : "green"}
            isDisabled={hasPersistedSelection}
            onClick={() => persistChoice(localSelectedOptionId)}
          >
            I&apos;m Ready for the Next Stage
          </Button>
        )}
      </VStack>
    </VStack>
  );
}

function OptionContent({
  users,
  optionId,
  optionVotes,
  text,
  notReadable,
  handleSelect,
  isSelected,
}: {
  users: SessionUser[];
  optionId: number;
  optionVotes: SessionRow["scenario_option_votes"];
  text: string;
  notReadable?: boolean;
  handleSelect: () => void;
  isSelected: boolean;
}) {
  return (
    <VStack height='100%' width='100%'>
      <HStack minHeight={10} width='100%'>
        <HStack flex={1} wrap='wrap'>
          <Text>Votes:</Text>
          {users
            .filter((user) => {
              const hasVoted = optionVotes[user.id] === optionId;
              return hasVoted;
            })
            .map((user) => (
              <Badge
                maxHeight={10}
                fontSize='lg'
                key={user.id}
                colorScheme={user.isCurrentUser ? "green" : "gray"}
              >
                {user.isCurrentUser ? "Me" : user.name}
              </Badge>
            ))}
        </HStack>
        {!notReadable && (
          <Box>
            <ReadOutLoudButton text={text} />
          </Box>
        )}
        {isSelected ? (
          <Button colorScheme='gray' key={`${optionId}-selected`} isDisabled>
            Selected
          </Button>
        ) : (
          <Button colorScheme='green' key={`${optionId}-unselected`} onClick={handleSelect}>
            Select
          </Button>
        )}
      </HStack>
      <Divider my={3} width='100%' />
      <Box flex={1}>
        <ScenarioText scenarioText={text} />
      </Box>
    </VStack>
  );
}
