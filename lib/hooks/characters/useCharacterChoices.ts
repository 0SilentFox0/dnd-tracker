"use client";

import { useState } from "react";

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

export function useCharacterChoices({ campaignId, characterId, onSaved }: { campaignId: string; characterId: string; onSaved?: (updated: Character) => void }) {
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
      setError(e instanceof Error ? e.message : "Не вдалося зберегти вибори");
      setIssues(issuesOf(e));

      return false;
    }
  };

  return { save, isPending: mutation.isPending, error, issues, clear };
}
