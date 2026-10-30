"use client";

import { useCallback, useMemo } from "react";

import { useOnboardingFlags } from "./useOnboardingFlags";

import { WHATS_NEW_KEY } from "@/lib/onboarding/flag-keys";
import { unseenWhatsNew, visibleWhatsNew } from "@/lib/onboarding/progress";
import { WHATS_NEW_SHOWN } from "@/lib/onboarding/whats-new";

export function useWhatsNew() {
  const { flags, audiences, setFlag } = useOnboardingFlags();

  const entries = useMemo(() => visibleWhatsNew(WHATS_NEW_SHOWN, audiences), [audiences]);

  const unseen = useMemo(() => (flags ? unseenWhatsNew(WHATS_NEW_SHOWN, audiences, flags[WHATS_NEW_KEY]) : []), [flags, audiences]);

  const latestId = WHATS_NEW_SHOWN[0]?.id;

  const markSeen = useCallback(() => {
    if (latestId && flags?.[WHATS_NEW_KEY] !== latestId) setFlag(WHATS_NEW_KEY, latestId);
  }, [flags, latestId, setFlag]);

  return { entries, unseen, markSeen };
}
