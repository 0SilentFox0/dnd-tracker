import type { Spell } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { context, goblin, participant } from './fixtures';

import { D6POOL_SYSTEM } from '@/lib/__tests__/fixtures/d6pool/definition';
import { createSpellMutation } from '@/lib/server/battles/mutations/spell/spell-mutation';
import type { BattleParticipant } from '@/types/battle';

vi.mock('@/lib/utils/rules/systems', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    ruleSystemOf: () => D6POOL_SYSTEM,
    ruleSystemByKey: () => D6POOL_SYSTEM,
}));

const row = {
    id: 's1',
    campaignId: 'c1',
    name: 'Ritual',
    level: 0,
    groupId: null,
    icon: null,
    dice: 1,
    dieSides: 6,
    cost: 'long',
    casting: { rounds: 2 },
    targeting: { kind: 'enemy' },
    resolution: { kind: 'auto' },
    spellEffects: [],
    raceModifiers: [],
} as unknown as Spell;

describe('cancelling a long cast on a system without concentration', () => {
    it('clears pendingCast', async () => {
        const base = participant('hero', { controlledBy: 'user-1' });

        const hero: BattleParticipant = {
            ...base,
            battleData: {
                ...base.battleData,
                pendingCast: {
                    spellId: 's1',
                    spellName: 'Ritual',
                    remainingRounds: 1,
                    totalRounds: 2,
                    lastRound: 1,
                },
            },
        };

        const ctx = context({ participants: [hero, goblin] });

        const out = await createSpellMutation({
            loadSpell: async () => row,
            loadPool: async () => ({ units: [], races: [] }),
        })(ctx, {
            casterId: 'hero',
            spellId: 's1',
            cancelCasting: true,
        } as never);

        expect(
            out.participants.find((p) => p.basicInfo.id === 'hero')?.battleData
                .pendingCast
        ).toBeUndefined();
    });
});
