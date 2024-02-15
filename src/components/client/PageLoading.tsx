"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import Loading from "./Loading";

// todo check if this is still relevant
export default function PageLoading({ children }: PropsWithChildren) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  if (!isLoaded) {
    return <Loading height='100dvh' />;
  }

  return children;
}
