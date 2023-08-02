import { Button } from "@chakra-ui/react";

export default function ReadyForNextStageButton({
  isReady,
  handleReady,
}: {
  isReady: boolean;
  handleReady: () => void;
}) {
  return isReady ? (
    <Button key='ready' p={5} colorScheme='gray' isDisabled>
      Waiting for Other Players...
    </Button>
  ) : (
    <Button
      key='not-ready'
      p={5}
      colorScheme={isReady ? "gray" : "green"}
      isDisabled={isReady}
      onClick={handleReady}
    >
      I&apos;m Ready for the Next Stage
    </Button>
  );
}
