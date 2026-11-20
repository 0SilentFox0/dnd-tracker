import { describe, expect } from 'vitest';

import { bookExample, CANON } from './book-example';

import '@/lib/server/systems/registry';
import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import {
    context,
    participant,
} from '@/lib/server/battles/__tests__/mutations/fixtures';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { withStats } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { collectAttackMods } from '@/systems/wfrp/rules/combat/attack-mods';
import {
    chargeSb,
    mountedDodgeModes,
} from '@/systems/wfrp/rules/combat/mounted';
import { ATTACK_SLOT } from '@/systems/wfrp/rules/slots';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';
import { trait } from '@/systems/wfrp/rules/traits/__tests__/fixtures';
import { mountedMutation } from '@/systems/wfrp/server/battle/mounted-mutation';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const lance = (group: string, reach = 'long'): BattleAttack =>
    ({
        id: 'l',
        name: 'Lance',
        type: AttackType.MELEE,
        system: ATTACK_SLOT.write({
            qualities: [],
            flaws: [],
            group,
            reach: reach as never,
        }),
    }) as unknown as BattleAttack;

const unit = (
    id: string,
    size: string,
    side: ParticipantSide = ParticipantSide.ALLY,
    abilities: ReturnType<typeof trait>[] = []
): BattleParticipant =>
    withStats(makeParticipant({ id, side, abilities }), { size } as never);

const modsOf = (
    attacker: BattleParticipant,
    target: BattleParticipant,
    all: BattleParticipant[],
    attack: BattleAttack
) =>
    collectAttackMods({
        ctx: { attacker, target, attack, participants: all, map: null } as never,
        edition: CANON,
        kind: 'melee',
    });

describe('canon: Mounted (p168)', () => {
    const horse = unit('horse', 'large');

    bookExample(168, 'a Cavalry weapon from the saddle against a smaller foe gains Advantage', () => {
        const rider = withWfrpState(unit('r', 'average'), {
            mounted: { mountId: 'horse' },
        });

        const foe = unit('f', 'average', ParticipantSide.ENEMY);

        const r = modsOf(rider, foe, [rider, horse, foe], lance('cavalry'));

        expect(r.advantage).toBe(1);
        expect(modsOf(rider, foe, [rider, horse, foe], lance('basic')).advantage).toBe(0);
    });

    bookExample(168, 'a smaller foe without a Long weapon attacks the rider at Disadvantage', () => {
        const rider = withWfrpState(unit('r', 'average', ParticipantSide.ENEMY), {
            mounted: { mountId: 'horse' },
        });

        const foe = unit('f', 'average');

        expect(modsOf(foe, rider, [foe, rider, horse], lance('basic', 'average')).disadvantage).toBe(1);
        expect(modsOf(foe, rider, [foe, rider, horse], lance('basic', 'long')).disadvantage).toBe(0);
    });

    bookExample(168, 'a rider dodges at Disadvantage unless a Trick Rider', () => {
        const mounted = { mounted: { mountId: 'horse' } };

        expect(mountedDodgeModes(withWfrpState(unit('r', 'average'), mounted))).toEqual({ disadvantage: 1 });

        const trick = unit('t', 'average', ParticipantSide.ALLY, [
            trait([{ kind: 'wfrpTalent', talent: 'trickRider' }], { key: 'tr' }),
        ]);

        expect(mountedDodgeModes(withWfrpState(trick, mounted))).toEqual({});
        expect(mountedDodgeModes(unit('p', 'average'))).toEqual({});
    });

    bookExample(168, 'a mounted Charge strikes with the mount Strength Bonus', () => {
        const rider = withWfrpState(unit('r', 'average'), {
            moveMode: 'charge',
            mounted: { mountId: 'horse', sb: 5 },
        });

        expect(chargeSb(rider, 3)).toBe(5);
        expect(chargeSb(withWfrpState(rider, { moveMode: 'run' }), 3)).toBe(3);
    });

    bookExample(168, 'the DM seats a rider and dismounts it', () => {
        const base = participant('rider', { controlledBy: 'user-1' });

        const ps = [
            base,
            participant('horse', { side: ParticipantSide.ALLY }),
        ];

        const c = context({ participants: ps, isDM: true });

        const up = mountedMutation(c, { participantId: 'rider', mountId: 'horse' });

        const seated = up.participants.find((p) => p.basicInfo.id === 'rider')!;

        expect(wfrpState(seated).mounted?.mountId).toBe('horse');

        const down = mountedMutation(
            { ...c, participants: up.participants },
            { participantId: 'rider' }
        );

        expect(
            wfrpState(down.participants.find((p) => p.basicInfo.id === 'rider')!).mounted
        ).toBeUndefined();
    });
});
