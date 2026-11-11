import { LOCATIONS } from "../combat/constants";
import { wfrpAttackFromProfile } from "../combat/extract-attacks";
import { type WfrpParticipantFields,wfrpParticipantFields } from "../combat/participant";
import { AP_CAP } from "../equipment/constants";
import type { WeaponProfile } from "../equipment/weapon-profile";
import { BREATH_BLAST, BREATH_DEFAULT_RANGE_FT, RANGED_DEFAULT_RANGE_FT, TRAIT_MELEE_CELLS } from "./constants";
import { sizeStep, traitEntries } from "./read";

import type { TraitEffect } from "@/lib/utils/abilities/schema";
import type { TraitSize } from "@/lib/utils/abilities/schema/kinds";
import type { ExtractedAttack } from "@/lib/utils/battle/types/participant";
import type { ResolvedAbility } from "@/types/abilities";

type AttackEffect = Extract<TraitEffect, { kind: "wfrpAttack" }>;

function attackProfile(e: AttackEffect): WeaponProfile {
  if (e.attack === "breath") {
    return { range: "ranged", rangeFt: e.rangeFt ?? BREATH_DEFAULT_RANGE_FT, damageFlat: e.damage, addSb: false, qualities: [{ key: "blast", value: BREATH_BLAST }], flaws: [], twoHanded: false };
  }

  if (e.attack === "ranged") return { range: "ranged", rangeFt: e.rangeFt ?? RANGED_DEFAULT_RANGE_FT, damageFlat: e.damage, addSb: true, qualities: [], flaws: [], twoHanded: false };

  return { range: "melee", cells: TRAIT_MELEE_CELLS, damageFlat: e.damage, addSb: true, qualities: [], flaws: [], twoHanded: false };
}

export function wfrpUnitBuild(row: { id: string; characteristics?: unknown }, abilities: readonly ResolvedAbility[]): { fields: WfrpParticipantFields; attacks: ExtractedAttack[] } {
  const base = wfrpParticipantFields(row);

  const entries = traitEntries(abilities);

  if (entries.length === 0) return { fields: base, attacks: [] };

  const ap = { ...base.wfrp.ap };

  let armoured = false;

  let ward: number | undefined;

  let size: TraitSize | undefined;

  const attacks: ExtractedAttack[] = [];

  for (const { ability, effect, index } of entries) {
    switch (effect.kind) {
      case "wfrpArmour":
        armoured = true;
        for (const l of LOCATIONS) ap[l] = Math.min(AP_CAP, Math.max(ap[l], effect[l]));
        break;
      case "wfrpWard":
        ward = Math.min(ward ?? effect.value, effect.value);
        break;
      case "wfrpSize":
        if (size === undefined || sizeStep(effect.size) > sizeStep(size)) size = effect.size;

        break;
      case "wfrpAttack":
        attacks.push(wfrpAttackFromProfile(`${row.id}-trait-${ability.key}-${index}`, ability.name, attackProfile(effect), effect.magical ? { magical: true } : undefined));
        break;
    }
  }

  return { fields: { ...base, wfrp: { ...base.wfrp, ...(armoured && { ap }), ...(ward !== undefined && { ward }), ...(size !== undefined && { size }) } }, attacks };
}
