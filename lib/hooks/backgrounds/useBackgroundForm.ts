"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useUpdateBackground } from "./useBackgrounds";

import { useNavigateFresh } from "@/lib/hooks/common";
import type { BackgroundData, BackgroundFormData } from "@/types/backgrounds";

export function useBackgroundForm(campaignId: string, background: BackgroundData) {
  const { id, ...initial } = background;

  const [data, set] = useState<BackgroundFormData>(initial);

  const [invalid, setInvalid] = useState(false);

  const router = useRouter();

  const navigateFresh = useNavigateFresh();

  const update = useUpdateBackground(campaignId);

  const href = `/campaigns/${campaignId}/dm/backgrounds`;

  const patch = (next: Partial<BackgroundFormData>) => set(prev => ({ ...prev, ...next }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (invalid) return;

    update.mutate({ backgroundId: id, data: { ...data, name: data.name.trim() } }, { onSuccess: () => navigateFresh(href) });
  };

  return {
    form: { data, set, patch },
    validation: { invalid, setInvalid },
    status: { isSaving: update.isPending },
    actions: { submit, cancel: () => router.push(href) },
  };
}
