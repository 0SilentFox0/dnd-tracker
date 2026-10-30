"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { scenarioKeys } from "./keys";

import { generateScenarioSummary } from "@/lib/api/scenario";
import { errorMessage } from "@/lib/utils/common/error-message";

export function useGenerateScenarioSummary(campaignId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ pageId, force }: { pageId: string; force?: boolean }) => generateScenarioSummary(campaignId, pageId, force),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scenarioKeys.summaries(campaignId) }),
  });

  return {
    generate: (pageId: string, force?: boolean) => mutation.mutate({ pageId, force }),
    pendingPageId: mutation.isPending ? mutation.variables.pageId : null,
    error: mutation.isError ? errorMessage(mutation.error, "") : null,
  };
}
