/* eslint-disable no-console */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@chakra-ui/react";
import { useUserContext } from "../../app/providers";
import LocalStorage from "./LocalStorage";

// todo handle browsers that dont support this
const getSynth = () => window.speechSynthesis;

export function getAvailableVoices() {
  const foundVoices = getSynth()
    .getVoices()
    .filter((voice) => voice.default || voice.lang.startsWith("en-"))
    .sort(function (voiceA, voiceB) {
      return voiceA.name.toUpperCase().localeCompare(voiceB.name.toUpperCase());
    });

  return foundVoices;
}

function stopSpeaking() {
  getSynth().cancel();
}

export function useVoiceSynthesis() {
  const { userProfile } = useUserContext();
  const selectedVoiceName = useSelectedVoiceName();
  const toast = useToast();
  const rate = userProfile.preferred_reading_rate ?? 1;

  // todo fix this so it can adjust if voices change, however how do they change?
  // useEffect(() => {
  //   function initVoices() {
  //     setVoices(getAvailableVoices());
  //   }

  //   getSynth().addEventListener("voiceschanged", initVoices);
  //   return () => {
  //     getSynth().removeEventListener("voiceschanged", initVoices);
  //   };
  // }, []);

  const speak = useCallback(
    (text: string, options?: { overrideVoiceName?: string; overrideReadingRate?: number }) => {
      return new Promise((resolve, reject) => {
        if (getSynth().speaking) {
          stopSpeaking();
        }
        if (!selectedVoiceName.value) {
          throw new Error("No voice selected");
        }
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = getAvailableVoices();
        if (options?.overrideVoiceName) {
          const customVoice = voices.find((voice) => voice.name === options.overrideVoiceName);
          if (!customVoice) {
            const errorMessage = `No voice found with custom name ${options.overrideVoiceName}`;
            toast({
              title: "Error",
              description: errorMessage,
            });
            throw new Error(errorMessage);
          }
          utterance.voice = customVoice;
        } else {
          const selectedVoice = voices.find((voice) => voice.name === selectedVoiceName.value);
          if (!selectedVoice) {
            const errorMessage = `No voice found with selected name ${selectedVoiceName.value}`;
            toast({
              title: "Error",
              description: errorMessage,
            });
            throw new Error(errorMessage);
          }
          utterance.voice = selectedVoice;
        }
        utterance.rate = options?.overrideReadingRate ?? rate;

        // NOTE: assuming this gets called on synth#cancel
        utterance.onend = resolve;
        // todo use this to highlight words as they are spoken
        // utterance.onboundary;
        utterance.onerror = (e) => {
          console.error("utterance.onerror", e);
          reject(e);
        };
        getSynth().speak(utterance);
      });
    },
    [rate, selectedVoiceName.value, toast],
  );

  return {
    // todo this is not impure, fix eslint plugin
    stop: stopSpeaking,
    speak,
  };
}

/**
 * @remark voice name is saved in local storage as it is specific to the browser,
 * different browsers have different voices so cant save this in the database for all browsers
 */
function createStorageKey(userId: string, key: "preferred_voice_name"): string {
  return `${userId}-${key}`;
}
function getCurrentVoiceName(currentUserId: string) {
  const key = createStorageKey(currentUserId, "preferred_voice_name");
  let persistedValue = LocalStorage.getItem(key);
  if (!persistedValue) {
    const foundVoices = getAvailableVoices();
    const defaultVoice =
      foundVoices.find((voice) => voice.default) ||
      // select the first english voice as a fallback (is it possible not to have a default?)
      foundVoices.find((voice) => voice.lang === "en-US");

    persistedValue = defaultVoice?.name || null;
    if (persistedValue) {
      LocalStorage.setItem(key, persistedValue);
    }
  }

  return persistedValue;
}

export function useSelectedVoiceName() {
  const [preferredVoiceName, setPreferredVoiceName] = useState<string | null>();
  const { user } = useUserContext();

  useEffect(() => {
    function handleVoicesChange() {
      setPreferredVoiceName(getCurrentVoiceName(user.id));
    }

    getSynth().addEventListener("voiceschanged", handleVoicesChange);
    return () => {
      getSynth().removeEventListener("voiceschanged", handleVoicesChange);
    };
  }, [user.id]);

  useEffect(() => {
    if (preferredVoiceName) {
      LocalStorage.setItem(createStorageKey(user.id, "preferred_voice_name"), preferredVoiceName);
    }
  }, [user.id, preferredVoiceName]);

  useEffect(() => {
    setPreferredVoiceName(getCurrentVoiceName(user.id));
    const key = createStorageKey(user.id, "preferred_voice_name");

    function handleStorageChange(newValue: string) {
      setPreferredVoiceName(newValue);
    }
    LocalStorage.addKeyChangeListener(key, handleStorageChange);
    return () => {
      LocalStorage.removeEventListener(key, handleStorageChange);
    };
  }, [user.id]);

  return {
    value: preferredVoiceName,
    set: setPreferredVoiceName,
  };
}
