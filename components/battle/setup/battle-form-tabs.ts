export const BATTLE_FORM_TAB = { basic: "basic", heroes: "heroes", units: "units", roster: "roster" } as const;

export type BattleFormTabId = (typeof BATTLE_FORM_TAB)[keyof typeof BATTLE_FORM_TAB];
