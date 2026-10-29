"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { spellKeys } from "./keys";

import { updateSpellAppearance } from "@/lib/api/spells";
import { useCrudMutation } from "@/lib/hooks/common";

export function useUpdateSpellAppearance(campaignId: string, spellId: string, initial: string) {
  const t = useTranslations("spellEditor");

  const [data, set] = useState(initial);

  const mutation = useCrudMutation({
    mutationFn: (value: string) => updateSpellAppearance(campaignId, spellId, value || null),
    invalidateKeys: [spellKeys.list(campaignId), spellKeys.detail(campaignId, spellId)],
    errorText: t("appearance.saveFailed"),
  });

  return { draft: { data, set }, status: { isSaving: mutation.isPending }, save: () => mutation.mutate(data) };
}
