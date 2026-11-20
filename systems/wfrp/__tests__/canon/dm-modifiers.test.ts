import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';
import {
    attackDetails,
    bow,
    canonRules,
    fighter,
    legacyRules,
} from './combat-fixtures';

import { CombatStatus } from '@/lib/constants/battle';
import { isAttackable } from '@/lib/utils/abilities/engine/core/participants';
import { testMap } from '@/lib/utils/battle/__tests__/fixtures/placed';
import { mulberry32 } from '@/lib/utils/common/rng';
import type { CastTestCtx } from '@/lib/utils/rules/systems/types';
import { assertWfrpInput } from '@/systems/wfrp/rules/combat/input';
import { caster } from '@/systems/wfrp/rules/magic/__tests__/fixtures';
import { wfrpCastTest } from '@/systems/wfrp/rules/magic/cast-test';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';
import { WfrpFortuneInputSchema } from '@/systems/wfrp/server/attack-input';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const down = (p: BattleParticipant): BattleParticipant => ({
    ...p,
    combatStats: { ...p.combatStats, status: CombatStatus.UNCONSCIOUS },
});

const gun = (): BattleAttack => ({ ...bow(), range: '150/450 ft' });

describe('canon: DM-only attack modifiers (D2b)', () => {
    const ctx = (isDM: boolean) =>
        ({
            kind: 'attack',
            actor: fighter('a'),
            targetCount: 1,
            isDM,
        }) as const;

    it('rejects a called shot or situational flags from a player', () => {
        const called = WfrpFortuneInputSchema.parse({
            system: { key: 'wfrp', data: { kind: 'none', calledShot: 'head' } },
        })!;

        const flags = WfrpFortuneInputSchema.parse({
            system: {
                key: 'wfrp',
                data: { kind: 'none', situational: { enclosed: true } },
            },
        })!;

        expect(() => assertWfrpInput(called, ctx(false))).toThrow();
        expect(() => assertWfrpInput(flags, ctx(false))).toThrow();
        expect(() => assertWfrpInput(called, ctx(true))).not.toThrow();
        expect(() => assertWfrpInput(flags, ctx(true))).not.toThrow();
    });

    it('a plain player input still passes', () => {
        const plain = WfrpFortuneInputSchema.parse({
            system: { key: 'wfrp', data: { kind: 'none' } },
        })!;

        expect(() => assertWfrpInput(plain, ctx(false))).not.toThrow();
    });
});

describe('canon: Unconscious targets (p167)', () => {
    bookExample(167, 'an Unconscious body is a valid attack target', () => {
        const p = down(fighter('t', { side: 'enemy' }));

        expect(isAttackable(p, canonRules)).toBe(true);
        expect(isAttackable(p, legacyRules)).toBe(false);
        expect(isAttackable(p)).toBe(false);
    });

    it('a Dead body is not attackable', () => {
        const dead = {
            ...fighter('t'),
            combatStats: {
                ...fighter('t').combatStats,
                status: CombatStatus.DEAD,
            },
        };

        expect(isAttackable(dead, canonRules)).toBe(false);
    });

    bookExample(167, 'a melee blow at an Unconscious target hits', () => {
        const a = fighter('a', { at: { x: 0, y: 5 } });

        const t = down(fighter('t', { side: 'enemy', at: { x: 1, y: 5 } }));

        const { result } = attackDetails(
            a,
            t,
            {
                ...bow(),
                type: 'melee',
            } as never,
            { manualRoll: 99 }
        );

        expect(result.isHit).toBe(true);
    });
});

describe('canon: Point Blank Dodge (p165)', () => {
    const shooter = fighter('a', { at: { x: 0, y: 5 } });

    const prey = (x: number) =>
        fighter('t', { side: 'enemy', at: { x, y: 5 } });

    const run = (x: number, manualRoll = 20) =>
        attackDetails(shooter, prey(x), gun(), {
            map: testMap(100, 20),
            manualRoll,
        });

    bookExample(165, 'at Point Blank the target opposes with Dodge', () => {
        const d = run(2).details;

        expect(d?.opposed).toBe(true);
        expect(d?.defender?.kind).toBe('dodge');
    });

    bookExample(165, 'beyond Point Blank the shot stays unopposed', () => {
        const d = run(12).details;

        expect(d?.opposed).toBeUndefined();
        expect(d?.defender).toBeUndefined();
    });

    it('a target that cannot defend is not given a Dodge', () => {
        const helpless = down(prey(2));

        const d = attackDetails(shooter, helpless, gun(), {
            map: testMap(100, 20),
            manualRoll: 99,
        });

        expect(d.details?.opposed).toBeUndefined();
        expect(d.result.isHit).toBe(true);
    });

    it('legacy keeps the unopposed shot at any range', () => {
        const d = attackDetails(shooter, prey(2), gun(), {
            map: testMap(100, 20),
            rules: legacyRules,
        }).details;

        expect(d?.opposed).toBeUndefined();
    });
});

describe('canon: a cast ends an Aim (p167)', () => {
    bookExample(167, 'casting before the shot loses the aim', () => {
        const aimer = withWfrpState(caster(), {
            aim: { targetId: 't', movementUsed: 0 },
        });

        const cast = (rules: typeof canonRules) =>
            wfrpCastTest({
                caster: aimer,
                spell: {
                    id: 's',
                    name: 'Bolt',
                    level: 1,
                    groupId: null,
                    definition: {
                        targeting: { kind: 'enemy', range: 60 },
                        effects: [],
                    },
                } as unknown as CastTestCtx['spell'],
                magic: { cn: 2, kind: 'arcane', overcast: null },
                rules,
                rng: mulberry32(1),
                presetRoll: 5,
            });

        const after = cast(canonRules).casterUpdate?.(aimer);

        expect(wfrpState(after!).aim).toBeUndefined();
        expect(cast(legacyRules).casterUpdate?.(aimer)).toBeUndefined();
    });
});
