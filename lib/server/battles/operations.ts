import { BattleStatus } from "@/lib/constants/battle";
import { ContentError } from "@/lib/server/content/errors";
import type { RunBattleMutationOptions } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError } from "@/lib/utils/battle/store";

export type BattleOperationParams = { id: string; battleId: string; participantId?: string };
type Definition = Omit<RunBattleMutationOptions<unknown>, "params">;

function define<T>(definition: Omit<RunBattleMutationOptions<T>, "params">): Definition { return definition as Definition; }

/** The HTTP and actor entry points consume these same schemas, guards and mutations. */
export async function getBattleOperation(operation: string, params: BattleOperationParams): Promise<Definition> {
  switch (operation) {
    case "ability-action": {
      const { abilityActionMutation, abilityActionSchema } = await import("@/lib/server/battles/mutations/ability-action/ability-action-mutation");

      return define({
        access: "member",
        requireStatus: BattleStatus.ACTIVE,
        blockedByMode: true,
        rateLimitScope: "abilityAction",
        schema: abilityActionSchema,
        respond: "wrapped",
        mutate: abilityActionMutation,
      });
    }
    case "add-participant": {
      const { addParticipantSchema, createAddParticipantMutation } = await import("@/lib/server/battles/mutations/add-participant/add-participant-mutation");

      const mutate = createAddParticipantMutation();

      return define({
        access: "dm",
        requireStatus: BattleStatus.ACTIVE,
        allowWhileAwaitingDm: true,
        schema: addParticipantSchema,
        mutate,
      });
    }
    case "attack": {
      const { attackBodySchema, attackMutation } = await import("@/lib/server/battles/mutations/attack/attack-mutation");

      return define({
        access: "member",
        requireStatus: BattleStatus.ACTIVE,
        blockedByMode: true,
        rateLimitScope: "attack",
        schema: attackBodySchema,
        mutate: attackMutation,
      });
    }
    case "aura-zone": {
      const { auraZoneMutation, auraZoneSchema } = await import("@/lib/server/battles/mutations/aura-zone/aura-zone-mutation");

      return define({
        access: "member",
        requireStatus: BattleStatus.ACTIVE,
        blockedByMode: true,
        rateLimitScope: "abilityAction",
        schema: auraZoneSchema,
        respond: "wrapped",
        mutate: auraZoneMutation,
      });
    }
    case "bonus-action": {
      const { bonusActionMutation, bonusActionSchema } = await import("@/lib/server/battles/mutations/bonus-action/bonus-action-mutation");

      return define({
        access: "member",
        requireStatus: BattleStatus.ACTIVE,
        blockedByMode: true,
        rateLimitScope: "bonusAction",
        schema: bonusActionSchema,
        respond: "wrapped",
        mutate: bonusActionMutation,
      });
    }
    case "complete": {
      const { completeBattleSchema, completeMutation } = await import("@/lib/server/battles/mutations/complete/complete-mutation");

      return define({
        access: "dm",
        requireStatus: BattleStatus.ACTIVE,
        allowWhileAwaitingDm: true,
        schema: completeBattleSchema,
        mutate: completeMutation,
      });
    }
    case "conditions": {
      const { battleConditionsMutation, battleConditionsSchema } = await import("@/lib/server/battles/mutations/conditions/conditions-mutation");

      return define({
        access: "dm",
        requireStatus: BattleStatus.ACTIVE,
        schema: battleConditionsSchema,
        mutate: battleConditionsMutation,
      });
    }
    case "core-action": {
      const { coreActionMutation } = await import("@/lib/server/battles/mutations/core-action/core-action-mutation");

      const { legendaryMutation } = await import("@/lib/server/battles/mutations/core-action/legendary-mutation");

      const { coreActionRouteSchema } = await import("@/lib/utils/battle/actions/schema");

      return define({
        access: "member",
        requireStatus: BattleStatus.ACTIVE,
        blockedByMode: true,
        schema: coreActionRouteSchema,
        mutate: (ctx, body) => (body.action === "legendary" ? legendaryMutation(ctx, body) : coreActionMutation(ctx, body)),
      });
    }
    case "map-terrain": {
      const { mapTerrainMutation, mapTerrainSchema } = await import("@/lib/server/battles/mutations/map-terrain/map-terrain-mutation");

      return define({
        access: "dm",
        requireStatus: BattleStatus.ACTIVE,
        rateLimitScope: "mapTerrain",
        schema: mapTerrainSchema,
        mutate: mapTerrainMutation,
      });
    }
    case "map-weather": {
      const { mapWeatherMutation, mapWeatherSchema } = await import("@/lib/server/battles/mutations/map-weather/map-weather-mutation");

      return define({
        access: "dm",
        requireStatus: BattleStatus.ACTIVE,
        rateLimitScope: "mapWeather",
        schema: mapWeatherSchema,
        mutate: mapWeatherMutation,
      });
    }
    case "maze": {
      const { mazeActionSchema,mazeMutation } = await import("@/lib/server/battles/mutations/maze/maze-mutation");

      return define({
        access: "dm",
        requireStatus: BattleStatus.ACTIVE,
        rateLimitScope: "maze",
        schema: mazeActionSchema,
        mutate: mazeMutation,
      });
    }
    case "maze-mark": {
      const { mazeMarkMutation, mazeMarkSchema } = await import("@/lib/server/battles/mutations/maze-mark/maze-mark-mutation");

      return define({
        access: "member",
        requireStatus: BattleStatus.ACTIVE,
        blockedByMode: true,
        rateLimitScope: "mazeMark",
        schema: mazeMarkSchema,
        mutate: mazeMarkMutation,
      });
    }
    case "morale-check": {
      const { moraleCheckMutation } = await import("@/lib/server/battles/mutations/morale-check/morale-check-mutation");

      const { moraleCheckSchema } = await import("@/lib/schemas");

      return define({
        access: "member",
        requireStatus: BattleStatus.ACTIVE,
        blockedByMode: true,
        allowWhileAwaitingDm: true,
        schema: moraleCheckSchema,
        respond: "wrapped",
        mutate: moraleCheckMutation,
      });
    }
    case "move": {
      const { moveMutation, moveSchema } = await import("@/lib/server/battles/mutations/move/move-mutation");

      return define({
        access: "member",
        requireStatus: BattleStatus.ACTIVE,
        rateLimitScope: "move",
        schema: moveSchema,
        respond: "wrapped",
        mutate: moveMutation,
      });
    }
    case "next-turn": {
      const { nextTurnMutation } = await import("@/lib/server/battles/mutations/next-turn/next-turn-mutation");

      return define({
        access: "currentController",
        requireStatus: BattleStatus.ACTIVE,
        rateLimitScope: "nextTurn",
        mutate: nextTurnMutation,
      });
    }
    case "refresh-sources": {
      const { createRefreshSourcesMutation, refreshSourcesSchema } = await import("@/lib/server/battles/mutations/refresh-sources/refresh-sources-mutation");

      const mutate = createRefreshSourcesMutation();

      return define({
        access: "dm",
        requireStatus: BattleStatus.ACTIVE,
        allowWhileAwaitingDm: true,
        schema: refreshSourcesSchema,
        mutate,
      });
    }
    case "reset": {
      const { resetMutation } = await import("@/lib/server/battles/mutations/reset/reset-mutation");

      return define({
        access: "dm", allowWhileAwaitingDm: true, mutate: resetMutation });
    }
    case "reveal-participant": {
      const { revealParticipantMutation, revealParticipantSchema } = await import("@/lib/server/battles/mutations/reveal-participant/reveal-participant-mutation");

      return define({
        access: "dm",
        requireStatus: BattleStatus.ACTIVE,
        allowWhileAwaitingDm: true,
        schema: revealParticipantSchema,
        mutate: revealParticipantMutation,
      });
    }
    case "rollback": {
      const { createRollbackMutation, rollbackSchema } = await import("@/lib/server/battles/mutations/rollback/rollback-mutation");

      const mutate = createRollbackMutation();

      return define({
        access: "dm", allowWhileAwaitingDm: true, schema: rollbackSchema, mutate });
    }
    case "scale-units": {
      const { scaleUnitsMutation, scaleUnitsSchema } = await import("@/lib/server/battles/mutations/scale-units/scale-units-mutation");

      return define({
        access: "dm",
        requireStatus: BattleStatus.ACTIVE,
        rateLimitScope: "participantPatch",
        schema: scaleUnitsSchema,
        mutate: scaleUnitsMutation,
      });
    }
    case "spell": {
      const { spellSchema } = await import("@/lib/server/battles/mutations/spell/cast-spell-schema");

      const { createSpellMutation } = await import("@/lib/server/battles/mutations/spell/spell-mutation");

      const mutate = createSpellMutation();

      return define({
        access: "member",
        requireStatus: BattleStatus.ACTIVE,
        blockedByMode: true,
        rateLimitScope: "spell",
        schema: spellSchema,
        dryRun: (body) => body.preview === true,
        mutate,
      });
    }
    case "start": {
      const { createStartMutation } = await import("@/lib/server/battles/mutations/start/start-mutation");

      const mutate = createStartMutation();

      return define({
        access: "dm", requireStatus: BattleStatus.PREPARED, mutate });
    }
    case "unit-control": {
      const { unitControlMutation, unitControlSchema } = await import("@/lib/server/battles/mutations/unit-control/unit-control-mutation");

      return define({
        access: "dm",
        requireStatus: BattleStatus.ACTIVE,
        rateLimitScope: "participantPatch",
        schema: unitControlSchema,
        mutate: unitControlMutation,
      });
    }
    case "participants.patch": {
      const { patchParticipantMutation } = await import("@/lib/server/battles/mutations/participants/patch-participant-mutation");

      const { patchParticipantSchema } = await import("@/lib/server/battles/mutations/participants/patch-participant-schema");

      if (!params.participantId) throw new ContentError("Потрібен participantId", 400);

      const participantId = params.participantId;

      return define({
        access: "dm", requireStatus: BattleStatus.ACTIVE, allowWhileAwaitingDm: true, rateLimitScope: "participantPatch", schema: patchParticipantSchema, mutate: (ctx, body) => patchParticipantMutation(ctx, participantId, body) });
    }
    default: throw new BattleAccessError(404, "Невідома бойова операція");
  }
}
