import { beforeAll, describe, expect, it } from 'vitest';

import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { resetTurnState } from '@/lib/utils/battle/turn/turn-state';
import { mulberry32 } from '@/lib/utils/common/rng';
import type { DamagedHook } from '@/lib/utils/rules/systems/types';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { wfrpLoseChannelled } from '@/systems/wfrp/rules/combat/lose-channelled';
import { wfrpAbilitiesOf } from '@/systems/wfrp/rules/combat/participant';
import { caster } from '@/systems/wfrp/rules/magic/__tests__/fixtures';
import { wfrpCastTest } from '@/systems/wfrp/rules/magic/cast-test';
import { wfrpChannel } from '@/systems/wfrp/rules/magic/channel';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';
import { trait } from '@/systems/wfrp/rules/traits/__tests__/fixtures';
import { wfrpPsychology } from '@/systems/wfrp/rules/traits/psychology';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

beforeAll(async () => {
    await import('@/lib/server/systems/registry');
}, 30_000);

const sword: BattleAttack = {
    id: 'sw',
    name: 'Sword',
    type: AttackType.MELEE,
    attackBonus: 0,
    damageDice: '1d6',
    damageType: 'slashing',
};

const fighter = (id: string, side: ParticipantSide): BattleParticipant => {
    const p = makeParticipant({ id, side, hp: 20, maxHp: 20 });

    const characteristics = {
        ...DEFAULT_CHARACTERISTICS,
        base: {
            ...DEFAULT_CHARACTERISTICS.base,
            ws: 40,
            bs: 40,
            ag: 40,
            s: 30,
            t: 30,
        },
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
        battleData: { ...p.battleData, attacks: [sword] },
    };
};

describe('channelled SL through the slot', () => {
    const spell = {
        id: 's',
        name: 'Bolt',
        level: 1,
        groupId: null,
        definition: {},
    } as unknown as Parameters<typeof wfrpCastTest>[0]['spell'];

    const cast = (
        p: BattleParticipant,
        kind: 'arcane' | 'blessing'
    ): ReturnType<typeof wfrpCastTest> =>
        wfrpCastTest({
            caster: p,
            spell,
            magic: { cn: 0, kind, overcast: null },
            rules: WFRP_RULES,
            rng: mulberry32(1),
            presetRoll: 30,
        });

    const banked = () =>
        wfrpChannel(caster({ skillAdvances: {} }), {
            rules: WFRP_RULES,
            rng: mulberry32(1),
            presetRoll: 20,
        }).participant;

    it('channel banks SL into the slot', () => {
        expect(wfrpState(banked()).channelledSl).toBe(2);
    });

    it('damage empties the bank', () => {
        const p = banked();

        const r = wfrpLoseChannelled(
            { amount: 3 } as unknown as Parameters<DamagedHook>[0],
            {
                participant: p,
                participants: [p],
            } as unknown as Parameters<DamagedHook>[1]
        );

        expect(wfrpState(r.participant).channelledSl).toBeUndefined();
        expect(wfrpState(r.participants[0]).channelledSl).toBeUndefined();
    });

    it('a prayer keeps the bank', () => {
        expect(cast(banked(), 'blessing').casterUpdate).toBeUndefined();
    });

    it('a spell spends the bank', () => {
        const p = banked();

        const r = cast(p, 'arcane');

        const after = r.casterUpdate?.(p) ?? p;

        expect(wfrpState(after).channelledSl).toBeUndefined();
    });
});

describe('condition tests through the slot', () => {
    const base = () => fighter('a', ParticipantSide.ALLY);

    it('a new turn clears the attempts and keeps the rest', () => {
        const p = withWfrpState(base(), {
            conditionTests: ['bleeding'],
            fortune: 1,
        });

        const next = {
            ...p,
            battleData: resetTurnState(p, { rules: WFRP_RULES }),
        };

        expect(wfrpState(next)).toEqual({ fortune: 1 });
    });

    it('a participant without attempts is not touched', () => {
        const p = base();

        expect(resetTurnState(p, { rules: WFRP_RULES }).system).toBeUndefined();
    });
});

describe('psychology tests through the slot', () => {
    const HERO_WP = {
        ...DEFAULT_CHARACTERISTICS,
        base: { ...DEFAULT_CHARACTERISTICS.base, wp: 40 },
    };

    const rollOf = (...rolls: number[]) => {
        const queue = [...rolls];

        return () => ((queue.shift() ?? 50) - 1) / 100 + 0.001;
    };

    const make = (
        id: string,
        side: ParticipantSide,
        effects: unknown[] = []
    ): BattleParticipant => {
        const p = makeParticipant({
            id,
            side,
            abilities: effects.length
                ? [trait(effects, { key: `t-${id}` })]
                : [],
        });

        return {
            ...p,
            abilities: { ...p.abilities, ...wfrpAbilitiesOf(HERO_WP) },
        };
    };

    const scary = () =>
        make('m', ParticipantSide.ENEMY, [
            { kind: 'wfrpPsychology', psychology: 'fear', value: 1 },
        ]);

    it('a tested source is not tested again', () => {
        const first = wfrpPsychology(
            [make('h', ParticipantSide.ALLY), scary()],
            { round: 1, rng: rollOf(30) }
        );

        expect(first.testerIds).toEqual(['h']);

        const again = wfrpPsychology(first.participants, {
            round: 2,
            rng: rollOf(70),
        });

        expect(again.testerIds).toEqual([]);
    });
});
