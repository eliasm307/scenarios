/* eslint-disable no-console */

"use client";

import type { UseToastOptions } from "@chakra-ui/react";
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Button,
  useColorModeValue,
  InputGroup,
  InputRightElement,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { useCustomToast } from "../../utils/client/hooks";
import { ShowPasswordIcon, HidePasswordIcon } from "../Icons";

type Props = {
  handleSubmit: (formData: FormData) => Promise<UseToastOptions | void>;
  submitButtonText: string;
  hidePasswordField?: boolean;
  handleSignedIn?: () => void;
};

export default function EmailPasswordForm({
  handleSubmit,
  hidePasswordField,
  submitButtonText,
  handleSignedIn,
}: Props) {
  console.log("EmailPasswordForm render");
  const toast = useCustomToast();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmitWithToast = useCallback(
    async (formData: FormData) => {
      const errorToastConfig = await handleSubmit(formData);
      if (errorToastConfig) {
        toast(errorToastConfig);
      } else {
        handleSignedIn?.();
      }
    },
    [handleSignedIn, handleSubmit, toast],
  );

  return (
    <Box
      as='form'
      action={handleSubmitWithToast}
      rounded='lg'
      width='100%'
      border='1px solid'
      borderColor={useColorModeValue("gray.100", "gray.700")}
      boxShadow='lg'
      mx='auto'
      p={8}
    >
      <Stack spacing={4}>
        <FormControl>
          <FormLabel>Email address</FormLabel>
          <Input type='email' name='email' />
        </FormControl>
        {!hidePasswordField && (
          <FormControl>
            <FormLabel>Password</FormLabel>
            <InputGroup>
              <Input type={showPassword ? "text" : "password"} name='password' />
              <InputRightElement h='full'>
                <Tooltip label={showPassword ? "Hide password" : "Show password"}>
                  <IconButton
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    variant='ghost'
                    onClick={() => setShowPassword((current) => !current)}
                    icon={showPassword ? <HidePasswordIcon /> : <ShowPasswordIcon />}
                  />
                </Tooltip>
              </InputRightElement>
            </InputGroup>
          </FormControl>
        )}
        <Button type='submit' colorScheme='green'>
          {submitButtonText}
        </Button>
      </Stack>
    </Box>
  );
}
