import { Tooltip, IconButton } from "@chakra-ui/react";
import { useState, useCallback } from "react";
import { SoundIcon, StopIcon } from "./Icons";
import { useVoiceSynthesis } from "../utils/client/hooks";

function StartReadOutLoudButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip label='Read out loud' aria-label='Read out loud'>
      <IconButton
        key='play'
        icon={<SoundIcon fontSize='1.5rem' />}
        aria-label='Read out loud'
        onClick={onClick}
      />
    </Tooltip>
  );
}

function StopReadingOutLoudButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip label='Stop reading out loud' aria-label='Stop reading out loud'>
      <IconButton
        key='stop'
        icon={<StopIcon />}
        aria-label='Stop reading out loud'
        onClick={onClick}
      />
    </Tooltip>
  );
}

export default function ReadOutLoudButton({ text }: { text: string }) {
  const voice = useVoiceSynthesis();
  const [isPlaying, setIsPlaying] = useState(false);
  const handlePlay = useCallback(async () => {
    setIsPlaying(true);
    try {
      await voice.speak(text);
    } finally {
      setIsPlaying(false);
    }
  }, [text, voice]);

  return isPlaying ? (
    <StopReadingOutLoudButton onClick={voice.stop} />
  ) : (
    <StartReadOutLoudButton onClick={handlePlay} />
  );
}
