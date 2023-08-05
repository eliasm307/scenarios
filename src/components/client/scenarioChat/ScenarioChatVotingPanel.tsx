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
import type { SessionUser } from "../../../types";
import type { ScenarioChatViewProps } from "./ScenarioChat.container";
import { useIsLargeScreen } from "../../../utils/client/hooks";
import {
  POSITIVE_OUTCOME_EMOJI,
  NEGATIVE_OUTCOME_EMOJI,
  CONFIRMED_EMOJI,
  THINKING_EMOJI,
} from "../../../utils/constants";
import ReadyForNextStageButton from "../ReadyForNextStageButton";

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
      {props.remoteUserVotingStatuses.map(({ user, isFinishedVoting }) => (
        <>
          <Divider my={3} key={`${user.id}-divider`} />
          <Heading key={user.id} size='md' width='100%' textAlign='center'>
            {isFinishedVoting ? CONFIRMED_EMOJI : THINKING_EMOJI} &quot;{user.name}&quot;{" "}
            {isFinishedVoting ? "has decided" : "is deciding..."}
          </Heading>
        </>
      ))}
    </VStack>
  );
}

function OutcomeVotingTable({
  users,
  outcomeVotesByCurrentUser,
  handleVoteChange,
  isFullWidth,
  readyForNextStageProps,
}: Props) {
  return (
    <>
      <TableContainer>
        <Table variant='unstyled'>
          <Tbody>
            {users.map((user) => (
              <UserOutcomeVotingRow
                key={`${user.id}-outcome-voting-row`}
                voteForUser={user}
                latestOutcomeVote={outcomeVotesByCurrentUser?.[user.id]}
                handleVoteChange={handleVoteChange}
                isFullWidth={isFullWidth}
              />
            ))}
          </Tbody>
        </Table>
      </TableContainer>
      <ReadyForNextStageButton {...readyForNextStageProps} />
    </>
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
      {POSITIVE_OUTCOME_EMOJI} would do it
    </Radio>
  );

  const negativeRadioNode = (
    <Radio colorScheme='red' value='false'>
      {NEGATIVE_OUTCOME_EMOJI} would not do it
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
          <Td key={`isLargeScreen=${String(isLargeScreen)}-col1`}>{positiveRadioNode}</Td>
          <Td key={`isLargeScreen=${String(isLargeScreen)}-col2`} pr={0}>
            {" "}
            {negativeRadioNode}{" "}
          </Td>
        </>
      ) : (
        <Td
          key={`isLargeScreen=${String(isLargeScreen)}-col1`}
          pr={0}
          display='flex'
          flexDirection='column'
          gap={3}
        >
          {positiveRadioNode}
          {negativeRadioNode}
        </Td>
      )}
    </RadioGroup>
  );
}
