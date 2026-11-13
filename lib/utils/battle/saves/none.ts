import type {
    RuleSystemProficiency,
    RuleSystemSaves,
    SaveRollResult,
} from './types';

const NO_SAVE: SaveRollResult = {
    roll: 0,
    rolls: [],
    mod: 0,
    bonus: 0,
    total: 0,
    success: false,
    mode: 'normal',
    autoFail: true,
};

/** A system without saving throws: nobody may save, nothing ends by a save */
export const noSaves: RuleSystemSaves = {
    roll: () => NO_SAVE,
    modifiers: () => ({
        strength: 0,
        dexterity: 0,
        constitution: 0,
        intelligence: 0,
        wisdom: 0,
        charisma: 0,
    }),
    resolve: (participant, result) => ({ result, participant, message: null }),
    bestAbility: (_target, [first]) => first,
    evasion: { has: () => false, factor: (success) => (success ? 0.5 : 1) },
    rollEnds: (participant) => ({ participant, messages: [] }),
};

export const noProficiency: RuleSystemProficiency = {
    fromClasses: () => undefined,
    withGranted: (p) => p,
    bonus: () => 0,
};
