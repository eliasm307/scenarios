import type { useDisclosure } from "@chakra-ui/react";

export type ChakraDisclosure = ReturnType<typeof useDisclosure>;

export type SessionUser = {
  id: string;
  name: string;
  joinTimeMs: number;
};

export type BroadcastEventFrom<TAction extends { event: string }> = TAction & {
  type: REALTIME_LISTEN_TYPES.BROADCAST;
};
