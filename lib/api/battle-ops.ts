import { campaignPatch, campaignPost } from "./client";

import type { AbilityKey } from "@/lib/constants/abilities";
import type { Condition5eKey, CustomConditionKey } from "@/lib/utils/abilities/schema/kinds";
import type { MoraleCheckResult } from "@/lib/utils/battle/morale/check";
import type {
  AbilityActionData,
  AttackData,
  AuraZoneData,
  BattleMutationResponse,
  BonusActionData,
  CritChoiceData,
  MapTerrainData,
  MapTerrainResponse,
  MapWeatherData,
  MazeActionData,
  MazeMarkData,
  MoraleCheckData,
  MoveParticipantData,
  PatchParticipantData,
  SpellCastData,
} from "@/types/api";
import type { BattleAction, LegendaryOption } from "@/types/battle";
import type { AddParticipantData } from "@/types/battle-setup";

export type WithVersion<T> = T & { expectedVersion?: number };

export type BattleConditionsBody =
  | { action: "apply"; participantId: string; condition: Condition5eKey | CustomConditionKey; rounds?: number; levels?: number; saveEnds?: { ability: AbilityKey; dc: number } }
  | { action: "remove"; participantId: string; condition: Condition5eKey | CustomConditionKey };

export type CoreActionBody =
  | { action: "dash" | "disengage" | "dodge" | "hide" | "ready" | "standUp" | "escape"; participantId: string }
  | { action: "help" | "grapple" | "readiedAttack"; participantId: string; targetId: string }
  | { action: "shove"; participantId: string; targetId: string; mode: "prone" | "push" }
  | { action: "legendary"; participantId: string; option: LegendaryOption };

export type UnitControlData = { mode: "assign"; participantId: string; controlledBy: string } | { mode: "random" };

export interface AttackResponse {
  hpChanges: BattleAction["hpChanges"];
  /** дію зупинено: ефект крита обирає ДМ, результат прийде пізніше */
  pendingCritChoice?: true;
}

export interface BattleOp<TBody extends object, TRes = Record<string, unknown>> {
  path: string | ((body: TBody) => string);
  method?: "PATCH";
  payload?: (body: WithVersion<TBody>) => object;
  invalidate?: ("battles" | "active-battles")[];
  retryOnConflict?: true;
  mapResponse?: (res: BattleMutationResponse) => BattleMutationResponse<TRes>;
  /** лише для виведення типу TBody; у рантаймі не використовується */
  readonly _body?: TBody;
}

export type BattleOpBody<O> = O extends BattleOp<infer B, infer _R> ? B : never;

export type BattleOpResponse<O> = O extends BattleOp<infer _B, infer R> ? R : never;

const op = <TBody extends object, TRes = Record<string, unknown>>(def: BattleOp<TBody, TRes>) => def;

const withHpChanges = (res: BattleMutationResponse): BattleMutationResponse<AttackResponse> => ({
  ...res,
  response: { hpChanges: res.delta.log.flatMap((a) => a.hpChanges ?? []), ...(res.response?.pendingCritChoice === true && { pendingCritChoice: true as const }) },
});

const BATTLES: ("battles" | "active-battles")[] = ["battles"];

const BATTLES_AND_ACTIVE: ("battles" | "active-battles")[] = ["battles", "active-battles"];

export const battleOps = {
  nextTurn: op<object>({ path: "/next-turn", invalidate: BATTLES }),
  attack: op<AttackData, AttackResponse>({ path: "/attack", invalidate: BATTLES, mapResponse: withHpChanges }),
  moraleCheck: op<MoraleCheckData, { moraleResult: MoraleCheckResult }>({ path: "/morale-check" }),
  critChoice: op<CritChoiceData>({ path: "/crit-choice" }),
  abilityAction: op<AbilityActionData>({ path: "/ability-action" }),
  auraZone: op<AuraZoneData>({ path: "/aura-zone" }),
  move: op<MoveParticipantData>({ path: "/move" }),
  mapTerrain: op<MapTerrainData, MapTerrainResponse>({ path: "/map-terrain", retryOnConflict: true }),
  maze: op<MazeActionData>({ path: "/maze" }),
  mazeMark: op<MazeMarkData>({ path: "/maze-mark" }),
  mapWeather: op<MapWeatherData>({ path: "/map-weather", retryOnConflict: true }),
  bonusAction: op<BonusActionData>({ path: "/bonus-action" }),
  castSpell: op<SpellCastData, AttackResponse>({ path: "/spell", mapResponse: withHpChanges }),
  start: op<object>({ path: "/start", invalidate: BATTLES_AND_ACTIVE }),
  reset: op<object>({ path: "/reset", invalidate: BATTLES }),
  complete: op<{ result?: "victory" | "defeat" }>({ path: "/complete", invalidate: BATTLES_AND_ACTIVE }),
  rollback: op<{ actionIndex: number }>({ path: "/rollback", invalidate: BATTLES }),
  addParticipant: op<AddParticipantData>({ path: "/add-participant" }),
  reveal: op<{ participantIds: string[] }>({ path: "/reveal-participant" }),
  conditions: op<BattleConditionsBody>({ path: "/conditions" }),
  coreAction: op<CoreActionBody>({ path: "/core-action" }),
  scaleUnits: op<{ direction: "buff" | "debuff" }>({ path: "/scale-units" }),
  unitControl: op<UnitControlData>({ path: "/unit-control" }),
  refreshSources: op<Record<string, never>>({ path: "/refresh-sources" }),
  updateParticipant: op<{ participantId: string; data: PatchParticipantData }>({
    path: (body) => `/participants/${body.participantId}`,
    method: "PATCH",
    payload: ({ data, expectedVersion }) => ({ ...data, expectedVersion }),
  }),
} as const;

export const battleOpPath = <T extends object, R>(operation: BattleOp<T, R>, battleId: string, body: T) =>
  `/battles/${battleId}${typeof operation.path === "function" ? operation.path(body) : operation.path}`;

export async function callBattleOp<TBody extends object, TRes>(
  operation: BattleOp<TBody, TRes>,
  campaignId: string,
  battleId: string,
  data: WithVersion<TBody>,
): Promise<BattleMutationResponse<TRes>> {
  const path = battleOpPath(operation, battleId, data);

  const body = operation.payload ? operation.payload(data) : data;

  const send = operation.method === "PATCH" ? campaignPatch : campaignPost;

  const res = await send<BattleMutationResponse<TRes>>(campaignId, path, body);

  return operation.mapResponse ? operation.mapResponse(res as BattleMutationResponse) : res;
}
