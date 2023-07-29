"use client";

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  FormControl,
  FormErrorMessage,
  Input,
  FormLabel,
  useToast,
  Select,
  Slider,
  SliderFilledTrack,
  SliderMark,
  SliderThumb,
  SliderTrack,
  Tooltip,
  HStack,
  Textarea,
} from "@chakra-ui/react";
import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import type { ChakraDisclosure } from "../types";
import { useUserContext } from "../app/providers";
import { useSelectedVoiceName, getAvailableVoices } from "../utils/client/hooks";
import ReadOutLoudButton from "./ReadOutLoudButton";

type Props = {
  disclosure: ChakraDisclosure;
};

export default function UserProfileModal({ disclosure: { isOpen, onClose } }: Props) {
  const [hasChanged, setHasChanged] = useState(false);
  const [state, setState] = useState<"idle-initial" | "idle-changed" | "loading">("idle-initial");
  const toast = useToast();
  const [userNameValidationMessage, setUserNameValidationMessage] = useState("");
  const userContext = useUserContext();
  const [userName, setUserName] = useState(userContext.userProfile.user_name);
  const [tempReadingRate, setTempReadingRate] = useState(
    userContext.userProfile.preferred_reading_rate || 1,
  );
  const preferredVoiceNamePersisted = useSelectedVoiceName();
  const [tempVoiceName, setPreferredVoiceNameTemp] = useState<string>();
  const [readingDemoText, setReadingDemoText] = useState(
    "This is a test of the reading out loud system.",
  );

  useEffect(() => {
    if (preferredVoiceNamePersisted.value) {
      setPreferredVoiceNameTemp(preferredVoiceNamePersisted.value);
    }
  }, [preferredVoiceNamePersisted.value]);

  useEffect(() => {
    if (!isOpen) {
      // reset on close
      setState("idle-initial");
      setHasChanged(false);
    }
  }, [isOpen]);

  const handleError = useCallback(() => {
    setState("idle-initial");
    onClose(); // ? why close on error?
  }, [onClose]);

  const handleUserNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setUserName(e.target.value);
  }, []);

  // validate change
  useEffect(() => {
    if (!hasChanged) {
      setHasChanged(true);
    }

    if (userName) {
      if (userNameValidationMessage) {
        setUserNameValidationMessage("");
      }
    } else {
      setUserNameValidationMessage("Display name cannot be empty");
    }
  }, [hasChanged, userName, userNameValidationMessage]);

  const handleSave = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      window.speechSynthesis.cancel();
      setState("loading");

      preferredVoiceNamePersisted.set(tempVoiceName);

      const errorMessage = await userContext.updateProfile({
        user_name: userName,
        preferred_reading_rate: tempReadingRate,
      });
      if (errorMessage) {
        handleError();
        onClose();
        return;
      }

      toast({
        title: "Profile updated",
        status: "success",
      });
      onClose();
    },
    [
      preferredVoiceNamePersisted,
      tempVoiceName,
      userContext,
      userName,
      tempReadingRate,
      toast,
      onClose,
      handleError,
    ],
  );

  const isValid = !!userName && !userNameValidationMessage;

  return (
    <Modal size='lg' onClose={onClose} isOpen={isOpen} isCentered>
      <ModalOverlay />
      <ModalContent as='form' onSubmit={handleSave} m={3}>
        <ModalHeader>Update Profile</ModalHeader>
        <ModalBody display='flex' flexDirection='column' gap={5}>
          <FormControl height='100%' isInvalid={!!userNameValidationMessage} isRequired>
            <FormLabel>Display Name</FormLabel>
            <Input type='text' onChange={handleUserNameChange} value={userName} />
            {userNameValidationMessage && (
              <FormErrorMessage>{userNameValidationMessage}</FormErrorMessage>
            )}
          </FormControl>
          <FormControl>
            <FormLabel>Reading Voice</FormLabel>
            <Select
              required
              value={tempVoiceName || undefined}
              onChange={(e) => setPreferredVoiceNameTemp(e.target.value)}
            >
              {getAvailableVoices().map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Reading Speed (x{tempReadingRate})</FormLabel>
            <SliderThumbWithTooltip
              maxValue={2}
              minValue={0.5}
              defaultValue={tempReadingRate}
              onChange={setTempReadingRate}
              value={tempReadingRate}
            />
          </FormControl>
          <FormControl>
            <HStack mb={3}>
              <FormLabel flex={1}>Reading Demo</FormLabel>
              <ReadOutLoudButton
                text={readingDemoText}
                overrideVoiceName={tempVoiceName}
                overrideReadingRate={tempReadingRate}
              />
            </HStack>
            <Textarea
              placeholder='Enter text to hear out loud here'
              size='sm'
              resize='vertical'
              onChange={(e) => setReadingDemoText(e.target.value)}
              value={readingDemoText}
            />
          </FormControl>
        </ModalBody>
        <ModalFooter display='flex' gap={3}>
          <Button
            type='submit'
            colorScheme='green'
            aria-label='Save button'
            isDisabled={!hasChanged || !isValid}
            isLoading={state === "loading"}
          >
            Save
          </Button>
          <Button colorScheme='red' onClick={onClose} isDisabled={state === "loading"}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function SliderThumbWithTooltip({
  maxValue,
  minValue,
  defaultValue,
  onChange,
  value: sliderValue,
}: {
  maxValue: number;
  minValue: number;
  defaultValue: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const scaleFactor = 100 / maxValue;
  const [showTooltip, setShowTooltip] = useState(false);

  const labelStyles = {
    mt: "2",
    ml: "-2.5",
    fontSize: "sm",
  };

  return (
    <Slider
      id='slider'
      defaultValue={defaultValue * scaleFactor}
      min={minValue * scaleFactor}
      max={maxValue * scaleFactor}
      step={0.25 * scaleFactor}
      colorScheme='teal'
      onChange={(value) => onChange(value / scaleFactor)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      mb={5}
    >
      <SliderMark value={0.5 * scaleFactor} {...labelStyles} ml={0}>
        x0.5
      </SliderMark>
      <SliderMark value={scaleFactor} {...labelStyles} ml='-5'>
        Normal
      </SliderMark>
      <SliderMark value={2 * scaleFactor} {...labelStyles}>
        x2
      </SliderMark>
      <SliderTrack>
        <SliderFilledTrack />
      </SliderTrack>
      <Tooltip
        hasArrow
        bg='teal.500'
        color='white'
        placement='top'
        isOpen={showTooltip}
        label={`x${sliderValue}`}
      >
        <SliderThumb />
      </Tooltip>
    </Slider>
  );
}
