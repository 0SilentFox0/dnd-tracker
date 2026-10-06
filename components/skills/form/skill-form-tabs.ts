export const SKILL_FORM_TAB = { basic: "basic", spell: "spell", abilities: "abilities" } as const;

export type SkillFormTabId = (typeof SKILL_FORM_TAB)[keyof typeof SKILL_FORM_TAB];
