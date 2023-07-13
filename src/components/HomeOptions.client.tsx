"use client";

/* eslint-disable no-console */

import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import { Center, Spinner } from "@chakra-ui/react";
import type { ChoiceConfig } from "./ChoiceGrid.client";
import ChoiceGrid from "./ChoiceGrid.client";
import APIClient from "../utils/client/APIClient";

export default function HomeOptions(): React.ReactElement {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading">("idle");

  const choices = useMemo((): ChoiceConfig[] => {
    return [
      {
        text: "Create a new session",
        onSelect: () => {
          console.log("create new session");
          setState("loading");

          void APIClient.sessions.create().then((session) => {
            // eslint-disable-next-line functional-core/purity
            return router.push(`/sessions/${session.id}`);
          });
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
