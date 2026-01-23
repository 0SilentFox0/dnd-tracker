/**
 * Хук для управління формою персонажа
 */

import { useCallback,useState } from "react";

import { characterToFormData } from "@/lib/utils/character-form";
import type { Character } from "@/types/characters";
import { CharacterFormData } from "@/types/characters";

export interface UseCharacterFormOptions {
  initialData?: Partial<Character> | Partial<CharacterFormData>;
  onSubmit: (data: CharacterFormData) => Promise<void>;
  onCancel?: () => void;
}

const defaultFormData: CharacterFormData = {
  basicInfo: {
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
  },
  abilityScores: {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  },
  combatStats: {
    armorClass: 10,
    initiative: 0,
    speed: 30,
    maxHp: 10,
    currentHp: 10,
    tempHp: 0,
    hitDice: "1d8",
  },
  skills: {
    savingThrows: {},
    skills: {},
  },
  spellcasting: {
    spellcastingClass: "",
    spellcastingAbility: undefined,
    spellSlots: {},
    knownSpells: [],
  },
  roleplay: {
    languages: [],
    proficiencies: {},
    immunities: [],
    morale: undefined,
    personalityTraits: "",
    ideals: "",
    bonds: "",
    flaws: "",
  },
};

export function useCharacterForm(options: UseCharacterFormOptions) {
  // Конвертуємо initialData в CharacterFormData якщо це Character
  const initialFormData = options.initialData
    ? "basicInfo" in options.initialData
      ? { ...defaultFormData, ...options.initialData }
      : characterToFormData(options.initialData as Partial<Character>)
    : defaultFormData;

  const [formData, setFormData] = useState<CharacterFormData>(initialFormData);

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

  const addLanguage = useCallback(() => {
    const lang = prompt("Введіть мову:");

    if (lang && lang.trim()) {
      setFormData((prev) => ({
        ...prev,
        roleplay: {
          ...prev.roleplay,
          languages: [...prev.roleplay.languages, lang.trim()],
        },
      }));
    }
  }, []);

  const removeLanguage = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      roleplay: {
        ...prev.roleplay,
        languages: prev.roleplay.languages.filter((_, i) => i !== index),
      },
    }));
  }, []);

  const addKnownSpell = useCallback((spellId: string) => {
    setFormData((prev) => {
      if (prev.spellcasting.knownSpells.includes(spellId)) {
        return prev;
      }

      return {
        ...prev,
        spellcasting: {
          ...prev.spellcasting,
          knownSpells: [...prev.spellcasting.knownSpells, spellId],
        },
      };
    });
  }, []);

  const removeKnownSpell = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      spellcasting: {
        ...prev.spellcasting,
        knownSpells: prev.spellcasting.knownSpells.filter((_, i) => i !== index),
      },
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (formData.basicInfo.type === "player" && !formData.basicInfo.controlledBy) {
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

  // Створюємо об'єкти з setters для кожної групи
  const basicInfo = {
    ...formData.basicInfo,
    setters: {
      setName: (value: string) => setFormData(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, name: value } })),
      setType: (value: "player" | "npc_hero") => setFormData(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, type: value } })),
      setControlledBy: (value: string) => setFormData(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, controlledBy: value } })),
      setLevel: (value: number) => setFormData(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, level: value } })),
      setClass: (value: string) => setFormData(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, class: value } })),
      setSubclass: (value: string) => setFormData(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, subclass: value } })),
      setRace: (value: string) => setFormData(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, race: value } })),
      setSubrace: (value: string) => setFormData(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, subrace: value } })),
      setAlignment: (value: string) => setFormData(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, alignment: value } })),
      setBackground: (value: string) => setFormData(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, background: value } })),
      setExperience: (value: number) => setFormData(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, experience: value } })),
      setAvatar: (value: string) => setFormData(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, avatar: value } })),
    },
  };

  const abilityScores = {
    ...formData.abilityScores,
    setters: {
      setStrength: (value: number) => setFormData(prev => ({ ...prev, abilityScores: { ...prev.abilityScores, strength: value } })),
      setDexterity: (value: number) => setFormData(prev => ({ ...prev, abilityScores: { ...prev.abilityScores, dexterity: value } })),
      setConstitution: (value: number) => setFormData(prev => ({ ...prev, abilityScores: { ...prev.abilityScores, constitution: value } })),
      setIntelligence: (value: number) => setFormData(prev => ({ ...prev, abilityScores: { ...prev.abilityScores, intelligence: value } })),
      setWisdom: (value: number) => setFormData(prev => ({ ...prev, abilityScores: { ...prev.abilityScores, wisdom: value } })),
      setCharisma: (value: number) => setFormData(prev => ({ ...prev, abilityScores: { ...prev.abilityScores, charisma: value } })),
    },
  };

  const combatStats = {
    ...formData.combatStats,
    setters: {
      setArmorClass: (value: number) => setFormData(prev => ({ ...prev, combatStats: { ...prev.combatStats, armorClass: value } })),
      setInitiative: (value: number) => setFormData(prev => ({ ...prev, combatStats: { ...prev.combatStats, initiative: value } })),
      setSpeed: (value: number) => setFormData(prev => ({ ...prev, combatStats: { ...prev.combatStats, speed: value } })),
      setMaxHp: (value: number) => setFormData(prev => ({ ...prev, combatStats: { ...prev.combatStats, maxHp: value } })),
      setCurrentHp: (value: number) => setFormData(prev => ({ ...prev, combatStats: { ...prev.combatStats, currentHp: value } })),
      setTempHp: (value: number) => setFormData(prev => ({ ...prev, combatStats: { ...prev.combatStats, tempHp: value } })),
      setHitDice: (value: string) => setFormData(prev => ({ ...prev, combatStats: { ...prev.combatStats, hitDice: value } })),
    },
  };

  const skills = {
    ...formData.skills,
    handlers: {
      toggleSavingThrow,
      toggleSkill,
    },
  };

  const spellcasting = {
    ...formData.spellcasting,
    setters: {
      setSpellcastingClass: (value: string) => setFormData(prev => ({ ...prev, spellcasting: { ...prev.spellcasting, spellcastingClass: value } })),
      setSpellcastingAbility: (value: "intelligence" | "wisdom" | "charisma" | undefined) => setFormData(prev => ({ ...prev, spellcasting: { ...prev.spellcasting, spellcastingAbility: value } })),
      setSpellSlots: (value: Record<string, { max: number; current: number }>) => setFormData(prev => ({ ...prev, spellcasting: { ...prev.spellcasting, spellSlots: value } })),
      setKnownSpells: (value: string[]) => setFormData(prev => ({ ...prev, spellcasting: { ...prev.spellcasting, knownSpells: value } })),
    },
    handlers: {
      addKnownSpell,
      removeKnownSpell,
    },
  };

  const roleplay = {
    ...formData.roleplay,
    setters: {
      setLanguages: (value: string[]) => setFormData(prev => ({ ...prev, roleplay: { ...prev.roleplay, languages: value } })),
      setProficiencies: (value: Record<string, string[]>) => setFormData(prev => ({ ...prev, roleplay: { ...prev.roleplay, proficiencies: value } })),
      setImmunities: (value: string[]) => setFormData(prev => ({ ...prev, roleplay: { ...prev.roleplay, immunities: value } })),
      setMorale: (value: number | undefined) => setFormData(prev => ({ ...prev, roleplay: { ...prev.roleplay, morale: value } })),
      setPersonalityTraits: (value: string) => setFormData(prev => ({ ...prev, roleplay: { ...prev.roleplay, personalityTraits: value } })),
      setIdeals: (value: string) => setFormData(prev => ({ ...prev, roleplay: { ...prev.roleplay, ideals: value } })),
      setBonds: (value: string) => setFormData(prev => ({ ...prev, roleplay: { ...prev.roleplay, bonds: value } })),
      setFlaws: (value: string) => setFormData(prev => ({ ...prev, roleplay: { ...prev.roleplay, flaws: value } })),
    },
    handlers: {
      addLanguage,
      removeLanguage,
    },
  };

  return {
    formData,
    loading,
    error,
    basicInfo,
    abilityScores,
    combatStats,
    skills,
    spellcasting,
    roleplay,
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
