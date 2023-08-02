import {
  VStack,
  Heading,
  Divider,
  TableContainer,
  Table,
  Tbody,
  RadioGroup,
  Td,
  Radio,
} from "@chakra-ui/react";
import { useCallback } from "react";
import type { SessionUser } from "../../types";
import type { ScenarioChatViewProps } from "./ScenarioChat.container";
import { useIsLargeScreen } from "../../utils/client/hooks";

type Props = ScenarioChatViewProps & {
  isFullWidth?: boolean;
};

export default function VotingPanel(props: Props) {
  return (
    <VStack className='voting-panel' gap={3} width='100%' flex={1}>
      <Heading size='md' width='100%' textAlign='center'>
        I think...
      </Heading>
      <OutcomeVotingTable {...props} />
      {props.users
        .filter((user) => !user.isCurrentUser)
        .map((user) => {
          const userVotes = props.outcomeVotes[user.id];
          const userHasFinishedVoting =
            userVotes && Object.values(userVotes).length === props.users.length;
          return (
            <>
              <Divider />
              <Heading size='md' width='100%' textAlign='center'>
                {userHasFinishedVoting ? <>✅</> : <>🤔</>} &quot;{user.name}&quot;{" "}
                {userHasFinishedVoting ? "has decided" : "is deciding..."}
              </Heading>
            </>
          );
        })}
    </VStack>
  );
}

function OutcomeVotingTable({
  users,
  outcomeVotesForCurrentUser,
  handleVoteChange,
  isFullWidth,
}: Props) {
  return (
    <TableContainer>
      <Table variant='unstyled'>
        <Tbody>
          {users.map((user) => (
            <UserOutcomeVotingRow
              key={`${user.id}-outcome-voting-row`}
              voteForUser={user}
              latestOutcomeVote={outcomeVotesForCurrentUser?.[user.id]}
              handleVoteChange={handleVoteChange}
              isFullWidth={isFullWidth}
            />
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
}

function UserOutcomeVotingRow({
  voteForUser,
  latestOutcomeVote,
  handleVoteChange,
  isFullWidth,
}: {
  voteForUser: SessionUser;
  latestOutcomeVote: boolean | undefined;
  handleVoteChange: (config: { voteForUserId: string; newVote: "true" | "false" }) => void;
  isFullWidth?: boolean;
}) {
  const handleSpecificUserVoteChange = useCallback(
    (vote: "true" | "false") => {
      handleVoteChange({ voteForUserId: voteForUser.id, newVote: vote });
    },
    [handleVoteChange, voteForUser.id],
  );
  const isLargeScreen = useIsLargeScreen({ above: isFullWidth ? "md" : "xl" });

  const positiveRadioNode = (
    <Radio colorScheme='green' value='true'>
      👍🏾 would do it
    </Radio>
  );

  const negativeRadioNode = (
    <Radio colorScheme='red' value='false'>
      🙅🏾‍♂️ would not do it
    </Radio>
  );

  return (
    <RadioGroup
      name={voteForUser.id}
      as='tr'
      value={String(latestOutcomeVote)}
      onChange={handleSpecificUserVoteChange}
    >
      <Td pl={0}>{voteForUser.relativeName}</Td>
      {isLargeScreen ? (
        <>
          <Td>{positiveRadioNode}</Td>
          <Td pr={0}> {negativeRadioNode} </Td>
        </>
      ) : (
        <Td pr={0} display='flex' flexDirection='column' gap={3}>
          {positiveRadioNode}
          {negativeRadioNode}
        </Td>
      )}
    </RadioGroup>
  );
}
