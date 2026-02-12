import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { useMainSkills } from "./useMainSkills";

import { createSkill, updateSkill } from "@/lib/api/skills";
import { SpellEnhancementType } from "@/lib/constants/spell-enhancement";
import type { SkillEffect } from "@/types/battle";
import type { GroupedSkillPayload } from "@/types/hooks";
import type { MainSkill } from "@/types/main-skills";
import type { SkillTriggers } from "@/types/skill-triggers";
import type { GroupedSkill, Skill } from "@/types/skills";

interface SpellOption {
  id: string;
  name: string;
}

// Підтримуємо обидві структури для сумісності
type InitialData =
  | Skill
  | GroupedSkill
  | {
      id: string;
      name: string;
      description: string | null;
      icon: string | null;
      bonuses: unknown;
      damage: number | null;
      armor: number | null;
      speed: number | null;
      physicalResistance: number | null;
      magicalResistance: number | null;
      spellId: string | null;
      spellGroupId: string | null;
      grantedSpellId?: string | null;
      mainSkillId: string | null;
      spellEnhancementTypes?: unknown;
      spellEffectIncrease?: number | null;
      spellTargetChange?: unknown;
      spellAdditionalModifier?: unknown;
      spellNewSpellId?: string | null;
      skillTriggers?: SkillTriggers;
    };

// ---------- Нормалізовані дані ----------

interface NormalizedData {
  id?: string;
  name: string;
  description: string | null;
  icon: string | null;
  min_targets?: number | null;
  max_targets?: number | null;
  effects?: SkillEffect[];
  spellId: string | null;
  spellGroupId: string | null;
  grantedSpellId?: string | null;
  mainSkillId: string | null;
  spellEnhancementTypes?: unknown;
  spellEffectIncrease?: number | null;
  spellTargetChange?: unknown;
  spellAdditionalModifier?: unknown;
  spellNewSpellId?: string | null;
  skillTriggers?: SkillTriggers;
}

/**
 * Адаптер для конвертації згрупованої структури в плоску для сумісності
 */
function normalizeInitialData(data: InitialData | undefined): NormalizedData | undefined {
  if (!data) return undefined;

  // Якщо це згрупована структура
  if ("basicInfo" in data && "combatStats" in data) {
    const grouped = data as GroupedSkill;

    return {
      id: grouped.id,
      name: grouped.basicInfo.name,
      description: grouped.basicInfo.description || null,
      icon: grouped.basicInfo.icon || null,
      min_targets: grouped.combatStats.min_targets || null,
      max_targets: grouped.combatStats.max_targets || null,
      effects: grouped.combatStats.effects || [],
      spellId: grouped.spellData.spellId || null,
      spellGroupId: grouped.spellData.spellGroupId || null,
      grantedSpellId: grouped.spellData.grantedSpellId ?? null,
      mainSkillId: grouped.mainSkillData.mainSkillId || null,
      spellEnhancementTypes: grouped.spellEnhancementData.spellEnhancementTypes,
      spellEffectIncrease:
        grouped.spellEnhancementData.spellEffectIncrease || null,
      spellTargetChange: grouped.spellEnhancementData.spellTargetChange || null,
      spellAdditionalModifier:
        grouped.spellEnhancementData.spellAdditionalModifier || null,
      spellNewSpellId: grouped.spellEnhancementData.spellNewSpellId || null,
      skillTriggers: grouped.skillTriggers,
    };
  }

  // Плоска структура (Skill або старий формат)
  return data as unknown as NormalizedData;
}

// ---------- Утиліти парсингу ----------

const parseInitialSpellEnhancementTypes = (
  types: unknown,
): SpellEnhancementType[] => {
  if (Array.isArray(types)) {
    return types as SpellEnhancementType[];
  }

  return [];
};

const parseInitialSpellTargetChange = (
  targetChange: unknown,
): string | null => {
  if (
    targetChange &&
    typeof targetChange === "object" &&
    targetChange !== null &&
    "target" in targetChange
  ) {
    return (targetChange as { target: string }).target;
  }

  return null;
};

