"use client";

import { useState } from "react";

import { skillKeys } from "./keys";

import { updateSkillAppearance } from "@/lib/api/skills";
import { useCrudMutation } from "@/lib/hooks/common";

export function useUpdateSkillAppearance(campaignId: string, skillId: string, initial: string) {
  const [data, set] = useState(initial);

  const mutation = useCrudMutation({
    mutationFn: (value: string) => updateSkillAppearance(campaignId, skillId, value || null),
    invalidateKeys: [skillKeys.list(campaignId), skillKeys.detail(campaignId, skillId)],
    errorText: "Не вдалося зберегти опис вигляду",
  });

  return { draft: { data, set }, status: { isSaving: mutation.isPending }, save: () => mutation.mutate(data) };
}
