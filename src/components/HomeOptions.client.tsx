/* eslint-disable no-console */

"use client";

import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import { Center, Spinner } from "@chakra-ui/react";
import ChoiceGrid from "./ChoiceCard.client";

export default function HomeOptions(): React.ReactElement {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading">("idle");

  const choices = useMemo(() => {
    return [
      {
        text: "Create a new session",
        onSelect: () => {
          console.log("create new session");
          setState("loading");
          // todo create new session in DB and get session ID
          void router.push("/sessions/1");
        },
      },
      {
        text: "Join an existing session",
        onSelect: () => {
          setState("loading");
          console.log("join existing session");
        },
      },
    ];
  }, [router]);

  if (state === "loading") {
    return (
      <Center as='section' height='100%'>
        <Spinner />
      </Center>
    );
  }

  return <ChoiceGrid choices={choices} />;
}
