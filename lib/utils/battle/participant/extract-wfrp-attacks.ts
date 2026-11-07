import type { ExtractedAttack } from "../types/participant";
import type { EquippedArtifactRow } from "./extract-artifacts";

import { AttackType } from "@/lib/constants/battle";
import { isWeaponSlot } from "@/lib/utils/artifacts/weapon-slot";
import type { RuleSystemEquipment } from "@/lib/utils/rules/systems/types";

const valueOf = (list: { key: string; value?: number }[], key: string) => list.find((q) => q.key === key)?.value;

// verify against 5e book: targets hit per cell of blast radius
const BLAST_TARGETS_PER_RADIUS_CELL = 4;

export function extractWfrpAttacks(rows: EquippedArtifactRow[], equipment: RuleSystemEquipment): ExtractedAttack[] {
  const seen = new Set<string>();

  return rows.flatMap(({ row, slot, carried }) => {
    if (carried || !isWeaponSlot(slot)) return [];

    const profile = equipment.weaponProfile(row.systemStats);

    if (!profile) return [];

    const id = seen.has(row.id) ? `${row.id}:${slot}` : row.id;

    seen.add(row.id);

    const ranged = profile.range === "ranged";

    const blast = valueOf(profile.qualities, "blast");

    const reload = valueOf(profile.flaws, "reload");

    const attack: ExtractedAttack = {
      id,
      name: row.name,
      type: (ranged ? AttackType.RANGED : AttackType.MELEE) as ExtractedAttack["type"],
      attackBonus: 0,
      damageDice: "",
      damageBonus: profile.damageFlat,
      damageType: "physical",
      ...(ranged && { range: `${profile.rangeFt} ft` }),
      ...(blast && { targetType: "aoe" as const, maxTargets: blast * BLAST_TARGETS_PER_RADIUS_CELL }),
      wfrp: {
        qualities: profile.qualities,
        flaws: profile.flaws,
        ...(profile.ammoCapacity !== undefined && { ammoCapacity: profile.ammoCapacity }),
        ...(reload && { reload }),
        ...(!profile.addSb && { noSb: true }),
        ...(!ranged && profile.cells && { reachCells: profile.cells }),
        ...(blast && { blastRadius: blast }),
      },
    };

    return [attack];
  });
}
