import { applyWfrpCrit } from "./crit-effect";
import { rollCrit } from "./crit-table";
import { computeWfrpDamage } from "./damage";

import { dynamicTextRef, textRef } from "@/lib/i18n/text-ref";
import type { MitigateCtx, MitigateResult,MitigateStep } from "@/lib/utils/rules/systems/types";

const step = (key: string, value: number): MitigateStep => ({
  key,
  value,
  label: dynamicTextRef(`battleWfrp.damage.steps.${key}`),
  side: key === "tb" || key === "ap" ? "target" : "attacker",
});

const totalLabel = textRef("battleWfrp.damage.total");

export function mitigateWfrpDamage(ctx: MitigateCtx): MitigateResult {
  const { attacker, target, location } = ctx;

  if (ctx.amount <= 0) return { amount: 0, steps: [], totalLabel };

  const base = computeWfrpDamage({
    weapon: ctx.weapon,
    sb: attacker.abilities.wfrp?.sb ?? 0,
    netSl: ctx.netSl,
    tb: target.abilities.wfrp?.tb ?? 0,
    ap: target.abilities.wfrp?.ap[location] ?? 0,
  });

  const steps = base.steps.filter((s) => s.key === "weapon" || s.value !== 0).map((s) => step(s.key, s.value));

  const raw = base.steps.reduce((sum, s) => sum + s.value, 0);

  if (base.total !== raw) steps.push(step("minimum", base.total - raw));

  const crit = ctx.crit && target.combatStats.currentHp > 0 ? rollCrit(location, ctx.rng) : undefined;

  if (!crit) return { amount: base.total, steps, totalLabel };

  if (crit.bonusDamage > 0) steps.push(step("crit", crit.bonusDamage));

  return { amount: base.total + crit.bonusDamage, steps, totalLabel, afterHit: (p, round) => applyWfrpCrit(p, crit, round) };
}
