import { ABILITY_LABELS } from "@/lib/constants/abilities";
import { DND_SKILL_META } from "@/lib/constants/skills";
import { rollCheck } from "@/lib/utils/battle/checks/roll-check";
import { rollSave } from "@/lib/utils/battle/saves/roll-save";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";
import type { SheetRollResult, SheetRollSubject } from "@/types/characters";

export function sheetRollLabel(subject: SheetRollSubject): string {
  if (subject.kind === "save") return `Рятівний кидок: ${ABILITY_LABELS[subject.ability]}`;

  return "skill" in subject ? DND_SKILL_META[subject.skill].label : `Перевірка: ${ABILITY_LABELS[subject.ability]}`;
}

export function rollFromSheet(p: BattleParticipant, subject: SheetRollSubject, opts: { rules: Ruleset; rng: () => number; inspiration: boolean }): SheetRollResult {
  const base = { label: sheetRollLabel(subject), inspirationUsed: opts.inspiration };

  const shared = { participants: [p], rules: opts.rules, rng: opts.rng, advantage: opts.inspiration };

  if (subject.kind === "save") {
    const r = rollSave({ target: p, ability: subject.ability, dc: 0, ...shared });

    return { ...base, rolls: r.rolls, roll: r.roll, mod: r.mod, bonus: r.bonus, total: r.total, mode: r.mode, autoFail: r.autoFail };
  }

  const r = rollCheck({ actor: p, subject: "skill" in subject ? { skill: subject.skill } : { ability: subject.ability }, ...shared });

  return { ...base, rolls: r.rolls, roll: r.roll, mod: r.mod, bonus: r.bonus, total: r.total, mode: r.mode, autoFail: false };
}
