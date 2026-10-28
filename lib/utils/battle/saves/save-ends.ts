import { ABILITY_LABELS } from "@/lib/constants/abilities";
import { removeEffects } from "@/lib/utils/battle/conditions/query";
import { resolveSave } from "@/lib/utils/battle/saves/legendary";
import { rollSave } from "@/lib/utils/battle/saves/roll-save";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

export function rollSaveEnds(
  p: BattleParticipant,
  participants: BattleParticipant[],
  rules: Ruleset | undefined,
  rng: () => number,
): { participant: BattleParticipant; messages: string[] } {
  const messages: string[] = [];

  const freed = new Set<string>();

  let current = p;

  for (const e of p.battleData.activeEffects) {
    if (!e.saveEnds) continue;

    const { ability, dc } = e.saveEnds;

    const rolled = rollSave({ target: current, ability, dc, participants, rules, rng });

    const { result, participant, message } = resolveSave(current, rolled);

    current = participant;

    const head = `🎲 ${p.basicInfo.name}: рятівний кидок ${ABILITY_LABELS[ability]} ${rolled.total} проти СК ${dc}`;

    messages.push(result.success ? `${head} — звільняється від стану «${e.name}»` : `${head} — стан «${e.name}» лишається`);

    if (message) messages.push(message);

    if (result.success) freed.add(e.id);
  }

  if (!freed.size) return { participant: current, messages };

  return { participant: removeEffects(current, (e) => freed.has(e.id)).participant, messages };
}
