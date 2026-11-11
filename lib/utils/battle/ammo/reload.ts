import type { BattleParticipant } from "@/types/battle";

export function tickReload(p: BattleParticipant): BattleParticipant {
  const { reload, ammo, attacks } = p.battleData;

  if (!reload || Object.keys(reload).length === 0) return p;

  const nextReload: Record<string, number> = {};

  const nextAmmo = { ...ammo };

  for (const [id, turns] of Object.entries(reload)) {
    const left = Math.max(0, turns - 1);

    if (left > 0) nextReload[id] = left;
    else nextAmmo[id] = attacks.find((a) => a.id === id)?.ammo?.capacity ?? nextAmmo[id] ?? 0;
  }

  return { ...p, battleData: { ...p.battleData, ammo: nextAmmo, reload: nextReload } };
}
