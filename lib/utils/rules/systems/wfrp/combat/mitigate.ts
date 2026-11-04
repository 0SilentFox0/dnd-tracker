import { applyWfrpCrit } from "./crit-effect";
import { rollCrit } from "./crit-table";
import { computeWfrpDamage } from "./damage";

import type { MitigateCtx, MitigateResult } from "@/lib/utils/rules/systems/types";

export function mitigateWfrpDamage(ctx: MitigateCtx): MitigateResult {
  const { attacker, target, location } = ctx;

  if (ctx.amount <= 0) return { amount: 0, steps: [] };

  const base = computeWfrpDamage({
    weapon: ctx.weapon,
    sb: attacker.abilities.wfrp?.sb ?? 0,
    netSl: ctx.netSl,
    tb: target.abilities.wfrp?.tb ?? 0,
    ap: target.abilities.wfrp?.ap[location] ?? 0,
  });

  const steps = base.steps.filter((s) => s.key === "weapon" || s.value !== 0);

  const raw = base.steps.reduce((sum, s) => sum + s.value, 0);

  if (base.total !== raw) steps.push({ key: "minimum", value: base.total - raw });

  const crit = ctx.crit && target.combatStats.currentHp > 0 ? rollCrit(location, ctx.rng) : undefined;

  if (!crit) return { amount: base.total, steps };

  if (crit.bonusDamage > 0) steps.push({ key: "crit", value: crit.bonusDamage });

  return { amount: base.total + crit.bonusDamage, steps, afterHit: (p, round) => applyWfrpCrit(p, crit, round) };
}
