import { value } from '../characteristics/derive';
import { qualityTrapBlade } from '../equipment/quality-effects';
import { resolvePercentileTest } from '../percentile';
import { DIFFICULTY_SL } from '../percentile/difficulty';
import { ATTACK_SLOT } from '../slots';
import { parryVsBiggerSl } from '../traits/size';
import { sidedMarker } from './location';
import { participantChars } from './participant';
import { canonWeaponUse } from './weapon-use';
import { attackWearKey, breakWeapon } from './weapon-wear';

import { textRef } from '@/lib/i18n/text-ref';
import { upsertLabeled } from '@/lib/utils/battle/actions/effects';
import type { Rng } from '@/lib/utils/common/rng';
import type { BattleAttack, BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

export const TRAP_BLADE_COST = 'battleWfrp.ui.fateReaction.trapBlade.spend';

/** Trap Blade (p305): a Critical parry with such a weapon against a bladed one, from a defender at least as big as the attacker */
export function canTrapBlade(
    defender: BattleParticipant,
    attacker: BattleParticipant,
    incoming: BattleAttack,
    parryWeapon: BattleAttack | undefined
): boolean {
    return (
        !!parryWeapon &&
        ATTACK_SLOT.read(incoming.system)?.bladed === true &&
        qualityTrapBlade(canonWeaponUse(defender, parryWeapon).refs, 'canon') &&
        parryVsBiggerSl(defender, attacker) === 0
    );
}

/** The attacker drops the blade; a passed Very Hard Strength Test (plus the parry SL) breaks it */
export function trapBladeResult(input: {
    defender: BattleParticipant;
    attacker: BattleParticipant;
    incoming: BattleAttack;
    parrySl: number;
    rng: Rng;
}): {
    attackerUpdate: (p: BattleParticipant) => BattleParticipant;
    line: LogLine;
} {
    const { defender, attacker, incoming, parrySl, rng } = input;

    const slot = ATTACK_SLOT.read(incoming.system);

    const test = resolvePercentileTest({
        target: value(participantChars(defender), 's'),
        slModifier: DIFFICULTY_SL.veryHard + Math.max(0, parrySl),
        slModel: 'final',
        rng,
    });

    const broken = test.outcome === 'success' || test.outcome === 'critical';

    const marker =
        slot?.hand === 'off' ? sidedMarker('disarmed', 'left') : 'disarmed';

    return {
        attackerUpdate: (p) => {
            const dropped = upsertLabeled(
                p,
                {
                    timedKey: 'wfrp:trapBlade',
                    name: 'trapBlade',
                    label: textRef('battleWfrp.log.trapBladeDrop'),
                    type: 'debuff',
                    rounds: 1,
                    stackable: false,
                    effects: [{ type: marker, value: 1 }],
                },
                0
            );

            return broken
                ? breakWeapon(dropped, attackWearKey(incoming), slot?.qualities)
                : dropped;
        },
        line: textRef(
            broken
                ? 'battleWfrp.log.trapBladeBroken'
                : 'battleWfrp.log.trapBladeCaught',
            {
                name: defender.basicInfo.name,
                attacker: attacker.basicInfo.name,
                weapon: incoming.name,
            }
        ),
    };
}
