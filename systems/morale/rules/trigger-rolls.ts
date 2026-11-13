import {
    effectiveMorale,
    moraleChanceBonus,
} from '@/lib/utils/battle/morale/effective-morale';
import { moraleThreshold } from '@/lib/utils/battle/morale/threshold';
import type { BattleParticipant } from '@/types/battle';

/** Значення d10, на яких спрацює мораль: додатковий хід (позитивна) чи пропуск ходу (негативна). */
export function moraleTriggerRolls(
    participant: BattleParticipant,
    participants: BattleParticipant[] = [participant]
): { kind: 'extra' | 'skip' | null; rolls: number[] } {
    const { value, ignored } = effectiveMorale(participant, participants);

    if (ignored || value === 0) return { kind: null, rolls: [] };

    const { kind, threshold } = moraleThreshold(
        value,
        value > 0 ? moraleChanceBonus(participant, participants) : 0
    );

    return {
        kind,
        rolls:
            kind === 'extra'
                ? Array.from(
                      { length: 11 - threshold },
                      (_, i) => threshold + i
                  )
                : Array.from({ length: threshold }, (_, i) => i + 1),
    };
}
