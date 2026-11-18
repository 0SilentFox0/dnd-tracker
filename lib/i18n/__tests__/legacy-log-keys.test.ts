import { describe, expect, it } from 'vitest';

import { currentLogKey } from '../legacy-log-keys';
import { textOf } from '../test/text';

import { LOCALES } from '@/lib/i18n/config';
import { localSource } from '@/lib/i18n/local-source';
import { dynamicTextRef, textRef } from '@/lib/i18n/text-ref';
import { decodeLog } from '@/lib/utils/battle/log/codec';

const OLD_KEYS = [
    'battleLog.morale.extra',
    'battleLog.morale.notFound',
    'battleLog.reject.moraleFirst',
    'battleLog.reject.abilityIsLair',
    'battleLog.dm.lairIn',
    'battleLog.dm.lairOut',
    'battleLog.legendary.useLair',
    'battleLog.legendary.runLair',
    'battleLog.round.lair',
    'battleLog.rollMode.inspiration',
    'battleLog.offTurn.titles.retaliation',
    'battleLog.offTurn.nouns.retaliation',
    'battleCommon.actionKinds.morale_skip',
    'battleCommon.actionKinds.retaliation',
];

const lookup = (tree: Record<string, unknown>, path: string) =>
    path
        .split('.')
        .reduce<unknown>(
            (node, part) =>
                (node as Record<string, unknown> | undefined)?.[part],
            tree
        );

describe('legacy log keys', () => {
    it.each(OLD_KEYS)('%s resolves to a key that exists', async (old) => {
        const key = currentLogKey(old);

        const [ns, ...rest] = key.split('.');

        expect(key).not.toBe(old);

        for (const locale of LOCALES) {
            const tree = await localSource.load(locale, ns as 'moraleLog');

            expect(
                typeof lookup(tree, rest.join('.')),
                `${locale}: ${key}`
            ).toBe('string');
        }
    });

    it.each(LOCALES)(
        'a stored old log renders the module texts in %s with no module on',
        (locale) => {
            const stored = [
                { m: 'm|extra', p: { n: 'Orc', i: 'x' } },
                { message: 'battleLog.dm.lairIn', params: { name: 'Orc' } },
            ];

            const [morale, lair] = decodeLog(stored as never);

            expect(textOf(morale as never, locale)).toContain('Orc');
            expect(textOf(lair as never, locale)).toBe(
                locale === 'uk' ? '🏰 Orc: у лігві' : '🏰 Orc: in the lair'
            );
            expect(
                textOf(textRef('lairLog.dmIn', { name: 'Orc' }), locale)
            ).toBe(textOf(lair as never, locale));
            expect(
                textOf(
                    dynamicTextRef('battleLog.morale.extra', { name: 'Orc' }),
                    locale
                )
            ).toBe(
                textOf(
                    textRef('moraleLog.check.extra', { name: 'Orc' }),
                    locale
                )
            );
        }
    );
});
