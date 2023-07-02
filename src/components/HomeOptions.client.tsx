/* eslint-disable no-console */

"use client";

import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import { Center, Spinner } from "@chakra-ui/react";
import type { ChoiceConfig } from "./ChoiceGrid.client";
import ChoiceGrid from "./ChoiceGrid.client";

export default function HomeOptions(): React.ReactElement {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading">("idle");

  const choices = useMemo((): ChoiceConfig[] => {
    return [
      {
        id: "create",
        text: "Create a new session",
        onSelect: () => {
          console.log("create new session");
          setState("loading");
          // todo create new session in DB and get session ID
          void router.push("/sessions/1");
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
