import { type SystemBattleUi,systemUiOf } from "@/components/systems";
import { useBattleRules } from "@/lib/hooks/battle";

export function useSystemBattleUi(): SystemBattleUi | undefined {
  return systemUiOf(useBattleRules().systemKey).battle;
}
