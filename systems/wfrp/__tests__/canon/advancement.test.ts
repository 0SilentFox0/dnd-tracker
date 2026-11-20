import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { bookExample, CANON } from './book-example';

import {
    advanceCost,
    CAREER_ADVANCE_XP,
    careerChangeCost,
    planCareerAdvance,
    planCareerRevert,
    planCareerSet,
    planPurchase,
    planTrappingTick,
    talentCost,
} from '@/systems/wfrp/rules/advancement';
import { AdvancementRulesSchema } from '@/systems/wfrp/rules/advancement/schema';
import {
    DEFAULT_CHARACTERISTICS,
    readCharacteristics,
} from '@/systems/wfrp/rules/characteristics/keys';
import { WFRP_RULES_PRESET } from '@/systems/wfrp/rules/rules-preset';

const PACKS = ['grim-d100', 'grim-d100-empty'] as const;

const packRules = (pack: string) =>
    JSON.parse(
        readFileSync(
            join(process.cwd(), 'data/templates', pack, 'rules.json'),
            'utf8'
        )
    ).advancement;

const RULES = AdvancementRulesSchema.parse(packRules('grim-d100'));

const STEP = CANON.advanceStep;

const purchaseCosts = (kind: 'characteristic' | 'skill') =>
    Array.from({ length: 15 }, (_, n) =>
        advanceCost(kind, n * STEP, RULES, STEP)
    );

describe('canon: advancement (Spending XP, p191)', () => {
    bookExample(
        191,
        'first Agility advance costs 125 XP, the next +5 costs 175 XP',
        () => {
            expect(advanceCost('characteristic', 0, RULES, STEP)).toBe(125);
            expect(advanceCost('characteristic', 5, RULES, STEP)).toBe(175);
        }
    );

    bookExample(
        191,
        'first Stealth advance costs 50 XP, the next +5 costs 75 XP',
        () => {
            expect(advanceCost('skill', 0, RULES, STEP)).toBe(50);
            expect(advanceCost('skill', 5, RULES, STEP)).toBe(75);
        }
    );

    bookExample(
        191,
        'cumulative cost of +30 is 2,100 XP for a characteristic, 1,025 for a skill',
        () => {
            const sum = (list: (number | null)[], n: number) =>
                list.slice(0, n).reduce<number>((a, c) => a + (c ?? 0), 0);

            expect(sum(purchaseCosts('characteristic'), 6)).toBe(2100);
            expect(sum(purchaseCosts('skill'), 6)).toBe(1025);
            expect(sum(purchaseCosts('characteristic'), 15)).toBe(44525);
            expect(sum(purchaseCosts('skill'), 15)).toBe(31125);
        }
    );

    bookExample(
        191,
        'a purchase adds +5 points; the table runs to +75 and stops there',
        () => {
            const r = planPurchase({
                characteristics: DEFAULT_CHARACTERISTICS,
                available: 1000,
                request: { kind: 'characteristic', key: 'ws' },
                rules: RULES,
                step: STEP,
                now: 't',
                id: 'e1',
            });

            expect(r.ok && r.next.advances.ws).toBe(5);
            expect(r.ok && r.entry).toMatchObject({
                from: 0,
                to: 5,
                cost: 125,
            });
            expect(advanceCost('skill', 75, RULES, STEP)).toBeNull();

            const capped = planPurchase({
                characteristics: {
                    ...DEFAULT_CHARACTERISTICS,
                    skillAdvances: { melee: 75 },
                },
                available: 1e6,
                request: { kind: 'skill', key: 'melee' },
                rules: RULES,
                step: STEP,
                now: 't',
                id: 'e2',
            });

            expect(capped).toEqual({ ok: false, error: 'AT_LIMIT' });
        }
    );

    bookExample(191, 'every talent costs a flat 100 XP per purchase', () => {
        expect(talentCost(100, 0, RULES, true)).toBe(100);
        expect(talentCost(100, 2, RULES, true)).toBe(100);
        expect(talentCost(100, 2, RULES)).toBe(300);
    });
});

