export const BATTLE_FORM_TAB = {
    participants: 'participants',
    map: 'map',
} as const;

export type BattleFormTabId =
    (typeof BATTLE_FORM_TAB)[keyof typeof BATTLE_FORM_TAB];

export const battleFormId = (isEdit: boolean) =>
    isEdit ? 'battle-edit-form' : 'battle-form';
