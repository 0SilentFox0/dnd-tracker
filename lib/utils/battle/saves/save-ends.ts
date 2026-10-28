import { ABILITY_LABELS } from "@/lib/constants/abilities";
import { removeEffects } from "@/lib/utils/battle/conditions/query";
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

  for (const e of p.battleData.activeEffects) {
    if (!e.saveEnds) continue;

    const { ability, dc } = e.saveEnds;

    const { total, success } = rollSave({ target: p, ability, dc, participants, rules, rng });

    const head = `🎲 ${p.basicInfo.name}: рятівний кидок ${ABILITY_LABELS[ability]} ${total} проти СК ${dc}`;

    messages.push(success ? `${head} — звільняється від стану «${e.name}»` : `${head} — стан «${e.name}» лишається`);

    if (success) freed.add(e.id);
  }

  if (!freed.size) return { participant: p, messages };

  return { participant: removeEffects(p, (e) => freed.has(e.id)).participant, messages };
}
