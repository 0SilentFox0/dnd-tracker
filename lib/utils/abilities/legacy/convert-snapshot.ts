import { convertLegacyArtifact } from "./convert-artifact";
import { convertLegacyRace } from "./convert-race";
import { convertLegacySkill } from "./convert-skill";

import { pickHighestPerLine, resolveAbilities } from "@/lib/utils/abilities/build/resolve";
import type { Effect } from "@/lib/utils/abilities/schema";
import type { AbilitySource, AbilityUsageCounter, ResolvedAbility, SpellEnhancer } from "@/types/abilities";

type Rec = Record<string, unknown>;

const arr = (v: unknown): Rec[] => (Array.isArray(v) ? (v.filter((x) => typeof x === "object" && x) as Rec[]) : []);

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

export function convertLegacySnapshot(bd: Rec) {
  const skills = pickHighestPerLine(
    arr(bd.activeSkills).map((s) => {
      const mainSkillId = str(s.mainSkillId);

      const level = str(s.level);

      const source: AbilitySource = {
        type: "skill",
        id: String(s.skillId),
        name: String(s.name ?? ""),
        icon: str(s.icon),
        ...(mainSkillId && level && { line: { mainSkillId, level } }),
      };

      return { item: s, source };
    }),
  );

  const resolvedAbilities: ResolvedAbility[] = [];

  for (const { item: s, source } of skills) {
    const { abilities } = convertLegacySkill(
      { id: source.id, name: source.name, combatStats: { effects: s.effects, affectsDamage: s.affectsDamage, damageType: s.damageType }, bonuses: null, skillTriggers: s.skillTriggers, spellGroupId: str(s.spellGroupId) },
      { skipBakedStats: true },
    );

    resolvedAbilities.push(...resolveAbilities(source, abilities));
  }

  for (const r of arr(bd.racialAbilities)) {
    const source: AbilitySource = { type: "race", id: String(r.id), name: String(r.name ?? "") };

    resolvedAbilities.push(...resolveAbilities(source, convertLegacyRace({ id: source.id, name: source.name, passiveAbility: r.effect }, { skipBakedStats: true }).abilities));
  }

  for (const a of arr(bd.equippedArtifacts)) {
    // scoped-артефакти вже роздані одержувачам синтетичними копіями
    if (a.effectAudience && a.effectAudience !== "self") continue;

    const source: AbilitySource = { type: "artifact", id: String(a.artifactId), name: String(a.name ?? "") };

    const { abilities } = convertLegacyArtifact({ id: source.id, name: source.name, slot: str(a.slot), bonuses: a.bonuses, modifiers: a.modifiers, passiveAbility: a.passiveAbility }, { skipBakedStats: true });

    resolvedAbilities.push(...resolveAbilities(source, abilities));
  }

  const extras = (bd.extras && typeof bd.extras === "object" ? bd.extras : null) as Rec | null;

  if (extras) {
    // extras — запечений результат старої побудови (скіли + артефакти + сети + аури): він авторитетний
    const replaced = resolvedAbilities.map((a) =>
      a.trigger.event === "passive" ? { ...a, effects: a.effects.filter((e) => !isBakedIntoExtras(e)) } : a,
    );

    resolvedAbilities.length = 0;
    resolvedAbilities.push(...replaced.filter((a) => a.effects.length > 0));

    const effects = extrasEffects(extras);

    if (effects.length) {
      resolvedAbilities.push(...resolveAbilities({ type: "skill", id: "legacy-extras", name: "Пасивні ефекти" }, [{ id: "extras", name: "Пасивні ефекти", trigger: { event: "passive" }, effects }]));
    }
  }

  const spellEnhancers: SpellEnhancer[] = skills
    .filter(({ item }) => item.spellEnhancements && typeof item.spellEnhancements === "object")
    .map(({ item, source }) => ({
      skillId: source.id,
      name: source.name,
      mainSkillId: str(item.mainSkillId),
      level: str(item.level),
      linkedSpellId: str(item.linkedSpellId),
      spellGroupId: str(item.spellGroupId),
      spellEnhancements: item.spellEnhancements as SpellEnhancer["spellEnhancements"],
    }));

  const counts = (bd.skillUsageCounts ?? {}) as Record<string, number>;

  const abilityUsage: Record<string, AbilityUsageCounter> = {};

  for (const a of resolvedAbilities) {
    const used = a.source.type === "skill" ? counts[a.source.id] : undefined;

    if (used) abilityUsage[a.key] = { battle: used, round: 0, turn: 0 };
  }

  return { resolvedAbilities, spellEnhancers, abilityUsage };
}

function isBakedIntoExtras(e: Effect): boolean {
  if (e.kind === "flag") return ["resistance", "advantage", "disadvantageForAttackers", "spellImmunity"].includes(e.flag);

  return e.kind === "modifyStat" && e.stat === "critThreshold";
}

function extrasEffects(extras: Rec): Effect[] {
  const out: Effect[] = [];

  const res = (extras.resistances ?? {}) as Record<string, unknown>;

  for (const damageType of ["physical", "spell"]) {
    const v = res[damageType];

    if (typeof v === "number" && v > 0) out.push({ kind: "flag", flag: "resistance", damageType, percent: Math.min(100, v) });
  }

  if (extras.advantageOnAllRolls === true) out.push({ kind: "flag", flag: "advantage", attackKind: "all" });
  else if (extras.advantageOnRangedAttacks === true) out.push({ kind: "flag", flag: "advantage", attackKind: "ranged" });

  if (extras.enemyAttackDisadvantage === true) out.push({ kind: "flag", flag: "disadvantageForAttackers" });

  if (typeof extras.critThreshold === "number" && extras.critThreshold < 20) {
    out.push({ kind: "modifyStat", stat: "critThreshold", flat: extras.critThreshold - 20 });
  }

  const immune = Array.isArray(extras.immuneSpellIds) ? extras.immuneSpellIds.filter((x): x is string => typeof x === "string" && !!x) : [];

  if (immune.length) out.push({ kind: "flag", flag: "spellImmunity", spellIds: immune });

  return out;
}
