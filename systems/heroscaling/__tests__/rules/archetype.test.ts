import { beforeAll, describe, expect, it } from 'vitest';

import { runParticipantParts } from '@/lib/utils/battle/participant/parts';
import { parseRules } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleParticipant } from '@/types/battle';

beforeAll(async () => {
    await import('@/lib/utils/rules/systems/registry');
}, 30_000);

const run = (
    system: { key: string; modules?: string[] },
    archetype: string | null,
    abilities: Record<string, unknown> = {}
) => {
    const rules = parseRules({ system });

    return runParticipantParts(
        ruleSystemOf(rules).participant?.fromCharacter,
        { abilities } as unknown as BattleParticipant,
        { row: { level: 1, archetype }, rules, refs: {} }
    ).abilities as unknown as Record<string, unknown>;
};

describe('heroscaling archetype part', () => {
    it('homm with an archetype writes the four keys', () => {
        const a = run({ key: 'homm' }, 'ranger');

        expect(a).toMatchObject({
            meleeMultiplier: 0.7,
            rangedMultiplier: 1.5,
            magicMultiplier: 0.7,
            archetypeKey: 'ranger',
        });
    });

    it('homm without an archetype is universal', () => {
        expect(run({ key: 'homm' }, null)).toMatchObject({
            meleeMultiplier: 1,
            archetypeKey: 'universal',
        });
    });

    it('class mode ignores the archetype', () => {
        expect(
            run({ key: 'homm' }, 'warrior', { damageModel: '5e' })
        ).toMatchObject({ meleeMultiplier: 1, archetypeKey: 'universal' });
    });

    it.each(['dnd5e', 'wfrp'])('bare %s gets no keys', (key) => {
        const a = run({ key }, 'warrior');

        expect(a).not.toHaveProperty('meleeMultiplier');
        expect(a).not.toHaveProperty('archetypeKey');
    });
});
