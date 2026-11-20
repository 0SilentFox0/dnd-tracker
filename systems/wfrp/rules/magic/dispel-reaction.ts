import { type LastCast, PARTICIPANT_STATE } from '../slots';
import { wfrpState, withWfrpState } from '../state';
import { canDispel, isCanonDispel, wfrpDispel } from './dispel';
import { dispelSpotsOfCast, isDispelRange } from './dispel-range';

import {
    findParticipant,
    isActive,
} from '@/lib/utils/abilities/engine/core/participants';
import { isHostile } from '@/lib/utils/battle/modes/engine';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type {
    CastReactionArgs,
    RuleSystemCastReaction,
} from '@/lib/utils/rules/systems/types-magic';
import type { BattleParticipant } from '@/types/battle';

const canReact = (
    p: BattleParticipant,
    caster: BattleParticipant,
    { map, round }: CastReactionArgs
): boolean =>
    isActive(p) &&
    isHostile(map, p, caster) &&
    canDispel(p) &&
    wfrpState(p).dispelRound !== round;

const heldOf = (data: SystemSlot): LastCast | undefined =>
    PARTICIPANT_STATE.read(data)?.lastCast;

export const wfrpCastReaction: RuleSystemCastReaction = {
    mayReact(args) {
        if (!isCanonDispel(args.rules)) return false;

        const caster = findParticipant(args.participants, args.casterId);

        return (
            !!caster && args.participants.some((p) => canReact(p, caster, args))
        );
    },
    open(args) {
        const caster = findParticipant(args.participants, args.casterId);

        const resolved = findParticipant(args.resolved, args.casterId);

        const last = resolved && wfrpState(resolved).lastCast;

        if (!caster || !last || last.critBonus === 'unstoppableForce')
            return null;

        const spots = dispelSpotsOfCast(last, caster.battleData.position);

        const offers = args.participants
            .filter(
                (p) =>
                    canReact(p, caster, args) &&
                    isDispelRange(p, spots, args.map, args.rules)
            )
            .map((p) => ({
                reactorId: p.basicInfo.id,
                label: 'wfrpMagic.dispel.react' as const,
            }));

        return offers.length > 0
            ? {
                  offers,
                  data: PARTICIPANT_STATE.write({ lastCast: last }),
              }
            : null;
    },
    answer({ reactorId, data, rng, participants, ...args }) {
        const caster = findParticipant(participants, args.casterId);

        const dispeller = findParticipant(participants, reactorId);

        const last = heldOf(data);

        if (
            !caster ||
            !dispeller ||
            !last ||
            !canReact(dispeller, caster, { ...args, participants }) ||
            !isDispelRange(
                dispeller,
                dispelSpotsOfCast(last, caster.battleData.position),
                args.map,
                args.rules
            )
        )
            return { participants, lines: [], cancelled: false };

        const result = wfrpDispel({
            dispeller,
            caster,
            spellName: last.spell,
            castSl: last.sl,
            critBonus: last.critBonus,
            rules: args.rules,
            rng,
        });

        const next = withWfrpState(dispeller, { dispelRound: args.round });

        return {
            participants: participants.map((p) => (p === dispeller ? next : p)),
            lines: result.lines,
            cancelled: result.dispelled,
        };
    },
};
