/* eslint-disable no-console */

"use client";

import { Auth } from "@supabase/auth-ui-react";
import type { ViewType } from "@supabase/auth-ui-shared";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button, Center, Flex, Grid, Heading, Spinner, VStack } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { css } from "@emotion/react";
import { useRouter } from "next/navigation";
import type { Database } from "../../types/supabase";

// see https://supabase.com/docs/guides/auth#redirect-urls-and-wildcards
const getURL = () => {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    "http://localhost:3000/";
  // Make sure to include `https://` when not localhost, as vercel urls dont include this.
  url = url.includes("http") ? url : `https://${url}`;
  // Make sure to including trailing `/`.
  url = url.charAt(url.length - 1) === "/" ? url : `${url}/`;

  return url;
};

const viewTypes: ViewType[] = ["sign_in", "sign_up", "magic_link"];

function getViewTypeDescription(viewType: ViewType) {
  switch (viewType) {
    case "sign_in":
      return "Sign In Using Email and Password";

    case "sign_up":
      return "Sign Up Using Email and Password";

    case "forgotten_password":
      return "Forgotten Password";

    case "magic_link":
      return "Sign In/Up Using Magic Link";

    case "update_password":
      return "Update Password";

    default:
      throw new Error(`Unknown view type: ${viewType}`);
  }
}

export default function AuthForm() {
  // eslint-disable-next-line no-console
  console.log("AuthForm");
  const [currentViewType, setCurrentViewType] = useState<ViewType>("sign_in");
  const router = useRouter();
  const [isSignedIn, setIsSignedIn] = useState(false);

  const supabase = useMemo(() => createClientComponentClient<Database>(), []);

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session?.user);
    });
    void supabase.auth.getSession().then((session) => {
      if (session.data.session?.user) {
        setIsSignedIn(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    // middleware will handle redirect
    window.location.reload();
    // router.refresh(); // using this means redirect doesnt update the url in browser for some reason
  }, [isSignedIn, router]);

  const magicLinkRedirectUrl = useMemo(() => new URL("/auth/callback", getURL()).href, []);

  if (isSignedIn) {
    return (
      <Center height='100dvh' width='100%'>
        <Spinner />
      </Center>
    );
  }

  return (
    <Grid
      as='main'
      height='100dvh'
      width='100%'
      overflow='hidden'
      templateRows='1fr'
      position='fixed'
      inset={0}
    >
      <Flex
        direction='column'
        placeItems='center'
        m='auto'
        width='70%'
        css={css`
          & > :is(div, form) {
            width: inherit;
          }
        `}
        gap={3}
      >
        <Heading>{getViewTypeDescription(currentViewType)}</Heading>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            style: {
              label: {
                // background: "white", color: "black",
                fontSize: "large",
              },
              input: {
                // background: "gray", color: "white",
                fontSize: "large",
              },
            },
          }}
          theme='dark'
          view={currentViewType}
          showLinks={false}
          // see https://supabase.com/docs/guides/auth#providers
          providers={[]}
          redirectTo={magicLinkRedirectUrl}
        />
        <Heading>Or</Heading>
        <VStack width='inherit'>
          {viewTypes
            .filter((viewType) => viewType !== currentViewType)
            .map((viewType) => (
              <Button
                key={viewType}
                variant='outline'
                width='100%'
                onClick={() => setCurrentViewType(viewType)}
              >
                {getViewTypeDescription(viewType)}
              </Button>
            ))}
        </VStack>
      </Flex>
    </Grid>
  );
}
