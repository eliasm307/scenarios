import type { BoxProps } from "@chakra-ui/react";
import { Center, Spinner, Heading } from "@chakra-ui/react";

type Props = BoxProps & {
  text?: string;
  spinnerSize?: string;
};

export default function Loading({ text, spinnerSize = "2xl", ...boxProps }: Props) {
  return (
    <Center as='section' height='100%' display='flex' flexDirection='column' gap={3} {...boxProps}>
      <Spinner fontSize={spinnerSize} />
      {text && <Heading>{text}</Heading>}
    </Center>
  );
}
