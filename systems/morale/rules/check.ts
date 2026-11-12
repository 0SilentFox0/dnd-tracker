import { textRef } from '@/lib/i18n/text-ref';
import {
    effectiveMorale,
    moraleChanceBonus,
} from '@/lib/utils/battle/morale/effective-morale';
import {
    type MoraleCheckResult,
    moraleThreshold,
} from '@/lib/utils/battle/morale/threshold';
import type { BattleParticipant } from '@/types/battle';

export function checkMorale(
    participant: BattleParticipant,
    d10Roll: number,
    participants: BattleParticipant[] = [participant]
): MoraleCheckResult {
    const { value: currentMorale, ignored } = effectiveMorale(
        participant,
        participants
    );

    const result: MoraleCheckResult = {
        shouldSkipTurn: false,
        hasExtraTurn: false,
        message: '',
        moralePositive: currentMorale > 0,
    };

    if (ignored) {
        return {
            ...result,
            message: textRef('battleLog.morale.ignored', {
                name: participant.basicInfo.name,
            }),
        };
    }

    if (currentMorale === 0) {
        return {
            ...result,
            message: textRef('battleLog.morale.neutral', {
                name: participant.basicInfo.name,
            }),
        };
    }

    if (currentMorale > 0) {
        const bonus = moraleChanceBonus(participant, participants);

        const { threshold } = moraleThreshold(currentMorale, bonus);

        const detail = textRef('battleLog.morale.detail', {
            morale: currentMorale,
            leadership:
                bonus > 0
                    ? textRef('battleLog.morale.leadership', { bonus })
                    : '',
            roll: d10Roll,
            threshold,
        });

        if (d10Roll >= threshold) {
            result.hasExtraTurn = true;
            result.message = textRef('battleLog.morale.extra', {
                name: participant.basicInfo.name,
                detail,
            });
        } else {
            result.message = textRef('battleLog.morale.noExtra', {
                name: participant.basicInfo.name,
                detail,
            });
        }
    } else {
        const { threshold } = moraleThreshold(currentMorale);

        if (d10Roll <= threshold) {
            result.shouldSkipTurn = true;
            result.message = textRef('battleLog.morale.skip', {
                name: participant.basicInfo.name,
                morale: currentMorale,
                roll: d10Roll,
                threshold,
            });
        } else {
            result.message = textRef('battleLog.morale.noSkip', {
                name: participant.basicInfo.name,
                morale: currentMorale,
                roll: d10Roll,
                threshold,
            });
        }
    }

    return result;
}
