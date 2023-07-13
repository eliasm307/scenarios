"use client";

import { Box, Button, Divider, Heading, Text, VStack, useToast } from "@chakra-ui/react";
import { useCallback, useMemo } from "react";
import type { SessionRow, SessionUser } from "../types";
import APIClient from "../utils/client/APIClient";
import ScenarioText from "./ScenarioText";
import type { BroadcastFunction } from "./GameSession.client";

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
  const toast = useToast();
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
    const errorToastConfig = await APIClient.sessions.reset(sessionId);
    if (errorToastConfig) {
      toast(errorToastConfig);
    }
  }, [broadcast, currentUser.name, sessionId, toast]);

  return (
    <VStack spacing={6}>
      <Box maxWidth='30rem' textAlign='center'>
        <ScenarioText scenarioText={scenarioText} />
      </Box>
      <Divider />
      {results.map((result) => {
        return <OutcomeVoteResults key={result.user.id} {...result} />;
      })}
      <Button onClick={handlePlayAgain}>Play Again</Button>
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
    <Box overflowY='auto'>
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
