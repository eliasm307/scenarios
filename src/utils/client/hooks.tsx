/* eslint-disable no-console */

"use client";

import type { MutableRefObject } from "react";
import { useState, useEffect, useCallback } from "react";
import type { UseToastOptions } from "@chakra-ui/react";
import { useToast as useToastOriginal } from "@chakra-ui/react";
import { useUserContext } from "../../app/providers";
import LocalStorage from "./LocalStorage";

// todo handle browsers that dont support this
const getSpeechSynthesis = () => window.speechSynthesis;

function getAvailableVoices() {
  const foundVoices = getSpeechSynthesis()
    .getVoices()
    .filter((voice) => voice.default || voice.lang.startsWith("en-"))
    .sort(function (voiceA, voiceB) {
      return voiceA.name.toUpperCase().localeCompare(voiceB.name.toUpperCase());
    });

  return foundVoices;
}

export function useAvailableVoices() {
  const [voices, setVoices] = useState(getAvailableVoices());
  useEffect(() => {
    function initVoices() {
      setVoices(getAvailableVoices());
    }

    getSpeechSynthesis().addEventListener("voiceschanged", initVoices);
    return () => {
      getSpeechSynthesis().removeEventListener("voiceschanged", initVoices);
    };
  }, []);
  return voices;
}

function stopSpeaking() {
  getSpeechSynthesis().cancel();
}

export function useVoiceSynthesis() {
  const { userProfile } = useUserContext();
  const selectedVoiceName = useSelectedVoiceName();
  const toast = useCustomToast();
  const rate = userProfile.preferred_reading_rate ?? 1;
  const voices = useAvailableVoices();

  const speak = useCallback(
    (
      text: string,
      options?: { overrideVoiceName?: string | null; overrideReadingRate?: number },
    ) => {
      return new Promise<void>((resolve, reject) => {
        if (getSpeechSynthesis().speaking) {
          stopSpeaking();
        }
        if (!selectedVoiceName.value) {
          throw new Error("No voice selected");
        }
        const utterance = new SpeechSynthesisUtterance(text);
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
        utterance.onend = () => resolve();

        // todo use this to highlight words as they are spoken
        // utterance.onboundary;

        utterance.onerror = (event) => {
          if ((["interrupted", "canceled"] as SpeechSynthesisErrorCode[]).includes(event.error)) {
            resolve(); // cancelling/stopping is not an error
            return;
          }
          console.error("utterance.onerror", event);
          toast({
            title: "Reading Out Loud Error",
            description: event.error,
          });
          reject(event);
        };

        getSpeechSynthesis().speak(utterance);
      });
    },
    [rate, selectedVoiceName.value, toast, voices],
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
function getCurrentVoiceName(currentUserId: string, availableVoices: SpeechSynthesisVoice[]) {
  const key = createStorageKey(currentUserId, "preferred_voice_name");
  let persistedValue = LocalStorage.getItem(key);
  if (!persistedValue) {
    const defaultVoice =
      availableVoices.find((voice) => voice.default) ||
      // select the first english voice as a fallback (is it possible not to have a default?)
      availableVoices.find((voice) => voice.lang === "en-US");

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
  const availableVoices = useAvailableVoices();

  useEffect(() => {
    setPreferredVoiceName(getCurrentVoiceName(user.id, availableVoices));
  }, [user.id, availableVoices]);

  useEffect(() => {
    if (preferredVoiceName) {
      LocalStorage.setItem(createStorageKey(user.id, "preferred_voice_name"), preferredVoiceName);
    }
  }, [user.id, preferredVoiceName]);

  useEffect(() => {
    setPreferredVoiceName(getCurrentVoiceName(user.id, availableVoices));
    const key = createStorageKey(user.id, "preferred_voice_name");

    function handleStorageChange(newValue: string) {
      setPreferredVoiceName(newValue);
    }
    LocalStorage.addKeyChangeListener(key, handleStorageChange);
    return () => {
      LocalStorage.removeEventListener(key, handleStorageChange);
    };
  }, [user.id, availableVoices]);

  return {
    value: preferredVoiceName,
    set: setPreferredVoiceName,
  };
}

// for debugging
export function useFlipFlop() {
  const [flipFlop, setFlipFlop] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setFlipFlop((prev) => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return flipFlop;
}

function createToastId(options: UseToastOptions): string {
  return `${options.title || ""}-${options.description || ""}`;
}

export function useCustomToast(hookOptions?: UseToastOptions) {
  const toast = useToastOriginal(hookOptions);

  return useCallback(
    (options: UseToastOptions) => {
      const id = createToastId(options);
      const isActive = toast.isActive(id);
      if (isActive) {
        return; // prevent duplicate toasts
      }
      toast({
        id,
        ...options,
      });
    },
    [toast],
  );
}

/**
 * Causes a re-render when a ref is attached to an element
 */
export function useElementRefNotifier<TElement = HTMLElement>(
  ref: MutableRefObject<TElement | null>,
) {
  const [, setFlag] = useState(false);
  return useCallback(
    (node: TElement | null) => {
      if (node) {
        ref.current = node;
        // this is to force a re-render when the ref changes
        setFlag((prev) => !prev);
      }
    },
    [ref],
  );
}
