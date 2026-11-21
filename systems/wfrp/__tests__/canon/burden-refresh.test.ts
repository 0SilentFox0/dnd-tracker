import { describe, expect, it } from 'vitest';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { consumablePoolKey } from '@/lib/utils/items/pools';
import { value } from '@/systems/wfrp/rules/characteristics/derive';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { wfrpAbilitiesOf } from '@/systems/wfrp/rules/combat/participant';
import { wfrpBurdenLoad } from '@/systems/wfrp/rules/equipment/burden';
import { PARTICIPANT_SLOT } from '@/systems/wfrp/rules/slots';
import { wfrpBurdenRefresh } from '@/systems/wfrp/rules/turn/burden-refresh';

const chars = {
    ...DEFAULT_CHARACTERISTICS,
    base: { ...DEFAULT_CHARACTERISTICS.base, s: 30, t: 30, ag: 40 },
    move: 4,
};

const potion = {
    id: 'inv-1',
    artifactId: 'a1',
    systemStats: { type: 'gear', weight: 2, price: 1, qualities: [] },
    quantity: 3,
};

const load = wfrpBurdenLoad({
    rows: [
        {
            slot: 'backpack',
            systemStats: { type: 'gear', weight: 3, price: 1, qualities: [] },
            carried: true,
        },
    ],
    specials: [potion],
    coins: 0,
    characteristics: chars,
    rules: { edition: { preset: 'canon5e' } } as never,
})!;

const hero = (spent: number) => {
    const p = makeParticipant({ id: 'h' });

    const system = wfrpAbilitiesOf(chars, {
        ap: {} as never,
        burden: 1,
        load,
    }).system;

    return {
        ...p,
        abilities: { ...p.abilities, system },
        battleData: {
            ...p.battleData,
            pools: {
                [consumablePoolKey('inv-1')]: {
                    label: 'Potion',
                    max: 3,
                    rest: null,
                },
            },
            abilityUsage: {
                [consumablePoolKey('inv-1')]: {
                    battle: spent,
                    round: 0,
                    turn: 0,
                },
            },
        },
    };
};

const refresh = (spent: number) => {
    const out = wfrpBurdenRefresh({
        participants: [hero(spent)],
        id: 'h',
        round: 1,
        rng: () => 0.5,
        rules: {} as never,
        applyDamage: undefined as never,
    });

    return PARTICIPANT_SLOT.read(out.participants[0].abilities.system)!;
};

describe('burden refresh after consumables are spent (p299)', () => {
    it('records the per-use weight of the carried consumables', () => {
        expect(load).toMatchObject({
            carried: 9,
            limit: 6,
            perUse: { 'inv-1': 2 },
        });
    });

    it('keeps the tier while the load stays over the limit', () => {
        expect(refresh(0).stats.burden).toBe(1);
        expect(refresh(1).stats.burden).toBe(1);
    });

    it('drops the burden and restores Agility when enough is spent', () => {
        const slot = refresh(2);

        expect(slot.stats.burden).toBeUndefined();
        expect(slot.stats.ag).toBe(40);
        expect(value(slot.characteristics, 'ag')).toBe(40);
    });

    it('recomputes the walking speed with the new tier', () => {
        const out = wfrpBurdenRefresh({
            participants: [
                {
                    ...hero(2),
                    combatStats: { ...hero(2).combatStats, speed: 0 },
                },
            ],
            id: 'h',
            round: 1,
            rng: () => 0.5,
            rules: {} as never,
            applyDamage: undefined as never,
        });

        expect(out.participants[0].combatStats.speed).toBe(4 * 2 * 3);
    });
});
