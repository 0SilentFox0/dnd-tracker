import { describe, expect, it } from 'vitest';

import heroesHomm from '@/data/templates/heroes-homm/rules.json';
import srd from '@/data/templates/srd-5.2/rules.json';
import { rulesHashes } from '@/lib/server/templates/sync/hash';
import { initialRules } from '@/lib/utils/rules/initial-rules';

const golden = (name: string) => `./__golden__/${name}.json`;

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

describe('E4 golden: stable before and after the d20 module split', () => {
    it('initialRules dnd5e without modules: sections stay, modules come from the preset', async () => {
        const { system, ...sections } = initialRules({ key: 'dnd5e' }) as {
            system: { key: string; modules: string[] };
        };

        expect(system.key).toBe('dnd5e');
        expect(system.modules).toEqual([
            'deathsaves',
            'inspiration',
            'lair',
            'offhand',
            'opportunity',
        ]);

        await expect(json(sections)).toMatchFileSnapshot(
            golden('initial-rules-dnd5e')
        );
    });

    it('rulesHashes srd-5.2', async () => {
        await expect(json(rulesHashes(srd))).toMatchFileSnapshot(
            golden('rules-hashes-srd-5.2')
        );
    });

    it('rulesHashes heroes-homm', async () => {
        await expect(json(rulesHashes(heroesHomm))).toMatchFileSnapshot(
            golden('rules-hashes-heroes-homm')
        );
    });
});
