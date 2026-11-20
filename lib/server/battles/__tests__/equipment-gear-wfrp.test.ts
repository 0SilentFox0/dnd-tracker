import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ prisma: {} }));

import '@/lib/server/systems/registry';
import { equipmentGearOf } from '@/lib/server/battles/participant/from-character';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { wfrpAbilitiesOf } from '@/systems/wfrp/rules/combat/participant';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

const rulesOf = (preset: 'legacy' | 'canon5e') =>
    RulesetSchema.parse({ ...WFRP_RULES, edition: { preset } });

const stats = (weight: number, extra: object = {}) => ({
    type: 'gear',
    weight,
    price: 1,
    qualities: [],
    ...extra,
});

const art = (id: string, weight: number) =>
    ({ id, systemStats: stats(weight) }) as never;

const row = (id: string, weight: number, slot = 'ring', carried?: true) => ({
    row: art(id, weight),
    slot,
    ...(carried && { carried }),
});

const hero = (items: object[] = [], gold = 0) =>
    ({
        characteristics: {
            ...DEFAULT_CHARACTERISTICS,
            base: { ...DEFAULT_CHARACTERISTICS.base, s: 30, t: 30 },
        },
        inventory: { items, gold, silver: 0, copper: 0 },
    }) as never;

const burden = (
    items: object[],
    rows: ReturnType<typeof row>[],
    byId: Record<string, { systemStats: unknown }>,
    coins = 0
) =>
    equipmentGearOf(hero(items, coins), rows as never, byId, rulesOf('canon5e'))
        ?.burden;

describe('equipmentGearOf burden (canon)', () => {
    it('weighs stash items from the full artifact set, not only equipped rows', () => {
        const byId = { rope: { systemStats: stats(1) } };

        expect(
            burden(
                [{ name: 'r', artifactId: 'rope', quantity: 7 }],
                [row('x', 0)],
                byId
            )
        ).toBe(1);
    });

    it('does not count an artifact twice when it is equipped and listed in items', () => {
        const byId = { sword: { systemStats: stats(6) } };

        expect(
            burden(
                [{ name: 's', artifactId: 'sword', quantity: 1 }],
                [
                    {
                        row: { id: 'sword', systemStats: stats(6) } as never,
                        slot: 'weapon',
                    },
                ],
                byId
            )
        ).toBeUndefined();
    });

    it('coins weigh 1 Enc per 200', () => {
        expect(burden([], [row('x', 6, 'backpack', true)], {}, 200)).toBe(1);
    });
});

describe('equipmentGearOf shield', () => {
    const shieldRow = {
        row: {
            id: 's',
            systemStats: stats(1, { qualities: [{ key: 'shield', value: 2 }] }),
        },
        slot: 'shield',
    };

    it('legacy: shield is not written to the participant snapshot', () => {
        const gear = equipmentGearOf(
            hero(),
            [shieldRow] as never,
            {},
            rulesOf('legacy')
        );

        const stats = wfrpAbilitiesOf(DEFAULT_CHARACTERISTICS, gear);

        expect(JSON.stringify(stats)).not.toContain('"shield"');
    });

    it('canon keeps the shield', () => {
        expect(
            equipmentGearOf(
                hero(),
                [shieldRow] as never,
                {},
                rulesOf('canon5e')
            )?.shield
        ).toBeGreaterThan(0);
    });
});
