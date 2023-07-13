"use client";

/* eslint-disable no-console */

import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import { Center, Spinner } from "@chakra-ui/react";
import { cookies } from "next/headers";
import type { ChoiceConfig } from "./ChoiceGrid.client";
import ChoiceGrid from "./ChoiceGrid.client";
import APIServer from "../utils/server/APIServer";

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

          void new APIServer(cookies).createSession().then((session) => {
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
