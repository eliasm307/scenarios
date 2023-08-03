import { Button } from "@chakra-ui/react";

export type ReadyForNextStageButtonProps = {
  /** Whether the user clicked the button and is ready for the next stage */
  isReadyForNextStage: boolean;
  handleReadyForNextStageClick: () => void;
  /** For before clicking the button, should the user be able to click it? */
  canMoveToNextStage: boolean;
};

export default function ReadyForNextStageButton({
  isReadyForNextStage: isReady,
  handleReadyForNextStageClick: handleReady,
  canMoveToNextStage,
}: ReadyForNextStageButtonProps) {
  return isReady ? (
    <Button key='ready' p={5} colorScheme='gray' isDisabled>
      Waiting for Other Players...
    </Button>
  ) : (
    <Button
      key='not-ready'
      p={5}
      colorScheme={isReady || !canMoveToNextStage ? "gray" : "green"}
      isDisabled={isReady || !canMoveToNextStage}
      onClick={handleReady}
    >
      I&apos;m Ready for the Next Stage
    </Button>
  );
}
