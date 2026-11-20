import { describe, expect } from 'vitest';

import { bookExample, CANON } from './book-example';

import {
    AttackType,
    CombatStatus,
    ParticipantSide,
} from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import type { ResolveAttackCtx } from '@/lib/utils/rules/systems/types';
import { attackOf, slotOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { isHelpless } from '@/systems/wfrp/rules/combat/attack-mods/helpless';
import { resolveWfrpAttack } from '@/systems/wfrp/rules/combat/resolve-attack';
import { applyWfrpConditionTo } from '@/systems/wfrp/rules/conditions/apply';
import { FORTUNE_INPUT } from '@/systems/wfrp/rules/percentile/fortune';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ATTACK_SLOT } from '@/systems/wfrp/rules/slots';
import type { BattleAttack, BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

const rulesOf = (helplessKills?: boolean) =>
    RulesetSchema.parse({
        ...WFRP_RULES,
        edition: {
            preset: 'canon5e',
            ...(helplessKills !== undefined && { helplessKills }),
        },
    });

const map: BattleMapConfig = {
    cols: 100,
    rows: 5,
    background: null,
    opacity: 0.3,
};

const unit = (
    id: string,
    x: number,
    side: 'ally' | 'enemy' = ParticipantSide.ALLY
): BattleParticipant => {
    const p = makeParticipant({ id, hp: 20, maxHp: 20 });

    return {
        ...p,
        basicInfo: { ...p.basicInfo, side },
        battleData: { ...p.battleData, position: { x, y: 0 } },
        abilities: {
            ...p.abilities,
            system: slotOf({
                ...DEFAULT_CHARACTERISTICS,
                base: { ...DEFAULT_CHARACTERISTICS.base, ws: 45, bs: 45 },
            }),
        },
    };
};

const sleeper = (x: number) =>
    applyWfrpConditionTo(unit('t', x, ParticipantSide.ENEMY), {
        key: 'unconscious',
        round: 0,
        edition: CANON,
        sourceName: 'test',
    }).participant;

const attackWith = (type: AttackType, range?: string): BattleAttack =>
    ({
        id: 'w',
        name: 'w',
        type,
        ...(range && { range }),
        attackBonus: 0,
        damageDice: '',
        damageType: 'physical',
        system: ATTACK_SLOT.write({ qualities: [], flaws: [] }),
    }) as unknown as BattleAttack;

const run = (
    target: BattleParticipant,
    attack: BattleAttack,
    mods: { helplessRoll?: number; calledShot?: 'leftArm' } = {},
    rules = rulesOf()
) => {
    const a = unit('a', 0);

    const ctx: ResolveAttackCtx = {
        attacker: a,
        target,
        attack,
        participants: [a, target],
        rules,
        rng: () => 0.5,
        map,
        system: FORTUNE_INPUT.write({ kind: 'none', mods }),
    };

    return resolveWfrpAttack(ctx);
};

describe('canon: helpless targets (p166)', () => {
    bookExample(166, 'unconscious and asleep fighters are helpless', () => {
        expect(isHelpless(sleeper(1))).toBe(true);
        expect(isHelpless(unit('x', 1))).toBe(false);
        expect(
            isHelpless({
                ...unit('x', 1),
                combatStats: {
                    ...unit('x', 1).combatStats,
                    status: CombatStatus.UNCONSCIOUS,
                },
            })
        ).toBe(true);
    });

    bookExample(
        166,
        'a melee attack on a helpless target hits with the chosen roll 01',
        () => {
            const r = run(sleeper(1), attackWith(AttackType.MELEE), {
                helplessRoll: 1,
            });

            expect(r.isHit).toBe(true);
            expect(attackOf(r.attackRoll)?.sl).toBe(4);
            expect(attackOf(r.attackRoll)?.defender).toBeUndefined();
        }
    );

    bookExample(166, 'the default chosen roll is 01', () => {
        const r = run(sleeper(1), attackWith(AttackType.MELEE));

        expect(r.isHit).toBe(true);
        expect(attackOf(r.attackRoll)?.roll).toBe(1);
    });

    bookExample(
        166,
        'a doubles roll is a Critical Hit and the attacker names the location',
        () => {
            const r = run(sleeper(1), attackWith(AttackType.MELEE), {
                helplessRoll: 33,
                calledShot: 'leftArm',
            });

            expect(r.isHit).toBe(true);
            expect(r.attackRoll.isCritical).toBe(true);
            expect(attackOf(r.attackRoll)?.location).toBe('leftArm');
        }
    );

    bookExample(
        166,
        'a Point Blank ranged attack on a helpless target hits',
        () => {
            const r = run(
                sleeper(2),
                attackWith(AttackType.RANGED, '150/450 ft')
            );

            expect(r.isHit).toBe(true);
            expect(attackOf(r.attackRoll)?.mods?.[0]?.key).toBe('helpless');
        }
    );

    bookExample(166, 'a ranged attack from afar is a normal test', () => {
        const r = run(sleeper(10), attackWith(AttackType.RANGED, '150/450 ft'));

        expect(
            attackOf(r.attackRoll)?.mods?.some((m) => m.key === 'helpless')
        ).toBeFalsy();
    });

    bookExample(166, 'with helplessKills the hit kills outright', () => {
        const target = sleeper(1);

        const r = run(target, attackWith(AttackType.MELEE), {}, rulesOf(true));

        expect(r.targetUpdate?.(target).combatStats.status).toBe(
            CombatStatus.DEAD
        );
    });

    bookExample(166, 'without the rule the target is only hit', () => {
        expect(
            run(sleeper(1), attackWith(AttackType.MELEE)).targetUpdate
        ).toBeUndefined();
    });
});
