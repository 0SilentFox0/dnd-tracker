export const RACE_FORM_TAB = { basic: "basic", stats: "stats", abilities: "abilities" } as const;

export type RaceFormTabId = (typeof RACE_FORM_TAB)[keyof typeof RACE_FORM_TAB];
