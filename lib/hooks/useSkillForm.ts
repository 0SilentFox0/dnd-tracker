import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { useMainSkills } from "./useMainSkills";
import { useRaces } from "./useRaces";

import { createSkill, updateSkill } from "@/lib/api/skills";
import { SpellEnhancementType } from "@/lib/constants/spell-enhancement";
import type { GroupedSkillPayload } from "@/types/hooks";
import type { Race } from "@/types/races";
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
      races: unknown;
      isRacial: boolean;
      bonuses: unknown;
      damage: number | null;
      armor: number | null;
      speed: number | null;
      physicalResistance: number | null;
      magicalResistance: number | null;
      spellId: string | null;
      spellGroupId: string | null;
      mainSkillId: string | null;
      spellEnhancementTypes?: unknown;
      spellEffectIncrease?: number | null;
      spellTargetChange?: unknown;
      spellAdditionalModifier?: unknown;
      spellNewSpellId?: string | null;
      skillTriggers?: SkillTriggers;
    };

/**
 * Адаптер для конвертації згрупованої структури в плоску для сумісності
 */
const normalizeInitialData = (
  data: InitialData | undefined,
):
  | {
      id?: string;
      name: string;
      description: string | null;
      icon: string | null;
      races: unknown;
      isRacial: boolean;
      bonuses: unknown;
      damage: number | null;
      armor: number | null;
      speed: number | null;
      physicalResistance: number | null;
      magicalResistance: number | null;
      min_targets?: number | null;
      max_targets?: number | null;
      spellId: string | null;
      spellGroupId: string | null;
      mainSkillId: string | null;
      spellEnhancementTypes?: unknown;
      spellEffectIncrease?: number | null;
      spellTargetChange?: unknown;
      spellAdditionalModifier?: unknown;
      spellNewSpellId?: string | null;
      skillTriggers?: SkillTriggers;
    }
  | undefined => {
  if (!data) return undefined;

  // Якщо це згрупована структура
  if ("basicInfo" in data && "combatStats" in data) {
    const grouped = data as GroupedSkill;

    return {
      id: grouped.id,
      name: grouped.basicInfo.name,
      description: grouped.basicInfo.description || null,
      icon: grouped.basicInfo.icon || null,
      races: grouped.basicInfo.races,
      isRacial: grouped.basicInfo.isRacial,
      bonuses: grouped.bonuses,
      damage: grouped.combatStats.damage || null,
      armor: grouped.combatStats.armor || null,
      speed: grouped.combatStats.speed || null,
      physicalResistance: grouped.combatStats.physicalResistance || null,
      magicalResistance: grouped.combatStats.magicalResistance || null,
      min_targets: grouped.combatStats.min_targets || null,
      max_targets: grouped.combatStats.max_targets || null,
      spellId: grouped.spellData.spellId || null,
      spellGroupId: grouped.spellData.spellGroupId || null,
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

  // Якщо це плоска структура (Skill або старий формат)
  return data as any;
};

/**
 * Утиліти для парсингу initialData
 */
const parseInitialBonuses = (bonuses: unknown): Record<string, number> => {
  if (bonuses && typeof bonuses === "object" && !Array.isArray(bonuses)) {
    return bonuses as Record<string, number>;
  }

  return {};
};

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

const convertRaceValueToId = (
  raceValue: string,
  races: Race[],
): string | null => {
  const isLikelyId = raceValue.length > 20;

  if (isLikelyId) {
    const race = races.find((r) => r.id === raceValue);

    return race ? race.id : null;
  } else {
    const race = races.find((r) => r.name === raceValue);

    return race ? race.id : null;
  }
};

const parseInitialRaces = (
  races: unknown,
  availableRaces: Race[],
): string[] => {
  if (!races || !Array.isArray(races)) {
    return [];
  }

  return races
    .map((raceValue: string) => convertRaceValueToId(raceValue, availableRaces))
    .filter((id): id is string => Boolean(id));
};

export function useSkillForm(
  campaignId: string,
  spells: SpellOption[],
  initialRaces?: Race[],
  initialData?: InitialData,
) {
  const router = useRouter();

  const queryClient = useQueryClient();

  const { data: mainSkills = [] } = useMainSkills(campaignId);

  const { data: races = [] } = useRaces(campaignId, initialRaces);

  const isEdit = !!initialData;

  // Нормалізуємо initialData до плоскої структури для сумісності
  const normalizedData = normalizeInitialData(initialData);

  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Basic info
  const [name, setName] = useState(normalizedData?.name || "");

  const [description, setDescription] = useState(
    normalizedData?.description || "",
  );

  const [icon, setIcon] = useState(normalizedData?.icon || "");

  const [selectedRaces, setSelectedRaces] = useState<string[]>([]);

  const [isRacial, setIsRacial] = useState(normalizedData?.isRacial || false);

  // Оновлюємо selectedRaces коли races завантажуються або змінюється initialData
  useEffect(() => {
    if (!normalizedData?.races) {
      setSelectedRaces([]);

      return;
    }

    const convertedRaces = parseInitialRaces(normalizedData.races, races);

    setSelectedRaces(convertedRaces);
  }, [normalizedData?.races, races]);

  // Bonuses
  const [bonuses, setBonuses] = useState<Record<string, number>>(() =>
    parseInitialBonuses(normalizedData?.bonuses),
  );

  // Combat stats
  const [damage, setDamage] = useState(
    normalizedData?.damage?.toString() || "",
  );

  const [armor, setArmor] = useState(normalizedData?.armor?.toString() || "");

  const [speed, setSpeed] = useState(normalizedData?.speed?.toString() || "");

  const [physicalResistance, setPhysicalResistance] = useState(
    normalizedData?.physicalResistance?.toString() || "",
  );

  const [magicalResistance, setMagicalResistance] = useState(
    normalizedData?.magicalResistance?.toString() || "",
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
  const handleRaceToggle = useCallback((race: string) => {
    setSelectedRaces((prev) =>
      prev.includes(race) ? prev.filter((r) => r !== race) : [...prev, race],
    );
  }, []);

  const handleEnhancementTypeToggle = useCallback(
    (type: SpellEnhancementType) => {
      setSpellEnhancementTypes((prev) =>
        prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
      );
    },
    [],
  );

  const handleBonusChange = useCallback((attr: string, value: string) => {
    const numValue = value === "" ? 0 : parseInt(value, 10);

    if (isNaN(numValue)) return;

    setBonuses((prev) => ({
      ...prev,
      [attr]: numValue,
    }));
  }, []);

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
        races: selectedRaces,
        isRacial,
      },
      bonuses: Object.fromEntries(
        Object.entries(bonuses).filter(([, v]) => v !== 0),
      ),
      combatStats: {
        damage: parseNumber(damage),
        armor: parseNumber(armor),
        speed: parseNumber(speed),
        physicalResistance: parseNumber(physicalResistance),
        magicalResistance: parseNumber(magicalResistance),
        min_targets: parseNumber(minTargets),
        max_targets: parseNumber(maxTargets),
      },
      spellData: {
        spellId: spellId || undefined,
        spellGroupId: spellGroupId || undefined,
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
    selectedRaces,
    isRacial,
    bonuses,
    damage,
    armor,
    speed,
    physicalResistance,
    magicalResistance,
    spellId,
    spellGroupId,
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
        // Очікуємо на оновлення даних перед переходом
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
    races,
    // Basic info group
    basicInfo: {
      name,
      description,
      icon,
      selectedRaces,
      isRacial,
      setters: {
        setName,
        setDescription,
        setIcon,
        setIsRacial,
      },
      handlers: {
        handleRaceToggle,
      },
    },
    // Bonuses group
    bonuses: {
      bonuses,
      handlers: {
        handleBonusChange,
      },
    },
    // Combat stats group
    combatStats: {
      damage,
      armor,
      speed,
      physicalResistance,
      magicalResistance,
      minTargets,
      maxTargets,
      setters: {
        setDamage,
        setArmor,
        setSpeed,
        setPhysicalResistance,
        setMagicalResistance,
        setMinTargets,
        setMaxTargets,
      },
    },
    // Spell group
    spell: {
      spellId,
      spellGroupId,
      setters: {
        setSpellId,
        setSpellGroupId,
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
