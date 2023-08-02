"use client";

import { Box, Button, Divider, Grid, Heading, Text, VStack } from "@chakra-ui/react";
import { useMemo } from "react";
import ScenarioText from "../ScenarioText";
import type { SessionUser } from "../../types";
import type { OutcomesRevealViewProps } from "./OutcomesReveal.container";
import { POSITIVE_OUTCOME_EMOJI, NEGATIVE_OUTCOME_EMOJI } from "../../utils/constants";

export default function OutcomesReveal({
  users,
  outcomeVotes,
  scenarioText,
  handlePlayAgain,
}: OutcomesRevealViewProps): React.ReactElement {
  const results = useMemo((): UserVotesResult[] => {
    return users
      .map((voterUser) => {
        const expectedOutcomes = outcomeVotes[voterUser.id]!;
        const voteResults: UserVotesResult["voteResults"] = users
          .filter((resultUser) => resultUser.id !== voterUser.id)
          .map((resultUser) => {
            const expected = expectedOutcomes[resultUser.id]!;
            const actual = outcomeVotes[resultUser.id]![resultUser.id]!;
            return {
              user: resultUser,
              expected,
              actual,
              isCorrect: expected === actual,
            };
          });
        return {
          user: voterUser,
          userChoice: expectedOutcomes[voterUser.id]!,
          voteResults,
          correctGuessesCount: voteResults.filter((result) => result.isCorrect).length,
        };
      })
      .sort((a, b) => b.correctGuessesCount - a.correctGuessesCount);
  }, [users, outcomeVotes]);

  return (
    <VStack spacing={3} mt={5} mb={10} height='stretch' overflow='auto' width='100%' gap={5}>
      <Box maxWidth='30rem' textAlign='center'>
        <ScenarioText scenarioText={scenarioText} />
      </Box>
      <Divider />
      <Heading>What did people say?</Heading>
      <ResponsiveGrid>
        {results.map((result) => {
          return <OutcomeVoteResults key={result.user.id} {...result} />;
        })}
      </ResponsiveGrid>
      <Divider />
      <Heading>Who is on the Podium?</Heading>
      <ResponsiveGrid>
        {results.map((result, i) => {
          return (
            <VStack key={result.user.id} gap={0}>
              <Heading as='h3' size='md' mb={2} width='100%' textAlign='center'>
                <Text as='span' fontSize='2rem'>
                  {getMedalEmoji(i)}
                </Text>{" "}
                &quot;{result.user.name}&quot; <br />
              </Heading>
              <Text>
                {result.correctGuessesCount} correct guess
                {result.correctGuessesCount === 1 ? "" : "es"}
              </Text>
            </VStack>
          );
        })}
      </ResponsiveGrid>
      <Divider />
      <Button colorScheme='green' onClick={handlePlayAgain} p={5}>
        Start a new Scenario
      </Button>
    </VStack>
  );
}

function getMedalEmoji(index: number) {
  switch (index) {
    case 0:
      return "🥇";
    case 1:
      return "🥈";
    case 2:
      return "🥉";
    default:
      return "";
  }
}

function ResponsiveGrid({ children }: React.PropsWithChildren) {
  return (
    <Grid
      flex={1}
      width='100%'
      justifyContent='space-evenly'
      templateColumns='repeat(auto-fit, minmax(15rem, 1fr))'
      justifyItems='center'
      gap={10}
      p={5}
    >
      {children}
    </Grid>
  );
}

type UserVotesResult = {
  user: SessionUser;
  userChoice: boolean;
  voteResults: {
    user: SessionUser;
    expected: boolean;
    actual: boolean;
    isCorrect: boolean;
  }[];
  correctGuessesCount: number;
};

function OutcomeVoteResults({ user, userChoice, voteResults }: UserVotesResult) {
  return (
    <Box overflowY='auto' maxWidth='20rem' minWidth='10rem'>
      <Heading as='h3' size='md' mb={2} width='100%' textAlign='center'>
        {userChoice ? POSITIVE_OUTCOME_EMOJI : NEGATIVE_OUTCOME_EMOJI} &quot;{user.relativeName}
        &quot;
        <br /> {userChoice ? "would" : "would not"} do it
      </Heading>
      <VStack>
        {voteResults
          .filter((result) => result.user.id !== user.id)
          .map((result) => {
            const resultEmoji = result.isCorrect ? "✅" : "❌";
            const expectedDecisionText = result.isCorrect ? "right" : "wrong";
            const resultSummary = `${resultEmoji} "${result.user.relativeName}" was ${expectedDecisionText}`;
            return (
              <Box key={result.user.id}>
                <Text>{resultSummary}</Text>
              </Box>
            );
          })}
      </VStack>
    </Box>
  );
}
