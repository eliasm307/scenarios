"use server";

import { cookies } from "next/headers";
import type { UseToastOptions } from "@chakra-ui/react";
import { NextResponse } from "next/server";
// need to use this client for login to work
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { getSupabaseServer } from "./supabase";

const SIGN_IN_ERROR_TITLE = "Could not sign in";
const SIGN_UP_ERROR_TITLE = "Could not sign up";

export async function invokeSignInWithEmailAndPasswordAction(
  formData: FormData,
): Promise<UseToastOptions | undefined> {
  // eslint-disable-next-line no-console
  console.log("invokeSignInWithEmailAndPasswordAction invoked");
  const supabase = createServerActionClient({ cookies });

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email) {
    return {
      status: "error",
      title: SIGN_IN_ERROR_TITLE,
      description: "Email is required",
    };
  }

  if (!password) {
    return {
      status: "error",
      title: SIGN_IN_ERROR_TITLE,
      description: "Password is required",
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  console.log("invokeSignInWithEmailAndPasswordAction", { data, error });

  if (error) {
    console.error(SIGN_IN_ERROR_TITLE, error);
    return {
      status: "error",
      title: SIGN_IN_ERROR_TITLE,
      description: error.message,
    };
  }

  if (!data.session) {
    console.error("user is null");
    return {
      status: "error",
      title: SIGN_IN_ERROR_TITLE,
      description: "Sign in produced no error and returned no data",
    };
  }

  await supabase.auth.getSession();
}

export async function invokeSignUpWithEmailAndPasswordAction(
  formData: FormData,
): Promise<UseToastOptions | undefined> {
  // eslint-disable-next-line no-console
  console.log("invokeSignUpWithEmailAndPasswordAction invoked");
  const supabase = getSupabaseServer(cookies);

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email) {
    return {
      status: "error",
      title: SIGN_UP_ERROR_TITLE,
      description: "Email is required",
    };
  }

  if (!password) {
    return {
      status: "error",
      title: SIGN_UP_ERROR_TITLE,
      description: "Password is required",
    };
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    console.error(SIGN_UP_ERROR_TITLE, error);
    return {
      status: "error",
      title: SIGN_UP_ERROR_TITLE,
      description: error.message,
    };
  }

  if (!data.session) {
    console.error("user is null");
    return {
      status: "error",
      title: SIGN_UP_ERROR_TITLE,
      description: "Sign up produced no error and returned no data",
    };
  }
}

export async function invokeMagicLinkAuthAction({
  formData,
  redirectUrl,
}: {
  formData: FormData;
  redirectUrl: string;
}): Promise<UseToastOptions | undefined> {
  // eslint-disable-next-line no-console
  console.log("invokeMagicLinkAuthAction invoked");
  const supabase = getSupabaseServer(cookies);

  const response = NextResponse.next();

  const email = formData.get("email") as string;

  if (!email) {
    return {
      status: "error",
      title: SIGN_IN_ERROR_TITLE,
      description: "Email is required",
    };
  }

  console.log("invokeMagicLinkAuthAction", { email, response, url: response.url });

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectUrl },
  });

  if (error) {
    console.error(SIGN_UP_ERROR_TITLE, error);
    return {
      status: "error",
      title: SIGN_UP_ERROR_TITLE,
      description: error.message,
    };
  }

  // session and user will be null at this point
  return {
    title: "Check your email for the magic link",
  };
}
