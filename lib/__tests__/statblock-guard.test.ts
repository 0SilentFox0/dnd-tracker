import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { ROOT, sourceFiles } from '@/scripts/shared/system-ratchet';

const SCANNED = [
    'lib/utils/battle',
    'lib/utils/abilities/engine',
    'lib/server/battles',
];

const BUILDERS = [
    'lib/utils/battle/participant/',
    'lib/utils/battle/store/',
    'lib/utils/battle/transform/',
    'lib/utils/abilities/build/',
];

const STATBLOCK =
    /\babilities\.(?:strength|dexterity|constitution|intelligence|wisdom|charisma|modifiers|proficiencyBonus|armorClass|speed|spellSlots|morale|moraleCap|minTargets|maxTargets)\b|\babilities\[/g;

/** Only goes down; target 0 is E3. */
const MAX: Record<string, number> = {
    'lib/utils/abilities/engine/effects/morale.ts': 1,
    'lib/utils/battle/attack/bonus.ts': 1,
    'lib/utils/battle/attack/cunning-strike.ts': 2,
    'lib/utils/battle/balance/hit-model.ts': 1,
    'lib/utils/battle/balance/stats.ts': 1,
    'lib/utils/battle/spell/ability-modifier.ts': 2,
    'lib/utils/battle/spell/power.ts': 2,
};

const countStatblockReads = (text: string) =>
    text.match(STATBLOCK)?.length ?? 0;

const found = () =>
    Object.fromEntries(
        sourceFiles(SCANNED)
            .filter((file) => !BUILDERS.some((b) => file.startsWith(b)))
            .map((file) => [
                file,
                countStatblockReads(
                    fs.readFileSync(path.join(ROOT, file), 'utf8')
                ),
            ])
            .filter(([, n]) => (n as number) > 0)
    ) as Record<string, number>;

describe('statblock columns in core rules', () => {
    it('counts the column accesses', () => {
        expect(
            countStatblockReads(
                'a.abilities.strength + b.abilities[k] + abilities.xabilities'
            )
        ).toBe(2);
        expect(countStatblockReads('hero.abilities.baseInitiative')).toBe(0);
    });

    it('no file reads more than recorded and none is new', () => {
        const now = found();

        expect(
            Object.entries(now)
                .filter(([file, n]) => n > (MAX[file] ?? 0))
                .map(
                    ([file, n]) =>
                        `new read: ${file} has ${n}, allowed ${MAX[file] ?? 0}`
                )
        ).toEqual([]);
    });

    it('lower the entry when a file got cleaner', () => {
        const now = found();

        expect(
            Object.entries(MAX)
                .filter(([file, max]) => (now[file] ?? 0) < max)
                .map(
                    ([file, max]) =>
                        `lower: ${file} has ${now[file] ?? 0}, recorded ${max}`
                )
        ).toEqual([]);
    });
});
