import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CombatStatus, ParticipantSide } from '@/lib/constants/battle';
import { attackBodySchema } from '@/lib/schemas/battles';
import { context } from '@/lib/server/battles/__tests__/mutations/fixtures';
import { attackMutation } from '@/lib/server/battles/mutations/attack/attack-mutation';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { createBattleParticipantFromUnit } from '@/lib/utils/battle/participant/from-unit';
import type { BattleMutationContext } from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { applyScenePatch } from '@/lib/utils/battle/scene-state';
import { diffParticipants, splitParticipant } from '@/lib/utils/battle/store';
import { runJoinTriggers } from '@/lib/utils/battle/turn/join-triggers';
import type { UnitFromPrisma } from '@/lib/utils/battle/types/participant';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { wfrpAbilitiesOf } from '@/systems/wfrp/rules/combat/participant';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { wfrpState } from '@/systems/wfrp/rules/state';
import { must } from '@/systems/wfrp/rules/traits/__tests__/fixtures';
import { TRAIT_RECIPES } from '@/systems/wfrp/rules/traits/recipes';
import type { BattleParticipant } from '@/types/battle';

vi.mock('@/lib/db', () => ({ prisma: { race: { findFirst: vi.fn() } } }));

const recipe = (id: string, values: Record<string, string | number> = {}) => {
    const r = must(TRAIT_RECIPES.find((x) => x.id === id));

    const defaults = Object.fromEntries(
        r.params.map((p) => [p.key, p.default])
    );

    const { ability } = r.build(
        { ...defaults, ...values },
        { scope: 'ability', name: id, note: '' }
    ) as { ability: object };

    return { id, ...ability };
};

const trollUnit = (abilities: unknown[]) =>
    ({
        id: 'troll',
        campaignId: 'c1',
        name: 'Troll',
        race: '',
        raceId: null,
        groupId: null,
        groupColor: null,
        damageModifier: null,
        level: 1,
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 8,
        wisdom: 8,
        charisma: 8,
        armorClass: 12,
        initiative: 1,
        speed: 30,
        maxHp: 30,
        proficiencyBonus: 2,
        attacks: [],
        specialAbilities: [],
        knownSpells: [],
        avatar: null,
        createdAt: new Date(0),
        immunities: [],
        morale: 0,
        maxTargets: 1,
        minTargets: 1,
        abilities,
        characteristics: { base: { ws: 40, s: 40, t: 40 } },
    }) as unknown as UnitFromPrisma;

const TRAITS = () => [
    recipe('armour', { ap: 2 }),
    recipe('ward', { value: 9 }),
    recipe('size', { size: 'large' }),
    recipe('fear', { psychology: 'fear', value: 1 }),
    recipe('regenerate'),
    recipe('bite', { damage: 4 }),
];

const buildTroll = async (
    rules: typeof WFRP_RULES,
    abilities: unknown[] = TRAITS()
): Promise<BattleParticipant> => {
    const p = await createBattleParticipantFromUnit(
        trollUnit(abilities),
        'b1',
        ParticipantSide.ENEMY,
        1,
        undefined,
        rules
    );

    return { ...p, basicInfo: { ...p.basicInfo, id: 't', controlledBy: 'dm' } };
};

const swordHero = (): BattleParticipant => {
    const p = makeParticipant({
        id: 'h',
        side: ParticipantSide.ALLY,
        hp: 20,
        maxHp: 20,
    });

    const characteristics = {
        ...DEFAULT_CHARACTERISTICS,
        base: { ...DEFAULT_CHARACTERISTICS.base, ws: 40, s: 30, t: 30, wp: 35 },
    };

    return {
        ...p,
        basicInfo: { ...p.basicInfo, battleId: 'b1', controlledBy: 'dm' },
        abilities: {
            ...p.abilities,
            ...wfrpAbilitiesOf(characteristics, {
                ap: { head: 0, arm: 0, body: 0, leg: 0 },
            }),
        },
        battleData: {
            ...p.battleData,
            attacks: [
                {
                    id: 'sw',
                    name: 'Sword',
                    type: 'melee',
                    attackBonus: 0,
                    damageDice: '1d6',
                    damageType: 'slashing',
                } as never,
            ],
        },
    };
};

