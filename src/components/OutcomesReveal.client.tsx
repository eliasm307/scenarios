"use client";

import { Box, Button, Divider, HStack, Heading, Text, VStack } from "@chakra-ui/react";
import { useCallback, useMemo } from "react";
import type { SessionRow, SessionUser } from "../types";
import ScenarioText from "./ScenarioText";
import type { BroadcastFunction } from "./GameSession.client";
import { invokeResetSessionAction } from "../utils/server/actions";
import { useCustomToast } from "../utils/client/hooks";

type Props = {
  currentUser: SessionUser;
  users: SessionUser[];
  outcomeVotes: Required<SessionRow["scenario_outcome_votes"]>;
  sessionId: number;
  scenarioText: string;
  broadcast: BroadcastFunction;
};

export default function OutcomesReveal({
  users,
  outcomeVotes,
  sessionId,
  currentUser,
  scenarioText,
  broadcast,
}: Props): React.ReactElement {
  const toast = useCustomToast();
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
          voteResults,
          correctGuessesCount: voteResults.filter((result) => result.isCorrect).length,
        };
      })
      .sort((a, b) => b.correctGuessesCount - a.correctGuessesCount);
  }, [users, outcomeVotes]);

  const handlePlayAgain = useCallback(async () => {
    broadcast({
      event: "Toast",
      data: {
        status: "info",
        title: `"${currentUser.name}" re-started the session`,
      },
    });
    const errorToastConfig = await invokeResetSessionAction(sessionId);
    errorToastConfig?.forEach(toast);
  }, [broadcast, currentUser.name, sessionId, toast]);

  return (
    <VStack spacing={3} mt={5} mb={10} overflow='auto' width='100%' gap={5}>
      <Box maxWidth='30rem' textAlign='center'>
        <ScenarioText scenarioText={scenarioText} />
      </Box>
      <Divider />
      <HStack flex={1} width='100%' justifyContent='space-evenly' wrap='wrap' gap={3}>
        {results.map((result) => {
          return <OutcomeVoteResults key={result.user.id} {...result} />;
        })}
      </HStack>
      <Divider />
      <Button colorScheme='green' onClick={handlePlayAgain}>
        Play Again
      </Button>
    </VStack>
  );
}

type UserVotesResult = {
  user: SessionUser;
  voteResults: {
    user: SessionUser;
    expected: boolean;
    actual: boolean;
    isCorrect: boolean;
  }[];
  correctGuessesCount: number;
};

function OutcomeVoteResults({ user, voteResults, correctGuessesCount }: UserVotesResult) {
  return (
    <Box overflowY='auto' maxWidth='20rem'>
      <Heading as='h2' size='md' mb={2} width='100%' textAlign='center'>
        &quot;{user.relativeName}&quot; guessed that...
      </Heading>
      <VStack>
        {voteResults.map((result) => {
          const resultEmoji = result.isCorrect ? "✅" : "❌";
          const expectedDecisionText = result.expected ? "would" : "would not";
          const resultSummary = `${resultEmoji} "${result.user.relativeName}" ${expectedDecisionText} do it`;
          return (
            <Box key={result.user.id}>
              <Text>{resultSummary}</Text>
            </Box>
          );
        })}
        <Box>
          <Text>Correct guesses: {correctGuessesCount}</Text>
        </Box>
      </VStack>
    </Box>
  );
}
