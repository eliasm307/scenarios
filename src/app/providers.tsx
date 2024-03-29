"use client";

import { CacheProvider } from "@chakra-ui/next-js";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import type { User } from "@supabase/auth-helpers-nextjs";
import { createContext, useContext, useMemo, useState } from "react";
import APIClient from "../utils/client/APIClient";
import type { UserProfileRow } from "../types";
import { useCustomToast } from "../utils/client/hooks";

export function CommonProviders({ children }: { children: React.ReactNode }) {
  return (
    <CacheProvider>
      <ChakraProvider toastOptions={{ defaultOptions: { duration: 5000, isClosable: true } }}>
        <ColorModeScript />
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
  updateProfile: (updates: Partial<UserProfile>) => Promise<string | void>;
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
  const toast = useCustomToast();

  const value = useMemo(
    () =>
      ({
        user,
        userProfile,
        updateProfile: async (updates) => {
          const errorToastConfig = await APIClient.userProfiles.update({
            userId: user.id,
            updates,
          });
          if (errorToastConfig) {
            toast(errorToastConfig);
            return `${errorToastConfig.title}: ${errorToastConfig.description}`;
          }

          setProfile((p) => ({ ...p, ...updates }));
        },
      }) satisfies UserContext,
    [toast, user, userProfile],
  );

  return <userContext.Provider value={value}>{children}</userContext.Provider>;
}

export function useUserContext(config?: { allowUnauthenticated: false }): UserContext;
export function useUserContext(config: { allowUnauthenticated: true }): UserContext | null;
export function useUserContext(config?: { allowUnauthenticated: boolean }): UserContext | null {
  const context = useContext(userContext);
  if (!context && !config?.allowUnauthenticated) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
}
