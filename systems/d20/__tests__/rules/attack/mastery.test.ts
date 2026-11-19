import { describe, expect, it } from 'vitest';

import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import {
    makeParticipant,
    resolved,
    seq,
} from '@/lib/utils/abilities/__tests__/fixtures';
import { findEffectMarker } from '@/lib/utils/battle/participant/state';
import { markUsedThisTurn } from '@/lib/utils/battle/weapon-mastery/once';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import { D20_MASTERIES, nickFree } from '@/systems/d20/rules/attack/mastery';
import type { BattleAttack, BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

const sword = (mastery: string, over: Partial<BattleAttack> = {}) =>
    ({
        id: 'w',
        name: 'Longsword',
        type: AttackType.MELEE,
        attackBonus: 5,
        damageDice: '1d8',
        damageType: 'slashing',
        properties: `Mastery: ${mastery}`,
        ...over,
    }) as BattleAttack;

function attacker(kinds: string[] = ['longsword']): BattleParticipant {
    const p = makeParticipant({
        id: 'a',
        abilities: [
            resolved({
                trigger: { event: 'passive' },
                params: { weaponMastery: kinds },
                effects: [{ kind: 'note', text: 'Mastery' }],
            }),
        ],
    });

    return {
        ...p,
        abilities: {
            ...p.abilities,
            damageModel: '5e',
            proficiencyBonus: 3,
            modifiers: { ...p.abilities.modifiers, strength: 3 },
        },
    };
}

function target(over: { conMod?: number; gridSize?: number } = {}) {
    const p = makeParticipant({
        id: 't',
        side: ParticipantSide.ENEMY,
        hp: 50,
        maxHp: 50,
    });

    return {
        ...p,
        abilities: {
            ...p.abilities,
            modifiers: {
                ...p.abilities.modifiers,
                constitution: over.conMod ?? 0,
            },
        },
        combatStats: {
            ...p.combatStats,
            ...(over.gridSize && { gridSize: over.gridSize }),
        },
    };
}

function strike(
    mastery: string,
    hit: boolean,
    opts: { kinds?: string[]; t?: BattleParticipant; roll?: number } = {}
) {
    const a = attacker(opts.kinds);

    const flow = {
        ps: [a, opts.t ?? target()],
        messages: [] as LogLine[],
        summons: [],
        ctx: { round: 1, rng: seq(opts.roll ?? 0.5), rules: DEFAULT_RULES },
    };

    D20_MASTERIES.onStrike({
        flow,
        attackerId: 'a',
        targetId: 't',
        attack: sword(mastery),
        hit,
    });

    const get = (id: string) =>
        flow.ps.find((p) => p.basicInfo.id === id) as BattleParticipant;

    return { a: get('a'), t: get('t'), flow };
}

const effectKeys = (p: BattleParticipant) =>
    p.battleData.activeEffects.map((e) => e.abilityKey);

describe('weapon mastery riders', () => {
    it('does nothing when the kind is not trained', () => {
        const r = strike('sap', true, { kinds: ['mace'] });

        expect(effectKeys(r.t)).toEqual([]);
    });

    it('Graze deals the ability modifier on a miss, never on a hit', () => {
        expect(strike('graze', false).t.combatStats.currentHp).toBe(47);
        expect(strike('graze', true).t.combatStats.currentHp).toBe(50);
    });

    it('Sap gives the target disadvantage on its next attack, consumed by it', () => {
        const { t } = strike('sap', true);

        const e = t.battleData.activeEffects[0];

        expect(e.abilityKey).toBe('mastery:sap@a');
        expect(e.consumeOn).toBe('ownAttack');
        expect(e.abilityEffects).toEqual([
            { kind: 'flag', flag: 'disadvantage' },
        ]);
    });

    it('Slow takes 10 feet of speed', () => {
        const { t } = strike('slow', true);

        expect(t.battleData.activeEffects[0].abilityEffects).toEqual([
            { kind: 'modifyStat', stat: 'speed', flat: -10 },
        ]);
    });

    it('Vex gives the attacker advantage on its next attack roll', () => {
        const { a } = strike('vex', true);

        const e = a.battleData.activeEffects.find(
            (x) => x.abilityKey === 'mastery:vex@a'
        );

        expect(e?.consumeOn).toBe('ownAttack');
        expect(e?.abilityEffects).toEqual([
            { kind: 'flag', flag: 'advantage', attackKind: 'all' },
        ]);
    });

    it('Topple knocks the target prone on a failed CON save (DC 8 + 3 + 3 = 14)', () => {
        const failed = strike('topple', true, { roll: 0.5, t: target() });

        expect(findEffectMarker(failed.t, 'prone')).toBeDefined();

        const saved = strike('topple', true, {
            roll: 0.9,
            t: target({ conMod: 2 }),
        });

        expect(findEffectMarker(saved.t, 'prone')).toBeUndefined();
    });

    it('Push leaves a Huge target in place', () => {
        const r = strike('push', true, { t: target({ gridSize: 3 }) });

        expect(r.t.battleData.position).toBeUndefined();
        expect(effectKeys(r.t)).toEqual([]);
    });
});

describe('Cleave and Nick use once per turn', () => {
    it('Cleave needs a melee weapon, the mastery and an unused turn', () => {
        const a = attacker(['longsword']);

        expect(D20_MASTERIES.cleave(a, sword('Cleave'), 1)?.spent).toBeTruthy();
        expect(D20_MASTERIES.cleave(a, sword('Sap'), 1)).toBeNull();
        expect(
            D20_MASTERIES.cleave(
                a,
                sword('Cleave', { type: AttackType.RANGED }),
                1
            )
        ).toBeNull();
        expect(
            D20_MASTERIES.cleave(
                markUsedThisTurn(a, 'cleave', 1),
                sword('Cleave'),
                1
            )
        ).toBeNull();
    });

    it('Nick makes the off-hand attack free once per turn', () => {
        const a = attacker(['longsword']);

        const first = nickFree(a, sword('Nick'), 1);

        expect(first).not.toBeNull();
        expect(nickFree(first as BattleParticipant, sword('Nick'), 1)).toBeNull();
        expect(nickFree(a, sword('Sap'), 1)).toBeNull();
    });
});
