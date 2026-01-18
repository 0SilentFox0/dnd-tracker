/**
 * Хук для управління формою персонажа
 */

import { useState, useCallback } from "react";
import { CharacterFormData } from "@/lib/api/characters";

export interface UseCharacterFormOptions {
  initialData?: Partial<CharacterFormData>;
  onSubmit: (data: CharacterFormData) => Promise<void>;
  onCancel?: () => void;
}

const defaultFormData: CharacterFormData = {
  name: "",
  type: "player",
  controlledBy: "",
  level: 1,
  class: "",
  subclass: "",
  race: "",
  subrace: "",
  alignment: "",
  background: "",
  experience: 0,
  avatar: "",
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  armorClass: 10,
  initiative: 0,
  speed: 30,
  maxHp: 10,
  currentHp: 10,
  tempHp: 0,
  hitDice: "1d8",
  savingThrows: {},
  skills: {},
  spellcastingClass: "",
  spellcastingAbility: undefined,
  spellSlots: {},
  knownSpells: [],
  languages: [],
  proficiencies: {},
  immunities: [],
  personalityTraits: "",
  ideals: "",
  bonds: "",
  flaws: "",
};

export function useCharacterForm(options: UseCharacterFormOptions) {
  const [formData, setFormData] = useState<CharacterFormData>(() => ({
    ...defaultFormData,
    ...options.initialData,
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = useCallback(
    <K extends keyof CharacterFormData>(
      field: K,
      value: CharacterFormData[K]
    ) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const updateFields = useCallback((fields: Partial<CharacterFormData>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
  }, []);

  const toggleSavingThrow = useCallback((ability: string) => {
    setFormData((prev) => ({
      ...prev,
      savingThrows: {
        ...prev.savingThrows,
        [ability]: !prev.savingThrows[ability],
      },
    }));
  }, []);

  const toggleSkill = useCallback((skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        [skill]: !prev.skills[skill],
      },
    }));
  }, []);

  const addLanguage = useCallback(() => {
    const lang = prompt("Введіть мову:");
    if (lang && lang.trim()) {
      setFormData((prev) => ({
        ...prev,
        languages: [...prev.languages, lang.trim()],
      }));
    }
  }, []);

  const removeLanguage = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.filter((_, i) => i !== index),
    }));
  }, []);

  const addKnownSpell = useCallback((spellId: string) => {
    setFormData((prev) => {
      if (prev.knownSpells.includes(spellId)) {
        return prev;
      }
      return {
        ...prev,
        knownSpells: [...prev.knownSpells, spellId],
      };
    });
  }, []);

  const removeKnownSpell = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      knownSpells: prev.knownSpells.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (formData.type === "player" && !formData.controlledBy) {
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
    [formData, options]
  );

  const handleCancel = useCallback(() => {
    if (options.onCancel) {
      options.onCancel();
    }
  }, [options]);

  return {
    formData,
    loading,
    error,
    updateField,
    updateFields,
    toggleSavingThrow,
    toggleSkill,
    addLanguage,
    removeLanguage,
    addKnownSpell,
    removeKnownSpell,
    handleSubmit,
    handleCancel,
    setFormData,
  };
}
