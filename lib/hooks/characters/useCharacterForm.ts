import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { CharacterType, type CharacterTypeValue } from "@/lib/constants/characters";
import { characterToFormData } from "@/lib/utils/characters/character-form";
import { buildCharacterFormBindings } from "@/lib/utils/characters/form/bindings";
import { defaultCharacterFormData } from "@/lib/utils/characters/form/defaults";
import type { Character } from "@/types/characters";
import { CharacterFormData } from "@/types/characters";

interface UseCharacterFormOptions {
  initialData?: Partial<Character> | Partial<CharacterFormData>;
  type?: CharacterTypeValue;
  onSubmit: (data: CharacterFormData) => Promise<CharacterFormData | void>;
  onCancel?: () => void;
}

export function useCharacterForm(options: UseCharacterFormOptions) {
  const t = useTranslations("characters.form.validation");

  const base = options.initialData
    ? "basicInfo" in options.initialData
      ? { ...defaultCharacterFormData, ...options.initialData }
      : characterToFormData(options.initialData as Partial<Character>)
    : defaultCharacterFormData;

  const initialFormData = options.type ? { ...base, basicInfo: { ...base.basicInfo, type: options.type } } : base;

  const [formData, setFormData] = useState<CharacterFormData>(initialFormData);

  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const updateField = useCallback(
    <K extends keyof CharacterFormData>(
      field: K,
      value: CharacterFormData[K],
    ) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const updateFields = useCallback((fields: Partial<CharacterFormData>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
  }, []);

  const toggleSavingThrow = useCallback((ability: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        savingThrows: {
          ...prev.skills.savingThrows,
          [ability]: !prev.skills.savingThrows[ability],
        },
      },
    }));
  }, []);

  const toggleSkill = useCallback((skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        skills: {
          ...prev.skills.skills,
          [skill]: !prev.skills.skills[skill],
        },
      },
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!formData.basicInfo.race) {
        setError(t("raceRequired"));

        return;
      }

      if (!formData.basicInfo.class.trim()) {
        setError(t("classRequired"));

        return;
      }

      if (
        formData.basicInfo.type === CharacterType.PLAYER &&
        !formData.basicInfo.controlledBy
      ) {
        setError(t("controllerRequired"));

        return;
      }

      setIsLoading(true);
      try {
        const next = await options.onSubmit(formData);

        if (next) setFormData(next);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    },
    [formData, options, t],
  );

  const handleCancel = useCallback(() => {
    if (options.onCancel) {
      options.onCancel();
    }
  }, [options]);

  const {
    basicInfo,
    abilityScores,
    combatStats,
    skills,
    spellcasting,
    abilities,
  } = useMemo(
    () =>
      buildCharacterFormBindings(formData, setFormData, { toggleSavingThrow, toggleSkill }),
    [formData, toggleSavingThrow, toggleSkill],
  );

  return {
    formData,
    status: { isLoading, error },
    basicInfo,
    abilityScores,
    combatStats,
    skills,
    spellcasting,
    abilities,
    actions: { updateField, updateFields, toggleSavingThrow, toggleSkill, handleSubmit, handleCancel, setFormData },
  };
}
