import { describe, expect, it } from 'vitest';

import {
    counterActionType,
    counterBlockFlags,
    isAttackFxAction,
    isCounterAction,
    moduleLoggedActionTypes,
} from '../action-types';

import { LOCALES, type Namespace } from '@/lib/i18n/config';
import { localSource } from '@/lib/i18n/local-source';
import { moduleVocab } from '@/lib/utils/rules/systems/vocab';

describe('action types from the module vocabulary', () => {
    it('isCounterAction knows retaliation and opportunity only', () => {
        expect(isCounterAction('retaliation')).toBe(true);
        expect(isCounterAction('opportunity')).toBe(true);

        for (const t of ['attack', 'spell', 'morale_skip', 'ability', ''])
            expect(isCounterAction(t)).toBe(false);
    });

    it('only retaliation renders as an attack', () => {
        expect(isAttackFxAction('retaliation')).toBe(true);
        expect(isAttackFxAction('opportunity')).toBe(false);
    });

    it('logged module types are the ones stored in the log', () =>
        expect([...moduleLoggedActionTypes()].sort()).toEqual([
            'morale_skip',
            'retaliation',
        ]));

    it('the counter-strike is stored as retaliation and blocked by its flag', () => {
        expect(counterActionType()).toBe('retaliation');
        expect(counterBlockFlags()).toEqual(['noRetaliation']);
    });

    it.each(LOCALES)('%s: every server-attack label key resolves', async (locale) => {
        for (const { label } of moduleVocab('actionTypes')) {
            if (!label) continue;

            for (const key of [label.title, label.noun]) {
                const [ns, ...path] = key.split('.');

                const tree = await localSource.load(locale, ns as Namespace);

                const value = path.reduce<unknown>(
                    (node, part) =>
                        (node as Record<string, unknown> | undefined)?.[part],
                    tree
                );

                expect(typeof value, key).toBe('string');
            }
        }
    });
});
