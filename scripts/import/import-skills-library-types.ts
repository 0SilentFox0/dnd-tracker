/**
 * Типи для import-skills-library
 */

export interface LibraryEffect {
  stat: string;
  type: string;
  value?: number | boolean | string;
  duration?: number;
}

export interface LibrarySkill {
  id: string;
  category: string;
  mainSkill?: string;
  tier: string | number;
  name: string;
  effects: LibraryEffect[];
  spells: string[];
  trigger: string;
  image?: string;
}

export interface SkillsDoc {
  meta: { version?: string; description?: string };
  skills: LibrarySkill[];
}

export interface SkillTriggerModifiers {
  probability?: number;
  oncePerBattle?: boolean;
  twicePerBattle?: boolean;
  stackable?: boolean;
  condition?: string;
}

export interface SimpleTrigger {
  type: "simple";
  trigger: string;
  modifiers?: SkillTriggerModifiers;
}

export interface ComplexTrigger {
  type: "complex";
  target: "ally" | "enemy";
  operator: string;
  value: number;
  valueType: "number" | "percent";
  stat: string;
  modifiers?: SkillTriggerModifiers;
}

export type ParsedTrigger = SimpleTrigger | ComplexTrigger;