describe('canon: Advance Career (p196) and Change Career (p197)', () => {
    const at = (ticks: number) => ({
        ...DEFAULT_CHARACTERISTICS,
        career: {
            careerId: 'c',
            tier: 1 as const,
            ticks: Array.from({ length: ticks }, (_, i) => `skill:s${i}`),
        },
    });

    bookExample(196, 'tick 10, 12 and 14 boxes to reach levels 2, 3, 4', () => {
        expect(RULES.career.ticksRequired).toEqual([10, 12, 14]);
    });

    bookExample(196, 'advancing a career level costs 100 XP', () => {
        const paid = planCareerAdvance(at(10), RULES, {
            force: false,
            charge: { cost: CAREER_ADVANCE_XP, available: 150 },
        });

        expect(paid.ok && paid.next.spentArchived).toBe(100);
        expect(paid.ok && paid.next.career?.tier).toBe(2);

        expect(
            planCareerAdvance(at(10), RULES, {
                force: false,
                charge: { cost: CAREER_ADVANCE_XP, available: 99 },
            })
        ).toEqual({ ok: false, error: 'INSUFFICIENT_XP' });
        expect(
            planCareerAdvance(at(9), RULES, {
                force: false,
                charge: { cost: CAREER_ADVANCE_XP, available: 500 },
            })
        ).toEqual({ ok: false, error: 'TICKS_MISSING' });
    });

    bookExample(196, 'the GM force path stays free', () => {
        const forced = planCareerAdvance(at(0), RULES, {
            force: true,
            charge: { cost: CAREER_ADVANCE_XP, available: 0 },
        });

        expect(forced.ok && forced.next.spentArchived).toBe(0);
    });

    bookExample(
        197,
        'changing career costs 100 XP in the same Class, 200 XP in another',
        () => {
            expect(careerChangeCost('Warriors', 'Warriors')).toBe(100);
            expect(careerChangeCost('Warriors', 'Rogues')).toBe(200);
            expect(careerChangeCost(null, 'Rogues')).toBe(200);
        }
    );
});

describe('canon: shipped tables match p191', () => {
    it.each(PACKS)('%s: brackets, max and ticks', (pack) => {
        const rules = AdvancementRulesSchema.parse(packRules(pack));

        expect(rules.characteristic.brackets.map((b) => b.cost)).toEqual(
            purchaseCosts('characteristic')
        );
        expect(rules.skill.brackets.map((b) => b.cost)).toEqual(
            purchaseCosts('skill')
        );
        expect(rules.characteristic.max).toBe(75);
        expect(rules.skill.max).toBe(75);
        expect(rules.career.ticksRequired).toEqual([10, 12, 14]);
    });

    it('the grim feats cost a flat 100 XP', () => {
        const feats = JSON.parse(
            readFileSync(
                join(process.cwd(), 'data/templates/grim-d100/feats.json'),
                'utf8'
            )
        ) as { xpCost?: number | null }[];

        for (const f of feats) if (f.xpCost != null) expect(f.xpCost).toBe(100);
    });

    it('the new-campaign preset carries the same tables', () => {
        const { characteristic, skill } = WFRP_RULES_PRESET.advancement;

        expect(characteristic.brackets.map((b) => b.cost)).toEqual(
            purchaseCosts('characteristic')
        );
        expect(skill.brackets.map((b) => b.cost)).toEqual(
            purchaseCosts('skill')
        );
        expect(characteristic.max).toBe(75);
    });
});

it('legacy keeps one point per purchase', () => {
    expect(advanceCost('characteristic', 0, RULES, 1)).toBe(125);
});

