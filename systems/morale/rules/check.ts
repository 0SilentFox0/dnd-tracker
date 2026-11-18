import { textRef } from '@/lib/i18n/text-ref';
import {
    effectiveMorale,
    moraleChanceBonus,
} from '@/systems/morale/rules/effective-morale';
import {
    type MoraleCheckResult,
    moraleThreshold,
} from '@/systems/morale/rules/threshold';
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
            message: textRef('moraleLog.check.ignored', {
                name: participant.basicInfo.name,
            }),
        };
    }

    if (currentMorale === 0) {
        return {
            ...result,
            message: textRef('moraleLog.check.neutral', {
                name: participant.basicInfo.name,
            }),
        };
    }

    if (currentMorale > 0) {
        const bonus = moraleChanceBonus(participant, participants);

        const { threshold } = moraleThreshold(currentMorale, bonus);

        const detail = textRef('moraleLog.check.detail', {
            morale: currentMorale,
            leadership:
                bonus > 0
                    ? textRef('moraleLog.check.leadership', { bonus })
                    : '',
            roll: d10Roll,
            threshold,
        });

        if (d10Roll >= threshold) {
            result.hasExtraTurn = true;
            result.message = textRef('moraleLog.check.extra', {
                name: participant.basicInfo.name,
                detail,
            });
        } else {
            result.message = textRef('moraleLog.check.noExtra', {
                name: participant.basicInfo.name,
                detail,
            });
        }
    } else {
        const { threshold } = moraleThreshold(currentMorale);

        if (d10Roll <= threshold) {
            result.shouldSkipTurn = true;
            result.message = textRef('moraleLog.check.skip', {
                name: participant.basicInfo.name,
                morale: currentMorale,
                roll: d10Roll,
                threshold,
            });
        } else {
            result.message = textRef('moraleLog.check.noSkip', {
                name: participant.basicInfo.name,
                morale: currentMorale,
                roll: d10Roll,
                threshold,
            });
        }
    }

    return result;
}
