import { z } from "zod";

import { DM_ACTOR,ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { applyBakedAuras } from "@/lib/utils/abilities/build/bake";
import {
  createBattleParticipantFromCharacter,
  createBattleParticipantFromUnit,
} from "@/lib/utils/battle/participant";
import { reserveOf, toReserve } from "@/lib/utils/battle/participant/reserve";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, type NewBattleEvent } from "@/lib/utils/battle/store";
import { calculateInitiative, compareInitiative } from "@/lib/utils/battle/turn/initiative";
import type { BattleParticipant } from "@/types/battle";

export const addParticipantSchema = z.object({
  sourceId: z.string(),
  type: z.enum([ParticipantSourceType.CHARACTER, ParticipantSourceType.UNIT]),
  side: z.enum([ParticipantSide.ALLY, ParticipantSide.ENEMY]),
  quantity: z.number().int().min(1).max(10).optional().default(1),
  reserved: z.boolean().optional(),
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

/** A unit added mid-battle copies the multipliers of a same-source enemy on the field or in the reserve; none there means ×1. */
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
    const side = data.side;

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

      const twin = side === ParticipantSide.ENEMY ? [...ctx.participants, ...reserveOf(ctx.pending)].find((p) => p.basicInfo.sourceId === unit.id && p.basicInfo.side === ParticipantSide.ENEMY) : undefined;

      for (let i = 0; i < (data.quantity ?? 1); i++) {
        const fresh = await deps.fromUnit(unit, battleId, side, i + 1);

        added.push(twin ? matchScaling(fresh, twin) : fresh);
      }
    }

    if (data.reserved) {
      return {
        participants: ctx.participants,
        pending: [...ctx.pending, ...added.map(toReserve)],
        events: [],
      };
    }

    const addedIds = new Set(added.map((p) => p.basicInfo.id));

    const baked = applyBakedAuras([...ctx.participants, ...added], addedIds);

    let order = baked.slice(0, ctx.participants.length);

    let turnIndex = ctx.scene.turnIndex;

    for (const newcomer of baked.slice(ctx.participants.length)) {
      const initiative = calculateInitiative(newcomer, [...order, newcomer]);

      const p = { ...newcomer, abilities: { ...newcomer.abilities, initiative } };

      const current = order[turnIndex];

      let at: number;

      if (current && compareInitiative(p, current) < 0) {
        // місце в цьому раунді вже минуло: поточний лишається поточним, новачок ходить з наступного раунду
        at = order.findIndex((other) => compareInitiative(p, other) < 0);
        turnIndex++;
      } else {
        // порядок після розкриттів не монотонний: шукаємо лише серед тих, хто ще має ходити (після щойно введених)
        let afterRun = turnIndex + 1;

        while (order[afterRun]?.battleData.revealPending) afterRun++;

        const next = order.findIndex((other, i) => i >= afterRun && compareInitiative(p, other) < 0);

        at = next === -1 ? order.length : next;
      }

      order = [...order.slice(0, at), p, ...order.slice(at)];
    }

    return {
      participants: order,
      pending: ctx.pending,
      ...(turnIndex !== ctx.scene.turnIndex && { scene: { turnIndex } }),
      events: [dmEvent(ctx, added, "DM додав на поле")],
    };
  };
}

function dmEvent(ctx: BattleMutationContext, added: BattleParticipant[], verb: string): NewBattleEvent {
  return {
    type: "ability",
    round: ctx.scene.round,
    actorId: DM_ACTOR.actorId,
    targets: added.map((p) => ({ participantId: p.basicInfo.id, participantName: p.basicInfo.name })),
    resultText: `${verb}: ${added.map((p) => p.basicInfo.name).join(", ")}`,
    details: { actorName: DM_ACTOR.actorName, actorSide: DM_ACTOR.actorSide, actionDetails: {} },
  };
}
