import { z } from "zod";

import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { applyBakedAuras } from "@/lib/utils/abilities/build/bake";
import { calculateInitiative } from "@/lib/utils/battle/battle-start";
import {
  createBattleParticipantFromCharacter,
  createBattleParticipantFromUnit,
} from "@/lib/utils/battle/participant";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError } from "@/lib/utils/battle/store";
import type { BattleParticipant } from "@/types/battle";

export const addParticipantSchema = z.object({
  sourceId: z.string(),
  type: z.enum([ParticipantSourceType.CHARACTER, ParticipantSourceType.UNIT]),
  side: z.enum(["ally", "enemy"]),
  quantity: z.number().int().min(1).max(10).optional().default(1),
});

export type AddParticipantBody = z.infer<typeof addParticipantSchema>;

type CharacterRow = Parameters<typeof createBattleParticipantFromCharacter>[0] & { campaignId: string };

type UnitRow = Parameters<typeof createBattleParticipantFromUnit>[0] & { campaignId: string };

export interface AddParticipantDeps {
  loadCharacter(id: string): Promise<CharacterRow | null>;
  loadUnit(id: string): Promise<UnitRow | null>;
  fromCharacter: typeof createBattleParticipantFromCharacter;
  fromUnit: typeof createBattleParticipantFromUnit;
}

const defaultDeps: AddParticipantDeps = {
  loadCharacter: (id) =>
    prisma.character.findUnique({
      where: { id },
      include: { inventory: true },
    }) as Promise<CharacterRow | null>,
  loadUnit: (id) => prisma.unit.findUnique({ where: { id } }) as Promise<UnitRow | null>,
  fromCharacter: createBattleParticipantFromCharacter,
  fromUnit: createBattleParticipantFromUnit,
};

/** A unit added mid-battle copies the multipliers of a same-source enemy already on the field; none there means ×1. */
function matchScaling(fresh: BattleParticipant, twin: BattleParticipant): BattleParticipant {
  const { hpMultiplier, damageMultiplier } = twin.battleData;

  if (hpMultiplier === undefined && damageMultiplier === undefined) return fresh;

  const maxHp = Math.max(1, Math.round(fresh.combatStats.maxHp * (hpMultiplier ?? 1)));

  return {
    ...fresh,
    combatStats: { ...fresh.combatStats, maxHp, currentHp: maxHp },
    battleData: { ...fresh.battleData, hpMultiplier, damageMultiplier },
  };
}

export function createAddParticipantMutation(deps: AddParticipantDeps = defaultDeps) {
  return async (ctx: BattleMutationContext, data: AddParticipantBody): Promise<MutationResult> => {
    const side = data.side === "ally" ? ParticipantSide.ALLY : ParticipantSide.ENEMY;

    const battleId = ctx.scene.id;

    const added: BattleParticipant[] = [];

    if (data.type === ParticipantSourceType.CHARACTER) {
      const character = await deps.loadCharacter(data.sourceId);

      if (!character || character.campaignId !== ctx.scene.campaignId) {
        throw new BattleAccessError(404, "Персонажа не знайдено");
      }

      added.push(await deps.fromCharacter(character, battleId, side));
    } else {
      const unit = await deps.loadUnit(data.sourceId);

      if (!unit || unit.campaignId !== ctx.scene.campaignId) {
        throw new BattleAccessError(404, "Юніта не знайдено");
      }

      const twin = side === ParticipantSide.ENEMY ? ctx.participants.find((p) => p.basicInfo.sourceId === unit.id && p.side === ParticipantSide.ENEMY) : undefined;

      for (let i = 0; i < (data.quantity ?? 1); i++) {
        const fresh = await deps.fromUnit(unit, battleId, side, i + 1);

        added.push(twin ? matchScaling(fresh, twin) : fresh);
      }
    }

    const insertAt = ctx.scene.turnIndex + 1;

    const addedIds = new Set(added.map((p) => p.basicInfo.id));

    const participants = applyBakedAuras([
      ...ctx.participants.slice(0, insertAt),
      ...added,
      ...ctx.participants.slice(insertAt),
    ], addedIds);

    for (const p of participants.filter((x) => addedIds.has(x.basicInfo.id))) {
      const initiative = calculateInitiative(p);

      p.abilities.initiative = initiative;
      p.abilities.baseInitiative = initiative;
    }

    return {
      participants,
      pending: ctx.pending,
      events: [
        {
          type: "ability",
          round: ctx.scene.round,
          actorId: "dm",
          targets: added.map((p) => ({ participantId: p.basicInfo.id, participantName: p.basicInfo.name })),
          resultText: `DM додав на поле: ${added.map((p) => p.basicInfo.name).join(", ")}`,
          details: { actorName: "DM", actorSide: "ally", actionDetails: {} },
        },
      ],
    };
  };
}
