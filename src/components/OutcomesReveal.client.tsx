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
    return users.map((voterUser) => {
      const expectedOutcomes = outcomeVotes[voterUser.id]!;
      return {
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
  }, [users, outcomeVotes]);

  const handlePlayAgain = useCallback(async () => {
    broadcast({
      event: "Toast",
      data: {
        status: "info",
        title: `"${currentUser.name}" reset the session`,
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
  }[];
};

function OutcomeVoteResults({ user, voteResults }: UserVotesResult) {
  return (
    <Box overflowY='auto'>
      <Heading as='h2' size='md' mb={2} width='100%' textAlign='center'>
        &quot;{user.relativeName}&quot; guessed that...
      </Heading>
      <VStack>
        {voteResults.map((result) => {
          return (
            <Box key={result.user.id}>
              <Text>
                &quot;{result.user.relativeName}&quot; would{" "}
                {result.expected ? "do it" : "not do it"} (
                {result.expected === result.actual ? "✅" : "❌"})
              </Text>
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
}
