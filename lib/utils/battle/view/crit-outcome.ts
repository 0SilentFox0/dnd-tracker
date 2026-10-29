import { dynamicTextRef } from "@/lib/i18n/text-ref";
import type { BattleAction } from "@/types/battle";
import type { LogLine } from "@/types/text";

export interface CritOutcome {
  name: LogLine;
  flavor?: LogLine;
  type: "success" | "fail";
}

export type CritEffectFx = Omit<CritOutcome, "type">;

type StoredCrit = NonNullable<BattleAction["actionDetails"]["criticalEffect"]>;

/** Legacy events carry the text; new ones only ids, so the text comes from `battleTerms.crits` in the viewer's language. */
export function critTexts(effect: StoredCrit, action: Pick<BattleAction, "actorName" | "targets">): { name: LogLine; description?: LogLine; flavor?: LogLine } {
  const key = `battleTerms.crits.${effect.source ?? "attack"}.${effect.type}.${effect.id}`;

  const flavor = effect.flavor ?? (effect.flavorIndex ? dynamicTextRef(`${key}.flavor.${effect.flavorIndex}`, { attacker: action.actorName, target: action.targets[0]?.participantName ?? "" }) : undefined);

  return {
    name: effect.name ?? dynamicTextRef(`${key}.name`),
    description: effect.description ?? dynamicTextRef(`${key}.description`),
    ...(flavor && { flavor }),
  };
}

export function critOutcome(log: BattleAction[], seen: ReadonlySet<number>, attackerId: string, targetId: string): CritOutcome | undefined {
  const e = log.find((x) => !seen.has(x.actionIndex) && x.actionType === "attack" && x.actorId === attackerId && x.targets[0]?.participantId === targetId && x.actionDetails.criticalEffect);

  const c = e?.actionDetails.criticalEffect;

  if (!e || !c) return undefined;

  const { name, flavor } = critTexts(c, e);

  return { name, type: c.type, ...(flavor && { flavor }) };
}
