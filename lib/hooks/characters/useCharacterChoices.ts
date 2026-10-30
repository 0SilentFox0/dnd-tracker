"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { levelUpInvalidateKeys } from "./useCharacters";

import { putCharacterChoices } from "@/lib/api/characters";
import { ApiError } from "@/lib/api/client";
import { useCrudMutation } from "@/lib/hooks/common";
import type { Character } from "@/types/characters";
import type { ChoiceIssue, ChoicesBody } from "@/types/choices";

const issuesOf = (e: unknown): ChoiceIssue[] => {
  const issues = e instanceof ApiError ? (e.body as { issues?: unknown } | undefined)?.issues : undefined;

  return Array.isArray(issues) ? (issues as ChoiceIssue[]) : [];
};

/** issues are already shown next to their pickers, so the banner carries only the headline, not the merged details */
export const choiceSaveError = (e: unknown, fallback: string): string => {
  if (!(e instanceof ApiError)) return e instanceof Error ? e.message : fallback;

  const { error, issues } = (e.body ?? {}) as { error?: unknown; issues?: unknown };

  return Array.isArray(issues) && issues.length > 0 && typeof error === "string" ? error : e.message;
};

export function useCharacterChoices({ campaignId, characterId, onSaved }: { campaignId: string; characterId: string; onSaved?: (updated: Character) => void }) {
  const t = useTranslations("characterProfile.choices");

  const [error, setError] = useState<string | null>(null);

  const [issues, setIssues] = useState<ChoiceIssue[]>([]);

  const mutation = useCrudMutation({ mutationFn: (body: ChoicesBody) => putCharacterChoices(campaignId, characterId, body), invalidateKeys: levelUpInvalidateKeys(campaignId) });

  const clear = () => {
    setError(null);
    setIssues([]);
  };

  const save = async (body: ChoicesBody) => {
    clear();

    try {
      onSaved?.(await mutation.mutateAsync(body));

      return true;
    } catch (e) {
      setError(choiceSaveError(e, t("saveFailed")));
      setIssues(issuesOf(e));

      return false;
    }
  };

  return { save, isPending: mutation.isPending, error, issues, clear };
}
