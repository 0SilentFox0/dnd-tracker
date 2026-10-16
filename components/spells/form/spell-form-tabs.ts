export const SPELL_FORM_TAB = { basic: "basic", roll: "roll", effects: "effects" } as const;

export type SpellFormTabId = (typeof SPELL_FORM_TAB)[keyof typeof SPELL_FORM_TAB];
