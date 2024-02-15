/* eslint-disable no-console */
import "./globals.css";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { CommonProviders, UserProvider } from "./providers";
import { getSupabaseServer } from "../utils/server/supabase";
import PageLoading from "../components/client/PageLoading";

export const metadata: Metadata = {
  title: "Scenarios",
  // description: "Generated by create next app",
  // todo enable
  // viewport: "width=device-width, height=device-height, initial-scale=1.0",
};

// todo determine why this is needed
export const dynamic = "force-dynamic";

// todo add "Powered by Supabase and Next.js" to the footer with their logos
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  console.log("RootLayout render");
  const supabase = getSupabaseServer(cookies);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    let { data: profile } = await supabase
      .from("user_profiles")
      .select()
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      console.log("creating a user profile for the user because none exists...");
      const profileResponse = await supabase
        .from("user_profiles")
        .upsert({
          user_id: user.id,
          user_name: user.email || "Anon User 🥷🏾",
          preferred_reading_rate: 1,
        })
        .select()
        .single();

      if (profileResponse.error) {
        console.error("error creating user profile", profileResponse.error);
        // todo collect all eslint-disable comments and move them to config, also check ignored rules in eslintrc
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw profileResponse.error;
      }

      profile = profileResponse.data;

      console.log("user profile created!");
    }

    return (
      <CommonWrapper>
        <UserProvider user={user} initialProfile={profile}>
          <PageLoading>{children}</PageLoading>
        </UserProvider>
      </CommonWrapper>
    );
  }

  // this is only for /auth page
  console.warn("no user found");
  return (
    <CommonWrapper>
      <PageLoading>{children}</PageLoading>
    </CommonWrapper>
  );
}

function CommonWrapper({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body suppressHydrationWarning>
        <CommonProviders>{children}</CommonProviders>
      </body>
    </html>
  );
}
