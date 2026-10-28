import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import type { BattleParticipant } from "@/types/battle";
import type { GameClassData } from "@/types/classes";

type Lines = { armor: string[]; weapons: string[] };

const ARMOR_LINE = { light: "Light armor", medium: "Medium armor", heavy: "Heavy armor", shield: "Shields" } as const;

const WEAPON_LINE = { simple: "Simple weapons", martial: "Martial weapons" } as const;

/** The first class gives its full list, later ones only their multiclass table; custom classes without lists → no checks. */
export function classProficiencies(classes: readonly Pick<GameClassData, "proficiencies" | "multiclassProficiencies">[]): Lines | undefined {
  const [first, ...rest] = classes;

  if (!first || (first.proficiencies.armor.length === 0 && first.proficiencies.weapons.length === 0)) return undefined;

  return {
    armor: [...first.proficiencies.armor, ...rest.flatMap((c) => c.multiclassProficiencies?.armor ?? [])],
    weapons: [...first.proficiencies.weapons, ...rest.flatMap((c) => c.multiclassProficiencies?.weapons ?? [])],
  };
}

/** Race/feat/item proficiency flags extend the class list; participants without a list stay unchecked. */
export function withGrantedProficiencies(p: BattleParticipant): BattleParticipant {
  const listed = p.abilities.proficiencies;

  if (!listed) return p;

  const { flags } = collectModifiers([p], p.basicInfo.id, { flags: ["proficiency"] });

  const kinds = flags.flatMap((f) => (f.flag === "proficiency" ? f.kinds : []));

  const armor = kinds.flatMap((k) => (k in ARMOR_LINE ? [ARMOR_LINE[k as keyof typeof ARMOR_LINE]] : []));

  const weapons = kinds.flatMap((k) => (k in WEAPON_LINE ? [WEAPON_LINE[k as keyof typeof WEAPON_LINE]] : []));

  if (armor.length === 0 && weapons.length === 0) return p;

  return { ...p, abilities: { ...p.abilities, proficiencies: { armor: [...listed.armor, ...armor], weapons: [...listed.weapons, ...weapons] } } };
}
