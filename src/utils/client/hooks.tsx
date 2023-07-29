/* eslint-disable no-console */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useUserContext } from "../../app/providers";

// todo handle browsers that dont support this
const getSynth = () => window.speechSynthesis;

const getAvailableVoices = () => {
  const foundVoices = getSynth()
    .getVoices()
    .sort(function (voiceA, voiceB) {
      return voiceA.name.toUpperCase().localeCompare(voiceB.name.toUpperCase());
    });

  console.log("foundVoices", foundVoices);
  return foundVoices;
};

function stopSpeaking() {
  getSynth().cancel();
}

export function useVoiceSynthesis() {
  const { userProfile } = useUserContext();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState(userProfile.preferred_reading_rate || 1);

  useEffect(() => {
    function initVoices() {
      const foundVoices = getAvailableVoices();
      setVoices(foundVoices);
      const preferredVoiceName = userProfile.preferred_reading_voice_name;
      const preferredVoice =
        preferredVoiceName && foundVoices.find((voice) => voice.name === preferredVoiceName);

      const currentVoice =
        preferredVoice ||
        foundVoices.find((voice) => voice.default) ||
        foundVoices.find((voice) => voice.lang === "en-US");

      if (!currentVoice) {
        throw new Error("No suitable voice found on the device");
      }

      setSelectedVoice(currentVoice);
    }

    getSynth().addEventListener("voiceschanged", initVoices);
    return () => {
      getSynth().removeEventListener("voiceschanged", initVoices);
    };
  }, [userProfile.preferred_reading_voice_name]);

  const speak = useCallback(
    (text: string) => {
      return new Promise((resolve, reject) => {
        if (getSynth().speaking) {
          stopSpeaking();
        }
        if (selectedVoice) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.voice = selectedVoice;
          utterance.rate = rate;

          // NOTE: assuming this gets called on synth#cancel
          utterance.onend = resolve;
          // todo use this to highlight words as they are spoken
          // utterance.onboundary;
          utterance.onerror = (e) => {
            console.error("utterance.onerror", e);
            reject(e);
          };
          getSynth().speak(utterance);
        }
      });
    },
    [rate, selectedVoice],
  );

  return {
    voices,
    selectedVoice,
    setSelectedVoice,
    setRate,
    rate,
    // todo this is not impure, fix eslint plugin
    stop: stopSpeaking,
    speak,
  };
}
