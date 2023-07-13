"use client";

import { Box, Button, Divider, Heading, Text, VStack, useToast } from "@chakra-ui/react";
import { useCallback, useMemo } from "react";
import type { SessionRow, SessionUser } from "../types";
import APIClient from "../utils/client/APIClient";
import ScenarioText from "./ScenarioText";

type Props = {
  currentUser: SessionUser;
  users: SessionUser[];
  outcomeVotes: Required<SessionRow["scenario_outcome_votes"]>;
  sessionId: number;
  scenarioText: string;
};

export default function OutcomesReveal({
  users,
  outcomeVotes,
  sessionId,
  currentUser,
  scenarioText,
}: Props): React.ReactElement {
  const toast = useToast();
  const results = useMemo((): UserVotesResult[] => {
    return users.map((voterUser) => {
      const expectedOutcomes = outcomeVotes[voterUser.id]!;
      return {
        isCurrentUser: voterUser.id === currentUser.id,
        user: voterUser,
        voteResults: users
          .filter((resultUser) => resultUser.id !== voterUser.id)
          .map((resultUser) => ({
            user: resultUser,
            expected: expectedOutcomes[resultUser.id]!,
            actual: outcomeVotes[resultUser.id]![resultUser.id]!,
          })),
      };
    });
  }, [users, outcomeVotes, currentUser.id]);

  const handlePlayAgain = useCallback(async () => {
    const errorToastConfig = await APIClient.sessions.reset(sessionId);
    if (errorToastConfig) {
      toast(errorToastConfig);
    }
  }, [sessionId, toast]);

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
  isCurrentUser: boolean;
  user: SessionUser;
  voteResults: {
    user: SessionUser;
    expected: boolean;
    actual: boolean;
  }[];
};

function OutcomeVoteResults({ isCurrentUser, user, voteResults }: UserVotesResult) {
  return (
    <Box overflowY='auto'>
      <Heading as='h2' size='md' mb={2} width='100%' textAlign='center'>
        &quot;{isCurrentUser ? "I" : user.name}&quot; guessed that...
      </Heading>
      <VStack>
        {voteResults.map((result) => {
          return (
            <Box key={result.user.id}>
              <Text>
                &quot;{result.user.name}&quot; would {result.expected ? "do it" : "not do it"} (
                {result.expected === result.actual ? "✅" : "❌"})
              </Text>
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
}