const parseInitialSpellAdditionalModifier = (
  modifier: unknown,
): {
  modifier?: string;
  damageDice?: string;
  duration?: number;
} => {
  if (modifier && typeof modifier === "object" && modifier !== null) {
    return modifier as {
      modifier?: string;
      damageDice?: string;
      duration?: number;
    };
  }

  return {
    modifier: undefined,
    damageDice: "",
    duration: undefined,
  };
};

// ---------- Hook ----------

export function useSkillForm(
  campaignId: string,
  spells: SpellOption[],
  initialData?: InitialData,
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
  const normalizedData = normalizeInitialData(initialData);

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

  // Функція для створення payload з поточного стану
  const createPayload = useCallback((): GroupedSkillPayload => {
    const parseNumber = (value: string): number | undefined => {
      return value ? parseInt(value, 10) : undefined;
    };

    return {
      basicInfo: {
        name: name.trim(),
        description: description.trim() || undefined,
        icon: icon.trim() || undefined,
      },
      bonuses: {},
      combatStats: {
        min_targets: parseNumber(minTargets),
        max_targets: parseNumber(maxTargets),
        effects: effects.length > 0 ? effects : undefined,
      },
      spellData: {
        spellId: spellId || undefined,
        spellGroupId: spellGroupId || undefined,
        grantedSpellId: grantedSpellId || undefined,
      },
      spellEnhancementData: {
        spellEnhancementTypes:
          spellEnhancementTypes.length > 0 ? spellEnhancementTypes : undefined,
        spellEffectIncrease: parseNumber(spellEffectIncrease),
        spellTargetChange:
          spellTargetChange &&
          spellEnhancementTypes.includes(SpellEnhancementType.TARGET_CHANGE)
            ? {
                target: spellTargetChange as "enemies" | "allies" | "all",
              }
            : undefined,
        spellAdditionalModifier:
          spellEnhancementTypes.includes(
            SpellEnhancementType.ADDITIONAL_MODIFIER,
          ) && spellAdditionalModifier.modifier
            ? {
                modifier: spellAdditionalModifier.modifier,
                damageDice: spellAdditionalModifier.damageDice || undefined,
                duration: spellAdditionalModifier.duration || undefined,
              }
            : undefined,
        spellNewSpellId: spellNewSpellId || undefined,
      },
      mainSkillData: {
        mainSkillId: mainSkillId || undefined,
      },
      skillTriggers: skillTriggers.length > 0 ? skillTriggers : undefined,
    };
  }, [
    name,
    description,
    icon,
    minTargets,
    maxTargets,
    effects,
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

  return {
    // Common state
    isSaving,
    error,
    isEdit,
    mainSkills,
    // Basic info group
    basicInfo: {
      name,
      description,
      icon,
      setters: {
        setName,
        setDescription,
        setIcon,
      },
    },
    // Effects & targeting group
    effectsGroup: {
      effects,
      minTargets,
      maxTargets,
      setters: {
        setEffects,
        setMinTargets,
        setMaxTargets,
      },
    },
    // Spell group
    spell: {
      spellId,
      spellGroupId,
      grantedSpellId,
      setters: {
        setSpellId,
        setSpellGroupId,
        setGrantedSpellId,
      },
    },
    // Spell enhancement group
    spellEnhancement: {
      spellEnhancementTypes,
      spellEffectIncrease,
      spellTargetChange,
      spellAdditionalModifier,
      spellNewSpellId,
      setters: {
        setSpellEffectIncrease,
        setSpellTargetChange,
        setSpellAdditionalModifier,
        setSpellNewSpellId,
      },
      handlers: {
        handleEnhancementTypeToggle,
      },
    },
    // Main skill group
    mainSkill: {
      mainSkillId,
      setters: {
        setMainSkillId,
      },
    },
    // Skill triggers group
    skillTriggers: {
      skillTriggers,
      setters: {
        setSkillTriggers,
      },
    },
    // Form handler
    handleSubmit,
  };
}
