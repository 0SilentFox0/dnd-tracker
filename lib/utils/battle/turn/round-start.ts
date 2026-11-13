import { countDownRoundEffects } from './effects';
import { runTurnHooks } from './hooks';
import { initiativeSlot } from './initiative';
import { runJoinTriggers } from './join-triggers';

import { textRef } from '@/lib/i18n/text-ref';
import { applyBakedAuras } from '@/lib/utils/abilities/build/bake';
import { runAbilities } from '@/lib/utils/abilities/engine/core/run-abilities';
import type { Rng } from '@/lib/utils/abilities/engine/core/types';
import { summonsOf } from '@/lib/utils/battle/participant/reserve';
import type { Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type {
    BattleAction,
    BattleMapConfig,
    BattleParticipant,
} from '@/types/battle';
import type { LogLine } from '@/types/text';

/**
 * Обробляє початок нового раунду
 * @param initiativeOrder - масив учасників
 * @param currentRound - поточний раунд
 * @param pendingSummons - масив призваних істот що з'являться
 * @returns оновлений масив учасників та повідомлення
 */
export function processStartOfRound(
    initiativeOrder: BattleParticipant[],
    currentRound: number,
    pendingSummons: BattleParticipant[] = [],
    rng: Rng = Math.random,
    map: BattleMapConfig | null | undefined,
    rules: Ruleset
): {
    updatedInitiativeOrder: BattleParticipant[];
    message: LogLine;
    triggerMessages: LogLine[];
    lairMessages: LogLine[];
    psychology: { lines: LogLine[]; targets: BattleAction['targets'] };
} {
    // 0. Видаляємо тимчасові слоти додаткових ходів з попереднього раунду
    const baseOrder = (initiativeOrder || []).filter(
        (p) => !p.basicInfo?.isExtraTurnSlot
    );

    const summons = summonsOf(pendingSummons);

    const updatedOrder = summons.reduce((order, s) => {
        const at = initiativeSlot(order, s, rules);

        return [...order.slice(0, at), s, ...order.slice(at)];
    }, baseOrder);

    const newSummonIds = new Set(summons.map((p) => p.basicInfo.id));

    const ctx = { round: currentRound, rng, map, rules };

    const messages: LogLine[] = [];

    let order = updatedOrder;

    let psychology: { lines: LogLine[]; targets: BattleAction['targets'] } = {
        lines: [],
        targets: [],
    };

    if (newSummonIds.size > 0) {
        order = applyBakedAuras(order, newSummonIds);

        const joined = runJoinTriggers(order, ctx, [...newSummonIds]);

        order = joined.participants;
        messages.push(...joined.messages);
        psychology = joined.psychology;
    }

    const round = runAbilities(order, { type: 'roundStart' }, ctx);

    messages.push(...round.messages);

    const roundHooks = ruleSystemOf(rules).combat.turn?.onRoundStart;

    const hooked = roundHooks
        ? runTurnHooks(roundHooks, {
              participants: round.participants,
              round: currentRound,
              rng,
              map,
              rules,
          })
        : { participants: round.participants, messages: [] };

    const sortedOrder = hooked.participants;

    return {
        updatedInitiativeOrder: sortedOrder.map(countDownRoundEffects),
        message: textRef('battleLog.round.start', { round: currentRound }),
        triggerMessages: messages,
        psychology,
        lairMessages: hooked.messages,
    };
}
