import { textRef } from "@/lib/i18n/text-ref";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

export const INSPIRATION_LABEL = textRef("battleLog.rollMode.inspiration");

export function canUseInspiration(p: BattleParticipant | undefined | null, rules: Ruleset | undefined | null): boolean {
  return !!rules?.outOfCombat?.inspiration && !!p?.battleData.inspiration;
}

export function spendInspiration(ps: BattleParticipant[], id: string): BattleParticipant[] {
  return ps.map((p) => (p.basicInfo.id === id ? { ...p, battleData: { ...p.battleData, inspiration: false, inspirationSpent: true } } : p));
}
