import { AttackType } from "@/lib/constants/battle";
import type { Ability } from "@/lib/utils/abilities/schema";

type Template = { id: string; build: (text: { name: string; note: string }) => Omit<Ability, "id"> };

export const ABILITY_TEMPLATES: readonly Template[] = [
  { id: "stats", build: ({ name }) => ({ name, trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 1 }] }) },
  { id: "damage", build: ({ name }) => ({ name, trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: AttackType.MELEE }, percent: 10 }] }) },
  { id: "onHit", build: ({ name }) => ({ name, trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "dot", damagePerRound: "1d4", damageType: "bleed", duration: { rounds: 2 }, target: "eventTarget" }] }) },
  { id: "resistance", build: ({ name }) => ({ name, trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "physical", percent: 25 }] }) },
  { id: "aura", build: ({ name }) => ({ name, trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 1, target: "allAllies" }] }) },
  { id: "survive", build: ({ name }) => ({ name, trigger: { event: "lethalDamage" }, limits: { perBattle: 1 }, effects: [{ kind: "heal", amount: 1, revive: true }] }) },
  { id: "bonusAction", build: ({ name }) => ({ name, trigger: { event: "bonusAction" }, limits: { perBattle: 1 }, effects: [{ kind: "heal", amount: "1d10" }] }) },
  { id: "spellSlots", build: ({ name }) => ({ name, trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "spellSlots", spellLevels: [1], flat: 1 }] }) },
  { id: "custom", build: ({ name, note }) => ({ name, trigger: { event: "passive" }, effects: [{ kind: "note", text: note }] }) },
];
