"use client";

import { CacheProvider } from "@chakra-ui/next-js";
import { ChakraProvider, useToast } from "@chakra-ui/react";
import type { User } from "@supabase/auth-helpers-nextjs";
import { createContext, useContext, useMemo, useState } from "react";
import APIClient from "../utils/client/APIClient";
import type { UserProfileRow } from "../types";

export function CommonProviders({ children }: { children: React.ReactNode }) {
  return (
    <CacheProvider>
      <ChakraProvider toastOptions={{ defaultOptions: { duration: 5000, isClosable: true } }}>
        {children}
      </ChakraProvider>
    </CacheProvider>
  );
}

type UserProfile = UserProfileRow;

export type UserContext = {
  user: User;
  userProfile: UserProfile;
  /**
   * @returns Error message if there was an error, otherwise void
   */
  setUserName: (userName: string) => Promise<string | void>;
};

const userContext = createContext<UserContext | null>(null);

export function UserProvider({
  children,
  user,
  initialProfile,
}: {
  children: React.ReactNode;
  user: User;
  initialProfile: UserProfile;
}) {
  const [userProfile, setProfile] = useState<UserProfile>(initialProfile);
  const toast = useToast();

  const value = useMemo(
    () => ({
      user,
      userProfile,
      setUserName: async (newName: string) => {
        const errorToastConfig = await APIClient.userProfiles.update({ userId: user.id, newName });
        if (errorToastConfig) {
          toast(errorToastConfig);
          return `${errorToastConfig.title}: ${errorToastConfig.description}`;
        }

        setProfile((p) => ({ ...p, user_name: newName }));
      },
    }),
    [toast, user, userProfile],
  );

  return <userContext.Provider value={value}>{children}</userContext.Provider>;
}

export function useUserContext() {
  const context = useContext(userContext);
  if (!context) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
}
