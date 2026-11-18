import { LAIR_STATE } from './state';

import type { ParticipantPart, UnitPartRow } from '@/lib/utils/rules/systems/types';
import { isMonster5e } from '@/lib/utils/units/monster';
import { d20StateData } from '@/systems/d20/rules/state';

/** A monster starts outside its lair with the legendary resistances it has now as the baseline */
export const lairUnitPart: ParticipantPart<UnitPartRow> = (p, { row }) => {
    if (!isMonster5e(row)) return p;

    const base = d20StateData(p, {});

    return {
        ...p,
        battleData: {
            ...p.battleData,
            ...base,
            system: LAIR_STATE.write(
                { active: false, baseResistances: row.legendaryResistances },
                base.system ?? p.battleData.system
            ),
        },
    };
};
