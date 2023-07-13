"use client";

import {
  Box,
  Button,
  Heading,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useToast,
} from "@chakra-ui/react";
import { useCallback, useMemo } from "react";
import type { SessionRow, SessionUser } from "../types";
import APIClient from "../utils/client/APIClient";

type Props = {
  currentUser: SessionUser;
  users: SessionUser[];
  outcomeVotes: Required<SessionRow["scenario_outcome_votes"]>;
  sessionId: number;
};

export default function OutcomesReveal({
  users,
  outcomeVotes,
  sessionId,
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
    const errorToastConfig = await APIClient.sessions.reset(sessionId);
    if (errorToastConfig) {
      toast(errorToastConfig);
    }
  }, [sessionId, toast]);

  return (
    <>
      <Box>Outcomes reveal</Box>
      {results.map((result) => {
        return <OutcomeVoteResults key={result.user.id} {...result} />;
      })}
      <Button onClick={handlePlayAgain}>Play Again</Button>
    </>
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
        {user.name} Results
      </Heading>
      <TableContainer>
        <Table variant='unstyled'>
          <Thead>
            <Tr>
              <Th />
              <Th>Expected</Th>
              <Th>Actual</Th>
            </Tr>
          </Thead>
          <Tbody>
            {voteResults.map((result) => {
              return (
                <Tr key={result.user.id}>
                  <Td>{result.user.name}</Td>
                  <Td>{`${result.expected}`}</Td>
                  <Td>{`${result.actual}`}</Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
}
