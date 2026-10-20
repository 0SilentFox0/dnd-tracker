"use client";

import { useQueryClient } from "@tanstack/react-query";

import { scenarioKeys } from "./keys";

import { patchScenarioSection } from "@/lib/api/scenario";
import { useCrudMutation } from "@/lib/hooks/common";
import type { ScenarioPage, ScenarioSectionPatch } from "@/types/scenario";

export function useSectionProgress(campaignId: string, pageId: string) {
  const queryClient = useQueryClient();

  const key = scenarioKeys.page(campaignId, pageId);

  const mutation = useCrudMutation({
    mutationFn: ({ sectionId, patch }: { sectionId: string; patch: ScenarioSectionPatch }) => patchScenarioSection(campaignId, pageId, sectionId, patch),
    errorText: "Не вдалося оновити розділ — перезавантажте сторінку",
    onSuccess: ({ version, section }) =>
      queryClient.setQueryData<ScenarioPage>(key, (old) => old && { ...old, version, content: { ...old.content, sections: old.content.sections.map((s) => (s.id === section.id ? section : s)) } }),
    onError: () => void queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    setPlayed: (sectionId: string, played: boolean) => mutation.mutateAsync({ sectionId, patch: { played } }).then(() => undefined),
    setRevealed: (sectionId: string, revealed: boolean) => mutation.mutateAsync({ sectionId, patch: { revealed } }).then(() => undefined),
    isPending: mutation.isPending,
  };
}
