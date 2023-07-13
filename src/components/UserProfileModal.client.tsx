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
} from "@chakra-ui/react";
import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import type { ChakraDisclosure } from "../types";
import { useUserContext } from "../app/providers";

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

  const handleUserNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setHasChanged(true);
      setUserName(e.target.value);
      if (e.target.value) {
        if (userNameValidationMessage) {
          setUserNameValidationMessage("");
        }
      } else {
        setUserNameValidationMessage("Display name cannot be empty");
      }
    },
    [userNameValidationMessage],
  );

  const handleSave = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setState("loading");

      const errorMessage = await userContext.setUserName(userName);
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
    [handleError, onClose, userContext, userName, toast],
  );

  const isValid = !!userName && !userNameValidationMessage;

  return (
    <Modal size='lg' onClose={onClose} isOpen={isOpen} isCentered>
      <ModalOverlay />
      <ModalContent as='form' onSubmit={handleSave} m={3}>
        <ModalHeader>Update Profile</ModalHeader>
        <ModalBody>
          <FormControl height='100%' isInvalid={!!userNameValidationMessage}>
            <FormLabel>Display Name</FormLabel>
            <Input type='text' onChange={handleUserNameChange} value={userName} />
            {userNameValidationMessage && (
              <FormErrorMessage>{userNameValidationMessage}</FormErrorMessage>
            )}
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
          <Button colorScheme='red' onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
