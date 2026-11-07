import type { BattleAttack } from "@/types/battle";

export function initAmmo(attacks: BattleAttack[]): Record<string, number> | undefined {
  const entries = attacks.flatMap((a) => (a.id && a.wfrp?.ammoCapacity ? [[a.id, a.wfrp.ammoCapacity] as const] : []));

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}
