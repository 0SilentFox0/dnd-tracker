import { type WeaponProfile, weaponProfile } from "../equipment/weapon-profile";
import { ATTACK_SLOT } from "../slots";

import { ArtifactSlot } from "@/lib/constants/artifacts";
import { AttackType } from "@/lib/constants/battle";
import { isWeaponSlot } from "@/lib/utils/artifacts/weapon-slot";
import type { EquippedArtifactRow } from "@/lib/utils/battle/participant/extract-artifacts";
import type { ExtractedAttack } from "@/lib/utils/battle/types/participant";

const valueOf = (list: { key: string; value?: number }[], key: string) => list.find((q) => q.key === key)?.value;

// verify against 5e book: targets hit per cell of blast radius
const BLAST_TARGETS_PER_RADIUS_CELL = 4;

export function extractWfrpAttacks({ rows }: { rows: EquippedArtifactRow[] }): ExtractedAttack[] {
  const seen = new Set<string>();

  return rows.flatMap(({ row, slot, carried }) => {
    if (carried || !(isWeaponSlot(slot) || slot === ArtifactSlot.SHIELD)) return [];

    const profile = weaponProfile(row.systemStats);

    if (!profile) return [];

    const id = seen.has(row.id) ? `${row.id}:${slot}` : row.id;

    seen.add(row.id);

    return [wfrpAttackFromProfile(id, row.name, profile)];
  });
}

export function wfrpAttackFromProfile(id: string, name: string, profile: WeaponProfile, extra?: { magical?: true }): ExtractedAttack {
  const ranged = profile.range === "ranged";

  const blast = valueOf(profile.qualities, "blast");

  const reload = valueOf(profile.flaws, "reload");

  return {
    id,
    name,
    type: (ranged ? AttackType.RANGED : AttackType.MELEE) as ExtractedAttack["type"],
    attackBonus: 0,
    damageDice: "",
    damageBonus: profile.damageFlat,
    damageType: "physical",
    ...(ranged && { range: `${profile.rangeFt} ft` }),
    ...(blast && { targetType: "aoe" as const, maxTargets: blast * BLAST_TARGETS_PER_RADIUS_CELL, blastRadius: blast }),
    system: ATTACK_SLOT.write({
      qualities: profile.qualities,
      flaws: profile.flaws,
      ...(!profile.addSb && { noSb: true }),
      ...(extra?.magical && { magical: true as const }),
    }),
    noLevelDice: true,
    ...(profile.ammoCapacity !== undefined && { ammo: { capacity: profile.ammoCapacity, ...(reload && { reload }) } }),
    ...(!ranged && profile.cells && { reachCells: profile.cells }),
    ...(profile.qualities.some((q) => q.key === "pistol") && { ignoresEngagement: true as const }),
  };
}
