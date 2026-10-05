import type { ConversionIssue, ConversionResult } from "./types";

import type { Ability } from "@/lib/utils/abilities/schema";

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function convertLegacyUnit(row: { id: string; name: string; specialAbilities: unknown }): ConversionResult {
  const issues: ConversionIssue[] = [];

  const abilities: Ability[] = [];

  const list = Array.isArray(row.specialAbilities) ? row.specialAbilities : [];

  list.forEach((sa, i) => {
    if (!isRecord(sa) || typeof sa.name !== "string" || !sa.name) return;

    const description = typeof sa.description === "string" && sa.description ? sa.description : undefined;

    const bonus = sa.actionType === "bonus_action";

    if (bonus) {
      issues.push({ severity: "loss", message: `«${sa.name}»: ${sa.spellId ? `спел ${String(sa.spellId)}` : "дія"} не виконується автоматично` });
    }

    abilities.push({
      id: `sa${i}`,
      name: sa.name,
      ...(description && { description }),
      trigger: bonus ? { event: "bonusAction" } : { event: "passive" },
      effects: [{ kind: "note", text: description ?? sa.name }],
    });
  });

  return { abilities, issues };
}
