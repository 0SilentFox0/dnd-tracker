import { type FormEvent,useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { useMainSkills } from "./useMainSkills";
import {
  type InitialSkillFormData,
  normalizeInitialSkillData,
  parseInitialSpellAdditionalModifier,
  parseInitialSpellEnhancementTypes,
  parseInitialSpellTargetChange,
  type SpellOption,
} from "./useSkillForm-normalize";
import { buildSkillFormPayload } from "./useSkillForm-payload";
import { buildSkillFormReturn } from "./useSkillForm-return";

import { createSkill, updateSkill } from "@/lib/api/skills";
import { SpellEnhancementType } from "@/lib/constants/spell-enhancement";
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

  // Нормалізуємо initialData
  const normalizedData = normalizeInitialSkillData(initialData);

  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Basic info
  const [name, setName] = useState(normalizedData?.name || "");

  const [description, setDescription] = useState(
    normalizedData?.description || "",
  );

  const [icon, setIcon] = useState(normalizedData?.icon || "");

  const [abilities, setAbilities] = useState<Ability[]>(normalizedData?.abilities ?? []);

  const [abilitiesValid, setAbilitiesValid] = useState(true);

  // Spell and main skill
  const [spellId, setSpellId] = useState<string | null>(
    normalizedData?.spellId || null,
  );

  const [spellGroupId, setSpellGroupId] = useState<string | null>(
    normalizedData?.spellGroupId || null,
  );

  const [grantedSpellId, setGrantedSpellId] = useState<string | null>(
    normalizedData?.grantedSpellId ?? null,
  );

  const [mainSkillId, setMainSkillId] = useState<string | null>(
    normalizedData?.mainSkillId || null,
  );

  // Spell enhancement
  const [spellEnhancementTypes, setSpellEnhancementTypes] = useState<
    SpellEnhancementType[]
  >(() => {
    const base = parseInitialSpellEnhancementTypes(
      normalizedData?.spellEnhancementTypes,
    );

    const aoeIds = normalizedData?.spellAoeSpellIds ?? [];

    if (
      aoeIds.length > 0 &&
      !base.includes(SpellEnhancementType.AOE_SPELL_UNLOCK)
    ) {
      return [...base, SpellEnhancementType.AOE_SPELL_UNLOCK];
    }

    return base;
  });

  const [spellEffectIncrease, setSpellEffectIncrease] = useState(
    normalizedData?.spellEffectIncrease?.toString() || "",
  );

  const [spellTargetChange, setSpellTargetChange] = useState<string | null>(
    () => parseInitialSpellTargetChange(normalizedData?.spellTargetChange),
  );

  const [spellAdditionalModifier, setSpellAdditionalModifier] = useState<{
    modifier?: string;
    damageDice?: string;
    duration?: number;
  }>(() =>
    parseInitialSpellAdditionalModifier(
      normalizedData?.spellAdditionalModifier,
    ),
  );

  const [spellNewSpellId, setSpellNewSpellId] = useState<string | null>(
    normalizedData?.spellNewSpellId || null,
  );

  const [spellAllowMultipleTargets] = useState(
    normalizedData?.spellAllowMultipleTargets === true,
  );

  const [spellAoeSpellIds, setSpellAoeSpellIds] = useState<string[]>(
    () => normalizedData?.spellAoeSpellIds ?? [],
  );

  useEffect(() => {
    setSpellEnhancementTypes((types) => {
      const hasAoe = types.includes(SpellEnhancementType.AOE_SPELL_UNLOCK);

      if (spellAoeSpellIds.length > 0 && !hasAoe) {
        return [...types, SpellEnhancementType.AOE_SPELL_UNLOCK];
      }

      if (spellAoeSpellIds.length === 0 && hasAoe) {
        return types.filter((t) => t !== SpellEnhancementType.AOE_SPELL_UNLOCK);
      }

      return types;
    });
  }, [spellAoeSpellIds]);

  // Handlers
  const handleEnhancementTypeToggle = useCallback(
    (type: SpellEnhancementType) => {
      setSpellEnhancementTypes((prev) => {
        if (prev.includes(type)) {
          if (type === SpellEnhancementType.AOE_SPELL_UNLOCK) {
            setSpellAoeSpellIds([]);
          }

          return prev.filter((t) => t !== type);
        }

        return [...prev, type];
      });
    },
    [],
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
      spellEnhancementTypes,
      spellEffectIncrease,
      spellTargetChange,
      spellAdditionalModifier,
      spellNewSpellId,
      spellAllowMultipleTargets,
      spellAoeSpellIds,
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
    spellEnhancementTypes,
    spellEffectIncrease,
    spellTargetChange,
    spellAdditionalModifier,
    spellNewSpellId,
    spellAllowMultipleTargets,
    spellAoeSpellIds,
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

        // Інвалідуємо кеш для скілів
        await queryClient.invalidateQueries({
          queryKey: ["skills", campaignId],
        });
        await queryClient.refetchQueries({
          queryKey: ["skills", campaignId],
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
    setAbilities,
    setAbilitiesValid,
    spellId,
    spellGroupId,
    grantedSpellId,
    setSpellId,
    setSpellGroupId,
    setGrantedSpellId,
    spellEnhancementTypes,
    spellEffectIncrease,
    spellTargetChange,
    spellAdditionalModifier,
    spellNewSpellId,
    spellAllowMultipleTargets,
    spellAoeSpellIds,
    setSpellEffectIncrease,
    setSpellTargetChange,
    setSpellAdditionalModifier,
    setSpellNewSpellId,
    setSpellAoeSpellIds,
    handleEnhancementTypeToggle,
    mainSkillId,
    setMainSkillId,
    handleSubmit,
  });
}
