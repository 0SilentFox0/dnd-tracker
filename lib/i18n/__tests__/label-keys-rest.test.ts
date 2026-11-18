import { describe } from 'vitest';

import { expectLabelKeys } from '../test/label-keys';

import {
    CharacterLogKind,
    type CharacterLogKindValue,
} from '@/lib/constants/character-log';
import { describeCharacterLog } from '@/lib/utils/characters/resources/describe-log';
import { moduleVocab } from '@/lib/utils/rules/systems/vocab';

describe('rest log lines have translations', () => {
    const kinds: CharacterLogKindValue[] = [
        ...Object.values(CharacterLogKind),
        ...moduleVocab('characterLogTypes').map((t) => t.id as CharacterLogKindValue),
    ];

    const keys = kinds.flatMap((kind) => [
        describeCharacterLog({ kind, data: {} }).key,
        describeCharacterLog({ kind, data: { value: true } }).key,
    ]);

    expectLabelKeys(
        'rest',
        'log',
        [...new Set(keys)].map((k) => k.replace('rest.log.', ''))
    );
});
