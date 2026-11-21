import { describe, expect } from 'vitest';

import { bookExample } from './book-example';

import '@/lib/server/systems/registry';
import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import {
    context,
    participant,
} from '@/lib/server/battles/__tests__/mutations/fixtures';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import type { ResolveAttackCtx } from '@/lib/utils/rules/systems/types';
import { slotOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { resolveWfrpAttack } from '@/systems/wfrp/rules/combat/resolve-attack';
import { applyWfrpConditionTo } from '@/systems/wfrp/rules/conditions/apply';
import { conditionLevel } from '@/systems/wfrp/rules/conditions/levels';
import { FORTUNE_INPUT } from '@/systems/wfrp/rules/percentile/fortune';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ATTACK_SLOT } from '@/systems/wfrp/rules/slots';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';
import { grappleMutation } from '@/systems/wfrp/server/battle/grapple-mutation';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const rules = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const withS = (s: number, stats: { sb?: number; tb?: number; size?: string }) =>
    slotOf(
        {
            ...DEFAULT_CHARACTERISTICS,
            base: { ...DEFAULT_CHARACTERISTICS.base, s, ws: 45 },
        },
        stats as never
    );

const fighter = (
    id: string,
    side: 'ally' | 'enemy',
    system: ReturnType<typeof slotOf>,
    x: number
): BattleParticipant => {
    const base = participant(id, {
        side,
        controlledBy: side === 'ally' ? 'user-1' : 'dm',
    });

    return {
        ...base,
        abilities: { ...base.abilities, system },
        combatStats: { ...base.combatStats, currentHp: 20, maxHp: 20 },
        battleData: { ...base.battleData, position: { x, y: 0 } },
    };
};

const held = (
    actor: BattleParticipant,
    foe: BattleParticipant
): BattleParticipant[] => [
    withWfrpState(actor, {
        grapple: { with: foe.basicInfo.id, holder: true },
    }),
    withWfrpState(foe, {
        grapple: { with: actor.basicInfo.id, holder: false },
    }),
];

const ctxOf = (participants: BattleParticipant[]) => {
    const c = context({ participants, rng: () => 0.5 });

    return { ...c, meta: { ...c.meta, rules } };
};

const find = (out: { participants: BattleParticipant[] }, id: string) =>
    out.participants.find((p) => p.basicInfo.id === id)!;

describe('canon: Grapple declaration (p167)', () => {
    const brawl = {
        id: 'fist',
        name: 'fist',
        type: AttackType.MELEE,
        attackBonus: 0,
        damageDice: '',
        damageType: 'physical',
        system: ATTACK_SLOT.write({ qualities: [], flaws: [] }),
    } as unknown as BattleAttack;

    const declare = (grapple: boolean) => {
        const a = makeParticipant({ id: 'a', side: ParticipantSide.ALLY });

        const t = makeParticipant({ id: 't', side: ParticipantSide.ENEMY });

        const place = (p: BattleParticipant, x: number) => ({
            ...p,
            abilities: { ...p.abilities, system: withS(40, {}) },
            battleData: { ...p.battleData, position: { x, y: 0 } },
        });

        const [pa, pt] = [place(a, 0), place(t, 1)];

        const ctx: ResolveAttackCtx = {
            attacker: pa,
            target: pt,
            attack: brawl,
            participants: [pa, pt],
            rules,
            rng: () => 0.5,
            manualRoll: 5,
            map: { cols: 20, rows: 5, background: null, opacity: 0.3 },
            system: FORTUNE_INPUT.write({
                kind: 'none',
                ...(grapple && { mods: { grapple: true } }),
            }),
        };

        const r = resolveWfrpAttack(ctx);

        return { pa, pt, r };
    };

    bookExample(167, 'a won grapple holds both fighters and Entangles the foe', () => {
        const { pa, pt, r } = declare(true);

        const a = r.attackerUpdate!(pa);

        const t = r.targetUpdate!(pt);

        expect(r.isHit).toBe(false);
        expect(wfrpState(a).grapple).toEqual({ with: 't', holder: true });
        expect(wfrpState(t).grapple).toEqual({ with: 'a', holder: false });
        expect(conditionLevel(t, 'entangled')).toBe(1);
    });

    bookExample(167, 'without the declaration the same win is a plain hit', () => {
        const { pt, r } = declare(false);

        expect(r.isHit).toBe(true);
        expect(wfrpState(r.targetUpdate!(pt)).grapple).toBeUndefined();
    });
});

describe('canon: Grapple action, Opposed Strength (p167)', () => {
    const duel = (actorStats: object = {}, foeStats: object = {}) => {
        const actor = fighter('hero', 'ally', withS(50, { sb: 3, tb: 3, ...actorStats }), 0);

        const foe = fighter('foe', 'enemy', withS(51, { sb: 3, tb: 3, ...foeStats }), 1);

        return held(actor, foe);
    };

    bookExample(167, 'a won test wounds for SB + SL less TB, ignoring armour', () => {
        const out = grappleMutation(ctxOf(duel()), {
            participantId: 'hero',
            choice: 'damage',
            roll: 10,
        });

        expect(find(out, 'hero').actionFlags.hasUsedAction).toBe(true);
        expect(find(out, 'foe').combatStats.currentHp).toBe(16);
    });

    bookExample(167, 'tightening the hold gives one Entangled plus one per SL beyond the first', () => {
        const out = grappleMutation(ctxOf(duel()), {
            participantId: 'hero',
            choice: 'entangle',
            roll: 10,
        });

        expect(conditionLevel(find(out, 'foe'), 'entangled')).toBe(4);
    });

    bookExample(167, 'breaking free removes Entangled and ends the hold', () => {
        const [actor, foe] = duel();

        const tied = applyWfrpConditionTo(actor, {
            key: 'entangled',
            round: 0,
            sourceName: 'test',
        }).participant;

        const out = grappleMutation(ctxOf([tied, foe]), {
            participantId: 'hero',
            choice: 'free',
            roll: 10,
        });

        expect(conditionLevel(find(out, 'hero'), 'entangled')).toBe(0);
        expect(wfrpState(find(out, 'hero')).grapple).toBeUndefined();
        expect(wfrpState(find(out, 'foe')).grapple).toBeUndefined();
    });

    bookExample(167, 'breaking free removes one Entangled plus one per SL beyond the first and keeps the hold while some remain', () => {
        const [actor, foe] = duel();

        const tied = applyWfrpConditionTo(actor, {
            key: 'entangled',
            levels: 6,
            round: 0,
            sourceName: 'test',
        }).participant;

        const out = grappleMutation(ctxOf([tied, foe]), {
            participantId: 'hero',
            choice: 'free',
            roll: 10,
        });

        expect(conditionLevel(find(out, 'hero'), 'entangled')).toBe(2);
        expect(wfrpState(find(out, 'hero')).grapple).toBeDefined();
    });

    bookExample(360, 'a foe two sizes larger wins the contest outright', () => {
        const out = grappleMutation(
            ctxOf(duel({}, { size: 'enormous' })),
            { participantId: 'hero', choice: 'damage', roll: 1 }
        );

        expect(find(out, 'foe').combatStats.currentHp).toBe(20);
    });

    bookExample(360, 'a much larger grappler wins even on a bad roll', () => {
        const out = grappleMutation(
            ctxOf(duel({ size: 'enormous' }, {})),
            { participantId: 'hero', choice: 'damage', roll: 99 }
        );

        expect(find(out, 'foe').combatStats.currentHp).toBeLessThan(20);
    });
});
