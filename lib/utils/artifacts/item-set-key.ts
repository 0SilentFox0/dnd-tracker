import {
    moduleVocab,
    type ModuleVocabId,
} from '@/lib/utils/rules/systems/vocab';

export type ItemSetKey = ModuleVocabId<'abilitySources'>;

/** Id of the module ability source that groups items into sets; doubles as the set filter / group-label key */
export const ITEM_SET_KEY = moduleVocab('abilitySources').find(
    (e) => e.itemLike
)?.id as ItemSetKey;
