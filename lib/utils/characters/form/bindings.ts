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

export function buildCharacterFormBindings(formData: CharacterFormData, setFormData: SetFormData, handlers: CharacterFormHandlers) {
  return {
    basicInfo: sectionBinding(formData, setFormData, "basicInfo"),
    abilityScores: sectionBinding(formData, setFormData, "abilityScores"),
    combatStats: sectionBinding(formData, setFormData, "combatStats"),
    skills: { data: formData.skills, handlers },
    spellcasting: sectionBinding(formData, setFormData, "spellcasting"),
    abilities: sectionBinding(formData, setFormData, "abilities"),
  };
}

export type CharacterFormBindings = ReturnType<typeof buildCharacterFormBindings>;
