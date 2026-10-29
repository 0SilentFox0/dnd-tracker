import { textRef } from "@/lib/i18n/text-ref";
import { abilityRef, effectName } from "@/lib/utils/battle/common/terms";
import { removeEffects } from "@/lib/utils/battle/conditions/query";
import { resolveSave } from "@/lib/utils/battle/saves/legendary";
import { rollSave } from "@/lib/utils/battle/saves/roll-save";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export function rollSaveEnds(
  p: BattleParticipant,
  participants: BattleParticipant[],
  rules: Ruleset | undefined,
  rng: () => number,
): { participant: BattleParticipant; messages: LogLine[] } {
  const messages: LogLine[] = [];

  const freed = new Set<string>();

  let current = p;

  for (const e of p.battleData.activeEffects) {
    if (!e.saveEnds) continue;

    const { ability, dc } = e.saveEnds;

    const rolled = rollSave({ target: current, ability, dc, participants, rules, rng });

    const { result, participant, message } = resolveSave(current, rolled);

    current = participant;

    const head = textRef("battleLog.saves.head", { name: p.basicInfo.name, ability: abilityRef(ability), total: rolled.total, dc });

    messages.push(textRef(result.success ? "battleLog.saves.freed" : "battleLog.saves.kept", { head, effect: effectName(e) }));

    if (message) messages.push(message);

    if (result.success) freed.add(e.id);
  }

  if (!freed.size) return { participant: current, messages };

  return { participant: removeEffects(current, (e) => freed.has(e.id)).participant, messages };
}
