"use client";

/* eslint-disable no-console */

import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import { VStack } from "@chakra-ui/react";
import type { ChoiceConfig } from "../ChoiceGrid.client";
import ChoiceGrid from "../ChoiceGrid.client";
import { invokeCreateSessionAction } from "../../utils/server/actions";
import Loading from "./Loading";

export default function HomeOptions(): React.ReactElement {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading">("idle");
  const [loadingText, setLoadingText] = useState("");

  const choices = useMemo((): ChoiceConfig[] => {
    return [
      {
        text: "Create a new session",
        onSelect: () => {
          console.log("create new session");
          setState("loading");
          setLoadingText("Creating session...");

          void invokeCreateSessionAction().then((session) => {
            console.log("created session with id", session.id);
            // eslint-disable-next-line functional-core/purity
            return router.push(`/sessions/${session.id}`);
          });
        },
      },
    ];
  }, [router]);

  if (state === "loading") {
    console.log("home options loading...");
    return <Loading key='loading' marginTop={10} text={loadingText} />;
  }

  return (
    <VStack>
      <ChoiceGrid choices={choices} />
    </VStack>
  );
}
