import { inflictWounds } from '../combat/direct-damage';
import { engagedFoes, engagementJournal } from '../combat/engagement';
import { editionOf } from '../edition';
import { SWARM_ENGAGED_WOUNDS } from '../traits/constants';
import { hasRegenerate, isSwarm } from '../traits/creature';
import { regenerateOnRoll } from '../traits/regeneration';

import { textRef } from '@/lib/i18n/text-ref';
import {
    isActive,
    replaceParticipant,
} from '@/lib/utils/abilities/engine/core/participants';
import { rollDie } from '@/lib/utils/common/dice';
import type {
    RoundStartCtx,
    TurnHook,
    TurnStartCtx,
} from '@/lib/utils/rules/systems/types';
import type { LogLine } from '@/types/text';

const REGEN_DIE = 10;

/** Swarm (p357): at the end of a round every Engaged enemy loses 1 Wound; read at the next round start, before the journal ages */
export const wfrpSwarmRoundEnd: TurnHook<RoundStartCtx> = (ctx) => {
    if (editionOf(ctx.rules).traitModel !== 'canon')
        return { participants: ctx.participants, messages: [] };

    let participants = ctx.participants;

    const messages: LogLine[] = [];

    const journal = engagementJournal(ctx.rules);

    for (const swarm of ctx.participants.filter(
        (p) => isActive(p) && isSwarm(p)
    )) {
        for (const foe of engagedFoes(swarm, participants, ctx.map, journal)) {
            const r = inflictWounds(
                participants,
                foe.basicInfo.id,
                SWARM_ENGAGED_WOUNDS,
                ctx
            );

            if (r.name === undefined) continue;

            participants = r.participants;

            messages.push(
                textRef('battleWfrp.log.swarmBite', {
                    swarm: swarm.basicInfo.name,
                    target: r.name,
                    damage: SWARM_ENGAGED_WOUNDS,
                }),
                ...r.messages
            );
        }
    }

    return { participants, messages };
};

/** Regeneration at the start of the creature's turn; legacy keeps the plain 1d10 heal */
export const wfrpRegenerate: TurnHook<TurnStartCtx> = ({
    participants,
    id,
    rng,
    rules,
}) => {
    const p = participants.find((o) => o.basicInfo.id === id);

    if (!p || !isActive(p) || !hasRegenerate(p))
        return { participants, messages: [] };

    const roll = rollDie(REGEN_DIE, rng);

    const canon = editionOf(rules).traitModel === 'canon';

    const r = canon
        ? regenerateOnRoll(p, roll)
        : {
              healed: Math.min(roll, p.combatStats.maxHp - p.combatStats.currentHp),
              critHealed: false,
              participant: {
                  ...p,
                  combatStats: {
                      ...p.combatStats,
                      currentHp: Math.min(
                          p.combatStats.maxHp,
                          p.combatStats.currentHp + roll
                      ),
                  },
              },
          };

    const messages: LogLine[] = [
        ...(r.healed > 0
            ? [
                  textRef('battleWfrp.log.regenerates', {
                      name: p.basicInfo.name,
                      amount: r.healed,
                  }),
              ]
            : []),
        ...(r.critHealed
            ? [textRef('battleWfrp.log.regenCrit', { name: p.basicInfo.name })]
            : []),
    ];

    return {
        participants: replaceParticipant(participants, r.participant),
        messages,
    };
};
