import { useCallback, useState } from "react";
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
import type { SkillEffect } from "@/types/battle";
import type { GroupedSkillPayload } from "@/types/hooks";
import type { MainSkill } from "@/types/main-skills";
import type { SkillTriggers } from "@/types/skill-triggers";

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

  // Effects & targeting
  const [effects, setEffects] = useState<SkillEffect[]>(
    normalizedData?.effects || [],
  );

  const [minTargets, setMinTargets] = useState(
    normalizedData?.min_targets?.toString() || "",
  );

  const [maxTargets, setMaxTargets] = useState(
    normalizedData?.max_targets?.toString() || "",
  );

  const [affectsDamage, setAffectsDamage] = useState(
    normalizedData?.affectsDamage ?? false,
  );

  const [damageType, setDamageType] = useState<
    "melee" | "ranged" | "magic" | null
  >(normalizedData?.damageType ?? null);

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
  >(() =>
    parseInitialSpellEnhancementTypes(normalizedData?.spellEnhancementTypes),
  );

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

  // Skill triggers
  const [skillTriggers, setSkillTriggers] = useState<SkillTriggers>(
    (normalizedData?.skillTriggers as SkillTriggers) || [],
  );

  // Handlers
  const handleEnhancementTypeToggle = useCallback(
    (type: SpellEnhancementType) => {
      setSpellEnhancementTypes((prev) =>
        prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
      );
    },
    [],
  );

  const createPayload = useCallback((): GroupedSkillPayload => {
    return buildSkillFormPayload({
      name,
      description,
      icon,
      minTargets,
      maxTargets,
      effects,
      affectsDamage,
      damageType,
      spellId,
      spellGroupId,
      grantedSpellId,
      mainSkillId,
      spellEnhancementTypes,
      spellEffectIncrease,
      spellTargetChange,
      spellAdditionalModifier,
      spellNewSpellId,
      skillTriggers,
    });
  }, [
    name,
    description,
    icon,
    minTargets,
    maxTargets,
    effects,
    affectsDamage,
    damageType,
    spellId,
    spellGroupId,
    grantedSpellId,
    mainSkillId,
    spellEnhancementTypes,
    spellEffectIncrease,
    spellTargetChange,
    spellAdditionalModifier,
    spellNewSpellId,
    skillTriggers,
  ]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (!name.trim()) return;

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
        const message =
          err instanceof Error ? err.message : "Помилка створення";

        setError(message);
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
    effects,
    minTargets,
    maxTargets,
    setEffects,
    setMinTargets,
    setMaxTargets,
    affectsDamage,
    damageType,
    setAffectsDamage,
    setDamageType,
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
    setSpellEffectIncrease,
    setSpellTargetChange,
    setSpellAdditionalModifier,
    setSpellNewSpellId,
    handleEnhancementTypeToggle,
    mainSkillId,
    setMainSkillId,
    skillTriggers,
    setSkillTriggers,
    handleSubmit,
  });
}
