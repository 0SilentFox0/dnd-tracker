import type { SystemData } from "@/lib/utils/rules/systems/slot";
import type { CharacterFormData } from "@/types/characters";

export interface SectionBinding<S> {
  data: S;
  set: <K extends keyof S>(key: K, value: S[K]) => void;
}

export interface CharacterFormHandlers {
  toggleSavingThrow: (ability: string) => void;
  toggleSkill: (skill: string) => void;
}

type SetFormData = React.Dispatch<React.SetStateAction<CharacterFormData>>;

type FieldSection = "basicInfo" | "abilityScores" | "combatStats" | "spellcasting" | "abilities";

function sectionBinding<T extends FieldSection>(formData: CharacterFormData, setFormData: SetFormData, section: T): SectionBinding<CharacterFormData[T]> {
  return {
    data: formData[section],
    set: (key, value) => setFormData((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } })),
  };
}

export interface SystemBinding {
  data: SystemData | undefined;
  update: (fn: (prev: SystemData | undefined) => SystemData) => void;
}

function characteristicsBinding(formData: CharacterFormData, setFormData: SetFormData): SystemBinding {
  return {
    data: formData.characteristics,
    update: (fn) => setFormData((prev) => ({ ...prev, characteristics: fn(prev.characteristics) })),
  };
}

export function buildCharacterFormBindings(formData: CharacterFormData, setFormData: SetFormData, handlers: CharacterFormHandlers) {
  return {
    basicInfo: sectionBinding(formData, setFormData, "basicInfo"),
    abilityScores: sectionBinding(formData, setFormData, "abilityScores"),
    combatStats: sectionBinding(formData, setFormData, "combatStats"),
    skills: { data: formData.skills, handlers },
    spellcasting: sectionBinding(formData, setFormData, "spellcasting"),
    abilities: sectionBinding(formData, setFormData, "abilities"),
    characteristics: characteristicsBinding(formData, setFormData),
  };
}

export type CharacterFormBindings = ReturnType<typeof buildCharacterFormBindings>;
