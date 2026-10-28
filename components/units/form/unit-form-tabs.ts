export const UNIT_FORM_TAB = { basic: "basic", attacks: "attacks", abilities: "abilities", magic: "magic", statblock: "statblock" } as const;

export type UnitFormTabId = (typeof UNIT_FORM_TAB)[keyof typeof UNIT_FORM_TAB];
