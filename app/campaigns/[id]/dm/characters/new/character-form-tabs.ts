export const CHARACTER_FORM_TAB = { basic: "basic", combat: "combat", skills: "skills" } as const;

export type CharacterFormTabId = (typeof CHARACTER_FORM_TAB)[keyof typeof CHARACTER_FORM_TAB];
