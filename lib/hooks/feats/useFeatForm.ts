"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useUpdateFeat } from "./useFeats";

import { useAbilityValidity } from "@/lib/hooks/abilities";
import { useNavigateFresh } from "@/lib/hooks/common";
import type { FeatFormData } from "@/types/choices";

export function useFeatForm(campaignId: string, featId: string, initial: FeatFormData) {
  const router = useRouter();

  const navigateFresh = useNavigateFresh();

  const update = useUpdateFeat(campaignId);

  const [data, set] = useState<FeatFormData>(initial);

  const abilities = useAbilityValidity();

  const listHref = `/campaigns/${campaignId}/dm/feats`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!abilities.valid) return;

    update.mutate({ featId, data: { ...data, name: data.name.trim(), icon: data.icon?.trim() || null, description: data.description?.trim() || null } }, { onSuccess: () => navigateFresh(listHref) });
  };

  return { form: { data, set }, abilities, status: { isSaving: update.isPending }, actions: { submit, cancel: () => router.push(listHref) } };
}
