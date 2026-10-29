import { useTranslations } from "next-intl";

import { characterKeys, characterWriteKeys } from "./keys";

import { type ReviewBody, reviewCharacter } from "@/lib/api/characters";
import { useCrudMutation } from "@/lib/hooks/common";

export function useReviewCharacter(campaignId: string, characterId: string) {
  const t = useTranslations("characters.review");

  const mutation = useCrudMutation({
    mutationFn: (body: ReviewBody) => reviewCharacter(campaignId, characterId, body),
    awaitInvalidation: true,
    errorText: t("saveFailed"),
    invalidateKeys: [...characterWriteKeys(campaignId), characterKeys.sheet(campaignId, characterId), characterKeys.list(campaignId, "pending", false)],
  });

  return {
    approve: async () => void (await mutation.mutateAsync({ action: "approve" })),
    returnWithNote: async (note: string) => void (await mutation.mutateAsync({ action: "return", note })),
    isPending: mutation.isPending,
  };
}
