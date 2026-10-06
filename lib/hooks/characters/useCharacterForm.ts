/**
 * Хук для управління формою персонажа
 */

import { useCallback, useMemo, useState } from "react";

import { buildCharacterFormBindings } from "./useCharacterForm-bindings";
import { defaultCharacterFormData } from "./useCharacterForm-defaults";

import type { CharacterTypeValue } from "@/lib/constants/characters";
import { characterToFormData } from "@/lib/utils/characters/character-form";
import type { Character } from "@/types/characters";
import { CharacterFormData } from "@/types/characters";

export interface UseCharacterFormOptions {
  initialData?: Partial<Character> | Partial<CharacterFormData>;
  type?: CharacterTypeValue;
  onSubmit: (data: CharacterFormData) => Promise<void>;
  onCancel?: () => void;
}

export function useCharacterForm(options: UseCharacterFormOptions) {
  // Конвертуємо initialData в CharacterFormData якщо це Character
  const base = options.initialData
    ? "basicInfo" in options.initialData
      ? { ...defaultCharacterFormData, ...options.initialData }
      : characterToFormData(options.initialData as Partial<Character>)
    : defaultCharacterFormData;

  const initialFormData = options.type ? { ...base, basicInfo: { ...base.basicInfo, type: options.type } } : base;

  const [formData, setFormData] = useState<CharacterFormData>(initialFormData);

  const [loading, setLoading] = useState(false);

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

      if (
        formData.basicInfo.type === "player" &&
        !formData.basicInfo.controlledBy
      ) {
        setError("Будь ласка, виберіть гравця для персонажа типу 'Гравець'");

        return;
      }

      setLoading(true);
      try {
        await options.onSubmit(formData);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [formData, options],
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
    loading,
    error,
    basicInfo,
    abilityScores,
    combatStats,
    skills,
    spellcasting,
    abilities,
    updateField,
    updateFields,
    toggleSavingThrow,
    toggleSkill,
    handleSubmit,
    handleCancel,
    setFormData,
  };
}
