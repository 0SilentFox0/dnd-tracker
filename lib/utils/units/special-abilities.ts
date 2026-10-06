import type { Ability } from "@/lib/utils/abilities/schema";

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** CSV «Навички/Здібності» юніта → вміння-нотатки; бонусна дія не виконується автоматично. */
export function specialAbilitiesToAbilities(list: unknown): Ability[] {
  const abilities: Ability[] = [];

  (Array.isArray(list) ? list : []).forEach((sa, i) => {
    if (!isRecord(sa) || typeof sa.name !== "string" || !sa.name) return;

    const description = typeof sa.description === "string" && sa.description ? sa.description : undefined;

    abilities.push({
      id: `sa${i}`,
      name: sa.name,
      ...(description && { description }),
      trigger: sa.actionType === "bonus_action" ? { event: "bonusAction" } : { event: "passive" },
      effects: [{ kind: "note", text: description ?? sa.name }],
    });
  });

  return abilities;
}
