import type { CharacteristicKey } from "../characteristics/schema";

export interface SkillDef {
  key: string;
  characteristic: CharacteristicKey;
  kind: "basic" | "advanced";
  spec: "none" | "fixed" | "open";
  specs?: readonly string[];
  basicSpecs?: readonly string[];
}

const basic = (key: string, characteristic: CharacteristicKey): SkillDef => ({ key, characteristic, kind: "basic", spec: "none" });

const advanced = (key: string, characteristic: CharacteristicKey): SkillDef => ({ key, characteristic, kind: "advanced", spec: "none" });

const open = (key: string, characteristic: CharacteristicKey): SkillDef => ({ key, characteristic, kind: "advanced", spec: "open" });

export const MELEE_SPECS = ["basic", "cavalry", "fencing", "flail", "parry", "polearm", "two-handed", "brawling"] as const;

export const RANGED_SPECS = ["bow", "crossbow", "blackpowder", "engineering", "entangling", "explosives", "sling", "throwing"] as const;

export const SKILL_CATALOG: readonly SkillDef[] = [
  basic("athletics", "ag"),
  basic("charm", "fel"),
  basic("climb", "s"),
  basic("cool", "wp"),
  basic("drink", "t"),
  basic("dodge", "ag"),
  basic("drive", "ag"),
  basic("endurance", "t"),
  basic("entertain", "fel"),
  basic("gamble", "int"),
  basic("gossip", "fel"),
  basic("haggle", "fel"),
  basic("intimidate", "s"),
  basic("intuition", "i"),
  basic("leadership", "fel"),
  basic("navigation", "i"),
  basic("survival", "int"),
  basic("perception", "i"),
  basic("ride", "ag"),
  basic("row", "s"),
  basic("stealth", "ag"),
  basic("swim", "s"),
  { key: "melee", characteristic: "ws", kind: "advanced", spec: "fixed", specs: MELEE_SPECS, basicSpecs: ["basic"] },
  { key: "ranged", characteristic: "bs", kind: "advanced", spec: "fixed", specs: RANGED_SPECS },
  advanced("animal-care", "int"),
  advanced("channelling", "wp"),
  advanced("evaluate", "int"),
  advanced("heal", "int"),
  advanced("lockpicking", "dex"),
  advanced("pray", "fel"),
  advanced("research", "int"),
  advanced("signs", "i"),
  advanced("traps", "dex"),
  advanced("sleight-of-hand", "dex"),
  advanced("track", "i"),
  open("lore", "int"),
  open("language", "int"),
  open("trade", "dex"),
  open("art", "dex"),
  open("performance", "ag"),
];

export const skillDef = (key: string): SkillDef | undefined => SKILL_CATALOG.find((s) => s.key === key);

export const skillAdvanceKey = (key: string, spec?: string): string => (spec ? `${key}:${spec}` : key);

export function parseSkillAdvanceKey(advanceKey: string): { key: string; spec?: string } {
  const [key, spec] = advanceKey.split(":");

  return spec ? { key, spec } : { key };
}
