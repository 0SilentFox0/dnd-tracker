import { REACH_RANK } from '../equipment/weapon-profile';
import type { ModeSources } from '../percentile/advantage';
import { ATTACK_SLOT } from '../slots';
import { wfrpState } from '../state';
import { canonSizeStep } from '../traits/read';
import { hasTalent } from '../traits/talents';
import type { AttackModSource } from './attack-mods/types';
import { participantStats } from './participant';

import type { BattleParticipant } from '@/types/battle';

const sizeOf = (p: BattleParticipant) =>
    canonSizeStep(participantStats(p)?.size);

const mountOf = (
    rider: BattleParticipant,
    participants: BattleParticipant[]
): BattleParticipant | undefined => {
    const id = wfrpState(rider).mounted?.mountId;

    return id ? participants.find((p) => p.basicInfo.id === id) : undefined;
};

/** A mounted Charge strikes with the mount's Strength Bonus when it is the greater (p168) */
export const chargeSb = (p: BattleParticipant, own: number): number =>
    wfrpState(p).moveMode === 'charge'
        ? Math.max(own, wfrpState(p).mounted?.sb ?? 0)
        : own;

/** A rider dodges at Disadvantage without Trick Rider (p168) */
export const mountedDodgeModes = (p: BattleParticipant): ModeSources =>
    wfrpState(p).mounted && !hasTalent(p, 'trickRider')
        ? { disadvantage: 1 }
        : {};

/** Mounted melee (p168): a Cavalry weapon from the saddle against a smaller foe gains Advantage; a smaller foe without a Long weapon attacks the rider at Disadvantage */
export const mountedMods: AttackModSource = ({ ctx, kind }) => {
    if (kind !== 'melee') return [];

    const { attacker, target, attack, participants } = ctx;

    const ownMount = mountOf(attacker, participants);

    const slot = ATTACK_SLOT.read(attack.system);

    if (
        ownMount &&
        slot?.group === 'cavalry' &&
        sizeOf(target) < sizeOf(ownMount)
    )
        return [{ key: 'cavalry', sl: 0, advantage: 1 }];

    const foeMount = mountOf(target, participants);

    if (
        foeMount &&
        sizeOf(attacker) < sizeOf(foeMount) &&
        REACH_RANK[slot?.reach ?? 'average'] < REACH_RANK.long
    )
        return [{ key: 'mountedFoe', sl: 0, disadvantage: 1 }];

    return [];
};
