import { type FormEvent,useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { skillKeys } from "./keys";
import { useMainSkills } from "./useMainSkills";
import {
  type InitialSkillFormData,
  normalizeInitialSkillData,
  type SpellOption,
} from "./useSkillForm-normalize";
import { buildSkillFormPayload } from "./useSkillForm-payload";
import { buildSkillFormReturn } from "./useSkillForm-return";

import { createSkill, updateSkill } from "@/lib/api/skills";
import { abilitySaveError } from "@/lib/hooks/abilities";
import type { Ability } from "@/lib/utils/abilities/schema";
import type { GroupedSkillPayload } from "@/types/hooks";
import type { MainSkill } from "@/types/main-skills";

export function useSkillForm(
  campaignId: string,
  spells: SpellOption[],
  initialData?: InitialSkillFormData,
  /** Якщо передано, не робимо GET /main-skills (дані вже з сервера) */
  initialMainSkills?: MainSkill[],
) {
  const router = useRouter();

  const queryClient = useQueryClient();

  const { data: mainSkillsFromApi = [] } = useMainSkills(campaignId, {
    enabled: initialMainSkills === undefined,
  });

  const mainSkills = initialMainSkills ?? mainSkillsFromApi;

  const isEdit = !!initialData;

  const normalizedData = normalizeInitialSkillData(initialData);

  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(normalizedData?.name || "");

  const [description, setDescription] = useState(
    normalizedData?.description || "",
  );

  const [icon, setIcon] = useState(normalizedData?.icon || "");

  const [abilities, setAbilities] = useState<Ability[]>(normalizedData?.abilities ?? []);

  const [abilityErrors, setAbilityErrors] = useState(0);

  const abilitiesValid = abilityErrors === 0;

  const [spellId, setSpellId] = useState<string | null>(
    normalizedData?.spellId || null,
  );

  const [spellGroupId, setSpellGroupId] = useState<string | null>(
    normalizedData?.spellGroupId || null,
  );

  const [grantedSpellId, setGrantedSpellId] = useState<string | null>(
    normalizedData?.grantedSpellId ?? normalizedData?.spellNewSpellId ?? null,
  );

  const [mainSkillId, setMainSkillId] = useState<string | null>(
    normalizedData?.mainSkillId || null,
  );

  const createPayload = useCallback((): GroupedSkillPayload => {
    return buildSkillFormPayload({
      name,
      description,
      icon,
      abilities,
      spellId,
      spellGroupId,
      grantedSpellId,
      mainSkillId,
    });
  }, [
    name,
    description,
    icon,
    abilities,
    spellId,
    spellGroupId,
    grantedSpellId,
    mainSkillId,
  ]);

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (!name.trim() || !abilitiesValid) return;

      setIsSaving(true);
      setError(null);

      try {
        const payload = createPayload();

        if (isEdit && normalizedData?.id) {
          await updateSkill(campaignId, normalizedData.id, payload);
        } else {
          await createSkill(campaignId, payload);
        }

        await queryClient.invalidateQueries({
          queryKey: skillKeys.list(campaignId),
        });
        await queryClient.refetchQueries({
          queryKey: skillKeys.list(campaignId),
        });
        router.push(`/campaigns/${campaignId}/dm/skills`);
      } catch (err) {
        setError(abilitySaveError(err, "Помилка створення"));
      } finally {
        setIsSaving(false);
      }
    },
    [
      createPayload,
      isEdit,
      normalizedData?.id,
      campaignId,
      queryClient,
      router,
      name,
      abilitiesValid,
    ],
  );

  return buildSkillFormReturn({
    isSaving,
    error,
    isEdit,
    mainSkills,
    name,
    description,
    icon,
    setName,
    setDescription,
    setIcon,
    abilities,
    abilityIssues: normalizedData?.abilityIssues ?? [],
    abilitiesValid,
    abilityErrors,
    setAbilities,
    setAbilityErrors,
    spellId,
    spellGroupId,
    grantedSpellId,
    setSpellId,
    setSpellGroupId,
    setGrantedSpellId,
    mainSkillId,
    setMainSkillId,
    handleSubmit,
  });
}
