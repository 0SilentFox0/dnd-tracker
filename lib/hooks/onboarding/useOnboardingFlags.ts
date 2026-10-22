"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { onboardingKeys } from "./keys";

import { getOnboardingFlags, resetOnboarding, setOnboardingFlag } from "@/lib/api/onboarding";
import { hintKey } from "@/lib/onboarding/flag-keys";
import { isHintHidden } from "@/lib/onboarding/progress";
import type { OnboardingRole } from "@/lib/onboarding/types";
import type { OnboardingFlagsResponse, ResetScope, SetFlagBody } from "@/types/onboarding";

const NO_AUDIENCES: OnboardingRole[] = [];

export function useOnboardingFlags() {
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: onboardingKeys.flags(), queryFn: getOnboardingFlags, staleTime: Infinity, retry: false });

  const { mutate: write } = useMutation({
    mutationFn: setOnboardingFlag,
    onMutate: ({ key, value }: SetFlagBody) => {
      qc.setQueryData<OnboardingFlagsResponse>(onboardingKeys.flags(), (prev) => (prev ? { ...prev, flags: { ...prev.flags, [key]: value ?? null } } : prev));
    },
  });

  const { mutate: resetMutate } = useMutation({
    mutationFn: resetOnboarding,
    onSuccess: (_data, scope) => {
      qc.invalidateQueries({ queryKey: onboardingKeys.flags() });

      if (scope === "checklists") qc.invalidateQueries({ queryKey: onboardingKeys.campaigns() });
    },
  });

  const setFlag = useCallback((key: string, value: string | null = null) => write({ key, value }), [write]);

  const reset = useCallback((scope: ResetScope) => resetMutate(scope), [resetMutate]);

  return { flags: data?.flags ?? null, audiences: data?.audiences ?? NO_AUDIENCES, setFlag, reset };
}

export function useOnboardingHint(id: string) {
  const { flags, setFlag } = useOnboardingFlags();

  const dismiss = useCallback(() => setFlag(hintKey(id)), [setFlag, id]);

  return { visible: !!flags && !isHintHidden(id, flags), dismiss };
}
