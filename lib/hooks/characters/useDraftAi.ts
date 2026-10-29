import type { Dispatch, SetStateAction } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "@tanstack/react-query";

import { backgroundStep, type RollKey } from "./draft-form-helpers";
import { characterKeys } from "./keys";
import type { RollStep } from "./useRollReveal";

import { generateBackstory, generateDraftAvatar, getBackstoryAvailability } from "@/lib/api/characters";
import { useOptionalNotify } from "@/lib/hooks/common";
import type { DraftInput } from "@/types/characters";

interface Options {
  campaignId: string;
  values: DraftInput;
  setValues: Dispatch<SetStateAction<DraftInput>>;
  start(steps: Array<RollStep<RollKey>>): void;
}

export function useDraftAi({ campaignId, values, setValues, start }: Options) {
  const t = useTranslations("characters.draft");

  const notify = useOptionalNotify();

  const availability = useQuery({ queryKey: characterKeys.backstoryAvailability(campaignId), queryFn: () => getBackstoryAvailability(campaignId), staleTime: 5 * 60_000 });

  const aiMutation = useMutation({
    mutationFn: () => generateBackstory(campaignId, { name: values.name, race: values.race, archetype: values.archetype, class: values.class, background: values.background || undefined }),
    onError: (error) => notify(error.message || t("backstoryFailed")),
    onSuccess: (res) => {
      setValues((prev) => ({ ...prev, background: res.background, goals: res.goals }));
      start([backgroundStep(res.background)]);
    },
  });

  const avatarMutation = useMutation({
    mutationFn: () => generateDraftAvatar(campaignId, { name: values.name, race: values.race, archetype: values.archetype, class: values.class }),
    onError: (error) => notify(error.message || t("avatarFailed")),
    onSuccess: (res) => setValues((prev) => ({ ...prev, avatar: res.url })),
  });

  return {
    available: availability.data?.available === true,
    run: () => aiMutation.mutate(),
    isPending: aiMutation.isPending,
    avatar: { available: availability.data?.image === true, run: () => avatarMutation.mutate(), isPending: avatarMutation.isPending },
  };
}