const ctxOf = (
    participants: BattleParticipant[],
    rules = WFRP_RULES
): BattleMutationContext => {
    const base = context({ participants, isDM: true });

    return {
        ...base,
        meta: { ...base.meta, rules },
        scene: { ...base.scene, turnIndex: 0 },
    };
};

const firstThen = (first: number, rest: number) => {
    let calls = 0;

    return () => (calls++ === 0 ? first : rest);
};

const fresh = (
    ctx: BattleMutationContext,
    turnIndex: number
): BattleMutationContext => ({
    ...ctx,
    participants: ctx.participants.map((p) => ({
        ...p,
        actionFlags: { ...p.actionFlags, hasUsedAction: false },
    })),
    scene: { ...ctx.scene, turnIndex },
});

const strike = (
    c: BattleMutationContext,
    attackerId: string,
    targetId: string,
    attackId: string,
    rng: [number, number],
    roll = 30,
    endTurn = true
) => {
    const ctx = fresh(c, c.scene.turnIndex);

    return attackMutation(
        { ...ctx, rng: firstThen(...rng) },
        attackBodySchema.parse({
            attackerId,
            targetId,
            attackId,
            d20Roll: roll,
            damageRolls: [4],
            endTurn,
        })
    );
};

const advance = (
    ctx: BattleMutationContext,
    out: Awaited<ReturnType<typeof strike>>
): BattleMutationContext => ({
    ...ctx,
    participants: out.participants,
    scene: applyScenePatch(ctx.scene, out.scene ?? {}),
});

const part = (ctx: BattleMutationContext, id: string) =>
    must(ctx.participants.find((p) => p.basicInfo.id === id));

const FAIL = 0.99;

const NO_WARD: [number, number] = [0.95, 0.05];

const WARD: [number, number] = [0.95, 0.95];

