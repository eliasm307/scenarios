import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import SignInButton from "../components/SignInButton";
import SignOutButton from "../components/SignOutButton";
import Session from "../components/Session.client";

export default async function Home() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main>
        <SignInButton />
      </main>
    );
  }

  return (
    <main>
      <SignOutButton />
      <Session sessionId='1' />
    </main>
  );
}
