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
} from "@chakra-ui/react";
import { useMemo } from "react";
import type { SessionData, SessionUser } from "../types";
import { getSupabaseClient } from "../utils/client/supabase";

type Props = {
  currentUser: SessionUser;
  users: SessionUser[];
  outcomeVotes: Required<SessionData["scenario_outcome_votes"]>;
  sessionId: number;
};

export default function OutcomesReveal(props: Props): React.ReactElement {
  const results = useMemo((): UserVotesResult[] => {
    const { users, outcomeVotes } = props;
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
  }, [props]);
  return (
    <>
      <Box>Outcomes reveal</Box>
      {results.map((result) => {
        return <OutcomeVoteResults key={result.user.id} {...result} />;
      })}
      <Button
        onClick={async () => {
          await getSupabaseClient()
            .from("sessions")
            .update({
              stage: "scenario-selection",
              messaging_locked_by_user_id: null,
              scenario_option_votes: {},
              scenario_options: [],
              scenario_outcome_votes: {},
              selected_scenario_id: null,
            } satisfies Omit<SessionData, "id" | "created_at">)
            .eq("id", props.sessionId);
        }}
      >
        Play Again
      </Button>
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
