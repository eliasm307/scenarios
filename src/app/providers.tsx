"use client";

import { CacheProvider } from "@chakra-ui/next-js";
import { ChakraProvider } from "@chakra-ui/react";
import type { User } from "@supabase/auth-helpers-nextjs";
import { createContext, useContext, useMemo, useState } from "react";
import { getSupabaseClient } from "../utils/client/supabase";

export function Providers({
  user,
  profile,
  children,
}: {
  user: User;
  profile: UserProfile;
  children: React.ReactNode;
}) {
  return (
    <CacheProvider>
      <ChakraProvider>
        <UserProvider user={user} initialProfile={profile}>
          {children}
        </UserProvider>
      </ChakraProvider>
    </CacheProvider>
  );
}

type UserProfile = {
  user_name: string;
};

export type UserContext = {
  user: User;
  profile: UserProfile;
  setUserName: (userName: string) => Promise<{ errorMessage?: string }>;
};

const userContext = createContext<UserContext | null>(null);

function UserProvider({
  children,
  user,
  initialProfile,
}: {
  children: React.ReactNode;
  user: User;
  initialProfile: UserProfile;
}) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);

  const value = useMemo(
    () => ({
      user,
      profile,
      setUserName: async (user_name: string) => {
        const result = await getSupabaseClient()
          .from("user_profiles")
          .update({ user_name })
          .eq("user_id", user.id);
        setProfile((p) => ({ ...p, user_name }));
        return {
          errorMessage: result.error?.message,
        };
      },
    }),
    [user, profile],
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
