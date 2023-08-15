/* eslint-disable no-console */

"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button, Divider, HStack, Heading, VStack } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "../../types/supabase";
import EmailPasswordForm from "./EmailPasswordForm";
import {
  invokeMagicLinkAuthAction,
  invokeSignInWithEmailAndPasswordAction,
  invokeSignUpWithEmailAndPasswordAction,
} from "../../utils/server/authActions";
import Loading from "./Loading";

// see https://supabase.com/docs/guides/auth#redirect-urls-and-wildcards
const getBaseURL = () => {
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

type ViewType = "sign_in" | "sign_up" | "magic_link";

const viewTypes: ViewType[] = [
  "sign_in",
  "sign_up",
  // this has issues, leaving it out for now
  // "magic_link"
];

function getViewTypeDescription(viewType: ViewType) {
  switch (viewType) {
    case "sign_in":
      return "Sign In";

    case "sign_up":
      return "Sign Up";

    case "magic_link":
      return "Create Magic Link";

    // case "forgotten_password":
    // return "Forgotten Password";

    // case "update_password":
    //   return "Update Password";

    default:
      throw new Error(`Unknown view type: ${viewType}`);
  }
}

function getMagicLinkRedirectUrl() {
  const redirectUrl = new URL("/auth/callback", getBaseURL());
  // ! adding query params currently breaks the redirect so cant redirect users to their target page automatically
  // const currentUrl = new URL(window.location.href);
  // const nextPath = currentUrl.searchParams.get("next");
  // if (nextPath) {
  //   redirectUrl.searchParams.set("nextUrl", new URL(nextPath, getBaseURL()).href);
  // }
  const url = redirectUrl.href;
  console.log("getMagicLinkRedirectUrl", url);
  return url;
}

export default function AuthForm() {
  // eslint-disable-next-line no-console
  console.log("AuthForm render");
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
    // router.refresh(); // using this means redirect doesn't update the url in browser for some reason
  }, [isSignedIn, router]);

  if (isSignedIn) {
    return <Loading height='100dvh' />;
  }

  return (
    <VStack as='main' width='100%' overflow='hidden' maxW='lg' m='auto'>
      {currentViewType === "sign_in" && (
        <EmailPasswordForm
          submitButtonText='Sign In'
          handleSubmit={invokeSignInWithEmailAndPasswordAction}
          handleSignedIn={() => setIsSignedIn(true)}
        />
      )}
      {currentViewType === "sign_up" && (
        <EmailPasswordForm
          submitButtonText='Sign Up'
          handleSubmit={invokeSignUpWithEmailAndPasswordAction}
          handleSignedIn={() => setIsSignedIn(true)}
        />
      )}
      {currentViewType === "magic_link" && (
        <EmailPasswordForm
          submitButtonText='Send Magic Link'
          hidePasswordField
          handleSubmit={(formData) =>
            invokeMagicLinkAuthAction({ formData, redirectUrl: getMagicLinkRedirectUrl() })
          }
        />
      )}
      <HStack width='100%' py={5}>
        <Divider flex={1} />
        <Heading as='h2' pb={1}>
          Or
        </Heading>
        <Divider flex={1} />
      </HStack>
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
        H
      </VStack>
    </VStack>
  );
}
