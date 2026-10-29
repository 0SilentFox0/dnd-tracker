import { countDownRoundEffects } from "./effects";
import { calculateInitiative, sortByInitiative } from "./initiative";

import { applyBakedAuras } from "@/lib/utils/abilities/build/bake";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import { summonsOf } from "@/lib/utils/battle/participant/reserve";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

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
  map?: BattleMapConfig | null,
  rules?: Ruleset,
): {
  updatedInitiativeOrder: BattleParticipant[];
  message: string;
  triggerMessages: LogLine[];
  lairMessages: LogLine[];
} {
  // 0. Видаляємо тимчасові слоти додаткових ходів з попереднього раунду
  const baseOrder = (initiativeOrder || []).filter((p) => !p.basicInfo?.isExtraTurnSlot);

  const summons = summonsOf(pendingSummons);

  const updatedOrder = [...baseOrder, ...summons];

  const newSummonIds = new Set(summons.map((p) => p.basicInfo.id));

  const ctx = { round: currentRound, rng, map, rules };

  const messages: LogLine[] = [];

  let order = updatedOrder;

  if (newSummonIds.size > 0) {
    order = applyBakedAuras(order, newSummonIds);

    const joined = runAbilities(order, { type: "battleStart", newcomerIds: [...newSummonIds] }, ctx);

    order = joined.participants;
    messages.push(...joined.messages);
  }

  const round = runAbilities(order, { type: "roundStart" }, ctx);

  messages.push(...round.messages);

  const sortedOrder = sortByInitiative(
    round.participants.map((p) => ({ ...p, abilities: { ...p.abilities, initiative: calculateInitiative(p, round.participants) } })),
  );

  return {
    updatedInitiativeOrder: sortedOrder.map(countDownRoundEffects),
    message: `🔁 Початок Раунду ${currentRound}`,
    triggerMessages: messages,
    lairMessages: sortedOrder.filter((p) => p.battleData.lair?.active && isActive(p) && p.battleData.resolvedAbilities.some((a) => a.limits?.lair)).map((p) => `🏰 Ініціатива 20: дія лігва — ${p.basicInfo.name}`),
  };
}
