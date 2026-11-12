import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { LOCALES } from '@/lib/i18n/config';

const SPELL_ONLY = [
    'spellFx.anchoredAura',
    'spellFx.delayed',
    'spellFx.distanceDice',
];

const LITERAL_UNIT = /\b(ft|feet)\b|фт/;

function literalUnitKeys(node: unknown, path = ''): string[] {
    if (typeof node === 'string') return LITERAL_UNIT.test(node) ? [path] : [];

    return Object.entries(node as Record<string, unknown>).flatMap(
        ([key, value]) => literalUnitKeys(value, path ? `${path}.${key}` : key)
    );
}

describe('battleLog: literal distance units', () => {
    it.each(LOCALES)(
        '%s: only spell and aura keys (unreachable in a spells:false system) hardcode feet',
        (locale) => {
            const tree = JSON.parse(
                readFileSync(
                    join(process.cwd(), 'messages', locale, 'battleLog.json'),
                    'utf8'
                )
            );

            expect(
                literalUnitKeys(tree).filter((key) => !SPELL_ONLY.includes(key))
            ).toEqual([]);
        }
    );
});
