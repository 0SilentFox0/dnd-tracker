import { parseLegacyEffects } from "./parse-effects";
import { mapLegacyEffect } from "./stat-map";
import { mapLegacyTrigger } from "./trigger-map";
import type { ConversionIssue, ConversionResult, ConvertOptions } from "./types";

import type { Ability, DamageKind, Effect } from "@/lib/utils/abilities/schema";

export interface LegacySkillRow {
  id: string;
  name: string;
  combatStats: unknown;
  bonuses: unknown;
  skillTriggers: unknown;
  spellGroupId?: string | null;
}

function damageKindOverride(combatStats: unknown): DamageKind | null {
  const cs = (combatStats ?? {}) as { affectsDamage?: unknown; damageType?: unknown };

  return cs.affectsDamage === true && (cs.damageType === "melee" || cs.damageType === "ranged" || cs.damageType === "magic") ? cs.damageType : null;
}

export function convertLegacySkill(row: LegacySkillRow, opts: ConvertOptions = {}): ConversionResult {
  const effects = parseLegacyEffects(row.combatStats, row.bonuses);

  const rawTriggers = Array.isArray(row.skillTriggers) && row.skillTriggers.length ? row.skillTriggers : [{ type: "simple", trigger: "passive" }];

  const issues: ConversionIssue[] = [];

  const abilities: Ability[] = [];

  const extras: Omit<Ability, "id" | "name">[] = [];

  let counterKinds: DamageKind[] | null = null;

  let counterPercent = 0;

  rawTriggers.forEach((raw, i) => {
    const mapped = mapLegacyTrigger(raw);

    if (!mapped) {
      issues.push({ severity: "loss", message: `Невідомий тригер: ${JSON.stringify(raw)}` });

      return;
    }

    issues.push(...mapped.issues);

    if (mapped.counter) counterKinds = mapped.counter.attackKinds;

    const main: Effect[] = [];

    const before: Effect[] = [];

    for (const e of effects) {
      const r = mapLegacyEffect(e, {
        trigger: mapped.trigger,
        damageKindOverride: damageKindOverride(row.combatStats),
        school: row.spellGroupId ?? null,
        skipBakedStats: opts.skipBakedStats === true,
        emitExtras: i === 0,
      });

      if (r.counterPercent !== undefined) counterPercent += r.counterPercent;

      if (mapped.counter) {
        if (r.effects.length) issues.push({ severity: "loss", message: `${e.stat}: у тригері першого удару не діяв` });

        continue;
      }

      main.push(...r.effects);
      before.push(...r.beforeEffects);
      extras.push(...r.extras);
      issues.push(...r.issues);
    }

    if (mapped.counter) return;

    for (const text of mapped.notes) main.push({ kind: "note", text });

    const common = {
      name: row.name,
      ...(mapped.condition && { condition: mapped.condition }),
      ...(mapped.limits && { limits: mapped.limits }),
      ...(mapped.stackable && { stackable: true }),
    };

    if (main.some((e) => e.kind !== "note") || (main.length && !before.length)) {
      abilities.push({ id: `t${i}`, ...common, trigger: mapped.trigger, effects: main });
    }

    if (before.length) {
      const t = mapped.trigger;

      if (mapped.limits) {
        issues.push({ severity: "behavior", message: "Ліміт onHit тепер окремо для бонусу шкоди й ефектів влучання" });
      }

      abilities.push({
        id: `t${i}-before`,
        ...common,
        trigger: { event: "attack", phase: "before", role: "attacker", ...(t.event === "hit" && t.attackKind && { attackKind: t.attackKind }) },
        effects: before,
      });
    }
  });

  if (counterKinds || counterPercent > 0) {
    abilities.unshift({
      id: "counter",
      name: row.name,
      trigger: { event: "passive" },
      effects: [{ kind: "flag", flag: "counterAttack", attackKinds: counterKinds ?? ["melee"], bonusPercent: counterPercent || 15 }],
    });
  }

  extras.forEach((x, n) => abilities.push({ id: `x${n}`, name: row.name, ...x }));

  const cs = (row.combatStats ?? {}) as { min_targets?: unknown; max_targets?: unknown };

  const targets: Effect[] = [];

  if (typeof cs.min_targets === "number" && cs.min_targets !== 0) targets.push({ kind: "modifyStat", stat: "minTargets", flat: cs.min_targets });

  if (typeof cs.max_targets === "number" && cs.max_targets !== 0) targets.push({ kind: "modifyStat", stat: "maxTargets", flat: cs.max_targets });

  if (targets.length && !opts.skipBakedStats) {
    abilities.push({ id: "targets", name: row.name, trigger: { event: "passive" }, effects: targets });
    issues.push({ severity: "behavior", message: "Мін./макс. цілей скіла: раніше не діяло, тепер додається до цілей" });
  }

  return { abilities, issues };
}