describe('canon: career write-off is reversible', () => {
    const hero = {
        ...DEFAULT_CHARACTERISTICS,
        career: { careerId: 'a', tier: 1 as const, ticks: ['skill:x'] },
    };

    it('changing career records the charge and the revert restores career, ticks and XP', () => {
        const set = planCareerSet(hero, 'b', 200);

        expect(set.spentArchived).toBe(200);
        expect(set.career?.lastChange?.cost).toBe(200);

        const back = planCareerRevert(set);

        expect(back.ok && back.next.career).toEqual(hero.career);
        expect(back.ok && back.next.spentArchived).toBe(0);
    });

    it('a trapping tick on the new career is dropped by the revert, the old ticks come back', () => {
        const tiers = [
            {
                name: 'L1',
                characteristics: [],
                skills: [],
                talents: [],
                trappings: [],
            },
            {
                name: 'L2',
                characteristics: [],
                skills: [],
                talents: [],
                trappings: ['Dagger'],
            },
        ];

        const set = planCareerSet(
            { ...hero, career: { ...hero.career!, ticks: ['trapping:rope'] } },
            'b',
            100
        );

        const ticked = planTrappingTick(set, tiers, 'Dagger');

        expect(ticked.ok && ticked.next.career?.ticks).toEqual([
            'trapping:dagger',
        ]);

        const back = ticked.ok && planCareerRevert(ticked.next);

        expect(back && back.ok && back.next.career?.ticks).toEqual([
            'trapping:rope',
        ]);
    });

    it('the undo record and the lost Standing survive a storage round trip', () => {
        const set = planCareerSet(
            { ...hero, career: { ...hero.career, standingLoss: 2 } },
            'b',
            100
        );

        const stored = {
            ...set,
            career: { ...set.career!, standingLoss: 1 },
        };

        expect(readCharacteristics({ characteristics: stored }).career).toEqual(
            stored.career
        );
    });

    it('a free change or an advance without charge leaves nothing to revert', () => {
        expect(planCareerRevert(planCareerSet(hero, 'b')).ok).toBe(false);
    });

    it('Advance Career is reversible too and a later purchase makes the revert stale', () => {
        const full = {
            ...hero,
            career: {
                ...hero.career,
                ticks: Array.from({ length: 10 }, (_, i) => `t${i}`),
            },
        };

        const up = planCareerAdvance(full, RULES, {
            force: false,
            charge: { cost: CAREER_ADVANCE_XP, available: 500 },
        });

        if (!up.ok) throw new Error(up.error);

        expect(up.next.career?.tier).toBe(2);

        const back = planCareerRevert(up.next);

        expect(back.ok && back.next.career?.tier).toBe(1);
        expect(back.ok && back.next.spentArchived).toBe(0);

        const bought = {
            ...up.next,
            ledger: [
                ...up.next.ledger,
                {
                    id: 'l1',
                    at: 'x',
                    kind: 'skill' as const,
                    key: 'k',
                    from: 0,
                    to: 5,
                    cost: 10,
                },
            ],
        };

        expect(planCareerRevert(bought)).toEqual({ ok: false, error: 'STALE' });
    });
});

describe('canon: tick per trapping (p191)', () => {
    const tiers = [
        {
            name: 'L1',
            characteristics: [],
            skills: [],
            talents: [],
            trappings: ['Dagger'],
        },
        {
            name: 'L2',
            characteristics: [],
            skills: [],
            talents: [],
            trappings: ['Leather Jerkin'],
        },
    ];

    const hero = {
        ...DEFAULT_CHARACTERISTICS,
        career: { careerId: 'a', tier: 1 as const, ticks: [] },
    };

    bookExample(
        191,
        'a trapping of the next career level ticks one box',
        () => {
            const r = planTrappingTick(hero, tiers, 'leather jerkin');

            expect(r.ok && r.next.career?.ticks).toEqual([
                'trapping:leather jerkin',
            ]);
        }
    );

    it('only next-level trappings count, and each ticks once', () => {
        expect(planTrappingTick(hero, tiers, 'Dagger')).toEqual({
            ok: false,
            error: 'NOT_LISTED',
        });

        const once = planTrappingTick(hero, tiers, 'Leather Jerkin');

        if (!once.ok) throw new Error(once.error);

        expect(planTrappingTick(once.next, tiers, 'Leather Jerkin')).toEqual({
            ok: false,
            error: 'ALREADY',
        });
    });
});
