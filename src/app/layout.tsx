/* eslint-disable no-console */
import "./globals.css";
import type { Metadata } from "next";
import { CommonProviders, UserProvider } from "./providers";
import { getSupabaseServer } from "../utils/server/supabase";

export const metadata: Metadata = {
  title: "Scenarios",
  // description: "Generated by create next app",
  icons: "/assets/openai.png",
  // todo enable
  // viewport: "width=device-width, height=device-height, initial-scale=1.0",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  console.log("RootLayout");
  const supabase = getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    console.log("user found, loading profile...");
    let { data: profile } = await supabase
      .from("user_profiles")
      .select("user_name")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      profile = {
        user_name: user.email || "Anon User 🥷🏾",
      };

      console.log("creating a user profile for the user because none exists...");
      await supabase.from("user_profiles").upsert({
        ...profile,
        user_id: user.id,
      });
      console.log("user profile created!");
    } else {
      console.log("user profile already exists");
    }

    return (
      <CommonWrapper>
        <UserProvider user={user} initialProfile={profile}>
          {children}
        </UserProvider>
      </CommonWrapper>
    );
  }

  console.log("no user found");
  return <CommonWrapper>{children}</CommonWrapper>;
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
