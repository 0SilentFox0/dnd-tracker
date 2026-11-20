import { describe, expect } from 'vitest';

import { bookExample, CANON } from './book-example';

import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { applyDamageConsequences } from '@/lib/utils/battle/damage/consequences';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { withStats } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { traitMods } from '@/systems/wfrp/rules/combat/attack-mods/traits';
import { applyWfrpCrit } from '@/systems/wfrp/rules/combat/crit-effect';
import { withEngagement } from '@/systems/wfrp/rules/combat/engagement';
import { rangeContext } from '@/systems/wfrp/rules/combat/range-band';
import { conditionLevel } from '@/systems/wfrp/rules/conditions/levels';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ATTACK_SLOT } from '@/systems/wfrp/rules/slots';
import { trait } from '@/systems/wfrp/rules/traits/__tests__/fixtures';
import { isPsychImmune } from '@/systems/wfrp/rules/traits/passions';
import { sizeMeleeDamage } from '@/systems/wfrp/rules/traits/size';
import { wfrpSwarmRoundEnd } from '@/systems/wfrp/rules/turn/creature-hooks';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const canon = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const legacy = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'legacy' },
});

const map = { cols: 100, rows: 5, background: null, opacity: 0.3 };

const creature = (kind: string) =>
    trait([{ kind: 'wfrpCreature', trait: kind }]);

const unit = (
    id: string,
    x: number,
    traits: string[] = [],
    side: 'ally' | 'enemy' = ParticipantSide.ALLY,
    stats: { sb?: number; size?: 'large' } = {}
): BattleParticipant => {
    const p = makeParticipant({
        id,
        side,
        abilities: traits.map(creature),
    });

    return withStats(
        { ...p, battleData: { ...p.battleData, position: { x, y: 0 } } },
        { sb: stats.sb ?? 0, ...(stats.size && { size: stats.size }) }
    );
};

const bow = (): BattleAttack =>
    ({
        id: 'bow',
        name: 'bow',
        type: AttackType.RANGED,
        range: '150/450 ft',
        attackBonus: 0,
        damageDice: '',
        damageType: 'physical',
        system: ATTACK_SLOT.write({ qualities: [], flaws: [] }),
    }) as unknown as BattleAttack;

describe('canon: Swarm (p357)', () => {
    bookExample(357, 'Engaged enemies lose 1 Wound at the end of the round', () => {
        const swarm = unit('sw', 0, ['swarm'], ParticipantSide.ENEMY);

        const a = withEngagement(unit('a', 1, []), 'sw');

        const b = withEngagement(unit('b', 0, []), 'sw');

        const c = unit('c', 40, []);

        const r = wfrpSwarmRoundEnd({
            participants: [swarm, a, b, c],
            round: 2,
            rng: () => 0.5,
            rules: canon,
            map,
            applyDamage: applyDamageConsequences,
        });

        const hp = (id: string) =>
            r.participants.find((p) => p.basicInfo.id === id)!.combatStats
                .currentHp;

        expect([hp('a'), hp('b'), hp('c')]).toEqual([19, 19, 20]);
    });

    bookExample(357, 'ranged attacks against a Swarm get +4 SL', () => {
        const ctx = {
            attacker: unit('a', 0),
            target: unit('sw', 5, ['swarm'], ParticipantSide.ENEMY),
            attack: bow(),
            participants: [],
            rules: canon,
            rng: () => 0.5,
        };

        expect(traitMods({ ctx, edition: CANON, kind: 'ranged' })).toEqual([
            { key: 'swarm', sl: 4 },
        ]);
        expect(traitMods({ ctx, edition: CANON, kind: 'melee' })).toEqual([]);
    });

    bookExample(357, 'a Swarm ignores psychology', () => {
        const swarm = unit('sw', 0, ['swarm'], ParticipantSide.ENEMY);

        expect(isPsychImmune([swarm], 'sw', canon)).toBe(true);
        expect(isPsychImmune([swarm], 'sw', legacy)).toBe(false);
    });

    bookExample(357, 'a Swarm ignores the rules for Size', () => {
        const swarm = unit('sw', 0, ['swarm'], ParticipantSide.ENEMY, {
            size: 'large',
            sb: 5,
        });

        const free = bow();

        expect(sizeMeleeDamage(swarm, { ...free, type: AttackType.MELEE }, 5)).toBe(
            0
        );
    });
});

describe('canon: Fly (p357)', () => {
    const at = (yd: number, flier: boolean) =>
        rangeContext({
            attacker: unit('a', 0),
            target: unit('f', yd / 2, flier ? ['fly'] : [], ParticipantSide.ENEMY),
            attack: bow(),
            map,
            rules: canon,
        })!.band;

    bookExample(357, 'a flying target at 100 yd (Long) is Extreme', () => {
        expect(at(100, false)).toBe('long');
        expect(at(100, true)).toBe('extreme');
    });

    bookExample(357, 'a flying target at 150 yd cannot be shot', () => {
        expect(at(150, false)).toBe('extreme');
        expect(at(150, true)).toBeNull();
    });

    bookExample(357, 'a flying shooter has -2 SL on ranged attacks', () => {
        const ctx = {
            attacker: unit('a', 0, ['fly']),
            target: unit('t', 5, [], ParticipantSide.ENEMY),
            attack: bow(),
            participants: [],
            rules: canon,
            rng: () => 0.5,
        };

        expect(traitMods({ ctx, edition: CANON, kind: 'ranged' })).toEqual([
            { key: 'flierShooter', sl: -2 },
        ]);
    });
});

describe('canon: Painless (p358)', () => {
    const crit = {
        id: 'arm.2',
        text: 'x',
        bonusDamage: 0,
        conditions: [{ key: 'bleeding' as const, levels: 1 }],
        markers: ['crippled'],
        death: false,
    };

    const crippled = (p: BattleParticipant) =>
        p.battleData.activeEffects.some((e) => e.abilityKey?.includes('crippled'));

    bookExample(358, 'the crippled marker is ignored, Bleeding still applies', () => {
        const hit = applyWfrpCrit(unit('p', 0, ['painless']), crit, 1, CANON);

        expect(crippled(hit.participant)).toBe(false);
        expect(conditionLevel(hit.participant, 'bleeding')).toBeGreaterThan(0);

        const normal = applyWfrpCrit(unit('n', 0), crit, 1, CANON);

        expect(crippled(normal.participant)).toBe(true);
    });
});
