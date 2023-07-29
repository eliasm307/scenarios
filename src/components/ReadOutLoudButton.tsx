import { Tooltip, IconButton } from "@chakra-ui/react";
import { useState, useCallback, useEffect } from "react";
import { SoundIcon, StopIcon } from "./Icons";
import { useSelectedVoiceName, useVoiceSynthesis } from "../utils/client/hooks";
import { useUserContext } from "../app/providers";

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

export default function ReadOutLoudButton({
  text,
  overrideVoiceName,
  overrideReadingRate,
}: {
  text: string;
  overrideVoiceName?: string;
  overrideReadingRate?: number;
}) {
  const voice = useVoiceSynthesis();
  const [isPlaying, setIsPlaying] = useState(false);
  const selectedVoiceName = useSelectedVoiceName();
  const { userProfile } = useUserContext();

  useEffect(() => {
    setIsPlaying(window.speechSynthesis.speaking);
  }, []);

  const handlePlay = useCallback(async () => {
    setIsPlaying(true);
    try {
      await voice.speak(text, { overrideVoiceName, overrideReadingRate });
    } finally {
      setIsPlaying(false);
    }
  }, [voice, text, overrideVoiceName, overrideReadingRate]);

  const key = `${selectedVoiceName.value}-${overrideVoiceName}-${userProfile.preferred_reading_rate}-${overrideReadingRate}-${text}`;
  return isPlaying ? (
    <StopReadingOutLoudButton key={`stop-${key}`} onClick={voice.stop} />
  ) : (
    <StartReadOutLoudButton key={`start-${key}`} onClick={handlePlay} />
  );
}
