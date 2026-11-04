import type { PrismaClient } from "@prisma/client";

import { bypassLayer } from "@/lib/db/content-layer";

type Db = Pick<PrismaClient, "spell" | "skill" | "mainSkill" | "unit">;

export type DetachKind = "spellGroup" | "race" | "mainSkill" | "spell" | "unit";

type Target = { model: keyof Db; column: string };

const REFERRERS: Record<DetachKind, Target[]> = {
  spellGroup: [{ model: "spell", column: "groupId" }, { model: "mainSkill", column: "spellGroupId" }, { model: "skill", column: "spellGroupId" }],
  race: [{ model: "unit", column: "raceId" }],
  mainSkill: [{ model: "skill", column: "mainSkillId" }],
  spell: [{ model: "skill", column: "spellId" }, { model: "skill", column: "spellNewSpellId" }, { model: "skill", column: "grantedSpellId" }],
  unit: [{ model: "spell", column: "summonUnitId" }],
};

/** Content FKs are gone (base rows can be referenced), so the old ON DELETE SET NULL is done here; `ids: "all"` nulls every reference of that kind. */
export async function detachRefs(db: Db, campaignId: string, kind: DetachKind, ids: string[] | "all"): Promise<void> {
  if (ids !== "all" && !ids.length) return;

  for (const { model, column } of REFERRERS[kind]) {
    const where = { campaignId, [column]: ids === "all" ? { not: null } : { in: ids } };

    const delegate = db[model] as unknown as { updateMany(args: unknown): Promise<unknown> };

    await bypassLayer(() => delegate.updateMany({ where, data: { [column]: null } }));
  }
}
