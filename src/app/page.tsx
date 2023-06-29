import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Grid } from "../components/ChakraUI.client";
import SignInButton from "../components/SignInButton";
import Session from "../components/Session.client";
import NavBar from "../components/NavBar.client";

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
    <Grid height='100dvh' overflow='hidden' templateRows='auto 1fr' position='fixed' inset={0}>
      <NavBar zIndex={2} />
      <Session sessionId='1' />
    </Grid>
  );
}