describe('wfrp unit traits end to end', () => {
    beforeEach(() => vi.clearAllMocks());

    it("fear test on join, AP and ward in damage, size on the troll's bite, regenerate, no regeneration at 0 Wounds", async () => {
        const troll = await buildTroll(WFRP_RULES);

        const before = [swordHero(), troll];

        const joined = runJoinTriggers(before, {
            round: 1,
            rng: () => FAIL,
            map: null,
            rules: WFRP_RULES,
        });

        const hero = must(
            joined.participants.find((p) => p.basicInfo.id === 'h')
        );

        expect(joined.psychology.targets).toEqual([
            { participantId: 'h', participantName: hero.basicInfo.name },
        ]);
        expect(JSON.stringify(joined.psychology.lines)).toContain(
            'psychologyFail'
        );
        expect(wfrpState(hero).psychologyTested).toEqual({ fear: 1 });
        expect(ruleSystemOf(WFRP_RULES).conditions?.list(hero)).toContainEqual(
            expect.objectContaining({ key: 'broken' })
        );

        const split = (list: BattleParticipant[]) =>
            list.map((p, i) =>
                splitParticipant(p, { orderIndex: i, isPending: false })
            );

        expect(
            JSON.stringify(
                diffParticipants(split(before), split(joined.participants))
            )
        ).toContain('psychologyTested');

        let ctx = ctxOf(joined.participants);

        const hit = await strike(ctx, 'h', 't', 'sw', NO_WARD, 30, false);

        expect(JSON.stringify(hit.events)).not.toContain('steps.ward');

        ctx = advance(ctx, hit);

        const afterHit = part(ctx, 't').combatStats.currentHp;

        expect(afterHit).toBeLessThan(30);

        const bite = must(
            part(ctx, 't').battleData.attacks.find((a) =>
                a.id?.includes('bite')
            )
        );

        const bitten = await strike(
            { ...ctx, scene: { ...ctx.scene, turnIndex: 1 } },
            't',
            'h',
            must(bite.id),
            NO_WARD,
            5,
            false
        );

        expect(JSON.stringify(bitten.events)).toContain('steps.size');
        expect(
            part({ ...ctx, participants: bitten.participants }, 'h').combatStats
                .currentHp
        ).toBeLessThan(20);

        const warded = await strike(
            { ...ctx, scene: { ...ctx.scene, turnIndex: 0 } },
            'h',
            't',
            'sw',
            WARD,
            30,
            false
        );

        expect(JSON.stringify(warded.events)).toContain('steps.ward');
        expect(
            part({ ...ctx, participants: warded.participants }, 't').combatStats
                .currentHp
        ).toBe(afterHit);

        let cur = {
            ...ctx,
            participants: ctx.participants.map((p) =>
                p.basicInfo.id === 't'
                    ? { ...p, combatStats: { ...p.combatStats, currentHp: 2 } }
                    : p
            ),
        };

        cur = advance(
            cur,
            await strike(
                { ...cur, scene: { ...cur.scene, turnIndex: 0 } },
                'h',
                't',
                'sw',
                NO_WARD,
                30,
                false
            )
        );

        const down = part(cur, 't');

        expect(down.combatStats).toMatchObject({
            currentHp: 0,
            status: CombatStatus.UNCONSCIOUS,
        });

        const next = await strike(
            { ...cur, scene: { ...cur.scene, turnIndex: 0 } },
            'h',
            't',
            'sw',
            NO_WARD,
            30,
            true
        );

        expect(
            part({ ...cur, participants: next.participants }, 't').combatStats
                .currentHp
        ).toBe(0);
        expect(JSON.stringify(next.events)).not.toContain('regenerate');
    });

    it('regenerate heals the wounded troll at the start of its turn', async () => {
        const troll = await buildTroll(WFRP_RULES);

        const wounded = {
            ...troll,
            combatStats: { ...troll.combatStats, currentHp: 10 },
        };

        const ctx = ctxOf([swordHero(), wounded]);

        const out = await strike(ctx, 'h', 't', 'sw', NO_WARD, 30, true);

        expect(out.scene?.turnIndex).toBe(1);
        expect(part(advance(ctx, out), 't').combatStats.currentHp).toBe(
            10 - 8 + 1
        );
        expect(JSON.stringify(out.events)).toContain('abilityText.log.heal');
    });

    it('a d20 campaign sees none of the traits', async () => {
        const troll = await buildTroll(DEFAULT_RULES as never);

        expect(troll.abilities.system).toBeUndefined();
        expect(troll.battleData.attacks).toHaveLength(0);

        const joined = runJoinTriggers(
            [makeParticipant({ id: 'h', side: ParticipantSide.ALLY }), troll],
            { round: 1, rng: () => FAIL, map: null, rules: DEFAULT_RULES }
        );

        expect(joined.psychology).toEqual({ lines: [], targets: [] });
        expect(JSON.stringify(joined.participants)).not.toContain(
            'psychologyTested'
        );

        const hero = makeParticipant({ id: 'h', side: ParticipantSide.ALLY });

        const out = await attackMutation(
            {
                ...ctxOf(
                    [
                        {
                            ...hero,
                            battleData: {
                                ...hero.battleData,
                                attacks: [
                                    {
                                        id: 'sw',
                                        name: 'Sword',
                                        type: 'melee',
                                        attackBonus: 5,
                                        damageDice: '1d6',
                                        damageType: 'slashing',
                                    } as never,
                                ],
                            },
                        },
                        troll,
                    ],
                    DEFAULT_RULES
                ),
                rng: () => 0.5,
            },
            attackBodySchema.parse({
                attackerId: 'h',
                targetId: 't',
                attackId: 'sw',
                d20Roll: 15,
                damageRolls: [4],
            })
        );

        expect(JSON.stringify(out.events)).not.toContain('battleWfrp');
    });
});
