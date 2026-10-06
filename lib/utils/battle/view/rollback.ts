import { BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE } from "@/lib/constants/battle";
import type { BattleScene } from "@/types/api";
import type { BattleAction } from "@/types/battle";

/**
 * Після завершення бою лишаються останні N знімків; кожна дія з подіями пише хоча б одну подію,
 * тож останні N нескасованих подій гарантовано мають знімок для відкату.
 */
export function canRollbackEntry(battle: Pick<BattleScene, "status" | "battleLog">, entry: BattleAction): boolean {
  if (entry.isCancelled) return false;

  if (battle.status !== "completed") return true;

  const active = (battle.battleLog ?? []).filter((e) => !e.isCancelled).map((e) => e.actionIndex).sort((a, b) => b - a);

  const oldestKept = active[BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE - 1] ?? -Infinity;

  return entry.actionIndex >= oldestKept;
}
