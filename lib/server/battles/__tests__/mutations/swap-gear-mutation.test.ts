import { describe, expect, it, vi } from 'vitest';

import { context, participant } from './fixtures';

import { createSwapGearMutation } from '@/lib/server/battles/mutations/swap-gear/swap-gear-mutation';

const hero = participant('hero', { sourceType: 'character', sourceId: 'ch1' });

const fresh = () => {
    const p = participant('x');

    return {
        ...p,
        combatStats: { ...p.combatStats, armorClass: 19 },
        battleData: { ...p.battleData, attacks: [] },
    };
};

function deps(over = {}) {
    return {
        loadCharacter: vi.fn(
            async () => ({ id: 'ch1', campaignId: 'c1' }) as never
        ),
        fromCharacter: vi.fn(async () => fresh()),
        buildContext: vi.fn(async () => undefined),
        ...over,
    };
}

describe('swap-gear mutation', () => {
    it('бере зі свіжого листа AC і витрачає бонусну дію', async () => {
        const mutate = createSwapGearMutation(deps());

        const out = await mutate(
            context({ participants: [hero], isDM: true }),
            {
                participantId: 'hero',
            }
        );

        const next = out.participants[0];

        expect(next?.combatStats.armorClass).toBe(19);
        expect(next?.actionFlags.hasUsedBonusAction).toBe(true);
        expect(out.events).toHaveLength(1);
    });

    it('відмовляє, коли бонусну дію вже витрачено', async () => {
        const spent = {
            ...hero,
            actionFlags: { ...hero.actionFlags, hasUsedBonusAction: true },
        };

        await expect(
            createSwapGearMutation(deps())(
                context({ participants: [spent], isDM: true }),
                { participantId: 'hero' }
            )
        ).rejects.toThrow();
    });

    it('відмовляє для не-героя', async () => {
        const unit = participant('hero', { sourceType: 'unit' });

        await expect(
            createSwapGearMutation(deps())(
                context({ participants: [unit], isDM: true }),
                { participantId: 'hero' }
            )
        ).rejects.toThrow();
    });
});
