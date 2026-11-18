import {
    moduleVocab,
    type ModuleVocabFlagged,
    type ModuleVocabId,
} from '@/lib/utils/rules/systems/vocab';

export type ModuleActionType = ModuleVocabId<'actionTypes'>;

/** Action types a server-driven attack can be labelled with in the log */
export type ServerLabelType = ModuleVocabFlagged<'actionTypes', 'serverLabel'>;

const actionTypes = () => moduleVocab('actionTypes');

export const isCounterAction = (type: string): boolean =>
    actionTypes().some((e) => e.id === type && e.counter === true);

/** Entries that render and resolve like a plain attack in the fx layer */
export const isAttackFxAction = (type: string): boolean =>
    actionTypes().some((e) => e.id === type && e.fx === 'attack');

export const moduleLoggedActionTypes = (): readonly string[] =>
    actionTypes()
        .filter((e) => e.logged)
        .map((e) => e.id);

/** Flags that stop the attacker from being struck back */
export const counterBlockFlags = (): readonly string[] =>
    actionTypes().flatMap((e) => (e.blockFlag ? [e.blockFlag] : []));

/** The log type a server counter-strike is stored under */
export const counterActionType = (): ServerLabelType => {
    const entry = actionTypes().find((e) => e.counter && e.fx === 'attack');

    if (!entry) throw new Error('no counter-strike action type is installed');

    return entry.id as ServerLabelType;
};
