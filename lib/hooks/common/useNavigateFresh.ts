"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

/** router.push + router.refresh: the target server page re-reads data the mutation changed. */
export function useNavigateFresh(): (href: string) => void {
  const router = useRouter();

  return useCallback((href: string) => {
    router.push(href);
    router.refresh();
  }, [router]);
}
